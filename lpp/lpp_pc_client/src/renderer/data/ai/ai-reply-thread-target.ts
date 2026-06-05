import type {
  ConversationListItem,
  CustomerServiceThread,
  CustomerServiceThreadType,
  StaffServiceHistoryItem,
} from "../api-client";

export type AiReplySourceModule = "messages" | "onlineService";

export type AiReplyThreadTarget = {
  conversationId?: string;
  disabledReason?: string;
  sourceModule: AiReplySourceModule;
  threadId?: string;
  threadTitle: string;
  threadType?: CustomerServiceThreadType;
};

export function aiReplyTargetForServiceThread(
  thread: CustomerServiceThread | null | undefined,
  fallbackTitle = "当前会话",
): AiReplyThreadTarget {
  if (!thread?.threadId) {
    return {
      disabledReason: "请选择可接待的客服会话后再使用 AI 草稿。",
      sourceModule: "onlineService",
      threadTitle: fallbackTitle,
    };
  }
  return {
    conversationId: thread.conversationId,
    sourceModule: "onlineService",
    threadId: thread.threadId,
    threadTitle: thread.title || fallbackTitle,
    threadType: thread.threadType,
  };
}

export function aiReplyTargetForDirectConversation({
  conversation,
  historyItems,
  title,
}: {
  conversation: ConversationListItem | null | undefined;
  historyItems: StaffServiceHistoryItem[];
  title: string;
}): AiReplyThreadTarget {
  if (!conversation?.conversationId) {
    return {
      disabledReason: "请选择私聊会话后再使用 AI 草稿。",
      sourceModule: "messages",
      threadTitle: title || "当前会话",
    };
  }

  const thread = historyItems.find((item) =>
    isMatchingDirectServiceThread(item, conversation.conversationId),
  );
  if (!thread?.threadId) {
    return {
      conversationId: conversation.conversationId,
      disabledReason: "当前私聊尚未形成客服接待线程，无法生成客服 AI 草稿。",
      sourceModule: "messages",
      threadTitle: title || conversation.title || "当前会话",
      threadType: "im_direct",
    };
  }

  return {
    conversationId: conversation.conversationId,
    sourceModule: "messages",
    threadId: thread.threadId,
    threadTitle: title || thread.title || conversation.title || "当前会话",
    threadType: "im_direct",
  };
}

function isMatchingDirectServiceThread(
  item: StaffServiceHistoryItem,
  conversationId: string,
) {
  return (
    normalizeThreadType(item.threadType) === "im_direct" &&
    (item.conversationId === conversationId || item.threadId === conversationId)
  );
}

function normalizeThreadType(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase().replace(/-/g, "_");
  if (normalized === "direct" || normalized === "direct_customer") return "im_direct";
  return normalized;
}
