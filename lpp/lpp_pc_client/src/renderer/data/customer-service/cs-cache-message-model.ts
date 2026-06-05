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
  identity?: CurrentUserIdentity | null;
}): MessageItemDto {
  if (params.result.message) {
    return {
      ...params.result.message,
      conversationId:
        params.result.message.conversationId ||
        params.thread.conversationId ||
        params.thread.threadId,
      messageType: params.result.message.messageType || params.messageType,
      body: params.result.message.body ?? params.body,
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
    body: { ...params.body, messageType: params.messageType },
    preview: previewFromComposerBody(params.messageType, params.body),
    sentAt: params.result.sentAt || params.result.serverTime || new Date().toISOString(),
    isSelf: true,
    direction: "out",
  };
}

export function latestCustomerServiceMessage(messages: MessageItemDto[]) {
  return [...messages].sort((a, b) => {
    const seqA = a.conversationSeq ?? 0;
    const seqB = b.conversationSeq ?? 0;
    if (seqA !== seqB) return seqB - seqA;
    return Date.parse(b.sentAt ?? "") - Date.parse(a.sentAt ?? "");
  })[0];
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

function normalizeCustomerServiceCacheMessageKind(
  messageType?: string,
): CustomerServiceCacheMessageKind {
  const normalized = String(messageType ?? "").trim().toLowerCase();
  if (normalized === "image") return "image";
  if (normalized === "video") return "video";
  if (normalized === "file") return "file";
  return "text";
}
