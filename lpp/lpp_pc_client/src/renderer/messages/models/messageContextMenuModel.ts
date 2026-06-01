import type { CachedMediaStatus } from "../../../shared/desktop-api";
import type { MessageItemDto } from "../../data/api/types";
import { normalizeMessageType } from "../../data/im-message-normalize";
import {
  chatMediaItemsFromMessage,
  hasOpenableMessageMedia,
} from "../../media/domain/mediaMessage";
import { timestampFromDateValue } from "../../lib/format";

export type MessageContextAction =
  | "multi_select"
  | "reply"
  | "copy"
  | "copy_image"
  | "copy_media"
  | "open_media"
  | "edit_media"
  | "translate"
  | "voice_to_text"
  | "save_media_as"
  | "reveal_in_folder"
  | "forward"
  | "favorite"
  | "recall"
  | "delete";

export type MessageContextMenuState = {
  canCopyMediaFile: boolean;
  hasMedia: boolean;
  isImage: boolean;
  isText: boolean;
  isVideo: boolean;
  isVoice: boolean;
  mediaCacheStatus?: CachedMediaStatus;
  recallable: boolean;
  revealInFolderLabel: string;
  serverUsable: boolean;
};

export type MessageContextActionAvailability = Record<MessageContextAction, boolean>;

export interface CreateMessageContextMenuStateInput {
  canCopyMediaFile: boolean;
  mediaCacheStatus?: CachedMediaStatus;
  message: MessageItemDto;
  mine: boolean;
  now?: Date | number;
  recallWindowMinutes?: number;
  revealInFolderLabel: string;
}

export function createMessageContextMenuState({
  canCopyMediaFile,
  mediaCacheStatus,
  message,
  mine,
  now = Date.now(),
  recallWindowMinutes = 2,
  revealInFolderLabel,
}: CreateMessageContextMenuStateInput): MessageContextMenuState {
  const serverUsable = isServerUsableMessage(message);
  return {
    canCopyMediaFile,
    hasMedia: hasOpenableMessageMedia(message),
    isImage: isImageMessage(message),
    isText: isTextLikeMessage(message),
    isVideo: isVideoMessage(message),
    isVoice: normalizeMessageType(message) === "voice",
    mediaCacheStatus,
    recallable: mine && serverUsable && isRecentMessage(message, recallWindowMinutes, now),
    revealInFolderLabel,
    serverUsable,
  };
}

export function getMessageContextActionAvailability(
  state: MessageContextMenuState,
): MessageContextActionAvailability {
  const videoReadyForFileActions = !state.isVideo || state.mediaCacheStatus === "cached";
  return {
    copy: state.isText,
    copy_image: state.hasMedia && state.isImage && videoReadyForFileActions,
    copy_media: state.hasMedia && state.canCopyMediaFile && !state.isImage && videoReadyForFileActions,
    delete: true,
    edit_media: state.hasMedia && !state.isVideo,
    favorite: state.serverUsable,
    forward: state.serverUsable,
    multi_select: state.serverUsable,
    open_media: state.hasMedia && videoReadyForFileActions,
    recall: state.recallable,
    reply: state.serverUsable,
    reveal_in_folder: state.hasMedia && videoReadyForFileActions,
    save_media_as: state.hasMedia && videoReadyForFileActions,
    translate: state.isText,
    voice_to_text: state.serverUsable && state.isVoice,
  };
}

export function isServerUsableMessage(message: MessageItemDto) {
  const record = message as unknown as Record<string, unknown>;
  const status = String(record.status ?? "").trim().toLowerCase();
  return Boolean(
    message.messageId &&
      !message.isRecalled &&
      !message.messageId.startsWith("pc-local-") &&
      !["sending", "failed", "local", "recalled"].includes(status),
  );
}

export function isRecentMessage(
  message: MessageItemDto,
  minutes: number,
  now: Date | number = Date.now(),
) {
  const sentAt = timestampFromDateValue(message.sentAt);
  if (!Number.isFinite(sentAt) || sentAt <= 0) return false;
  const nowMs = now instanceof Date ? now.getTime() : now;
  if (!Number.isFinite(nowMs)) return false;
  return nowMs - sentAt <= minutes * 60_000;
}

export function isTextLikeMessage(message: MessageItemDto) {
  return Boolean(extractMessageText(message));
}

export function isImageMessage(message: MessageItemDto) {
  return chatMediaItemsFromMessage({ message }).some((item) => item.kind === "image");
}

export function isVideoMessage(message: MessageItemDto) {
  return chatMediaItemsFromMessage({ message }).some((item) => item.kind === "video");
}

function extractMessageText(message: MessageItemDto) {
  const body = message.body ?? {};
  const directText = stringField(
    body,
    "text",
    "content",
    "message",
    "markdown",
    "markdownText",
    "caption",
  );
  if (directText) return directText;
  const nested = [
    body.parts,
    body.bodies,
    body.items,
    body.contents,
    body.messageBodies,
  ].flatMap((value) => (Array.isArray(value) ? value : []));
  for (const item of nested) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const nestedBody =
      record.body && typeof record.body === "object"
        ? (record.body as Record<string, unknown>)
        : record;
    const text = stringField(
      nestedBody,
      "text",
      "content",
      "message",
      "markdown",
      "markdownText",
      "caption",
    );
    if (text) return text;
  }
  return undefined;
}

function stringField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}
