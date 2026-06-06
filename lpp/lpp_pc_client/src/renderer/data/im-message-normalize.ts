import type { MediaResourceDto, MessageItemDto } from "./api/types";
import { renderWechatEmojiText } from "../lib/wechatEmoji";

export type NormalizedMessagePart =
  | { type: "text"; text: string }
  | { type: "markdown"; text: string }
  | { type: "image"; media?: MediaResourceDto }
  | { type: "file"; media?: MediaResourceDto }
  | { type: "voice"; media?: MediaResourceDto }
  | { type: "video"; media?: MediaResourceDto }
  | { type: "location"; value: Record<string, unknown> }
  | { type: "contact"; value: Record<string, unknown> }
  | { type: "call"; value: Record<string, unknown> }
  | { type: "event"; text: string };

const messageTypeLabels: Record<string, string> = {
  image: "图片",
  file: "文件",
  voice: "语音",
  audio: "语音",
  video: "视频",
  location: "位置",
  contact: "名片",
  contact_card: "名片",
  call_log: "通话记录",
  event: "系统消息",
  system: "系统消息",
};
const nestedBodyFields = ["parts", "bodies", "items", "contents", "messageBodies"] as const;
const textFields = ["text", "content", "message", "caption"] as const;
const mediaTextFields = ["text", "message", "caption"] as const;
const markdownFields = ["markdown", "markdownText"] as const;
const eventTextFields = ["eventText", "notice", "text", "content", "message"] as const;
const contactFields = [
  "contactCard",
  "contact_card",
  "contact",
  "card",
  "nameCard",
  "name_card",
  "businessCard",
  "business_card",
  "userCard",
  "user_card",
  "profileCard",
  "profile_card",
] as const;
const mediaBodyFields = {
  image: ["image", "images", "picture", "photo", "imageUrl", "image_url"],
  file: ["file", "files", "attachment", "attachments", "fileUrl", "file_url"],
  voice: ["voice", "audio", "audioUrl", "audio_url"],
  video: ["video", "videoUrl", "video_url"],
} as const;
const mediaTypeFallbacks = {
  image: ["image", "picture", "photo"],
  file: ["file", "attachment"],
  voice: ["voice", "audio"],
  video: ["video"],
} as const;
const mediaRecordFields = {
  url: [
    "url",
    "sourceUrl",
    "source_url",
    "contentUrl",
    "content_url",
    "resourceUrl",
    "resource_url",
    "mediaUrl",
    "media_url",
    "objectUrl",
    "object_url",
    "originalUrl",
    "original_url",
    "content",
    "fileUrl",
    "file_url",
    "filePath",
    "file_path",
    "uri",
    "path",
  ],
  signedUrl: ["signedUrl", "signed_url"],
  downloadUrl: ["downloadUrl", "download_url"],
  thumbnailUrl: [
    "thumbnailUrl",
    "thumbnail_url",
    "thumbUrl",
    "thumb_url",
    "previewUrl",
    "preview_url",
    "previewPath",
    "preview_path",
    "posterUrl",
    "poster_url",
    "coverUrl",
    "cover_url",
    "cover",
    "thumbnail",
  ],
  fileName: [
    "fileName",
    "file_name",
    "filename",
    "name",
    "originalName",
    "original_name",
    "originalFileName",
    "original_file_name",
  ],
  mimeType: ["mimeType", "mime_type", "contentType", "content_type", "mediaType", "media_type"],
} as const;
const numericMediaRecordFields = {
  sizeBytes: ["sizeBytes", "size", "fileSize"],
  durationSeconds: ["durationSeconds", "duration"],
} as const;
const mediaRecordIdFields = [
  "mediaId",
  "media_id",
  "resourceId",
  "resource_id",
  "fileId",
  "file_id",
] as const;
const mediaRecordThumbnailIdFields = [
  "thumbnailMediaId",
  "thumbnail_media_id",
  "thumbMediaId",
  "thumb_media_id",
  "posterMediaId",
  "poster_media_id",
  "coverMediaId",
  "cover_media_id",
] as const;

