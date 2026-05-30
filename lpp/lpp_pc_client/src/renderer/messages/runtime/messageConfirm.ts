export type MessageDangerConfirmAction =
  | "recall-message"
  | "delete-message"
  | "delete-conversation"
  | "batch-delete-messages";

export function requestMessageDangerConfirmation({
  action,
  count,
}: {
  action: MessageDangerConfirmAction;
  count?: number;
}) {
  return window.confirm(messageDangerConfirmationText(action, count));
}

export function messageDangerConfirmationText(
  action: MessageDangerConfirmAction,
  count?: number,
) {
  if (action === "recall-message") return "确定撤回这条消息吗？";
  if (action === "delete-message") {
    return "确定删除这条消息吗？删除后将从当前会话移除。";
  }
  if (action === "delete-conversation") {
    return "删除会话后将从当前 PC 列表隐藏。服务端持久化删除需要接口支持，确定继续吗？";
  }
  return `确定删除已选的 ${count ?? 0} 条消息吗？`;
}
