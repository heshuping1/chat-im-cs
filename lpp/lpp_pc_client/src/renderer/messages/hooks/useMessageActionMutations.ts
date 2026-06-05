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
  appendForwardedMessagesToCache,
  invalidateMessages,
  markMessageFavoriteInCache,
  markMessageRecalledInCache,
  removeMessageFromCache,
} from "../models/messageCacheMutationModel";
import { extractActionResultText } from "../models/messageComposerModel";
import { extractMessageText } from "../models/messageDisplayModel";

type MessageAnnotationMap = Record<string, string>;

export function useMessageActionMutations({
  activeConversation,
  conversations,
  queryClient,
  session,
  setForwardTargetMessages,
  setMessageAnnotations,
  setMultiSelectMode,
  setNotice,
  setSelectedMessageIds,
}: {
  activeConversation?: ConversationListItem;
  conversations: ConversationListItem[];
  queryClient: QueryClient;
  session: AuthSession | null;
  setForwardTargetMessages: Dispatch<SetStateAction<MessageItemDto[]>>;
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
      markMessageRecalledInCache(queryClient, messageId);
      setNotice(t("messages.actionMutations.recallSuccess"));
      await invalidateMessages(queryClient);
    },
    onError: (error) =>
      setNotice(t("messages.actionMutations.recallFailed", { error: formatError(error) })),
  });

  const deleteMutation = useMutation({
    mutationFn: async (messageId: string) => {
      if (!session) throw new Error(t("messages.actionMutations.loginRequired"));
      return requireApiClient(session).deleteMessage(messageId);
    },
    onSuccess: async (_result, messageId) => {
      removeMessageFromCache(queryClient, messageId);
      setNotice(t("messages.actionMutations.deleteSuccess"));
      await invalidateMessages(queryClient);
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
        queryClient.invalidateQueries({ queryKey: ["pc-im-messages"] }),
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
      return requireApiClient(session).batchDeleteMessages(messageIds);
    },
    onSuccess: async (result) => {
      result.successIds.forEach((messageId) => removeMessageFromCache(queryClient, messageId));
      const succeeded = messageBatchSucceededCount(result);
      const failed = messageBatchFailedCount(result);
      if (succeeded > 0) {
        setMultiSelectMode(false);
        setSelectedMessageIds(new Set());
        await invalidateMessages(queryClient);
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
      await invalidateMessages(queryClient);
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
