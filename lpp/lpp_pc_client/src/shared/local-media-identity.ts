export type LocalMediaIdentitySource =
  | "mediaId"
  | "resourceId"
  | "fileId"
  | "objectKey"
  | "storageKey"
  | "relativePath"
  | "urlPath"
  | "urlHash";

export interface LocalMediaResourceLike {
  mediaId?: string | null;
  resourceId?: string | null;
  fileId?: string | null;
  objectKey?: string | null;
  storageKey?: string | null;
  relativePath?: string | null;
  signedUrl?: string | null;
  downloadUrl?: string | null;
  url?: string | null;
  fileName?: string | null;
}

export interface LocalMediaIdentity {
  source: LocalMediaIdentitySource;
  value: string;
}

const identityPriority: Array<{
  field: keyof LocalMediaResourceLike;
  prefix: string;
  source: LocalMediaIdentitySource;
}> = [
  { field: "mediaId", prefix: "media", source: "mediaId" },
  { field: "resourceId", prefix: "resource", source: "resourceId" },
  { field: "fileId", prefix: "file", source: "fileId" },
  { field: "objectKey", prefix: "object", source: "objectKey" },
  { field: "storageKey", prefix: "storage", source: "storageKey" },
  { field: "relativePath", prefix: "path", source: "relativePath" },
];

export function mediaIdentityFromResource(resource: LocalMediaResourceLike): LocalMediaIdentity {
  for (const candidate of identityPriority) {
    const value = clean(resource[candidate.field]);
    if (value) {
      return {
        source: candidate.source,
        value: `${candidate.prefix}:${value}`,
      };
    }
  }
  const url = clean(resource.downloadUrl) ?? clean(resource.url) ?? clean(resource.signedUrl);
  const mediaPathIdentity = mediaIdentityFromUrlPath(url);
  if (mediaPathIdentity) {
    return {
      source: "urlPath",
      value: `media:${mediaPathIdentity}`,
    };
  }
  const fallbackSource = url ?? clean(resource.fileName) ?? "unknown-media";
  return {
    source: "urlHash",
    value: `url:${stableHexHash(fallbackSource)}`,
  };
}

function mediaIdentityFromUrlPath(value: string | undefined) {
  if (!value) return undefined;
  const path = mediaUrlPath(value);
  const mediaId = /(?:^|\/)media\/([^/?#]+)/i.exec(path)?.[1];
  return mediaId ? decodeURIComponentSafe(mediaId) : undefined;
}

function mediaUrlPath(value: string) {
  try {
    return new URL(value, "https://lpp.local").pathname;
  } catch {
    return value.split(/[?#]/, 1)[0] || value;
  }
}

function decodeURIComponentSafe(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function clean(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function stableHexHash(value: string) {
  const seeds = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35, 0x27d4eb2f];
  return seeds
    .map((seed) => fnv1a(value, seed).toString(16).padStart(8, "0"))
    .join("");
}

function fnv1a(value: string, seed: number) {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}
