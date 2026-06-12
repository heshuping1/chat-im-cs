import type { CustomerServiceThread, MessageItemDto } from "../api/types";

export interface CustomerServiceThreadPreviewSnapshot {
  preview?: string;
  sentAt?: string | null;
}

export interface CustomerServiceThreadPreviewDetail {
  lastMessageAt?: string | null;
  lastMessagePreview?: string;
  messages?: MessageItemDto[];
}

export function isCustomerServicePlaceholderThreadPreview(value: unknown) {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return [
    "\u5f53\u524d\u6392\u961f",
    "\u6392\u961f\u7b2c",
    "\u8bf7\u7a0d\u5019",
    "\u6b22\u8fce\u54a8\u8be2\u5728\u7ebf\u5ba2\u670d",
    "\u6b22\u8fce\u54a8\u8be2",
    "currently queued",
    "in queue",
    "please wait",
    "welcome to online customer service",
  ].some((token) => normalized.includes(token));
}

export function threadPreviewFromCustomerServiceDetail(
  detail?: CustomerServiceThreadPreviewDetail | null,
): CustomerServiceThreadPreviewSnapshot {
  if (!detail) return {};
  const messages = detail.messages ?? [];
  const latest = latestThreadMessage(messages);
  const latestNonPlaceholder = latestThreadMessage(
    messages.filter((message) => {
      const preview = previewFromThreadMessage(message);
      return Boolean(preview && !isCustomerServicePlaceholderThreadPreview(preview));
    }),
  );
  const detailPreview =
    detail.lastMessagePreview &&
    !isCustomerServicePlaceholderThreadPreview(detail.lastMessagePreview)
      ? detail.lastMessagePreview
      : undefined;
  const previewMessage = latestNonPlaceholder ?? latest;
  return {
    preview: detailPreview || previewFromThreadMessage(previewMessage),
    sentAt: detail.lastMessageAt || previewMessage?.sentAt || latest?.sentAt || null,
  };
}

export function shouldHydrateCustomerServiceThreadPreview(
  thread: Pick<CustomerServiceThread, "lastMessagePreview" | "threadId">,
) {
  return Boolean(
    thread.threadId &&
      (!thread.lastMessagePreview ||
        isCustomerServicePlaceholderThreadPreview(thread.lastMessagePreview)),
  );
}

export function selectCustomerServiceThreadCardPreview(
  listPreview?: string | null,
  hydratedPreview?: string | null,
) {
  const normalizedListPreview = listPreview?.trim();
  const normalizedHydratedPreview = hydratedPreview?.trim();
  if (
    normalizedHydratedPreview &&
    (!normalizedListPreview ||
      isCustomerServicePlaceholderThreadPreview(normalizedListPreview))
  ) {
    return normalizedHydratedPreview;
  }
  return normalizedListPreview || normalizedHydratedPreview || "";
}

function latestThreadMessage(messages: MessageItemDto[]) {
  return [...messages].sort((left, right) => {
    const leftSeq = Number(left.conversationSeq ?? 0);
    const rightSeq = Number(right.conversationSeq ?? 0);
    if (leftSeq !== rightSeq) return rightSeq - leftSeq;
    return timestampMs(right.sentAt) - timestampMs(left.sentAt);
  })[0];
}

function previewFromThreadMessage(message?: MessageItemDto) {
  if (!message) return undefined;
  if (message.preview?.trim()) return message.preview.trim();
  const text = message.body?.text;
  return typeof text === "string" && text.trim() ? text.trim() : undefined;
}

function timestampMs(value?: string | null) {
  const timestamp = Date.parse(value ?? "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}
