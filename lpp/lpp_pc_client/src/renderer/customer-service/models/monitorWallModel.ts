import type { CustomerServiceThread } from "../../data/api-client";

export type MonitorLayoutMode = "1x1" | "2x1" | "2x2" | "3x2" | "3x3";

export const monitorLayoutModes: MonitorLayoutMode[] = ["1x1", "2x1", "2x2", "3x2", "3x3"];

export function monitorLayoutCapacity(layoutMode: MonitorLayoutMode) {
  if (layoutMode === "1x1") return 1;
  if (layoutMode === "2x1") return 2;
  if (layoutMode === "3x3") return 9;
  if (layoutMode === "3x2") return 6;
  return 4;
}

export function trimWatchedThreadKeys(
  watchedThreadKeys: string[],
  layoutMode: MonitorLayoutMode,
) {
  return dedupeKeys(watchedThreadKeys).slice(0, monitorLayoutCapacity(layoutMode));
}

export function addWatchedThreadKey(
  watchedThreadKeys: string[],
  threadKey: string,
  layoutMode: MonitorLayoutMode,
) {
  const key = threadKey.trim();
  if (!key) return trimWatchedThreadKeys(watchedThreadKeys, layoutMode);
  const current = trimWatchedThreadKeys(watchedThreadKeys, layoutMode);
  if (current.includes(key) || current.length >= monitorLayoutCapacity(layoutMode)) {
    return current;
  }
  return [...current, key];
}

export function addOrReplaceWatchedThreadKey(
  watchedThreadKeys: string[],
  threadKey: string,
  layoutMode: MonitorLayoutMode,
) {
  const key = threadKey.trim();
  if (!key) return trimWatchedThreadKeys(watchedThreadKeys, layoutMode);
  const current = trimWatchedThreadKeys(watchedThreadKeys, layoutMode);
  if (current.includes(key)) {
    return promoteWatchedThreadKey(current, key, layoutMode);
  }
  const capacity = monitorLayoutCapacity(layoutMode);
  if (current.length < capacity) return [key, ...current];
  return [key, ...current.slice(0, capacity - 1)];
}

export function replaceWatchedThreadKey(
  watchedThreadKeys: string[],
  targetThreadKey: string,
  replacementThreadKey: string,
  layoutMode: MonitorLayoutMode,
) {
  const target = targetThreadKey.trim();
  const replacement = replacementThreadKey.trim();
  if (!target || !replacement) return trimWatchedThreadKeys(watchedThreadKeys, layoutMode);
  const current = trimWatchedThreadKeys(watchedThreadKeys, layoutMode);
  if (current.includes(replacement)) {
    return promoteWatchedThreadKey(current, replacement, layoutMode);
  }
  return current.map((key) => (key === target ? replacement : key));
}

export function selectWatchedThreadKey(
  watchedThreadKeys: string[],
  threadKey: string,
  focusedThreadKey: string,
  layoutMode: MonitorLayoutMode,
) {
  const key = threadKey.trim();
  const current = trimWatchedThreadKeys(watchedThreadKeys, layoutMode);
  if (!key) {
    return {
      focusedThreadKey: focusedThreadKey.trim(),
      replacementThreadKey: "",
      replaced: false,
      watchedThreadKeys: current,
    };
  }
  if (current.includes(key)) {
    return {
      focusedThreadKey: key,
      replacementThreadKey: "",
      replaced: false,
      watchedThreadKeys: current,
    };
  }
  if (current.length < monitorLayoutCapacity(layoutMode)) {
    return {
      focusedThreadKey: key,
      replacementThreadKey: "",
      replaced: false,
      watchedThreadKeys: addWatchedThreadKey(current, key, layoutMode),
    };
  }
  const focused = focusedThreadKey.trim();
  if (focused && current.includes(focused)) {
    return {
      focusedThreadKey: key,
      replacementThreadKey: "",
      replaced: true,
      watchedThreadKeys: replaceWatchedThreadKey(current, focused, key, layoutMode),
    };
  }
  return {
    focusedThreadKey: "",
    replacementThreadKey: key,
    replaced: false,
    watchedThreadKeys: current,
  };
}

export function removeWatchedThreadKey(
  watchedThreadKeys: string[],
  threadKey: string,
) {
  return dedupeKeys(watchedThreadKeys).filter((key) => key !== threadKey);
}

export function promoteWatchedThreadKey(
  watchedThreadKeys: string[],
  threadKey: string,
  layoutMode: MonitorLayoutMode,
) {
  const current = trimWatchedThreadKeys(watchedThreadKeys, layoutMode);
  if (!current.includes(threadKey)) return current;
  return [threadKey, ...current.filter((key) => key !== threadKey)];
}

export function pruneWatchedThreadKeys(
  watchedThreadKeys: string[],
  visibleThreadKeys: string[],
  layoutMode: MonitorLayoutMode,
) {
  const visible = new Set(visibleThreadKeys);
  return trimWatchedThreadKeys(watchedThreadKeys, layoutMode).filter((key) =>
    visible.has(key),
  );
}

export function sortMonitorThreadsByPriority(
  threads: CustomerServiceThread[],
  riskThreadKeys: Set<string>,
) {
  return [...threads].sort((left, right) => {
    const priorityDelta =
      monitorThreadPriority(right, riskThreadKeys) -
      monitorThreadPriority(left, riskThreadKeys);
    if (priorityDelta !== 0) return priorityDelta;
    return threadTimeValue(right) - threadTimeValue(left);
  });
}

export function monitorThreadPriority(
  thread: CustomerServiceThread,
  riskThreadKeys: Set<string>,
) {
  let score = 0;
  if (riskThreadKeys.has(`${thread.threadType}:${thread.threadId}`)) score += 100;
  const status = String(thread.status ?? "").toLowerCase();
  if (status.includes("queue")) score += 60;
  if (!threadStaffIdentity(thread)) score += 40;
  const ageMinutes = (Date.now() - threadTimeValue(thread)) / 60_000;
  if (Number.isFinite(ageMinutes) && ageMinutes >= 10) {
    score += Math.min(30, Math.floor(ageMinutes / 5) * 5);
  }
  return score;
}

function threadStaffIdentity(thread: CustomerServiceThread) {
  const record = thread as CustomerServiceThread & Record<string, unknown>;
  return [
    "assignedStaffUserId",
    "staffUserId",
    "serviceStaffUserId",
    "assignedStaffDisplayName",
    "assignedStaffName",
    "staffDisplayName",
    "staffName",
  ].some((key) => {
    const value = record[key];
    return typeof value === "string" && value.trim();
  });
}

function threadTimeValue(thread: CustomerServiceThread) {
  const value = Date.parse(thread.updatedAt || thread.lastMessageAt || thread.assignedAt || "");
  return Number.isFinite(value) ? value : 0;
}

function dedupeKeys(keys: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  keys.forEach((key) => {
    const normalized = key.trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    result.push(normalized);
  });
  return result;
}