export function normalizeMessageItem(message: MessageItemDto): MessageItemDto {
  const messageType = normalizeMessageType(message);
  const body = normalizeMessageBody(message.body, messageType, message);
  const preview = renderWechatEmojiText(
    message.preview || messagePreviewFromBody(body, messageType) || "[Message]",
  );
  return {
    ...message,
    messageType: messageType || message.messageType,
    body,
    preview,
  };
}

export function normalizeMessageType(message: MessageItemDto | string | undefined) {
  const value =
    typeof message === "string"
      ? message
      : message?.messageType ||
        (typeof message?.body?.messageType === "string"
          ? message.body.messageType
          : undefined) ||
        (typeof message?.body?.type === "string" ? message.body.type : undefined);
  return normalizeType(value);
}

export function normalizeMessageBody(
  body?: Record<string, unknown>,
  messageType?: string,
  message?: MessageItemDto,
) {
  const normalizedType = normalizeType(messageType);
  const next = { ...(body ?? {}) };
  if (normalizedType && !next.messageType && !next.type) {
    next.messageType = normalizedType;
  }
  normalizeReplyIntoBody(next, message);
  normalizeMentionsIntoBody(next, message);
  return next;
}

export function normalizeMessageParts(message: MessageItemDto): NormalizedMessagePart[] {
  const body = normalizeMessageBody(message.body, normalizeMessageType(message));
  const parts: NormalizedMessagePart[] = [];
  const nestedBodies = nestedMessageBodies(body);

  if (nestedBodies.length > 0) {
    nestedBodies.forEach((item) => appendBodyParts(parts, item));
  } else {
    appendBodyParts(parts, body);
  }

  if (parts.length === 0 && normalizeMessageType(message) === "text" && message.preview) {
    parts.push({ type: "text", text: renderWechatEmojiText(message.preview) });
  }
  return parts;
}

export function messagePreviewFromBody(
  body?: Record<string, unknown>,
  messageType?: string,
) {
  const normalizedBody = normalizeMessageBody(body, messageType);
  const parts = normalizeMessageParts({
    messageId: "preview",
    body: normalizedBody,
    messageType,
  });
  const textPart = parts.find(
    (part): part is Extract<NormalizedMessagePart, { type: "text" | "markdown" | "event" }> =>
      part.type === "text" || part.type === "markdown" || part.type === "event",
  );
  if (textPart?.text) return renderWechatEmojiText(textPart.text);
  const partType = parts[0]?.type || inferMessageType(normalizedBody) || normalizeType(messageType);
  if (!partType) return "";
  if (partType === "text") return "";
  const label = messageTypeLabels[normalizeType(partType)];
  return label ? `[${label}]` : `暂不支持的消息类型：${partType}`;
}

export function inferMessageType(body: Record<string, unknown>) {
  if (body.image || body.images || body.picture || body.photo || body.imageUrl || body.image_url) {
    return "image";
  }
  if (body.file || body.files || body.attachment || body.attachments || body.fileUrl || body.file_url) {
    return "file";
  }
  if (body.voice || body.audio || body.audioUrl || body.audio_url) return "voice";
  if (body.video || body.videoUrl || body.video_url) return "video";
  if (body.location || body.locationMessage || body.location_message) return "location";
  if (contactRecord(body)) return "contact_card";
  if (body.callLog || body.call_log || body.call) return "call_log";
  if (body.event || body.eventText || body.notice) return "event";
  return "";
}

export function firstMessageMedia(message: MessageItemDto): MediaResourceDto | undefined {
  for (const part of normalizeMessageParts(message)) {
    if (
      part.type === "image" ||
      part.type === "file" ||
      part.type === "voice" ||
      part.type === "video"
    ) {
      return part.media;
    }
  }
  return undefined;
}

export function mediaFileName(media?: MediaResourceDto) {
  const record = media as Record<string, unknown> | undefined;
  return (
    stringValue(record?.fileName) ||
    stringValue(record?.filename) ||
    stringValue(record?.name) ||
    stringValue(record?.originalName) ||
    stringValue(record?.originalFileName)
  );
}

export function imageMediaCacheKey(media: MediaResourceDto | undefined, src: string | undefined) {
  const stableKey = mediaStableCacheIdentity(media, src);
  if (stableKey) return `image:${stableKey}`;
  if (!src || isBrowserNativeUrl(src)) return undefined;
  return `image:${src}`;
}

