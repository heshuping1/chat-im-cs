import type { DesktopApi } from "../../../shared/desktop-api";

export type MediaActionCapabilities = {
  canCacheMediaFile: boolean;
  canCopyMediaFile: boolean;
  canEditMediaFile: boolean;
  canOpenMediaFile: boolean;
  canOpenVideoPlayer: boolean;
  canReadMediaFileAsDataUrl: boolean;
  canRevealInFolder: boolean;
  canSaveMediaAs: boolean;
};

export function getMediaActionCapabilities(
  desktopApi: DesktopApi | undefined,
): MediaActionCapabilities {
  const canCacheMediaFile = Boolean(desktopApi?.cacheMediaFile);
  return {
    canCacheMediaFile,
    canCopyMediaFile: Boolean(desktopApi?.copyMediaFile || canCacheMediaFile),
    canEditMediaFile: Boolean(desktopApi?.editMediaFile),
    canOpenMediaFile: Boolean(desktopApi?.openMediaFile),
    canOpenVideoPlayer: Boolean(desktopApi?.openVideoPlayer),
    canReadMediaFileAsDataUrl: Boolean(desktopApi?.readMediaFileAsDataUrl),
    canRevealInFolder: Boolean(desktopApi?.revealMediaInFolder),
    canSaveMediaAs: Boolean(desktopApi?.saveMediaAs),
  };
}

export function getCurrentMediaActionCapabilities(): MediaActionCapabilities {
  return getMediaActionCapabilities(window.desktopApi);
}
