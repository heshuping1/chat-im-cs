import type { CustomerServiceThreadType } from "../api-client";

export const CUSTOMER_SERVICE_TYPING_PREVIEW_TTL_MS = 5_000;
export const CUSTOMER_SERVICE_TYPING_PREVIEW_MAX_LENGTH = 500;

export interface CustomerServiceTypingPreviewEvent {
  threadId: string;
  threadType: CustomerServiceThreadType;
  isTyping: boolean;
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
  expiresAt: number;
}

export type CustomerServiceTypingPreviewResult =
  | CustomerServiceTypingPreview
  | null
  | undefined;

export function reduceCustomerServiceTypingPreview(
  event: CustomerServiceTypingPreviewEvent,
  now = Date.now(),
): CustomerServiceTypingPreviewResult {
  if (!event.threadId) return undefined;
  if (isStaffTypingSender(event.senderRole)) return undefined;
  if (!event.isTyping) return null;
  return {
    threadId: event.threadId,
    threadType: event.threadType,
    previewText: normalizeCustomerServiceTypingPreviewText(event.previewText),
    senderUserId: event.senderUserId,
    receivedAt: event.receivedAt,
    expiresAt: now + CUSTOMER_SERVICE_TYPING_PREVIEW_TTL_MS,
  };
}

export function isCustomerServiceTypingPreviewExpired(
  preview: CustomerServiceTypingPreview,
  now = Date.now(),
) {
  return preview.expiresAt <= now;
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
