import type { MediaResourceDto, MessageItemDto } from "../../data/api/types";
import type { ImMessageHydrationSource } from "../../data/message-store/im-message-store-hydration";
import { normalizeMessageType } from "../../data/im-message-normalize";
import {
  messageMediaFileName,
  shouldDisplayMessageMedia,
} from "../../media/domain/mediaMessage";

export type HistoryFilterKey =
  | "all"
  | "text"
  | "image"
  | "file"
  | "voice"
  | "video"
  | "link"
  | "favorite";

export interface MessageLookupScope {
  source: ImMessageHydrationSource;
  limitedToLoadedRange: boolean;
  labelKey: string;
}

export function createMessageLookupScope(
  source: ImMessageHydrationSource,
  options?: { localDatabaseSearch?: boolean },
): MessageLookupScope {
  if (options?.localDatabaseSearch) {
    return {
      source,
      limitedToLoadedRange: false,
      labelKey: "messages.listPanel.localDatabaseRange",
    };
  }
  if (source === "local") {
    return {
      source,
      limitedToLoadedRange: true,
      labelKey: "messages.listPanel.localRange",
    };
  }
  if (source === "hot") {
    return {
      source,
      limitedToLoadedRange: true,
      labelKey: "messages.listPanel.loadedRange",
    };
  }
  return {
    source,
    limitedToLoadedRange: false,
    labelKey: "messages.listPanel.syncedRange",
  };
}

export function filterVisibleMessages(messages: MessageItemDto[], keyword: string) {
  const normalized = keyword.trim().toLowerCase();
  const displayableMessages = messages.filter((message) => shouldDisplayMessageMedia(message));
  if (!normalized) return displayableMessages;
  return displayableMessages.filter((message) =>
    [
      message.preview,
      message.senderDisplayName,
      typeof message.body?.text === "string" ? message.body.text : "",
      mediaFileNameFromBody(message.body?.file),
      mediaFileNameFromBody(message.body?.image),
      mediaFileNameFromBody(message.body?.video),
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalized)),
  );
}

export function filterMessagesByHistory(
  messages: MessageItemDto[],
  filter: HistoryFilterKey,
) {
  const displayableMessages = messages.filter((message) => shouldDisplayMessageMedia(message));
  if (filter === "all") return displayableMessages;
  return displayableMessages.filter((message) => historyMessageMatches(message, filter));
}

export function getHistoryFilterCounts(messages: MessageItemDto[]) {
  const displayableMessages = messages.filter((message) => shouldDisplayMessageMedia(message));
  return historyFilterKeys.reduce(
    (counts, key) => ({
      ...counts,
      [key]:
        key === "all"
          ? displayableMessages.length
          : displayableMessages.filter((message) => historyMessageMatches(message, key)).length,
    }),
    {} as Record<HistoryFilterKey, number>,
  );
}

export function historyMessageMatches(message: MessageItemDto, filter: HistoryFilterKey) {
  const type = normalizeMessageType(message);
  const body = message.body ?? {};
  if (filter === "text") {
    return (
      type.includes("text") ||
      typeof body.text === "string" ||
      (!type && Boolean(message.preview))
    );
  }
  if (filter === "image") {
    return type.includes("image") || type.includes("video") || Boolean(body.image || body.video);
  }
  if (filter === "file") return type.includes("file") || Boolean(body.file);
  if (filter === "voice") {
    return type.includes("voice") || type.includes("audio") || Boolean(body.voice || body.audio);
  }
  if (filter === "video") return type.includes("video") || Boolean(body.video);
  if (filter === "link") return messageContainsLink(message);
  if (filter === "favorite") {
    const record = message as unknown as Record<string, unknown>;
    return Boolean(record.favoriteId || record.isFavorite || record.favoritedAt);
  }
  return true;
}

export function messageActionPreview(message: MessageItemDto) {
  const text = extractMessageText(message);
  if (text) return text.length > 60 ? `${text.slice(0, 60)}...` : text;
  const type = normalizeMessageType(message);
  if (type.includes("image") || message.body?.image) return "[图片]";
  if (type.includes("file") || message.body?.file) return messageMediaFileName(message) || "[文件]";
  if (type.includes("voice") || message.body?.voice || message.body?.audio) return "[语音]";
  if (type.includes("video") || message.body?.video) return "[视频]";
  if (type.includes("location") || message.body?.location) return "[位置]";
  if (
    type.includes("contact") ||
    message.body?.contact ||
    message.body?.contactCard ||
    message.body?.contact_card ||
    message.body?.nameCard ||
    message.body?.name_card ||
    message.body?.businessCard ||
    message.body?.business_card
  ) {
    return "[名片]";
  }
  return message.preview || "[消息]";
}

function messageContainsLink(message: MessageItemDto) {
  const values = [
    message.preview ?? "",
    typeof message.body?.text === "string" ? message.body.text : "",
    ...Object.values(message.body ?? {}).map((value) =>
      typeof value === "string" ? value : "",
    ),
  ];
  return values.some((value) => /https?:\/\//i.test(value));
}

function extractMessageText(message: MessageItemDto) {
  const body = message.body ?? {};
  if (typeof body.text === "string" && body.text.trim()) return body.text.trim();
  if (typeof body.content === "string" && body.content.trim()) return body.content.trim();
  if (typeof body.message === "string" && body.message.trim()) return body.message.trim();
  if (typeof body.markdown === "string" && body.markdown.trim()) return body.markdown.trim();
  if (typeof body.markdownText === "string" && body.markdownText.trim()) {
    return body.markdownText.trim();
  }
  if (typeof body.caption === "string" && body.caption.trim()) return body.caption.trim();
  return undefined;
}

function mediaFileNameFromBody(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  return (value as MediaResourceDto).fileName ?? "";
}

const historyFilterKeys: HistoryFilterKey[] = [
  "all",
  "text",
  "image",
  "file",
  "voice",
  "link",
  "favorite",
];
