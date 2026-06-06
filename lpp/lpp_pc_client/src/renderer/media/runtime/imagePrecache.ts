import type { MessageItemDto } from "../../data/api-client";
import {
  forgetPrefetchedImageFileUrl,
  getPrefetchedImageFileUrl,
  prefetchImageMessages,
  registerPrefetchedImageFileUrl,
  selectImageMaterializationCandidates,
  subscribeImagePrecache,
} from "./mediaMaterialization";

export type ImagePrecacheCandidate = {
  cacheIdentity?: string;
  cacheKey: string;
  fileName: string;
  url: string;
};

export {
  forgetPrefetchedImageFileUrl,
  getPrefetchedImageFileUrl,
  prefetchImageMessages,
  registerPrefetchedImageFileUrl,
  subscribeImagePrecache,
};

export function selectImagePrecacheCandidates(
  messages: MessageItemDto[],
  assetBaseUrl?: string,
): ImagePrecacheCandidate[] {
  return selectImageMaterializationCandidates(messages, assetBaseUrl).map(
    ({ cacheIdentity, cacheKey, fileName, url }) => ({
      ...(cacheIdentity ? { cacheIdentity } : {}),
      cacheKey,
      fileName,
      url,
    }),
  );
}
