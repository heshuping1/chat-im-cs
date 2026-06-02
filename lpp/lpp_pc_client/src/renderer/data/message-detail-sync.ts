import type { MessageItemDto } from "./api/types";

export type MessageDetailSyncReason =
  | "summary-seq-ahead"
  | "summary-message-id-missing"
  | "summary-time-ahead"
  | "summary-preview-missing";

export interface MessageDetailSyncTarget {
  targetId?: string | null;
  targetType?: string | null;
  alternateTargetIds?: Array<string | null | undefined>;
  lastMessageSeq?: number | null;
  lastMessageId?: string | null;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
}

export interface MessageDetailSyncDecision {
  needsSync: boolean;
  reason?: MessageDetailSyncReason;
  syncKey?: string;
}

export function evaluateMessageDetailSync(input: {
  messages?: MessageItemDto[] | null;
  target?: MessageDetailSyncTarget | null;
}): MessageDetailSyncDecision {
  const targetId = normalizeText(input.target?.targetId);
  if (!targetId) return { needsSync: false };

  const messages = input.messages ?? [];
  const targetType = normalizeText(input.target?.targetType) || "conversation";
  const targetPrefix = `${targetType}:${targetId}`;
  const targetIds = [
    targetId,
    ...(input.target?.alternateTargetIds ?? []).map(normalizeText),
  ].filter(Boolean);
  const targetSeq = normalizeSeq(input.target?.lastMessageSeq);
  const targetMessageId = normalizeText(input.target?.lastMessageId);
  const targetAt = timestamp(input.target?.lastMessageAt);
  const targetPreview = normalizeText(input.target?.lastMessagePreview);

  if (targetSeq > 0) {
    const currentMaxSeq = maxConversationSeq(messages, targetIds);
    if (targetSeq > currentMaxSeq) {
      return sync("summary-seq-ahead", `${targetPrefix}:seq:${targetSeq}`);
    }
  }

  if (targetMessageId && !messages.some((message) => message.messageId === targetMessageId)) {
    return sync("summary-message-id-missing", `${targetPrefix}:id:${targetMessageId}`);
  }

  if (targetSeq > 0 || targetMessageId) return { needsSync: false };

  const latest = latestMessage(messages, targetIds);
  if (!latest && (targetAt > 0 || targetPreview)) {
    return sync(
      targetAt > 0 ? "summary-time-ahead" : "summary-preview-missing",
      `${targetPrefix}:fallback:${input.target?.lastMessageAt ?? ""}:${targetPreview}`,
    );
  }

  const latestAt = timestamp(latest?.sentAt);
  if (targetAt > 0 && targetAt > latestAt) {
    return sync("summary-time-ahead", `${targetPrefix}:at:${input.target?.lastMessageAt}`);
  }

  if (
    targetPreview &&
    latestAt === 0 &&
    !messages.some((message) => normalizeText(message.preview) === targetPreview)
  ) {
    return sync("summary-preview-missing", `${targetPrefix}:preview:${targetPreview}`);
  }

  return { needsSync: false };
}

function sync(reason: MessageDetailSyncReason, syncKey: string): MessageDetailSyncDecision {
  return { needsSync: true, reason, syncKey };
}

function maxConversationSeq(messages: MessageItemDto[], targetIds: string[]) {
  return messages.reduce((max, message) => {
    if (!belongsToTarget(message, targetIds)) return max;
    return Math.max(max, normalizeSeq(message.conversationSeq));
  }, 0);
}

function latestMessage(messages: MessageItemDto[], targetIds: string[]) {
  return [...messages]
    .filter((message) => belongsToTarget(message, targetIds))
    .sort((left, right) => {
      const leftSeq = normalizeSeq(left.conversationSeq);
      const rightSeq = normalizeSeq(right.conversationSeq);
      if (leftSeq !== rightSeq) return leftSeq - rightSeq;
      return timestamp(left.sentAt) - timestamp(right.sentAt);
    })
    .at(-1);
}

function belongsToTarget(message: MessageItemDto, targetIds: string[]) {
  return !message.conversationId || targetIds.includes(message.conversationId);
}

function normalizeSeq(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.max(0, Math.floor(numberValue)) : 0;
}

function timestamp(value: unknown) {
  if (typeof value !== "string") return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeText(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}
