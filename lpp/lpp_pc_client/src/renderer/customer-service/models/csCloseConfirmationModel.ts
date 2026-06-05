import type { CustomerServiceThreadAction } from "../../data/customer-service/cs-action-service";
import type { MessageItemDto } from "../../data/api/types";

export interface CustomerServiceCloseConfirmationText {
  key: string;
  params?: Record<string, string | number>;
}

export interface CustomerServiceCloseConfirmation {
  confirmLabel: CustomerServiceCloseConfirmationText;
  detail: CustomerServiceCloseConfirmationText;
  riskText: CustomerServiceCloseConfirmationText;
  title: CustomerServiceCloseConfirmationText;
  warningText: CustomerServiceCloseConfirmationText | null;
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
    confirmLabel: { key: "customerService.closeConfirm.confirm" },
    detail: { key: "customerService.closeConfirm.detail" },
    riskText: { key: "customerService.closeConfirm.risk" },
    title: {
      key: "customerService.closeConfirm.title",
      params: { customer: customerTitle || "customerService.workspace.currentCustomer" },
    },
    warningText:
      pendingMessageCount > 0
        ? {
            key: "customerService.closeConfirm.pendingWarning",
            params: { count: pendingMessageCount },
          }
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
