import type {
  CustomerServiceThread,
  MessageItemDto,
} from "../api/types";
import type { CurrentUserIdentity } from "../message-display";

export type CustomerServiceCacheMessageKind = "text" | "image" | "video" | "file";

export function customerServiceMessageFromSendResult(params: {
  thread: CustomerServiceThread;
  result: {
    messageId?: string;
    conversationSeq?: number;
    sentAt?: string;
    serverTime?: string;
    message?: MessageItemDto;
  };
  messageType: CustomerServiceCacheMessageKind;
  body: Record<string, unknown>;
  clientMsgId?: string;
  identity?: CurrentUserIdentity | null;
}): MessageItemDto {
  const fallbackBody = bodyWithMessageType(params.messageType, params.body);
  const fallbackPreview = previewFromComposerBody(params.messageType, params.body);
  if (params.result.message) {
    const serverType = normalizeCustomerServiceCacheMessageKind(
      params.result.message.messageType || params.messageType,
    );
    const body = hasMeaningfulComposerBody(serverType, params.result.message.body)
      ? bodyWithMessageType(serverType, params.result.message.body ?? {})
      : bodyWithMessageType(serverType, params.body);
    const serverPreview = params.result.message.preview?.trim();
    const preview =
      serverPreview && !isGenericMessagePreview(serverPreview)
        ? serverPreview
        : previewFromComposerBody(serverType, body) || fallbackPreview;
    return {
      ...params.result.message,
      ...(params.clientMsgId && !params.result.message.clientMsgId
        ? { clientMsgId: params.clientMsgId }
        : {}),
      conversationId:
        params.result.message.conversationId ||
        params.thread.conversationId ||
        params.thread.threadId,
      messageType: params.result.message.messageType || serverType,
      body,
      preview,
      isSelf: true,
      direction: params.result.message.direction || "out",
    };
  }
  return {
    messageId:
      params.result.messageId ||
      `pc-cs-local-${params.thread.threadId}-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}`,
    ...(params.clientMsgId ? { clientMsgId: params.clientMsgId } : {}),
    conversationId: params.thread.conversationId || params.thread.threadId,
    conversationSeq: params.result.conversationSeq,
    senderUserId: params.identity?.userId || undefined,
    senderId: params.identity?.userId || undefined,
    senderPlatformUserId: params.identity?.platformUserId || undefined,
    senderLppId: params.identity?.lppId || undefined,
    senderDisplayName: params.identity?.displayName || "Me",
    senderAvatarUrl:
      typeof (params.identity as { avatarUrl?: unknown } | null | undefined)?.avatarUrl ===
      "string"
        ? ((params.identity as { avatarUrl?: string }).avatarUrl ?? null)
        : null,
    messageType: params.messageType,
    body: fallbackBody,
    preview: fallbackPreview,
    sentAt: params.result.sentAt || params.result.serverTime || new Date().toISOString(),
    isSelf: true,
    direction: "out",
  };
}

export function latestCustomerServiceMessage(messages: MessageItemDto[]) {
  return [...messages].sort(compareCustomerServiceMessagesAscending).at(-1);
}

export function compareCustomerServiceMessagesAscending(
  left: MessageItemDto,
  right: MessageItemDto,
) {
  const leftSeq = positiveSeq(left.conversationSeq);
  const rightSeq = positiveSeq(right.conversationSeq);
  if (leftSeq !== undefined && rightSeq !== undefined && leftSeq !== rightSeq) {
    return leftSeq - rightSeq;
  }

  const leftTime = timestamp(left.sentAt);
  const rightTime = timestamp(right.sentAt);
  if (leftTime !== undefined && rightTime !== undefined && leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  if (leftSeq !== undefined && rightSeq === undefined) return -1;
  if (leftSeq === undefined && rightSeq !== undefined) return 1;
  return 0;
}

export function customerServiceMessageIdentity(message: MessageItemDto) {
  return (
    message.messageId ||
    [
      message.conversationId ?? "",
      message.conversationSeq ?? "",
      message.sentAt ?? "",
      previewFromCustomerServiceMessage(message) ?? "",
    ].join("|")
  );
}

export function previewFromCustomerServiceMessage(message?: MessageItemDto) {
  if (!message) return undefined;
  if (message.preview?.trim()) return message.preview.trim();
  return previewFromComposerBody(
    normalizeCustomerServiceCacheMessageKind(message.messageType),
    message.body ?? {},
  );
}

function previewFromComposerBody(
  messageType: CustomerServiceCacheMessageKind,
  body: Record<string, unknown>,
) {
  if (messageType === "text") {
    const text = body.text;
    return typeof text === "string" ? text : "";
  }
  if (messageType === "image") return "[图片]";
  if (messageType === "video") return "[视频]";
  if (messageType === "file") return "[文件]";
  return "[消息]";
}

function bodyWithMessageType(
  messageType: CustomerServiceCacheMessageKind,
  body: Record<string, unknown>,
) {
  return { ...body, messageType };
}

function hasMeaningfulComposerBody(
  messageType: CustomerServiceCacheMessageKind,
  body: Record<string, unknown> | undefined,
) {
  if (!body) return false;
  if (messageType === "text") {
    return typeof body.text === "string" && Boolean(body.text.trim());
  }
  return Boolean(body[messageType]);
}

function isGenericMessagePreview(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized === "[message]" || normalized === "[消息]";
}

function normalizeCustomerServiceCacheMessageKind(
  messageType?: string,
): CustomerServiceCacheMessageKind {
  const normalized = String(messageType ?? "").trim().toLowerCase();
  if (normalized === "image") return "image";
  if (normalized === "video") return "video";
  if (normalized === "file") return "file";
  return "text";
}

function positiveSeq(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return undefined;
  const normalized = Math.floor(number);
  return normalized > 0 ? normalized : undefined;
}

function timestamp(value: unknown) {
  if (typeof value !== "string") return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
