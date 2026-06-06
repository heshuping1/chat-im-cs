import type { GroupMemberDto, MediaResourceDto } from "../../data/api-client";
import type { VideoPosterResult } from "../../lib/videoPoster";
import { groupMemberDisplayName, groupMemberIdentityKeys } from "./groupManagementModel";

export const MENTION_ALL_ID = "all";
export const MENTION_ALL_LABEL = "\u6240\u6709\u4eba";

export type MentionOption = {
  id: string;
  label: string;
  kind?: "all" | "member";
};

export type MentionDto =
  | { type: "all"; offset: number; length: number }
  | { type: "user"; userId: string; offset: number; length: number };

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

export function buildMentionOptions(
  members: GroupMemberDto[],
  options: { includeAll?: boolean } = {},
): MentionOption[] {
  const memberOptions = members
    .map((member) => ({
      id: member.userId || member.platformUserId || member.lppId || member.displayName,
      label: mentionDisplayLabel(groupMemberDisplayName(member) || member.userId || "Member"),
    }))
    .filter((item) => item.id && item.label);
  if (!options.includeAll) return memberOptions;
  return [
    {
      id: MENTION_ALL_ID,
      label: MENTION_ALL_LABEL,
      kind: "all",
    },
    ...memberOptions,
  ];
}

export function extractMentions(
  content: string,
  members: GroupMemberDto[],
  options: { includeAll?: boolean } = {},
): MentionDto[] {
  const tokens = Array.from(content.matchAll(/@([^\s@]+)/g)).map((match) => {
    const label = mentionDisplayLabel(match[1] ?? "");
    return {
      label,
      normalized: label.trim().toLowerCase(),
      offset: match.index ?? 0,
      length: match[0].length,
    };
  });
  const names = new Set(tokens.map((token) => token.label));
  const normalizedNames = new Set(tokens.map((token) => token.normalized));
  const mentions: MentionDto[] = [];
  if (options.includeAll && normalizedNames.has(MENTION_ALL_LABEL.toLowerCase())) {
    const token = tokens.find((item) => item.normalized === MENTION_ALL_LABEL.toLowerCase());
    mentions.push({
      type: "all",
      offset: token?.offset ?? 0,
      length: token?.length ?? MENTION_ALL_LABEL.length + 1,
    });
  }
  mentions.push(...members
    .filter((member) =>
      mentionIdentityKeys(member).some((key) => normalizedNames.has(key)) ||
      names.has(mentionDisplayLabel(groupMemberDisplayName(member))),
    )
    .map((member) => {
      const memberLabel = mentionDisplayLabel(groupMemberDisplayName(member));
      const token = tokens.find((item) =>
        mentionIdentityKeys(member).some((key) => item.normalized === key) ||
        item.label === memberLabel,
      );
      const userId = member.userId || member.platformUserId || member.lppId;
      return {
        type: "user" as const,
        userId: userId ?? "",
        offset: token?.offset ?? 0,
        length: token?.length ?? memberLabel.length + 1,
      };
    })
    .filter((mention) => Boolean(mention.userId)));
  return mentions.sort((a, b) => a.offset - b.offset);
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

export function mentionDisplayLabel(value: string) {
  return value.trim().replace(/^[@\uff20]+/, "").trim();
}

function mentionIdentityKeys(member: GroupMemberDto) {
  return Array.from(
    new Set(
      groupMemberIdentityKeys(member)
        .flatMap((key) => [key, mentionDisplayLabel(key).toLowerCase()])
        .filter(Boolean),
    ),
  );
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
