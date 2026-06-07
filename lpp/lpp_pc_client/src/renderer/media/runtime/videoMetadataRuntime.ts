const videoDurationStorageKey = "lpp-pc-video-duration-cache";
const maxVideoDurationEntries = 240;

const videoDurationCache = new Map<string, number>();
let hydrated = false;

export function initialVideoDurationSeconds(
  cacheKey: string | undefined,
  serverDurationSeconds?: number,
) {
  if (isUsableVideoDuration(serverDurationSeconds)) return serverDurationSeconds;
  if (!cacheKey) return undefined;
  hydrateVideoDurationCache();
  return videoDurationCache.get(cacheKey);
}

export function rememberVideoDurationSeconds(
  cacheKey: string | undefined,
  durationSeconds: number | undefined,
) {
  if (!cacheKey || !isUsableVideoDuration(durationSeconds)) return;
  hydrateVideoDurationCache();
  videoDurationCache.delete(cacheKey);
  videoDurationCache.set(cacheKey, durationSeconds);
  trimVideoDurationCache();
  persistVideoDurationCache();
}

function isUsableVideoDuration(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function hydrateVideoDurationCache() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = localStorageSafe()?.getItem(videoDurationStorageKey);
    const parsed = raw ? JSON.parse(raw) : undefined;
    if (!Array.isArray(parsed)) return;
    parsed.forEach((entry) => {
      if (!Array.isArray(entry)) return;
      const [cacheKey, durationSeconds] = entry;
      if (typeof cacheKey === "string" && isUsableVideoDuration(durationSeconds)) {
        videoDurationCache.set(cacheKey, durationSeconds);
      }
    });
    trimVideoDurationCache();
  } catch {
    // Ignore corrupt local metadata; the next video metadata event will repopulate it.
  }
}

function persistVideoDurationCache() {
  try {
    localStorageSafe()?.setItem(
      videoDurationStorageKey,
      JSON.stringify([...videoDurationCache.entries()]),
    );
  } catch {
    // Duration is an optimization cache; storage failures must not break media playback.
  }
}

function localStorageSafe() {
  return globalThis.window?.localStorage;
}

function trimVideoDurationCache() {
  while (videoDurationCache.size > maxVideoDurationEntries) {
    const oldestKey = videoDurationCache.keys().next().value;
    if (!oldestKey) return;
    videoDurationCache.delete(oldestKey);
  }
}
