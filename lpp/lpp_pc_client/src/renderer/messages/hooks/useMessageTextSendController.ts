import type { QueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";

import type {
  ConversationListItem,
  GroupMemberDto,
  MessageItemDto,
} from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import { requireApiClient } from "../../data/runtime";
import {
  chatSendFailureContext,
  initialChatSendStatusForKind,
  logChatSendDiagnostic,
} from "../../data/send/send-state-machine";
import {
  getSendOutboxStorage,
  sendOutboxScopeKey,
  type SendOutboxStatus,
} from "../../data/send/send-outbox";
import { currentIsoTimestamp, formatError } from "../../lib/format";
import {
  appendLocalMessage,
  invalidateMessages,
  markLocalMessageFailed,
  markLocalOutgoingMessageFailed,
  patchLocalMessageSendState,
  replaceLocalMessageInCache,
  replaceLocalOutgoingMessage,
  upsertLocalOutgoingMessage,
  type ImConversationType,
} from "../models/messageCacheMutationModel";
import {
  extractMentions,
  withReplyBody,
  type ReplyTarget,
} from "../models/messageComposerModel";
import { failedMessageRetryAction } from "../../data/message/message-retry-model";

export function useMessageTextSendController({
  activeConversation,
  activeConversationType,
  enqueueOutgoingTask,
  groupMembers,
  queryClient,
  replyTarget,
  scrollMessagesToBottom,
  session,
  setLocalOutgoingMessagesByConversation,
  setReplyTarget,
}: {
  activeConversation?: ConversationListItem;
  activeConversationType?: ImConversationType;
  enqueueOutgoingTask: (task: () => Promise<void>) => Promise<void>;
  groupMembers: GroupMemberDto[];
  queryClient: QueryClient;
  replyTarget: ReplyTarget;
  scrollMessagesToBottom: (behavior?: ScrollBehavior) => void;
  session: AuthSession | null;
  setLocalOutgoingMessagesByConversation: Dispatch<
    SetStateAction<Record<string, MessageItemDto[]>>
  >;
  setReplyTarget: Dispatch<SetStateAction<ReplyTarget>>;
}) {
  const retryTextMessage = useCallback(
    (message: MessageItemDto) => {
      if (!session || !activeConversation || !activeConversationType) {
        throw new Error("请选择一个普通 IM 会话");
      }
      const retryAction = failedMessageRetryAction(message);
      if (!retryAction || retryAction.type !== "text") {
        throw new Error("该消息暂时无法重发");
      }
      const conversation = activeConversation;
      const conversationType = activeConversationType;
      const localMessageId = message.messageId;
      const clientMsgId = localMessageId;
      const body =
        message.body && Object.keys(message.body).length
          ? message.body
          : { text: retryAction.content };
      const sendStartedAt = Date.now();
      const storage = getSendOutboxStorage();
      const scopeKey = sendOutboxScopeKey(session);
      patchLocalMessageSendState(
        queryClient,
        session,
        conversation,
        conversationType,
        localMessageId,
        { status: "sending", localError: undefined, localSendStartedAt: sendStartedAt },
        setLocalOutgoingMessagesByConversation,
      );
      void storage.upsertRecord({
        body,
        channel: "im",
        clientMsgId,
        createdAt: Date.parse(message.sentAt ?? "") || Date.now(),
        localMessageId,
        messageType: "text",
        scopeKey,
        status: "sending",
        targetId: conversation.conversationId,
        targetType: conversationType,
        updatedAt: sendStartedAt,
      });
      logChatSendDiagnostic({
        taskId: "P4-MSG-005C",
        channel: "im",
        phase: "transition",
        result: "ok",
        action: "retry_send",
        from: "failed",
        to: "sending",
        context: {
          conversationId: conversation.conversationId,
          conversationType,
          localMessageId,
          messageKind: "text",
        },
      });
      enqueueOutgoingTask(async () => {
        try {
          const result = await requireApiClient(session).sendConversationTextMessage(
            conversationType,
            conversation.conversationId,
            retryAction.content,
            retryAction.replyToMessageId,
            conversationType === "group"
              ? extractMentions(retryAction.content, groupMembers)
              : [],
            { clientMsgId },
          );
          const sentMessage = replaceLocalMessageInCache(
            queryClient,
            session,
            conversation,
            localMessageId,
            "text",
            body,
            result,
          );
          logChatSendDiagnostic({
            taskId: "P4-MSG-005C",
            channel: "im",
            phase: "send",
            result: "ok",
            action: "send_succeeded",
            from: "sending",
            to: "sent",
            context: {
              conversationId: conversation.conversationId,
              conversationType,
              localMessageId,
              messageId: sentMessage.messageId,
              messageKind: "text",
            },
          });
          setLocalOutgoingMessagesByConversation((current) =>
            replaceLocalOutgoingMessage(
              current,
              conversationType,
              conversation.conversationId,
              localMessageId,
              sentMessage,
            ),
          );
          void storage.deleteRecord(scopeKey, localMessageId);
          void invalidateMessages(queryClient);
          scrollMessagesToBottom("smooth");
        } catch (error) {
          const failedAt = Date.now();
          const reason = formatError(error);
          logChatSendDiagnostic({
            taskId: "P4-MSG-005C",
            channel: "im",
            phase: "send",
            result: "failed",
            action: "send_failed",
            from: "sending",
            to: "failed",
            reason,
            context: chatSendFailureContext(error, {
              conversationId: conversation.conversationId,
              conversationType,
              localMessageId,
              messageKind: "text",
              path: conversationType === "group"
                ? "/api/client/v1/groups/{conversationId}/messages"
                : "/api/client/v1/direct-chats/{conversationId}/messages",
            }),
          });
          markLocalMessageFailed(
            queryClient,
            session,
            conversation,
            localMessageId,
            reason,
            failedAt,
          );
          setLocalOutgoingMessagesByConversation((current) =>
            markLocalOutgoingMessageFailed(
              current,
              conversationType,
              conversation.conversationId,
              localMessageId,
              reason,
              failedAt,
            ),
          );
          void storage.patchRecord(scopeKey, localMessageId, {
            localFailedAt: failedAt,
            localError: reason,
            status: "failed",
            updatedAt: failedAt,
          });
        }
      });
    },
    [
      activeConversation,
      activeConversationType,
      enqueueOutgoingTask,
      groupMembers,
      queryClient,
      scrollMessagesToBottom,
      session,
      setLocalOutgoingMessagesByConversation,
    ],
  );

  const sendTextOptimistically = useCallback(
    (content: string) => {
      if (!session || !activeConversation || !activeConversationType) {
        throw new Error("请选择一个普通 IM 会话");
      }
      const conversation = activeConversation;
      const conversationType = activeConversationType;
      const reply = replyTarget;
      const localMessageId = `pc-local-text-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const clientMsgId = localMessageId;
      const body = withReplyBody({ text: content }, reply);
      const initialStatus = initialChatSendStatusForKind("text");
      const sendStartedAt = Date.now();
      const storage = getSendOutboxStorage();
      const scopeKey = sendOutboxScopeKey(session);
      const localMessage = appendLocalMessage(
        queryClient,
        session,
        conversation,
        "text",
        body,
        {
          messageId: localMessageId,
          conversationId: conversation.conversationId,
          serverTime: currentIsoTimestamp(),
        },
        { status: initialStatus, localSendStartedAt: sendStartedAt },
      );
      logChatSendDiagnostic({
        taskId: "P4-MSG-005C",
        channel: "im",
        phase: "local_echo",
        result: "ok",
        action: "enqueue_text",
        to: initialStatus,
        context: {
          conversationId: conversation.conversationId,
          conversationType,
          localMessageId,
          messageKind: "text",
        },
      });
      setLocalOutgoingMessagesByConversation((current) =>
        upsertLocalOutgoingMessage(
          current,
          conversationType,
          conversation.conversationId,
          localMessage,
        ),
      );
      setReplyTarget(null);
      scrollMessagesToBottom("smooth");
      void storage.upsertRecord({
        body,
        channel: "im",
        clientMsgId,
        createdAt: sendStartedAt,
        localMessageId,
        messageType: "text",
        scopeKey,
        status: initialStatus as SendOutboxStatus,
        targetId: conversation.conversationId,
        targetType: conversationType,
        updatedAt: sendStartedAt,
      });
      enqueueOutgoingTask(async () => {
        try {
          const result = await requireApiClient(session).sendConversationTextMessage(
            conversationType,
            conversation.conversationId,
            content,
            reply?.messageId,
            conversationType === "group" ? extractMentions(content, groupMembers) : [],
            { clientMsgId },
          );
          const sentMessage = replaceLocalMessageInCache(
            queryClient,
            session,
            conversation,
            localMessageId,
            "text",
            body,
            result,
          );
          logChatSendDiagnostic({
            taskId: "P4-MSG-005C",
            channel: "im",
            phase: "send",
            result: "ok",
            action: "send_succeeded",
            from: "sending",
            to: "sent",
            context: {
              conversationId: conversation.conversationId,
              conversationType,
              localMessageId,
              messageId: sentMessage.messageId,
              messageKind: "text",
            },
          });
          setLocalOutgoingMessagesByConversation((current) =>
            replaceLocalOutgoingMessage(
              current,
              conversationType,
              conversation.conversationId,
              localMessageId,
              sentMessage,
            ),
          );
          void storage.deleteRecord(scopeKey, localMessageId);
          void invalidateMessages(queryClient);
          scrollMessagesToBottom("smooth");
        } catch (error) {
          const failedAt = Date.now();
          const reason = formatError(error);
          logChatSendDiagnostic({
            taskId: "P4-MSG-005C",
            channel: "im",
            phase: "send",
            result: "failed",
            action: "send_failed",
            from: "sending",
            to: "failed",
            reason,
            context: chatSendFailureContext(error, {
              conversationId: conversation.conversationId,
              conversationType,
              localMessageId,
              messageKind: "text",
              path: conversationType === "group"
                ? "/api/client/v1/groups/{conversationId}/messages"
                : "/api/client/v1/direct-chats/{conversationId}/messages",
            }),
          });
          markLocalMessageFailed(
            queryClient,
            session,
            conversation,
            localMessageId,
            reason,
            failedAt,
          );
          setLocalOutgoingMessagesByConversation((current) =>
            markLocalOutgoingMessageFailed(
              current,
              conversationType,
              conversation.conversationId,
              localMessageId,
              reason,
              failedAt,
            ),
          );
          void storage.patchRecord(scopeKey, localMessageId, {
            localFailedAt: failedAt,
            localError: reason,
            status: "failed",
            updatedAt: failedAt,
          });
        }
      });
    },
    [
      activeConversation,
      activeConversationType,
      enqueueOutgoingTask,
      groupMembers,
      queryClient,
      replyTarget,
      scrollMessagesToBottom,
      session,
      setLocalOutgoingMessagesByConversation,
      setReplyTarget,
    ],
  );

  return {
    retryTextMessage,
    sendTextOptimistically,
  };
}
