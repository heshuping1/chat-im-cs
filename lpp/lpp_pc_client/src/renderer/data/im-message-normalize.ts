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

export function normalizeMessageItem(message: MessageItemDto): MessageItemDto {
  const messageType = normalizeMessageType(message);
  const body = normalizeMessageBody(message.body, messageType);
  const preview = renderWechatEmojiText(
    message.preview || messagePreviewFromBody(body, messageType) || "[消息]",
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
) {
  const normalizedType = normalizeType(messageType);
  const next = { ...(body ?? {}) };
  if (normalizedType && !next.messageType && !next.type) {
    next.messageType = normalizedType;
  }
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
  if (!src || isBrowserNativeUrl(src)) return undefined;
  const record = media as Record<string, unknown> | undefined;
  const stableKey =
    stringValue(record?.mediaId) ||
    stringValue(record?.resourceId) ||
    stringValue(record?.fileId) ||
    stringValue(record?.objectKey) ||
    stringValue(record?.storageKey) ||
    stringValue(record?.filePath) ||
    stringValue(record?.path);
  return stableKey ? `image:${stableKey}` : `image:${src}`;
}

export function resolveMediaUrl(
  media: MediaResourceDto | undefined,
  baseUrl: string | undefined,
  ...keys: string[]
) {
  const record = media as Record<string, unknown> | undefined;
  const raw = keys.map((key) => stringValue(record?.[key])).find(Boolean);
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
  const valueBody = asRecord(body.body) ?? body;
  const eventText = eventMessageText(valueBody, type);
  if (eventText) {
    parts.push({ type: "event", text: eventText });
    return;
  }

  const text =
    stringValue(valueBody.text) ||
    stringValue(valueBody.content) ||
    stringValue(valueBody.message) ||
    stringValue(valueBody.caption);
  const markdown =
    stringValue(valueBody.markdown) ||
    stringValue(valueBody.markdownText) ||
    (type === "markdown" ? text : undefined);
  if (markdown) {
    parts.push({ type: "markdown", text: renderWechatEmojiText(markdown) });
  } else if (text) {
    parts.push({ type: "text", text: renderWechatEmojiText(text) });
  }

  appendMediaParts(
    parts,
    "image",
    valueBody.image ??
      valueBody.images ??
      valueBody.picture ??
      valueBody.photo ??
      valueBody.imageUrl ??
      valueBody.image_url ??
      (type === "image" || type === "picture" || type === "photo" ? valueBody : undefined),
  );
  appendMediaParts(
    parts,
    "file",
    valueBody.file ??
      valueBody.files ??
      valueBody.attachment ??
      valueBody.attachments ??
      valueBody.fileUrl ??
      valueBody.file_url ??
      (type === "file" || type === "attachment" ? valueBody : undefined),
  );
  appendMediaParts(
    parts,
    "voice",
    valueBody.voice ??
      valueBody.audio ??
      valueBody.audioUrl ??
      valueBody.audio_url ??
      (type === "voice" || type === "audio" ? valueBody : undefined),
  );
  appendMediaParts(
    parts,
    "video",
    valueBody.video ??
      valueBody.videoUrl ??
      valueBody.video_url ??
      (type === "video" ? valueBody : undefined),
  );

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
  return [
    ...toBodyArray(body.parts),
    ...toBodyArray(body.bodies),
    ...toBodyArray(body.items),
    ...toBodyArray(body.contents),
    ...toBodyArray(body.messageBodies),
  ];
}

function eventMessageText(body: Record<string, unknown>, type: string) {
  if (type !== "event" && type !== "system" && type !== "notice" && !body.event && !body.eventText && !body.notice) {
    return undefined;
  }
  const eventRecord = asRecord(body.event);
  return (
    stringValue(body.eventText) ||
    stringValue(body.notice) ||
    stringField(eventRecord ?? {}, "text", "preview", "content") ||
    (typeof body.event === "string" ? body.event.trim() : undefined) ||
    stringValue(body.text) ||
    stringValue(body.content) ||
    stringValue(body.message) ||
    messageTypeLabel(type)
  );
}

function contactRecord(body: Record<string, unknown>) {
  return asRecord(
    body.contactCard ??
      body.contact_card ??
      body.contact ??
      body.card ??
      body.nameCard ??
      body.name_card ??
      body.businessCard ??
      body.business_card ??
      body.userCard ??
      body.user_card ??
      body.profileCard ??
      body.profile_card,
  );
}

function appendMediaParts(
  parts: NormalizedMessagePart[],
  type: "image" | "file" | "voice" | "video",
  value: unknown,
) {
  toMediaArray(value).forEach((media) => {
    parts.push({ type, media } as NormalizedMessagePart);
  });
}

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
    url:
      stringValue(record.url) ||
      stringValue(record.resourceUrl) ||
      stringValue(record.mediaUrl) ||
      stringValue(record.objectUrl) ||
      stringValue(record.originalUrl) ||
      stringValue(record.downloadUrl) ||
      stringValue(record.signedUrl) ||
      stringValue(record.fileUrl) ||
      stringValue(record.filePath) ||
      stringValue(record.uri) ||
      stringValue(record.path),
    thumbnailUrl:
      stringValue(record.thumbnailUrl) ||
      stringValue(record.thumbUrl) ||
      stringValue(record.previewUrl) ||
      stringValue(record.previewPath) ||
      stringValue(record.coverUrl) ||
      stringValue(record.cover) ||
      stringValue(record.thumbnail),
    fileName:
      stringValue(record.fileName) ||
      stringValue(record.filename) ||
      stringValue(record.name) ||
      stringValue(record.originalName) ||
      stringValue(record.originalFileName),
    mimeType:
      stringValue(record.mimeType) ||
      stringValue(record.contentType) ||
      stringValue(record.mediaType),
    sizeBytes:
      numberValue(record.sizeBytes) ??
      numberValue(record.size) ??
      numberValue(record.fileSize),
    durationSeconds:
      numberValue(record.durationSeconds) ??
      numberValue(record.duration) ??
      durationMsToSeconds(record.durationMs),
  } as MediaResourceDto;
}

function toBodyArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asRecord(item)).filter(Boolean) as Record<string, unknown>[];
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") return undefined;
  return value as Record<string, unknown>;
}

function durationMsToSeconds(value: unknown) {
  const durationMs = numberValue(value);
  return durationMs === undefined ? undefined : durationMs / 1000;
}

function messageTypeLabel(type: string) {
  return messageTypeLabels[normalizeType(type)] ?? "消息";
}
