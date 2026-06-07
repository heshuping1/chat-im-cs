import { cachedAvatarObjectUrl } from "./avatarCache";

const snapshotDbName = "lpp-pc-group-avatar-snapshots";
const snapshotStoreName = "snapshots";
const snapshotDbVersion = 1;
const snapshotLocalPrefix = "lpp.pc.groupAvatarSnapshot.";

export type GroupAvatarSnapshotCell = {
  avatarUrl?: string | null;
  name: string;
};

export type GroupAvatarSnapshotEntry = {
  dataUrl: string;
  generatedAt: number;
  key: string;
  memberCount: number;
};

let dbPromise: Promise<IDBDatabase> | null = null;
const memorySnapshots = new Map<string, GroupAvatarSnapshotEntry>();

export function groupAvatarSnapshotKey({
  accountId,
  conversationId,
  tenantId,
}: {
  accountId?: string | null;
  conversationId: string;
  tenantId?: string | null;
}) {
  return [accountId || "anonymous", tenantId || "default", conversationId].join("::");
}

export function getGroupAvatarSnapshotDataUrlSync(key: string) {
  const memoryEntry = memorySnapshots.get(key);
  if (memoryEntry?.dataUrl) return memoryEntry.dataUrl;
  try {
    const dataUrl = window.localStorage.getItem(snapshotLocalPrefix + encodeURIComponent(key));
    return dataUrl || null;
  } catch {
    return null;
  }
}

export async function getGroupAvatarSnapshot(key: string) {
  const memoryEntry = memorySnapshots.get(key);
  if (memoryEntry?.dataUrl) return memoryEntry;
  const localDataUrl = getGroupAvatarSnapshotDataUrlSync(key);
  if (localDataUrl) {
    const localEntry: GroupAvatarSnapshotEntry = {
      dataUrl: localDataUrl,
      generatedAt: 0,
      key,
      memberCount: 0,
    };
    memorySnapshots.set(key, localEntry);
    return localEntry;
  }
  const database = await openSnapshotDb();
  return new Promise<GroupAvatarSnapshotEntry | null>((resolve) => {
    const request = database
      .transaction(snapshotStoreName, "readonly")
      .objectStore(snapshotStoreName)
      .get(key);
    request.onsuccess = () => {
      const entry = request.result as GroupAvatarSnapshotEntry | undefined;
      if (entry?.dataUrl) {
        memorySnapshots.set(key, entry);
        writeLocalMirror(key, entry.dataUrl);
      }
      resolve(entry ?? null);
    };
    request.onerror = () => resolve(null);
  });
}

export async function putGroupAvatarSnapshot(entry: GroupAvatarSnapshotEntry) {
  if (!entry.dataUrl) return;
  memorySnapshots.set(entry.key, entry);
  writeLocalMirror(entry.key, entry.dataUrl);
  const database = await openSnapshotDb();
  await new Promise<void>((resolve) => {
    const request = database
      .transaction(snapshotStoreName, "readwrite")
      .objectStore(snapshotStoreName)
      .put(entry);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
  });
}

export async function generateGroupAvatarSnapshot({
  assetBaseUrl,
  cells,
  token,
}: {
  assetBaseUrl?: string | null;
  cells: GroupAvatarSnapshotCell[];
  token?: string | null;
}) {
  const normalizedCells = cells.slice(0, 9);
  if (normalizedCells.length === 0) {
    throw new Error("No group avatar cells");
  }

  const size = 96;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");

  context.fillStyle = "#d8dde5";
  context.fillRect(0, 0, size, size);

  const slots = groupAvatarSlots(normalizedCells.length, size);
  await Promise.all(
    normalizedCells.map(async (cell, index) => {
      const slot = slots[index];
      if (!slot) return;
      const image = cell.avatarUrl
        ? await loadAvatarImage(resolveAvatarUrl(cell.avatarUrl, assetBaseUrl), token)
        : null;
      if (image) {
        drawCroppedImage(context, image, slot.x, slot.y, slot.size);
      } else {
        drawInitialTile(context, cell.name, slot.x, slot.y, slot.size);
      }
    }),
  );

  return {
    dataUrl: canvas.toDataURL("image/png"),
    memberCount: normalizedCells.length,
  };
}

