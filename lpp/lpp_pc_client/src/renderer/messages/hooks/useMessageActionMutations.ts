import { useMutation, type QueryClient } from "@tanstack/react-query";
import type { Dispatch, SetStateAction } from "react";

import type { ConversationListItem, MessageItemDto } from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import {
  messageBatchFailedCount,
  messageBatchSucceededCount,
} from "../../data/message/message-batch-action-result";
import { requireApiClient } from "../../data/runtime";
import { useI18n } from "../../i18n/useI18n";
import { formatError } from "../../lib/format";
import {
  discardLocalFailedOutgoingMessage,
  appendForwardedMessagesToCache,
  invalidateMessages,
  markMessageFavoriteInCache,
  markMessageRecalledInCache,
  removeMessageFromCache,
} from "../models/messageCacheMutationModel";
import { extractActionResultText } from "../models/messageComposerModel";
import { extractMessageText } from "../models/messageDisplayModel";
import type { ImConversationType } from "../models/messageCacheMutationModel";
import type { useMediaUploadTaskRegistry } from "./useMediaUploadTaskRegistry";

type MessageAnnotationMap = Record<string, string>;

export function useMessageActionMutations({
  activeConversation,
  activeConversationType,
  conversations,
  mediaUploadTasks,
  messages,
  queryClient,
  session,
  setForwardTargetMessages,
  setLocalOutgoingMessagesByConversation,
  setMessageAnnotations,
  setMultiSelectMode,
  setNotice,
  setSelectedMessageIds,
}: {
  activeConversation?: ConversationListItem;
  activeConversationType?: ImConversationType;
  conversations: ConversationListItem[];
  mediaUploadTasks: ReturnType<typeof useMediaUploadTaskRegistry>;
  messages: MessageItemDto[];
  queryClient: QueryClient;
  session: AuthSession | null;
  setForwardTargetMessages: Dispatch<SetStateAction<MessageItemDto[]>>;
  setLocalOutgoingMessagesByConversation: Dispatch<
    SetStateAction<Record<string, MessageItemDto[]>>
  >;
  setMessageAnnotations: Dispatch<SetStateAction<MessageAnnotationMap>>;
  setMultiSelectMode: Dispatch<SetStateAction<boolean>>;
  setNotice: Dispatch<SetStateAction<string | null>>;
  setSelectedMessageIds: Dispatch<SetStateAction<Set<string>>>;
}) {
  const { t } = useI18n();

  const recallMutation = useMutation({
    mutationFn: async (messageId: string) => {
      if (!session) throw new Error(t("messages.actionMutations.loginRequired"));
      return requireApiClient(session).recallMessage(messageId);
    },
    onSuccess: async (_result, messageId) => {
      markMessageRecalledInCache(queryClient, messageId, session);
      setNotice(t("messages.actionMutations.recallSuccess"));
      await invalidateMessages(queryClient, session);
    },
    onError: (error) =>
      setNotice(t("messages.actionMutations.recallFailed", { error: formatError(error) })),
  });

  const deleteMutation = useMutation({
    mutationFn: async (message: MessageItemDto) => {
      if (!session) throw new Error(t("messages.actionMutations.loginRequired"));
      const localDiscard = await discardLocalFailedOutgoingForMessage({
        activeConversation,
        activeConversationType,
        mediaUploadTasks,
        message,
        queryClient,
        session,
        setLocalOutgoingMessagesByConversation,
      });
      if (localDiscard.discarded) {
        return { kind: "local" as const, messageId: localDiscard.localMessageId };
      }
      await requireApiClient(session).deleteMessage(message.messageId);
      return { kind: "server" as const, messageId: message.messageId };
    },
    onSuccess: async (result) => {
      if (result.kind === "server") {
        removeMessageFromCache(queryClient, result.messageId, session);
        await invalidateMessages(queryClient, session);
      }
      setNotice(t("messages.actionMutations.deleteSuccess"));
    },
    onError: (error) =>
      setNotice(t("messages.actionMutations.deleteFailed", { error: formatError(error) })),
  });

  const favoriteMutation = useMutation({
    mutationFn: async (message: MessageItemDto) => {
      if (!session || !activeConversation) {
        throw new Error(t("messages.actionMutations.selectNormalConversation"));
      }
      return requireApiClient(session).addFavoriteMessage({
        messageId: message.messageId,
        conversationId: message.conversationId || activeConversation.conversationId,
      });
    },
    onSuccess: async (result, message) => {
      markMessageFavoriteInCache(
        queryClient,
        message.messageId,
        (result as { favoriteId?: string }).favoriteId,
      );
      setNotice(t("messages.actionMutations.favoriteSuccess"));
      await Promise.all([
        invalidateMessages(queryClient, session),
        queryClient.invalidateQueries({ queryKey: ["pc-account-favorites"] }),
        queryClient.invalidateQueries({ queryKey: ["pc-account-favorites-summary"] }),
      ]);
    },
    onError: (error) =>
      setNotice(t("messages.actionMutations.favoriteFailed", { error: formatError(error) })),
  });

  const batchDeleteMutation = useMutation({
    mutationFn: async (messageIds: string[]) => {
      if (!session) throw new Error(t("messages.actionMutations.loginRequired"));
      const localSuccessIds: string[] = [];
      const localFailedItems: { messageId: string; message?: string }[] = [];
      const serverMessageIds: string[] = [];
      for (const messageId of messageIds) {
        const message = messages.find((item) => item.messageId === messageId);
        if (!message) {
          serverMessageIds.push(messageId);
          continue;
        }
        try {
          const localDiscard = await discardLocalFailedOutgoingForMessage({
            activeConversation,
            activeConversationType,
            mediaUploadTasks,
            message,
            queryClient,
            session,
            setLocalOutgoingMessagesByConversation,
          });
          if (localDiscard.discarded) {
            localSuccessIds.push(messageId);
          } else {
            serverMessageIds.push(messageId);
          }
        } catch (error) {
          localFailedItems.push({ messageId, message: formatError(error) });
        }
      }
      const serverResult = serverMessageIds.length > 0
        ? await requireApiClient(session).batchDeleteMessages(serverMessageIds)
        : { failedItems: [], requestedIds: [], successIds: [] };
      return {
        failedItems: [...serverResult.failedItems, ...localFailedItems],
        localSuccessIds,
        requestedIds: messageIds,
        serverSuccessIds: serverResult.successIds,
        successIds: [...serverResult.successIds, ...localSuccessIds],
      };
    },
    onSuccess: async (result) => {
      result.serverSuccessIds.forEach((messageId) =>
        removeMessageFromCache(queryClient, messageId, session),
      );
      const succeeded = messageBatchSucceededCount(result);
      const failed = messageBatchFailedCount(result);
      if (succeeded > 0) {
        setMultiSelectMode(false);
        setSelectedMessageIds(new Set());
        await invalidateMessages(queryClient, session);
      }
      if (failed > 0) {
        setNotice(
          t("messages.interactions.batchDeletePartial", {
            failed,
            succeeded,
          }),
        );
        return;
      }
      setNotice(t("messages.interactions.batchDeleteSuccess", { count: succeeded }));
    },
    onError: (error) =>
      setNotice(t("messages.actionMutations.deleteFailed", { error: formatError(error) })),
  });

  const translateMutation = useMutation({
    mutationFn: async (message: MessageItemDto) => {
      if (!session) throw new Error(t("messages.actionMutations.loginRequired"));
      if (!message.messageId) throw new Error(t("messages.actionMutations.missingMessageId"));
      const apiClient = requireApiClient(session);
      const messageText = extractMessageText(message);
      let text: string | undefined;
      try {
        text = extractActionResultText(
          await apiClient.translateMessage(message.messageId),
        );
      } catch (error) {
        if (!messageText) throw error;
      }
      if (!text && messageText) {
        text = extractActionResultText(await apiClient.translateText(messageText));
      }
      return {
        messageId: message.messageId,
        text,
      };
    },
    onSuccess: ({ messageId, text }) => {
      if (!text) {
        setMessageAnnotations((current) => {
          const next = { ...current };
          delete next[messageId];
          return next;
        });
        setNotice(t("messages.actionMutations.translateEmpty"));
        return;
      }
      setMessageAnnotations((current) => ({
        ...current,
        [messageId]: t("messages.actionMutations.translationAnnotation", { text }),
      }));
      setNotice(t("messages.actionMutations.translateSuccess"));
    },
    onError: (error, message) => {
      setMessageAnnotations((current) => {
        const next = { ...current };
        delete next[message.messageId];
        return next;
      });
      setNotice(t("messages.actionMutations.translateFailed", { error: formatError(error) }));
    },
  });

  const voiceToTextMutation = useMutation({
    mutationFn: async (message: MessageItemDto) => {
      if (!session) throw new Error(t("messages.actionMutations.loginRequired"));
      return {
        messageId: message.messageId,
        text: extractActionResultText(
          await requireApiClient(session).voiceToText(message.messageId),
        ),
      };
    },
    onSuccess: ({ messageId, text }) => {
      if (!text) {
        setNotice(t("messages.actionMutations.voiceToTextEmpty"));
        return;
      }
      setMessageAnnotations((current) => ({
        ...current,
        [messageId]: t("messages.actionMutations.voiceToTextAnnotation", { text }),
      }));
      setNotice(t("messages.actionMutations.voiceToTextSuccess"));
    },
    onError: (error) =>
      setNotice(t("messages.actionMutations.voiceToTextFailed", { error: formatError(error) })),
  });

  const forwardMutation = useMutation({
    mutationFn: async ({
      messages,
      targetConversationId,
    }: {
      messages: MessageItemDto[];
      targetConversationId: string;
    }) => {
      if (!session) throw new Error(t("messages.actionMutations.loginRequired"));
      const client = requireApiClient(session);
      let succeededMessages: MessageItemDto[];
      let failedCount = 0;
      if (messages.length > 1) {
        const result = await client.batchForwardMessages({
          messageIds: messages.map((message) => message.messageId),
          targetConversationId,
        });
        const successIds = new Set(result.successIds.map((messageId) => messageId.toLowerCase()));
        succeededMessages = messages.filter((message) => successIds.has(message.messageId.toLowerCase()));
        failedCount = messageBatchFailedCount(result);
      } else {
        const message = messages[0];
        if (!message) throw new Error(t("messages.actionMutations.forwardFailedFallback"));
        await client.forwardMessage({
          sourceMessageId: message.messageId,
          targetConversationId,
        });
        succeededMessages = [message];
      }
      if (succeededMessages.length === 0) throw new Error(t("messages.actionMutations.forwardFailedFallback"));
      return { failedCount, succeededMessages, targetConversationId };
    },
    onSuccess: async ({ failedCount, succeededMessages }, variables) => {
      const target = conversations.find(
        (item) => item.conversationId === variables.targetConversationId,
      );
      if (target) {
        appendForwardedMessagesToCache(
          queryClient,
          session,
          target,
          succeededMessages,
        );
      }
      setForwardTargetMessages([]);
      setMultiSelectMode(false);
      setSelectedMessageIds(new Set());
      setNotice(
        failedCount > 0
          ? t("messages.actionMutations.forwardPartial", {
              failed: failedCount,
              succeeded: succeededMessages.length,
            })
          : succeededMessages.length > 1
            ? t("messages.actionMutations.forwardManySuccess", {
                count: succeededMessages.length,
              })
            : t("messages.actionMutations.forwardSuccess"),
      );
      await invalidateMessages(queryClient, session);
    },
    onError: (error) =>
      setNotice(t("messages.actionMutations.forwardFailed", { error: formatError(error) })),
  });

  return {
    batchDeleteMutation,
    deleteMutation,
    favoriteMutation,
    forwardMutation,
    recallMutation,
    translateMutation,
    voiceToTextMutation,
  };
}

async function discardLocalFailedOutgoingForMessage({
  activeConversation,
  activeConversationType,
  mediaUploadTasks,
  message,
  queryClient,
  session,
  setLocalOutgoingMessagesByConversation,
}: {
  activeConversation?: ConversationListItem;
  activeConversationType?: ImConversationType;
  mediaUploadTasks: ReturnType<typeof useMediaUploadTaskRegistry>;
  message: MessageItemDto;
  queryClient: QueryClient;
  session: AuthSession | null;
  setLocalOutgoingMessagesByConversation: Dispatch<
    SetStateAction<Record<string, MessageItemDto[]>>
  >;
}) {
  const conversationId = message.conversationId || activeConversation?.conversationId;
  const conversationType = activeConversationType;
  if (!conversationId || !conversationType) return { discarded: false as const };
  return discardLocalFailedOutgoingMessage({
    conversationId,
    conversationType,
    mediaUploadTasks,
    message,
    queryClient,
    session,
    setLocalOutgoingMessagesByConversation,
  });
}
