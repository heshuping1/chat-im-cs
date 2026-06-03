import type { MessageItemDto } from "../../data/api-client";
import { normalizeMessageType } from "../../data/im-message-normalize";
import { extractMessageText } from "../../messages/models/messageDisplayModel";

export interface AutoTranslateCandidate {
  message: MessageItemDto;
  taskKey: string;
  text: string;
}

export function autoTranslateTargetLanguage(language: unknown) {
  if (language === "English") return "en-US";
  if (language === "العربية") return "ar";
  return "zh-CN";
}

export function selectAutoTranslateMessages({
  activeTaskKeys,
  annotations,
  conversationKey,
  isMineMessage,
  messages,
}: {
  activeTaskKeys: Set<string>;
  annotations: Record<string, string | undefined>;
  conversationKey: string;
  isMineMessage: (message: MessageItemDto) => boolean;
  messages: MessageItemDto[];
}): AutoTranslateCandidate[] {
  const candidates: AutoTranslateCandidate[] = [];
  for (const message of messages) {
    const candidate = autoTranslateCandidate({
      activeTaskKeys,
      annotation: message.messageId ? annotations[message.messageId] : undefined,
      conversationKey,
      isMine: isMineMessage(message),
      message,
    });
    if (candidate) candidates.push(candidate);
  }
  return candidates;
}

export function autoTranslateCandidate({
  activeTaskKeys,
  annotation,
  conversationKey,
  isMine,
  message,
}: {
  activeTaskKeys: Set<string>;
  annotation?: string;
  conversationKey: string;
  isMine: boolean;
  message: MessageItemDto;
}): AutoTranslateCandidate | null {
  if (isMine) return null;
  if (!isAutoTranslatableMessageType(message)) return null;
  const text = extractMessageText(message)?.trim();
  if (!text) return null;
  const taskKey = autoTranslateTaskKey(conversationKey, message, text);
  if (activeTaskKeys.has(taskKey)) return null;
  if (annotation?.startsWith("译文：")) return null;
  return {
    message,
    taskKey,
    text,
  };
}

export function autoTranslateTaskKey(
  conversationKey: string,
  message: MessageItemDto,
  text: string,
) {
  const messageKey =
    message.messageId ||
    `${message.sentAt ?? "no-time"}:${text.slice(0, 48)}`;
  return `${conversationKey}::${messageKey}`;
}

export function translationAnnotationText(
  state: "loading" | "success" | "empty" | "failed",
  text = "",
) {
  if (state === "loading") return "译文：翻译中...";
  if (state === "success") return `译文：${text.trim()}`;
  if (state === "empty") return "译文：翻译服务未返回内容";
  return "译文：翻译失败，请稍后重试";
}

function isAutoTranslatableMessageType(message: MessageItemDto) {
  const type = normalizeMessageType(message);
  if (type === "text" || type === "markdown") return true;
  if (type) return false;
  return Boolean(extractMessageText(message));
}
