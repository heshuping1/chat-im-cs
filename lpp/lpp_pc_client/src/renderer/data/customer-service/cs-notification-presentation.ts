import type { CustomerServiceThread, MessageItemDto } from "../api/types";

export interface CustomerServiceNotificationInput {
  fallbackTitle?: string;
  message?: MessageItemDto;
  payload?: Record<string, unknown>;
  thread?: Partial<CustomerServiceThread>;
}

export interface CustomerServiceNotificationPresentation {
  avatarLabel: string;
  avatarUrl?: string | null;
  body: string;
  preview: string;
  senderLabel?: string;
  targetId?: string;
  title: string;
}

export function buildCustomerServiceNotificationPresentation({
  fallbackTitle,
  message,
  payload,
  thread,
}: CustomerServiceNotificationInput): CustomerServiceNotificationPresentation {
  const payloadThread = recordValue(payload?.thread);
  const title =
    nonEmpty(fallbackTitle) ||
    nonEmpty(thread?.title) ||
    stringField(payloadThread, "title", "customerName", "visitorName") ||
    stringField(payload, "threadTitle", "customerName", "visitorName", "title") ||
    "在线客服新消息";
  const senderLabel =
    stringField(payload, "senderDisplayName", "senderName", "fromName", "visitorName", "customerName") ||
    nonEmpty(message?.senderDisplayName) ||
    (isIncomingMessage(message) ? "访客" : undefined);
  const preview = customerServiceNotificationPreview(message, payload);
  const sourceAvatarUrl =
    stringField(thread, "groupAvatarUrl", "groupIconUrl", "sourceAvatarUrl", "sourceIconUrl") ||
    stringField(payloadThread, "groupAvatarUrl", "groupIconUrl", "sourceAvatarUrl", "sourceIconUrl") ||
    stringField(payload, "groupAvatarUrl", "groupIconUrl", "sourceAvatarUrl", "sourceIconUrl") ||
    nonEmpty(thread?.avatarUrl);
  const senderAvatarUrl =
    nonEmpty(message?.senderAvatarUrl) ||
    nonEmpty(message?.avatarUrl) ||
    nonEmpty(thread?.customerAvatarUrl) ||
    stringField(payloadThread, "customerAvatarUrl", "avatarUrl") ||
    stringField(payload, "customerAvatarUrl", "senderAvatarUrl", "avatarUrl") ||
    null;
  const avatarUrl = sourceAvatarUrl || senderAvatarUrl || null;
  const targetId =
    nonEmpty(thread?.threadId) ||
    nonEmpty(thread?.conversationId) ||
    stringField(payload, "threadId", "sessionId") ||
    nonEmpty(message?.conversationId);

  return {
    avatarLabel: avatarLabel(title),
    avatarUrl,
    body: senderLabel ? `${senderLabel}: ${preview}` : preview,
    preview,
    senderLabel,
    targetId,
    title,
  };
}

export function customerServiceNotificationPreview(
  message?: MessageItemDto,
  payload?: Record<string, unknown>,
) {
  const messageType = normalizeMessageType(
    message?.messageType ||
      stringField(message?.body, "messageType", "type") ||
      stringField(payload, "messageType", "type"),
  );
  if (messageType === "image") return "[图片]";
  if (messageType === "video") return "[视频]";
  if (messageType === "file") return "[文件]";
  if (message?.preview?.trim()) return message.preview.trim();
  const text =
    stringField(message?.body, "text", "content", "message") ||
    stringField(payload, "text", "content", "message", "preview");
  return text || "[消息]";
}

function avatarLabel(title: string) {
  const compact = title.trim();
  if (!compact) return "C";
  return Array.from(compact)[0] ?? "C";
}

function isIncomingMessage(message?: MessageItemDto) {
  if (!message) return true;
  if (message.isSelf || message.isMine) return false;
  const direction = message.direction?.trim().toLowerCase();
  return direction !== "out" && direction !== "outgoing";
}

function normalizeMessageType(value?: string) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized.includes("image") || normalized.includes("photo")) return "image";
  if (normalized.includes("video")) return "video";
  if (normalized.includes("file") || normalized.includes("attachment")) return "file";
  return "text";
}

function nonEmpty(value?: string | null) {
  const text = value?.trim();
  return text || undefined;
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function stringField(source: unknown, ...keys: string[]) {
  const record = recordValue(source);
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}
