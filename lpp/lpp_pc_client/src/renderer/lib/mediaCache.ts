const mediaDbName = "lpp-pc-media-cache";
const mediaStoreName = "media";
const mediaDbVersion = 1;
const mediaRefreshIntervalMs = 24 * 60 * 60 * 1000;
const mediaRetryIntervalMs = 5 * 60 * 1000;

type MediaCacheEntry = {
  blob: Blob;
  failedAt?: number;
  key: string;
  updatedAt: number;
  url: string;
};

const memoryCache = new Map<string, MediaCacheEntry>();
const pendingRefreshes = new Map<string, Promise<Blob | null>>();
let dbPromise: Promise<IDBDatabase> | null = null;

export async function getCachedMedia(key: string) {
  const memoryEntry = memoryCache.get(key);
  if (memoryEntry?.blob?.size) return memoryEntry.blob;
  const entry = await getMediaEntry(key);
  if (!entry?.blob?.size) return null;
  memoryCache.set(key, entry);
  return entry.blob;
}

export async function refreshCachedMedia({
  force = false,
  key,
  token,
  url,
}: {
  force?: boolean;
  key: string;
  token?: string | null;
  url: string;
}) {
  const entry = await getMediaEntry(key);
  const now = Date.now();
  if (!force && entry?.updatedAt && now - entry.updatedAt < mediaRefreshIntervalMs) {
    return entry.blob;
  }
  if (!force && entry?.failedAt && now - entry.failedAt < mediaRetryIntervalMs) {
    return entry.blob?.size ? entry.blob : null;
  }

  const pending = pendingRefreshes.get(key);
  if (pending) return pending;

  const refreshPromise = fetchMediaBlob(url, token)
    .then(async (blob) => {
      const nextEntry: MediaCacheEntry = {
        blob,
        key,
        updatedAt: Date.now(),
        url,
      };
      memoryCache.set(key, nextEntry);
      await putMediaEntry(nextEntry);
      return blob;
    })
    .catch(async () => {
      await putMediaEntry({
        blob: entry?.blob ?? new Blob(),
        failedAt: Date.now(),
        key,
        updatedAt: entry?.updatedAt ?? 0,
        url,
      });
      return entry?.blob?.size ? entry.blob : null;
    })
    .finally(() => {
      pendingRefreshes.delete(key);
    });

  pendingRefreshes.set(key, refreshPromise);
  return refreshPromise;
}

async function fetchMediaBlob(url: string, token?: string | null) {
  const headers = token
    ? {
        Accept: "application/octet-stream,*/*",
        Authorization: `Bearer ${token}`,
        "X-Access-Token": token,
        "X-Tenant-Token": token,
      }
    : undefined;
  const response = await fetch(url, { cache: "no-store", headers });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const blob = await response.blob();
  if (!blob.size) throw new Error("Empty media");
  return blob;
}

async function getMediaEntry(key: string) {
  const database = await openMediaDb();
  return new Promise<MediaCacheEntry | null>((resolve) => {
    const request = database
      .transaction(mediaStoreName, "readonly")
      .objectStore(mediaStoreName)
      .get(key);
    request.onsuccess = () => {
      const entry = request.result as MediaCacheEntry | undefined;
      resolve(entry ?? null);
    };
    request.onerror = () => resolve(null);
  });
}

async function putMediaEntry(entry: MediaCacheEntry) {
  const database = await openMediaDb();
  return new Promise<void>((resolve) => {
    const request = database
      .transaction(mediaStoreName, "readwrite")
      .objectStore(mediaStoreName)
      .put(entry);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
  });
}

function openMediaDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(mediaDbName, mediaDbVersion);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(mediaStoreName)) {
        database.createObjectStore(mediaStoreName, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}
