const maxImageObjectUrlHotCacheEntries = 300;

type ImageObjectUrlHotCacheEntry = {
  objectUrl: string;
  size: number;
  type: string;
};

const imageObjectUrlHotCache = new Map<string, ImageObjectUrlHotCacheEntry>();

export function peekImageObjectUrl(cacheKey: string | undefined) {
  if (!cacheKey) return null;
  const entry = imageObjectUrlHotCache.get(cacheKey);
  if (!entry) return null;
  imageObjectUrlHotCache.delete(cacheKey);
  imageObjectUrlHotCache.set(cacheKey, entry);
  return entry.objectUrl;
}

export function rememberImageObjectUrl(cacheKey: string, blob: Blob) {
  const current = imageObjectUrlHotCache.get(cacheKey);
  if (current && current.size === blob.size && current.type === blob.type) {
    imageObjectUrlHotCache.delete(cacheKey);
    imageObjectUrlHotCache.set(cacheKey, current);
    return current.objectUrl;
  }
  if (current) URL.revokeObjectURL(current.objectUrl);
  const objectUrl = URL.createObjectURL(blob);
  imageObjectUrlHotCache.set(cacheKey, {
    objectUrl,
    size: blob.size,
    type: blob.type,
  });
  trimImageObjectUrlHotCache();
  return objectUrl;
}

export function clearImageObjectUrlHotCache() {
  for (const entry of imageObjectUrlHotCache.values()) {
    URL.revokeObjectURL(entry.objectUrl);
  }
  imageObjectUrlHotCache.clear();
}

function trimImageObjectUrlHotCache() {
  while (imageObjectUrlHotCache.size > maxImageObjectUrlHotCacheEntries) {
    const oldestKey = imageObjectUrlHotCache.keys().next().value;
    if (!oldestKey) break;
    const oldest = imageObjectUrlHotCache.get(oldestKey);
    if (oldest) URL.revokeObjectURL(oldest.objectUrl);
    imageObjectUrlHotCache.delete(oldestKey);
  }
}
