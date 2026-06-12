import type { CustomerServiceThreadType } from "../api-client";

export const CUSTOMER_SERVICE_TYPING_PREVIEW_MAX_LENGTH = 500;

export interface CustomerServiceTypingPreviewEvent {
  threadId: string;
  threadType: CustomerServiceThreadType;
  aliasThreadIds?: string[];
  isTyping: boolean;
  hasPreviewText?: boolean;
  previewText?: string;
  senderRole?: string;
  senderUserId?: string;
  receivedAt: number;
}

export interface CustomerServiceTypingPreview {
  threadId: string;
  threadType: CustomerServiceThreadType;
  previewText: string;
  senderUserId?: string;
  receivedAt: number;
}

export type CustomerServiceTypingPreviewResult =
  | CustomerServiceTypingPreview
  | null
  | undefined;

export function reduceCustomerServiceTypingPreview(
  event: CustomerServiceTypingPreviewEvent,
): CustomerServiceTypingPreviewResult {
  if (!event.threadId) return undefined;
  if (isStaffTypingSender(event.senderRole)) return undefined;
  if (!event.isTyping) return null;
  const previewText = normalizeCustomerServiceTypingPreviewText(event.previewText);
  if (!previewText) return null;
  return {
    threadId: event.threadId,
    threadType: event.threadType,
    previewText,
    senderUserId: event.senderUserId,
    receivedAt: event.receivedAt,
  };
}

export function normalizeCustomerServiceTypingPreviewText(value?: string) {
  if (!value) return "";
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim()
    .slice(0, CUSTOMER_SERVICE_TYPING_PREVIEW_MAX_LENGTH);
}

function isStaffTypingSender(senderRole?: string) {
  const role = senderRole?.trim().toLowerCase().replace(/-/g, "_") ?? "";
  if (!role) return false;
  return ["staff", "agent", "operator", "customer_service", "service_staff", "kefu"].some(
    (marker) => role.includes(marker),
  );
}
