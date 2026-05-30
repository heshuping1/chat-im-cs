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
  initialChatSendStatusForKind,
  logChatSendDiagnostic,
} from "../../data/send/send-state-machine";
import { currentIsoTimestamp, formatError } from "../../lib/format";
import {
  appendLocalMessage,
  invalidateMessages,
  markLocalMessageFailed,
  markLocalOutgoingMessageFailed,
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
  return useCallback(
    (content: string) => {
      if (!session || !activeConversation || !activeConversationType) {
        throw new Error("请选择一个普通 IM 会话");
      }
      const conversation = activeConversation;
      const conversationType = activeConversationType;
      const reply = replyTarget;
      const localMessageId = `pc-local-text-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const body = withReplyBody({ text: content }, reply);
      const initialStatus = initialChatSendStatusForKind("text");
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
        { status: initialStatus },
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
      enqueueOutgoingTask(async () => {
        try {
          const result = await requireApiClient(session).sendConversationTextMessage(
            conversationType,
            conversation.conversationId,
            content,
            reply?.messageId,
            conversationType === "group" ? extractMentions(content, groupMembers) : [],
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
          void invalidateMessages(queryClient);
          scrollMessagesToBottom("smooth");
        } catch (error) {
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
            context: {
              conversationId: conversation.conversationId,
              conversationType,
              localMessageId,
              messageKind: "text",
            },
          });
          markLocalMessageFailed(
            queryClient,
            session,
            conversation,
            localMessageId,
            reason,
          );
          setLocalOutgoingMessagesByConversation((current) =>
            markLocalOutgoingMessageFailed(
              current,
              conversationType,
              conversation.conversationId,
              localMessageId,
              reason,
            ),
          );
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
}
