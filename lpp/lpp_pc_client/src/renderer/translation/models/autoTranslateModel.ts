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
  if (language === "\u65e5\u672c\u8a9e") return "ja-JP";
  if (language === "Ti\u1ebfng Vi\u1ec7t") return "vi-VN";
  if (language === "\u0e44\u0e17\u0e22") return "th-TH";
  if (language === "\u7e41\u9ad4\u4e2d\u6587") return "zh-TW";
  if (language === "\u0627\u0644\u0639\u0631\u0628\u064a\u0629") return "ar";
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
  if (isTranslationAnnotation(annotation)) return null;
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

function isTranslationAnnotation(annotation?: string) {
  return Boolean(
    annotation?.startsWith("Translation:") ||
      annotation?.startsWith("\u8bd1\u6587\uff1a") ||
      annotation?.startsWith("\u8b6f\u6587\uff1a"),
  );
}
