import type { MessageItemDto } from "../../data/api-client";
import {
  messageMediaActionPayload,
  messageVideoPlayerPayload,
} from "../../media/domain/mediaMessage";
import {
  copyDesktopImage,
  copyDesktopMediaFile,
  downloadDesktopMedia,
  editDesktopMediaFile,
  openDesktopMediaFile,
  revealDesktopMediaInFolder,
  revealInFolderLabel as desktopRevealInFolderLabel,
  saveDesktopMediaAs,
} from "../../media/runtime/desktopMediaActions";

export type MessageMediaCacheContext = {
  accountId?: string;
  conversationId?: string;
  fileName?: string;
};

export async function downloadMessageMedia(
  message: MessageItemDto,
  url: string,
  authToken?: string,
  cacheContext?: MessageMediaCacheContext,
) {
  await downloadDesktopMedia(
    messageMediaActionPayload({ message, url, authToken, cacheContext }),
  );
}

export async function saveMessageMediaAs(
  message: MessageItemDto,
  url: string,
  authToken?: string,
  cacheContext?: MessageMediaCacheContext,
) {
  return saveDesktopMediaAs(
    messageMediaActionPayload({ message, url, authToken, cacheContext }),
  );
}

export async function revealMessageMediaInFolder(
  message: MessageItemDto,
  url: string,
  authToken?: string,
  cacheContext?: MessageMediaCacheContext,
) {
  return revealDesktopMediaInFolder(
    messageMediaActionPayload({ message, url, authToken, cacheContext }),
  );
}

export async function copyMessageMediaFile(
  message: MessageItemDto,
  url: string,
  authToken?: string,
  cacheContext?: MessageMediaCacheContext,
) {
  return copyDesktopMediaFile(
    messageMediaActionPayload({ message, url, authToken, cacheContext }),
  );
}

export async function openMessageMediaFile(
  message: MessageItemDto,
  url: string,
  authToken?: string,
  cacheContext?: MessageMediaCacheContext,
) {
  return openDesktopMediaFile(
    messageMediaActionPayload({ message, url, authToken, cacheContext }),
  );
}

export async function openMessageVideoPlayer(
  message: MessageItemDto,
  url: string,
  authToken?: string,
  cacheContext?: MessageMediaCacheContext,
) {
  if (!window.desktopApi?.openVideoPlayer) return false;
  await window.desktopApi.openVideoPlayer(
    messageVideoPlayerPayload({
      message,
      url,
      authToken,
      cacheContext,
    }),
  );
  return true;
}

export async function editMessageMediaFile(
  message: MessageItemDto,
  url: string,
  authToken?: string,
  cacheContext?: MessageMediaCacheContext,
) {
  return editDesktopMediaFile(
    messageMediaActionPayload({ message, url, authToken, cacheContext }),
  );
}

export function revealInFolderLabel() {
  return desktopRevealInFolderLabel();
}

export function isMacPlatform() {
  return /mac/i.test(navigator.platform);
}

export async function copyMessageImage(
  url: string,
  authToken?: string,
  cacheContext?: MessageMediaCacheContext,
) {
  await copyDesktopImage({
    url,
    authToken,
    accountId: cacheContext?.accountId,
    conversationId: cacheContext?.conversationId,
    fileName: cacheContext?.fileName || "image.png",
  });
}
