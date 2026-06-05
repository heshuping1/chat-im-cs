export type MessageDangerConfirmAction =
  | "recall-message"
  | "delete-message"
  | "delete-conversation"
  | "batch-delete-messages"
  | "delete-friend"
  | "block-user";

export interface MessageConfirmDescriptor {
  key: string;
  params?: Record<string, string | number>;
}

export function requestMessageDangerConfirmation({
  action,
  count,
  message,
}: {
  action: MessageDangerConfirmAction;
  count?: number;
  message?: string;
}) {
  return window.confirm(message ?? messageDangerConfirmationFallback(action, count));
}

export function requestMessageCustomConfirmation(message: string) {
  return window.confirm(message);
}

export function messageDangerConfirmationDescriptor(
  action: MessageDangerConfirmAction,
  count?: number,
): MessageConfirmDescriptor {
  if (action === "recall-message") return { key: "messages.confirm.recallMessage" };
  if (action === "delete-message") return { key: "messages.confirm.deleteMessage" };
  if (action === "delete-conversation") return { key: "messages.confirm.deleteConversation" };
  if (action === "delete-friend") return { key: "messages.confirm.deleteFriend" };
  if (action === "block-user") return { key: "messages.confirm.blockUser" };
  return { key: "messages.confirm.batchDeleteMessages", params: { count: count ?? 0 } };
}

export function messageDangerConfirmationFallback(
  action: MessageDangerConfirmAction,
  count?: number,
) {
  if (action === "recall-message") return "确定撤回这条消息？";
  if (action === "delete-message") {
    return "确定删除这条消息？它会从当前会话中移除。";
  }
  if (action === "delete-conversation") {
    return "确定从当前 PC 会话列表删除这个会话？服务端持久化删除需要接口支持。";
  }
  if (action === "delete-friend") {
    return "确定删除这个好友？该联系人会从好友列表移除。";
  }
  if (action === "block-user") {
    return "确定把该用户加入黑名单？对方将无法与你正常互动。";
  }
  return `确定删除选中的 ${count ?? 0} 条消息？`;
}

export const messageDangerConfirmationText = messageDangerConfirmationFallback;
