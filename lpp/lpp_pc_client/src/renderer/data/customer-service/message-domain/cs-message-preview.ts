import type { CustomerServiceMessage } from "./cs-message-types";

export function isGenericCustomerServicePreview(value: unknown) {
  const preview = stringValue(value);
  if (!preview) return false;
  const normalized = preview.toLowerCase();
  return normalized === "[message]" || preview === "[\u6d88\u606f]";
}

export function isMeaningfulCustomerServicePreview(value: unknown) {
  const preview = stringValue(value);
  return Boolean(preview && !isGenericCustomerServicePreview(preview));
}

export function customerServicePreviewFromMessage(message: CustomerServiceMessage) {
  if (isMeaningfulCustomerServicePreview(message.preview)) return stringValue(message.preview);
  return customerServicePreviewFromBody(message.messageType, message.body ?? {});
}

export function customerServicePreviewFromBody(
  messageType: unknown,
  body: Record<string, unknown>,
) {
  const type = normalizeCustomerServiceMessageType(messageType, body);
  if (type === "text") {
    const text = stringValue(body.text);
    return text || undefined;
  }
  if (type === "image") return "[\u56fe\u7247]";
  if (type === "video") return "[\u89c6\u9891]";
  if (type === "file") return "[\u6587\u4ef6]";
  return undefined;
}

export function normalizeCustomerServiceMessageType(
  messageType: unknown,
  body: Record<string, unknown> = {},
) {
  const type = String(messageType ?? "").trim().toLowerCase();
  if (type === "image" || body.image) return "image";
  if (type === "video" || body.video) return "video";
  if (type === "file" || body.file) return "file";
  return "text";
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
