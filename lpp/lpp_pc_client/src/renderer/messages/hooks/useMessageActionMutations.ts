import { useMutation, type QueryClient } from "@tanstack/react-query";
import type { Dispatch, SetStateAction } from "react";

import type { ConversationListItem, MessageItemDto } from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import { requireApiClient } from "../../data/runtime";
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
  const recallMutation = useMutation({
    mutationFn: async (messageId: string) => {
      if (!session) throw new Error("请先登录");
      return requireApiClient(session).recallMessage(messageId);
    },
    onSuccess: async (_result, messageId) => {
      markMessageRecalledInCache(queryClient, messageId);
      setNotice("消息已撤回");
      await invalidateMessages(queryClient);
    },
    onError: (error) => setNotice(`撤回失败：${formatError(error)}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (messageId: string) => {
      if (!session) throw new Error("请先登录");
      return requireApiClient(session).deleteMessage(messageId);
    },
    onSuccess: async (_result, messageId) => {
      removeMessageFromCache(queryClient, messageId);
      setNotice("消息已删除");
      await invalidateMessages(queryClient);
    },
    onError: (error) => setNotice(`删除失败：${formatError(error)}`),
  });

  const favoriteMutation = useMutation({
    mutationFn: async (message: MessageItemDto) => {
      if (!session || !activeConversation) {
        throw new Error("请选择一个普通 IM 会话");
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
      setNotice("已收藏");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pc-im-messages"] }),
        queryClient.invalidateQueries({ queryKey: ["pc-account-favorites"] }),
        queryClient.invalidateQueries({ queryKey: ["pc-account-favorites-summary"] }),
      ]);
    },
    onError: (error) => setNotice(`收藏失败：${formatError(error)}`),
  });

  const translateMutation = useMutation({
    mutationFn: async (message: MessageItemDto) => {
      if (!session) throw new Error("请先登录");
      if (!message.messageId) throw new Error("当前消息缺少 messageId，无法翻译");
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
        setNotice("翻译服务未返回内容");
        return;
      }
      setMessageAnnotations((current) => ({
        ...current,
        [messageId]: `译文：${text}`,
      }));
      setNotice("已翻译");
    },
    onError: (error, message) => {
      setMessageAnnotations((current) => {
        const next = { ...current };
        delete next[message.messageId];
        return next;
      });
      setNotice(`翻译失败：${formatError(error)}`);
    },
  });

  const voiceToTextMutation = useMutation({
    mutationFn: async (message: MessageItemDto) => {
      if (!session) throw new Error("请先登录");
      return {
        messageId: message.messageId,
        text: extractActionResultText(
          await requireApiClient(session).voiceToText(message.messageId),
        ),
      };
    },
    onSuccess: ({ messageId, text }) => {
      if (!text) {
        setNotice("语音转文字未返回内容");
        return;
      }
      setMessageAnnotations((current) => ({
        ...current,
        [messageId]: `转文字：${text}`,
      }));
      setNotice("已转为文字");
    },
    onError: (error) => setNotice(`语音转文字失败：${formatError(error)}`),
  });

  const forwardMutation = useMutation({
    mutationFn: async ({
      messages,
      targetConversationId,
    }: {
      messages: MessageItemDto[];
      targetConversationId: string;
    }) => {
      if (!session) throw new Error("请先登录");
      const client = requireApiClient(session);
      const results = await Promise.allSettled(
        messages.map((message) =>
          client.forwardMessage({
            sourceMessageId: message.messageId,
            targetConversationId,
          }).then(() => message),
        ),
      );
      const succeededMessages = results
        .filter(
          (result): result is PromiseFulfilledResult<MessageItemDto> =>
            result.status === "fulfilled",
        )
        .map((result) => result.value);
      const failedCount = results.length - succeededMessages.length;
      if (succeededMessages.length === 0) {
        const firstFailure = results.find(
          (result): result is PromiseRejectedResult =>
            result.status === "rejected",
        );
        throw firstFailure?.reason ?? new Error("转发失败");
      }
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
          ? `已转发 ${succeededMessages.length} 条，${failedCount} 条失败，请稍后重试`
          : succeededMessages.length > 1
            ? `已转发 ${succeededMessages.length} 条消息`
            : "已转发",
      );
      await invalidateMessages(queryClient);
    },
    onError: (error) => setNotice(`转发失败：${formatError(error)}`),
  });

  return {
    deleteMutation,
    favoriteMutation,
    forwardMutation,
    recallMutation,
    translateMutation,
    voiceToTextMutation,
  };
}
