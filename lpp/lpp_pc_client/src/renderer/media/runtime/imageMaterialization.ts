import type { MessageItemDto } from "../../data/api-client";
import {
  accountIdFromSession,
  forgetPrefetchedImageFileUrl,
  getPrefetchedImageFileUrl,
  materializeImageMessages,
  materializeReceivedImageMessage,
  prefetchImageMessages,
  registerPrefetchedImageFileUrl,
  selectImageMaterializationCandidates as selectUnifiedImageMaterializationCandidates,
  subscribeImagePrecache,
} from "./mediaMaterialization";
import type { ImagePrecacheCandidate } from "./imagePrecache";

export type ImageMaterializationCandidate = ImagePrecacheCandidate;
export type { ImagePrecacheCandidate };

export {
  accountIdFromSession,
  forgetPrefetchedImageFileUrl,
  getPrefetchedImageFileUrl,
  materializeImageMessages,
  materializeReceivedImageMessage,
  prefetchImageMessages,
  registerPrefetchedImageFileUrl,
  subscribeImagePrecache,
};

export function selectImageMaterializationCandidates(
  messages: MessageItemDto[],
  assetBaseUrl?: string,
): ImageMaterializationCandidate[] {
  return selectUnifiedImageMaterializationCandidates(messages, assetBaseUrl).map(
    ({ cacheIdentity, cacheKey, fileName, url }) => ({
      ...(cacheIdentity ? { cacheIdentity } : {}),
      cacheKey,
      fileName,
      url,
    }),
  );
}

export const selectImagePrecacheCandidates = selectImageMaterializationCandidates;
