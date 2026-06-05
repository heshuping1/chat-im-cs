import type { GroupMemberDto, MediaResourceDto } from "../../data/api-client";
import type { VideoPosterResult } from "../../lib/videoPoster";
import { groupMemberDisplayName, groupMemberIdentityKeys } from "./groupManagementModel";

export type ReplyTarget = {
  messageId: string;
  sender: string;
  preview: string;
} | null;

export function withReplyBody(body: Record<string, unknown>, reply: ReplyTarget) {
  if (!reply) return body;
  return {
    ...body,
    reply: {
      messageId: reply.messageId,
      sender: reply.sender,
      preview: reply.preview,
    },
  };
}

export function buildMentionOptions(members: GroupMemberDto[]) {
  return members
    .map((member) => ({
      id: member.userId || member.platformUserId || member.lppId || member.displayName,
      label: groupMemberDisplayName(member) || member.userId || "Member",
    }))
    .filter((item) => item.id && item.label);
}

export function extractMentions(content: string, members: GroupMemberDto[]) {
  const rawNames = Array.from(content.matchAll(/@([^\s@]+)/g)).map((match) => match[1]);
  const names = new Set(rawNames);
  const normalizedNames = new Set(rawNames.map((name) => name.trim().toLowerCase()));
  return members
    .filter((member) =>
      groupMemberIdentityKeys(member).some((key) => normalizedNames.has(key)) ||
      names.has(groupMemberDisplayName(member)),
    )
    .map((member) => ({
      userId: member.userId || member.platformUserId || member.lppId,
      displayName: groupMemberDisplayName(member) || member.displayName,
    }));
}

export function extractActionResultText(value: unknown): string | undefined {
  if (typeof value === "string") {
    const text = value.trim();
    return text || undefined;
  }
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  for (const key of [
    "translatedText",
    "translation",
    "text",
    "content",
    "transcript",
    "result",
    "data",
    "body",
    "payload",
    "output",
  ]) {
    const item = record[key];
    if (typeof item === "string" && item.trim()) return item.trim();
    const nested: string | undefined = extractActionResultText(item);
    if (nested) return nested;
  }
  const translations = record.translations;
  if (Array.isArray(translations)) {
    for (const item of translations) {
      const nested: string | undefined = extractActionResultText(item);
      if (nested) return nested;
    }
  }
  return undefined;
}

export function normalizeUploadedMedia(
  media: MediaResourceDto,
  file: File,
): MediaResourceDto {
  const record = media as Record<string, unknown>;
  return {
    ...media,
    url: media.url || stringField(record, "resourceUrl", "mediaUrl", "objectUrl", "downloadUrl", "fileUrl", "filePath", "uri", "path"),
    thumbnailUrl:
      media.thumbnailUrl ||
      stringField(record, "thumbUrl", "previewUrl", "previewPath", "coverUrl", "cover", "thumbnail"),
    fileName: file.name || media.fileName,
    originalFileName: file.name,
    mimeType: file.type || media.mimeType,
    sizeBytes: file.size || media.sizeBytes,
  } as MediaResourceDto;
}

export async function settleVideoPosterForSend(
  promise: Promise<VideoPosterResult | undefined>,
  timeoutMs = 700,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise.catch(() => undefined),
      new Promise<undefined>((resolve) => {
        timer = globalThis.setTimeout(() => resolve(undefined), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) globalThis.clearTimeout(timer);
  }
}

function stringField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}
