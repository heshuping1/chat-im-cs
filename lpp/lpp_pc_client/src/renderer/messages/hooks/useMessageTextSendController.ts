import type { QueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";

import type {
  ConversationListItem,
  GroupMemberDto,
  MessageItemDto,
} from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import { recordMessageTraceEvent } from "../../data/diagnostics/message-trace-diagnostics";
import { requireApiClient } from "../../data/runtime";
import {
  chatSendFailureContext,
  initialChatSendStatusForKind,
} from "../../data/send/send-state-machine";
import { createChatSendRuntime } from "../../data/send/chat-send-runtime";
import type { SendOutboxStatus } from "../../data/send/send-outbox";
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
import {
  contactCardMessageBody,
  normalizeContactCard,
  sanitizeContactCard,
  type NormalizedContactCard,
} from "../models/contactCardModel";

export function useMessageTextSendController({
  activeConversation,
  activeConversationType,
  canMentionAll,
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
  canMentionAll?: boolean;
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
        throw new Error("Select a regular IM conversation.");
      }
      const retryAction = failedMessageRetryAction(message);
      if (!retryAction || (retryAction.type !== "text" && retryAction.type !== "contact_card")) {
        throw new Error("This message cannot be resent right now.");
      }
      const conversation = activeConversation;
      const conversationType = activeConversationType;
      const localMessageId = message.messageId;
      const clientMsgId = localMessageId;
      const body =
        message.body && Object.keys(message.body).length
          ? message.body
          : retryAction.type === "text"
            ? { text: retryAction.content }
          : retryAction.body;
      const sendStartedAt = Date.now();
      const runtime = createChatSendRuntime({
        channel: "im",
        session,
        taskId: retryAction.type === "contact_card" ? "P24-CONTACT-001" : "P4-MSG-005C",
      });
      patchLocalMessageSendState(
        queryClient,
        session,
        conversation,
        conversationType,
        localMessageId,
        { status: "sending", localError: undefined, localSendStartedAt: sendStartedAt },
        setLocalOutgoingMessagesByConversation,
      );
      void runtime.upsertOutboxRecord({
        body,
        clientMsgId,
        createdAt: Date.parse(message.sentAt ?? "") || Date.now(),
        localMessageId,
        messageType: retryAction.type,
        status: "sending",
        targetId: conversation.conversationId,
        targetType: conversationType,
        updatedAt: sendStartedAt,
      });
      runtime.log({
        phase: "transition",
        result: "ok",
        action: "retry_send",
        from: "failed",
        to: "sending",
        context: {
          conversationId: conversation.conversationId,
          conversationType,
          localMessageId,
          messageKind: retryAction.type,
        },
      });
      enqueueOutgoingTask(async () => {
        try {
          const result = retryAction.type === "text"
            ? await requireApiClient(session).sendConversationTextMessage(
              conversationType,
              conversation.conversationId,
              retryAction.content,
              retryAction.replyToMessageId,
              conversationType === "group"
                ? extractMentions(retryAction.content, groupMembers, {
                    includeAll: canMentionAll,
                  })
                : [],
              { clientMsgId },
            )
            : await requireApiClient(session).sendConversationContactCardMessage(
              conversationType,
              conversation.conversationId,
              sanitizeContactCard(normalizeContactCard(retryAction.body.contactCard)),
              retryAction.replyToMessageId,
              { clientMsgId },
            );
          const sentMessage = replaceLocalMessageInCache(
            queryClient,
            session,
            conversation,
            localMessageId,
            retryAction.type,
            body,
            result,
          );
          runtime.log({
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
              messageKind: retryAction.type,
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
          void runtime.deleteOutboxRecord(localMessageId);
          void invalidateMessages(queryClient);
          scrollMessagesToBottom("smooth");
        } catch (error) {
          const failedAt = Date.now();
          const reason = formatError(error);
          runtime.log({
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
              messageKind: retryAction.type,
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
          void runtime.patchOutboxRecord(localMessageId, {
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
      canMentionAll,
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
        throw new Error("Select a regular IM conversation.");
      }
      const conversation = activeConversation;
      const conversationType = activeConversationType;
      const reply = replyTarget;
      const runtime = createChatSendRuntime({
        channel: "im",
        session,
        taskId: "P4-MSG-005C",
      });
      const { clientMsgId, createdAt, localMessageId } =
        runtime.createLocalIdentity("pc-local-text");
      recordMessageTraceEvent({
        clientMsgId,
        conversationId: conversation.conversationId,
        conversationType,
        owner: "im",
        route: "text-message",
        source: "use-message-text-send-controller",
        sourceChannel: "send",
        stage: "send.compose.submit",
        traceId: clientMsgId,
      });
      const body = withReplyBody({ text: content }, reply);
      const initialStatus = initialChatSendStatusForKind("text");
      const sendStartedAt = createdAt;
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
      runtime.log({
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
      recordMessageTraceEvent({
        clientMsgId,
        conversationId: conversation.conversationId,
        conversationType,
        messageId: localMessageId,
        owner: "im",
        route: "text-message",
        source: "use-message-text-send-controller",
        sourceChannel: "send",
        stage: "send.local_echo.written",
        traceId: clientMsgId,
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
      void runtime.upsertOutboxRecord({
        body,
        clientMsgId,
        createdAt: sendStartedAt,
        localMessageId,
        messageType: "text",
        status: initialStatus as SendOutboxStatus,
        targetId: conversation.conversationId,
        targetType: conversationType,
        updatedAt: sendStartedAt,
      });
      enqueueOutgoingTask(async () => {
        try {
          recordMessageTraceEvent({
            clientMsgId,
            conversationId: conversation.conversationId,
            conversationType,
            owner: "im",
            route: "text-message",
            source: "use-message-text-send-controller",
            sourceChannel: "send",
            stage: "send.http.start",
            traceId: clientMsgId,
          });
          const result = await requireApiClient(session).sendConversationTextMessage(
            conversationType,
            conversation.conversationId,
            content,
            reply?.messageId,
            conversationType === "group"
              ? extractMentions(content, groupMembers, { includeAll: canMentionAll })
              : [],
            { clientMsgId },
          );
          recordMessageTraceEvent({
            clientMsgId,
            conversationId: conversation.conversationId,
            conversationType,
            messageId: result.messageId,
            owner: "im",
            route: "text-message",
            serverSentAt: result.serverTime,
            source: "use-message-text-send-controller",
            sourceChannel: "send",
            stage: "send.http.done",
            traceId: clientMsgId,
          });
          const sentMessage = replaceLocalMessageInCache(
            queryClient,
            session,
            conversation,
            localMessageId,
            "text",
            body,
            result,
          );
          runtime.log({
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
          recordMessageTraceEvent({
            clientMsgId,
            conversationId: conversation.conversationId,
            conversationSeq: sentMessage.conversationSeq,
            conversationType,
            messageId: sentMessage.messageId,
            owner: "im",
            route: "text-message",
            serverSentAt: sentMessage.sentAt,
            source: "use-message-text-send-controller",
            sourceChannel: "send",
            stage: "send.server_ack.observed",
            traceId: clientMsgId,
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
          void runtime.deleteOutboxRecord(localMessageId);
          void invalidateMessages(queryClient);
          scrollMessagesToBottom("smooth");
        } catch (error) {
          const failedAt = Date.now();
          const reason = formatError(error);
          runtime.log({
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
          recordMessageTraceEvent({
            clientMsgId,
            conversationId: conversation.conversationId,
            conversationType,
            owner: "im",
            route: "text-message",
            source: "use-message-text-send-controller",
            sourceChannel: "send",
            stage: "send.http.failed",
            traceId: clientMsgId,
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
          void runtime.patchOutboxRecord(localMessageId, {
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
      canMentionAll,
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

  const sendContactCardOptimistically = useCallback(
    (card: NormalizedContactCard) => {
      if (!session || !activeConversation || !activeConversationType) {
        throw new Error("Select a regular IM conversation.");
      }
      if (!card.userId) {
        throw new Error("This contact card is missing a user ID and cannot be sent right now.");
      }
      const conversation = activeConversation;
      const conversationType = activeConversationType;
      const reply = replyTarget;
      const runtime = createChatSendRuntime({
        channel: "im",
        session,
        taskId: "P24-CONTACT-001",
      });
      const { clientMsgId, createdAt, localMessageId } =
        runtime.createLocalIdentity("pc-local-card");
      const body = withReplyBody(contactCardMessageBody(card), reply);
      const initialStatus = initialChatSendStatusForKind("text");
      const sendStartedAt = createdAt;
      const localMessage = appendLocalMessage(
        queryClient,
        session,
        conversation,
        "contact_card",
        body,
        {
          messageId: localMessageId,
          conversationId: conversation.conversationId,
          serverTime: currentIsoTimestamp(),
        },
        { status: initialStatus, localSendStartedAt: sendStartedAt },
      );
      runtime.log({
        phase: "local_echo",
        result: "ok",
        action: "enqueue_contact_card",
        to: initialStatus,
        context: {
          conversationId: conversation.conversationId,
          conversationType,
          localMessageId,
          messageKind: "contact_card",
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
      void runtime.upsertOutboxRecord({
        body,
        clientMsgId,
        createdAt: sendStartedAt,
        localMessageId,
        messageType: "contact_card",
        status: initialStatus as SendOutboxStatus,
        targetId: conversation.conversationId,
        targetType: conversationType,
        updatedAt: sendStartedAt,
      });
      enqueueOutgoingTask(async () => {
        try {
          const result = await requireApiClient(session).sendConversationContactCardMessage(
            conversationType,
            conversation.conversationId,
            sanitizeContactCard(card),
            reply?.messageId,
            { clientMsgId },
          );
          const sentMessage = replaceLocalMessageInCache(
            queryClient,
            session,
            conversation,
            localMessageId,
            "contact_card",
            body,
            result,
          );
          runtime.log({
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
              messageKind: "contact_card",
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
          void runtime.deleteOutboxRecord(localMessageId);
          void invalidateMessages(queryClient);
          scrollMessagesToBottom("smooth");
        } catch (error) {
          const failedAt = Date.now();
          const reason = formatError(error);
          runtime.log({
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
              messageKind: "contact_card",
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
          void runtime.patchOutboxRecord(localMessageId, {
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
    sendContactCardOptimistically,
    sendTextOptimistically,
  };
}