export function mediaStableCacheIdentity(
  media: MediaResourceDto | undefined,
  src: string | undefined,
) {
  const record = media as Record<string, unknown> | undefined;
  const stableKey =
    stringValue(record?.mediaId) ||
    stringValue(record?.media_id) ||
    stringValue(record?.resourceId) ||
    stringValue(record?.resource_id) ||
    stringValue(record?.fileId) ||
    stringValue(record?.file_id) ||
    stringValue(record?.objectKey) ||
    stringValue(record?.object_key) ||
    stringValue(record?.storageKey) ||
    stringValue(record?.storage_key) ||
    stringValue(record?.relativePath) ||
    stringValue(record?.relative_path);
  if (stableKey) return stableKey;
  return mediaIdentityFromUrl(src);
}

function mediaIdentityFromUrl(value: string | undefined) {
  if (!value || isBrowserNativeUrl(value)) return undefined;
  const path = mediaUrlPath(value);
  const match = /(?:^|\/)media\/([^/?#]+)/i.exec(path);
  const mediaId = match?.[1];
  return mediaId ? `media:${decodeURIComponentSafe(mediaId)}` : undefined;
}

function mediaUrlPath(value: string) {
  try {
    return new URL(value, "https://lpp.local").pathname;
  } catch {
    return value.split(/[?#]/, 1)[0] || value;
  }
}

function decodeURIComponentSafe(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function resolveMediaUrl(
  media: MediaResourceDto | undefined,
  baseUrl: string | undefined,
  ...keys: string[]
) {
  const record = media as Record<string, unknown> | undefined;
  const raw = keys
    .map((key) => stringValue(record?.[key]))
    .find((value): value is string => Boolean(value && !isBareMediaFileName(value)));
  if (!raw) return undefined;
  if (/^(data:|blob:|https?:|file:)/i.test(raw)) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  if (!baseUrl) return raw;
  try {
    return new URL(raw, `${baseUrl.replace(/\/$/, "")}/`).toString();
  } catch {
    return raw;
  }
}

function isBareMediaFileName(value: string) {
  return (
    !/[\\/?#]/.test(value) &&
    /\.[a-z0-9]{2,8}$/i.test(value) &&
    !/^[a-z][a-z0-9+.-]*:/i.test(value)
  );
}

export function isBrowserNativeUrl(value: string) {
  return /^(data:|blob:|file:)/i.test(value);
}

export function stringValue(value: unknown) {
  if (typeof value === "string") {
    const text = value.trim();
    return text ? text : undefined;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
}

export function stringField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = stringValue(record[key]);
    if (value) return value;
  }
  return undefined;
}

export function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

export function normalizeType(value?: string) {
  return value?.trim().toLowerCase().replace(/-/g, "_") ?? "";
}

function appendBodyParts(parts: NormalizedMessagePart[], body: Record<string, unknown>) {
  const type = normalizeType(stringValue(body.type) || stringValue(body.messageType));
  const valueBody = messageValueBody(body, type);
  const eventText = eventMessageText(valueBody, type);
  if (eventText) {
    parts.push({ type: "event", text: eventText });
    return;
  }

  const bodyTextFields = mediaTypeFallbacksFor(type) ? mediaTextFields : textFields;
  const text = firstStringField(valueBody, bodyTextFields);
  const markdown = firstStringField(valueBody, markdownFields) || (type === "markdown" ? text : undefined);
  if (markdown) {
    parts.push({ type: "markdown", text: renderWechatEmojiText(markdown) });
  } else if (text) {
    parts.push({ type: "text", text: renderWechatEmojiText(text) });
  }

  appendMediaParts(parts, "image", mediaBodyValue(valueBody, "image", type));
  appendMediaParts(parts, "file", mediaBodyValue(valueBody, "file", type));
  appendMediaParts(parts, "voice", mediaBodyValue(valueBody, "voice", type));
  appendMediaParts(parts, "video", mediaBodyValue(valueBody, "video", type));

  const location =
    asRecord(valueBody.location) ??
    asRecord(valueBody.locationMessage) ??
    asRecord(valueBody.location_message) ??
    (type === "location" ? valueBody : undefined);
  if (location) parts.push({ type: "location", value: location });
  const contact = contactRecord(valueBody) ?? (type === "contact_card" || type === "contact" ? valueBody : undefined);
  if (contact) parts.push({ type: "contact", value: contact });
  const call =
    asRecord(valueBody.callLog ?? valueBody.call_log ?? valueBody.call) ??
    (type === "call_log" || type === "call" ? valueBody : undefined);
  if (call) parts.push({ type: "call", value: call });
}

function nestedMessageBodies(body: Record<string, unknown>) {
  return nestedBodyFields.flatMap((field) => toBodyArray(body[field]));
}

function eventMessageText(body: Record<string, unknown>, type: string) {
  if (type !== "event" && type !== "system" && type !== "notice" && !body.event && !body.eventText && !body.notice) {
    return undefined;
  }
  const eventRecord = asRecord(body.event);
  return (
    firstStringField(body, eventTextFields) ||
    stringField(eventRecord ?? {}, "text", "preview", "content") ||
    (typeof body.event === "string" ? body.event.trim() : undefined) ||
    messageTypeLabel(type)
  );
}

function contactRecord(body: Record<string, unknown>) {
  return asRecord(firstFieldValue(body, contactFields));
}

function mediaBodyValue(
  body: Record<string, unknown>,
  mediaType: keyof typeof mediaBodyFields,
  messageType: string,
) {
  return (
    firstFieldValue(body, mediaBodyFields[mediaType]) ??
    (mediaTypeFallbacks[mediaType].includes(messageType as never) ? body : undefined)
  );
}

function appendMediaParts(
  parts: NormalizedMessagePart[],
  type: "image" | "file" | "voice" | "video",
  value: unknown,
) {
  toMediaArray(value).forEach((media) => {
    parts.push({ type: correctedMediaPartType(type, media), media } as NormalizedMessagePart);
  });
}

function correctedMediaPartType(
  type: "image" | "file" | "voice" | "video",
  media: MediaResourceDto,
) {
  if (type !== "video") return type;
  const extension = mediaFileName(media)?.split(".").pop()?.toLowerCase() ?? "";
  if (!extension) return type;
  return videoFileExtensions.has(extension) ? type : "file";
}

const videoFileExtensions = new Set([
  "avi",
  "m4v",
  "mkv",
  "mov",
  "mp4",
  "mpeg",
  "mpg",
  "ogv",
  "webm",
  "wmv",
]);

function toMediaArray(value: unknown): MediaResourceDto[] {
  const directUrl = stringValue(value);
  if (directUrl) return [{ url: directUrl }];
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeMediaRecord(asRecord(item)))
      .filter((item): item is MediaResourceDto => Boolean(item));
  }
  const media = normalizeMediaRecord(asRecord(value));
  return media ? [media] : [];
}

function normalizeMediaRecord(record?: Record<string, unknown>) {
  if (!record) return undefined;
  return {
    ...record,
    url: firstStringField(record, mediaRecordFields.url) ?? mediaAccessUrl(record, mediaRecordIdFields),
    signedUrl: firstStringField(record, mediaRecordFields.signedUrl),
    downloadUrl: firstStringField(record, mediaRecordFields.downloadUrl),
    thumbnailUrl:
      firstStringField(record, mediaRecordFields.thumbnailUrl) ??
      mediaAccessUrl(record, mediaRecordThumbnailIdFields),
    fileName: firstStringField(record, mediaRecordFields.fileName),
    mimeType: firstStringField(record, mediaRecordFields.mimeType),
    sizeBytes: firstNumberField(record, numericMediaRecordFields.sizeBytes),
    durationSeconds:
      firstNumberField(record, numericMediaRecordFields.durationSeconds) ??
      durationMsToSeconds(record.durationMs),
  } as MediaResourceDto;
}

function toBodyArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asRecord(item)).filter(Boolean) as Record<string, unknown>[];
}

function messageValueBody(body: Record<string, unknown>, type: string) {
  const nestedBody = asRecord(body.body) ?? jsonRecord(body.body);
  if (nestedBody) return nestedBody;
  const content = asRecord(body.content) ?? jsonRecord(body.content);
  if (content && mediaTypeFallbacksFor(type)) return content;
  return body;
}

function mediaAccessUrl(record: Record<string, unknown>, fields: readonly string[]) {
  const id = firstStringField(record, fields);
  return id ? `/media/${encodeURIComponent(id)}` : undefined;
}

function mediaTypeFallbacksFor(type: string) {
  return Object.values(mediaTypeFallbacks).some((fallbacks) =>
    fallbacks.includes(type as never),
  );
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") return undefined;
  return value as Record<string, unknown>;
}

function jsonRecord(value: unknown): Record<string, unknown> | undefined {
  const text = stringValue(value);
  if (!text || !/^\s*\{/.test(text)) return undefined;
  try {
    return asRecord(JSON.parse(text));
  } catch {
    return undefined;
  }
}

function normalizeReplyIntoBody(body: Record<string, unknown>, message?: MessageItemDto) {
  const source =
    asRecord(body.reply) ||
    asRecord(body.replyTo) ||
    asRecord(body.quotedMessage) ||
    asRecord(body.quote) ||
    asRecord(body.replyMessage) ||
    asRecord(messageRecord(message)?.reply) ||
    asRecord(messageRecord(message)?.replyTo) ||
    asRecord(messageRecord(message)?.quotedMessage) ||
    asRecord(messageRecord(message)?.quote);
  if (!source) return;
  const messageId =
    stringField(source, "messageId", "replyToMessageId", "quotedMessageId", "id") ||
    stringField(body, "replyToMessageId") ||
    stringField(messageRecord(message) ?? {}, "replyToMessageId");
  const sender =
    stringField(source, "sender", "senderDisplayName", "fromDisplayName", "displayName", "name") ||
    stringField(source, "senderName", "nickname");
  const preview =
    stringField(source, "preview", "text", "content", "message", "summary") ||
    messagePreviewFromBody(asRecord(source.body), stringField(source, "messageType", "type"));
  if (!preview && !messageId) return;
  body.reply = {
    ...source,
    ...(messageId ? { messageId } : {}),
    ...(sender ? { sender } : {}),
    ...(preview ? { preview } : {}),
  };
  if (messageId && !body.replyToMessageId) body.replyToMessageId = messageId;
}

function normalizeMentionsIntoBody(body: Record<string, unknown>, message?: MessageItemDto) {
  const source =
    mentionArray(body.mentions) ||
    mentionArray(body.atUsers) ||
    mentionArray(body.mentionedUsers) ||
    mentionArray(messageRecord(message)?.mentions) ||
    mentionArray(messageRecord(message)?.atUsers) ||
    mentionArray(messageRecord(message)?.mentionedUsers);
  if (!source) return;
  body.mentions = source;
}

function mentionArray(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const mentions: Array<{ userId?: string; displayName?: string }> = [];
  value.forEach((item) => {
    const record = asRecord(item);
    if (!record) return;
    const userId = stringField(record, "userId", "platformUserId", "memberId", "id");
    const displayName = stringField(record, "groupAlias", "displayName", "groupNickname", "nickname", "name");
    if (!userId && !displayName) return;
    mentions.push({
      ...(userId ? { userId } : {}),
      ...(displayName ? { displayName } : {}),
    });
  });
  return mentions.length > 0 ? mentions : undefined;
}

function messageRecord(message?: MessageItemDto) {
  return message as unknown as Record<string, unknown> | undefined;
}

function firstFieldValue(
  record: Record<string, unknown>,
  fields: readonly string[],
) {
  for (const field of fields) {
    const value = record[field];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function firstStringField(
  record: Record<string, unknown>,
  fields: readonly string[],
) {
  for (const field of fields) {
    const value = stringValue(record[field]);
    if (value) return value;
  }
  return undefined;
}

function firstNumberField(
  record: Record<string, unknown>,
  fields: readonly string[],
) {
  for (const field of fields) {
    const value = numberValue(record[field]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function durationMsToSeconds(value: unknown) {
  const durationMs = numberValue(value);
  return durationMs === undefined ? undefined : durationMs / 1000;
}

function messageTypeLabel(type: string) {
  return messageTypeLabels[normalizeType(type)] ?? "Message";
}
