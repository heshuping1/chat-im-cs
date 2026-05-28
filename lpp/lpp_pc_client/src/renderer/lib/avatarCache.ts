const avatarDbName = "lpp-pc-avatar-cache";
const avatarStoreName = "avatars";
const avatarDbVersion = 1;
const avatarRefreshIntervalMs = 12 * 60 * 60 * 1000;
const avatarRetryIntervalMs = 5 * 60 * 1000;

type AvatarCacheEntry = {
  blob: Blob;
  failedAt?: number;
  key: string;
  updatedAt: number;
  url: string;
};

const memoryCache = new Map<string, AvatarCacheEntry>();
const pendingRefreshes = new Map<string, Promise<Blob | null>>();
let dbPromise: Promise<IDBDatabase> | null = null;

export async function getCachedAvatar(url: string) {
  const key = avatarCacheKey(url);
  const memoryEntry = memoryCache.get(key);
  if (memoryEntry?.blob?.size) return memoryEntry.blob;
  const entry = await getAvatarEntry(key);
  if (!entry?.blob?.size) return null;
  memoryCache.set(key, entry);
  return entry.blob;
}

export async function refreshCachedAvatar({
  token,
  url,
}: {
  token?: string | null;
  url: string;
}) {
  const key = avatarCacheKey(url);
  const entry = await getAvatarEntry(key);
  const now = Date.now();
  if (entry?.updatedAt && now - entry.updatedAt < avatarRefreshIntervalMs) {
    return entry.blob;
  }
  if (entry?.failedAt && now - entry.failedAt < avatarRetryIntervalMs) {
    return entry.blob ?? null;
  }

  const pending = pendingRefreshes.get(key);
  if (pending) return pending;

  const refreshPromise = fetchAvatarBlob(url, token)
    .then(async (blob) => {
      const nextEntry: AvatarCacheEntry = {
        blob,
        key,
        updatedAt: Date.now(),
        url,
      };
      memoryCache.set(key, nextEntry);
      await putAvatarEntry(nextEntry);
      return blob;
    })
    .catch(async () => {
      await putAvatarEntry({
        blob: entry?.blob ?? new Blob(),
        failedAt: Date.now(),
        key,
        updatedAt: entry?.updatedAt ?? 0,
        url,
      });
      return entry?.blob ?? null;
    })
    .finally(() => {
      pendingRefreshes.delete(key);
    });

  pendingRefreshes.set(key, refreshPromise);
  return refreshPromise;
}

function avatarCacheKey(url: string) {
  return url.trim();
}

async function fetchAvatarBlob(url: string, token?: string | null) {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const response = await fetch(url, { cache: "no-store", headers });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const blob = await response.blob();
  if (!blob.size || !blob.type.startsWith("image/")) {
    throw new Error("Invalid avatar image");
  }
  return blob;
}

async function getAvatarEntry(key: string) {
  const database = await openAvatarDb();
  return new Promise<AvatarCacheEntry | null>((resolve) => {
    const request = database
      .transaction(avatarStoreName, "readonly")
      .objectStore(avatarStoreName)
      .get(key);
    request.onsuccess = () => {
      const entry = request.result as AvatarCacheEntry | undefined;
      resolve(entry ?? null);
    };
    request.onerror = () => resolve(null);
  });
}

async function putAvatarEntry(entry: AvatarCacheEntry) {
  const database = await openAvatarDb();
  return new Promise<void>((resolve) => {
    const request = database
      .transaction(avatarStoreName, "readwrite")
      .objectStore(avatarStoreName)
      .put(entry);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
  });
}

function openAvatarDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(avatarDbName, avatarDbVersion);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(avatarStoreName)) {
        database.createObjectStore(avatarStoreName, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}
