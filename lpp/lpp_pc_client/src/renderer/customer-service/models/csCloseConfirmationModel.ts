import type { CustomerServiceThreadAction } from "../../data/customer-service/cs-action-service";
import type { MessageItemDto } from "../../data/api/types";

export interface CustomerServiceCloseConfirmation {
  confirmLabel: string;
  detail: string;
  riskText: string;
  title: string;
  warningText: string | null;
}

export interface CustomerServiceCloseConfirmationInput {
  customerTitle: string;
  pendingMessageCount: number;
}

export function shouldConfirmCustomerServiceCloseAction(
  action: CustomerServiceThreadAction,
) {
  return action === "close";
}

export function createCustomerServiceCloseConfirmation({
  customerTitle,
  pendingMessageCount,
}: CustomerServiceCloseConfirmationInput): CustomerServiceCloseConfirmation {
  return {
    confirmLabel: "确认关闭",
    detail: "关闭后，本次服务会话将进入历史记录，输入区会变为只读。",
    riskText: "访客后续再次咨询时，将按服务端规则重新排队或生成新的客服线程。",
    title: `关闭「${customerTitle || "当前客户"}」的会话？`,
    warningText:
      pendingMessageCount > 0
        ? `当前还有 ${pendingMessageCount} 条消息未完成发送，建议处理后再关闭。`
        : null,
  };
}

export function countPendingCustomerServiceCloseMessages(
  messages: Pick<MessageItemDto, "status">[],
) {
  return messages.filter((message) =>
    ["failed", "queued", "sending", "uploading", "paused"].includes(
      (message.status ?? "").trim().toLowerCase(),
    ),
  ).length;
}