function groupAvatarSlots(count: number, canvasSize: number) {
  if (count === 1) {
    return [{ x: 0, y: 0, size: canvasSize }];
  }
  const padding = count <= 4 ? 8 : 6;
  const gap = 3;
  const columns = count <= 4 ? 2 : 3;
  const rows = count <= 2 ? 1 : count <= 4 ? 2 : count <= 6 ? 2 : 3;
  const cellSize = Math.floor((canvasSize - padding * 2 - gap * (columns - 1)) / columns);
  const totalWidth = cellSize * columns + gap * (columns - 1);
  const totalHeight = cellSize * rows + gap * (rows - 1);
  const startX = Math.floor((canvasSize - totalWidth) / 2);
  const startY = Math.floor((canvasSize - totalHeight) / 2);

  if (count === 3) {
    return [
      { x: startX + cellSize / 2 + gap / 2, y: startY, size: cellSize },
      { x: startX, y: startY + cellSize + gap, size: cellSize },
      { x: startX + cellSize + gap, y: startY + cellSize + gap, size: cellSize },
    ];
  }

  return Array.from({ length: count }, (_, index) => ({
    x: startX + (index % columns) * (cellSize + gap),
    y: startY + Math.floor(index / columns) * (cellSize + gap),
    size: cellSize,
  }));
}

async function loadAvatarImage(url: string, token?: string | null) {
  try {
    const imageUrl = await avatarUrlToObjectUrl(url, token);
    try {
      return await loadImageElement(imageUrl);
    } finally {
      if (imageUrl.startsWith("blob:") && imageUrl !== url) {
        URL.revokeObjectURL(imageUrl);
      }
    }
  } catch {
    return null;
  }
}

async function avatarUrlToObjectUrl(url: string, token?: string | null) {
  if (url.startsWith("data:")) return url;
  const objectUrl = await cachedAvatarObjectUrl({ token, url });
  if (!objectUrl) throw new Error("Avatar unavailable");
  return objectUrl;
}

function loadImageElement(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image load failed"));
    image.src = url;
  });
}

function resolveAvatarUrl(url: string, assetBaseUrl?: string | null) {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (/^(blob:|data:|file:|https?:)/i.test(trimmed)) return trimmed;
  if (!assetBaseUrl) return trimmed;
  try {
    return new URL(trimmed, assetBaseUrl).toString();
  } catch {
    return trimmed;
  }
}

function drawCroppedImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  size: number,
) {
  const sourceSize = Math.min(image.naturalWidth || image.width, image.naturalHeight || image.height);
  const sourceX = ((image.naturalWidth || image.width) - sourceSize) / 2;
  const sourceY = ((image.naturalHeight || image.height) - sourceSize) / 2;
  context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, x, y, size, size);
}

function drawInitialTile(
  context: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  size: number,
) {
  context.fillStyle = stableTileColor(name);
  context.fillRect(x, y, size, size);
  context.fillStyle = "#ffffff";
  context.font = `600 ${Math.max(12, Math.floor(size * 0.45))}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(initialFromName(name), x + size / 2, y + size / 2 + 1);
}

function initialFromName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const match = Array.from(trimmed).find((char) => /\p{L}|\p{N}/u.test(char));
  return (match ?? trimmed[0] ?? "?").toUpperCase();
}

function stableTileColor(value: string) {
  const palette = ["#02b979", "#2396ef", "#7c72dc", "#00a1a7", "#5874d8", "#13a66b"];
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return palette[hash % palette.length];
}

function writeLocalMirror(key: string, dataUrl: string) {
  try {
    window.localStorage.setItem(snapshotLocalPrefix + encodeURIComponent(key), dataUrl);
  } catch {
    // IndexedDB remains the authoritative cache when localStorage is full.
  }
}

function openSnapshotDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(snapshotDbName, snapshotDbVersion);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(snapshotStoreName)) {
        database.createObjectStore(snapshotStoreName, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}
