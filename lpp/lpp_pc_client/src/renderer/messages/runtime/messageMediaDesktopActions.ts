import type {
  CacheMediaFilePayload,
  CachedMediaStatus,
  DesktopApi,
} from "../../../shared/desktop-api";
import { openDesktopMediaFile } from "../../media/runtime/desktopMediaActions";

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
