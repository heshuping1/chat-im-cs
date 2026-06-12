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
  const messageById = new Map(messages.map((message) => [message.messageId, message]));
  return selectImageMaterializationCandidates(messages, assetBaseUrl).map(
    ({ cacheIdentity, cacheKey, fileName, messageId, url }) => {
      const sourceMessage = messageId ? messageById.get(messageId) : undefined;
      return {
        ...(cacheIdentity ? { cacheIdentity } : {}),
        cacheKey,
        fileName,
        url: preferredSignedImageUrl(sourceMessage, assetBaseUrl) || url,
      };
    },
  );
}

function preferredSignedImageUrl(
  message: MessageItemDto | undefined,
  assetBaseUrl?: string,
) {
  const image = readImageRecord(message?.body);
  const signedUrl = typeof image?.signedUrl === "string" ? image.signedUrl.trim() : "";
  if (!signedUrl) return "";
  if (/^[a-z]+:/i.test(signedUrl)) return signedUrl;
  if (!assetBaseUrl) return signedUrl;
  return new URL(signedUrl, ensureTrailingSlash(assetBaseUrl)).toString();
}

function readImageRecord(body: Record<string, unknown> | undefined) {
  const image = body?.image;
  return image && typeof image === "object" && !Array.isArray(image)
    ? (image as Record<string, unknown>)
    : undefined;
}

function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}
