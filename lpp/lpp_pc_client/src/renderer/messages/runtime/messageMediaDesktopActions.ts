import type {
  CacheMediaFilePayload,
  CachedMediaStatus,
  DesktopApi,
} from "../../../shared/desktop-api";
import {
  copyDesktopImage,
  openDesktopMediaFile,
  revealDesktopMediaInFolder,
  saveDesktopMediaAs,
} from "../../media/runtime/desktopMediaActions";

type ImageMediaFilePayload = Omit<CacheMediaFilePayload, "kind"> & { kind: "image" };

export async function cacheMessageImageFile({
  desktopApi,
  payload,
}: {
  desktopApi: DesktopApi | undefined;
  payload: CacheMediaFilePayload;
}) {
  return desktopApi?.cacheMediaFile?.(payload) ?? null;
}

export async function cacheCurrentMessageImageFile(payload: CacheMediaFilePayload) {
  return window.desktopApi?.cacheMediaFile?.(payload) ?? null;
}

export async function copyCurrentMessageImage(payload: ImageMediaFilePayload) {
  return copyDesktopImage(payload);
}

export async function saveCurrentMessageImageAs(payload: ImageMediaFilePayload) {
  return saveDesktopMediaAs(payload);
}

export async function revealCurrentMessageImageInFolder(payload: ImageMediaFilePayload) {
  return revealDesktopMediaInFolder(payload);
}

export async function openMessageFileMedia({
  desktopApi,
  payload,
}: {
  desktopApi: DesktopApi | undefined;
  payload: CacheMediaFilePayload;
}) {
  return desktopApi?.openMediaFile?.(payload) ?? null;
}

export async function openCurrentMessageFileMedia(payload: CacheMediaFilePayload) {
  return openDesktopMediaFile(payload);
}

export async function getCurrentCachedMediaStatus(
  payload: CacheMediaFilePayload,
): Promise<CachedMediaStatus | null> {
  return window.desktopApi?.getCachedMediaStatus?.(payload) ?? null;
}
