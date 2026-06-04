import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createElectronRuntimeDiagnosticsSnapshot,
  resetElectronRuntimeDiagnosticsForTest,
} from "../../src/main/runtime-diagnostics";

const getPath = vi.fn();

vi.mock("electron", () => ({
  app: {
    getPath,
  },
}));

describe("media storage", () => {
  let userDataDir: string;
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    userDataDir = await mkdtemp(join(tmpdir(), "lpp-media-storage-"));
    getPath.mockReturnValue(userDataDir);
    resetElectronRuntimeDiagnosticsForTest();
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
    await rm(userDataDir, { force: true, recursive: true });
  });

  it("redownloads stale video cache files that contain JSON/HTML error payloads", async () => {
    const { ensureLocalMediaFile } = await import("../../src/main/media-storage");
    const url = "https://cdn.example.test/media/clip.mp4";
    const filePath = cachedVideoPath({
      accountId: "u1",
      conversationId: "c1",
      fileName: "clip.mp4",
      url,
      userDataDir,
    });
    await mkdir(join(filePath, ".."), { recursive: true });
    await writeFile(filePath, JSON.stringify({ code: "AUTH_REQUIRED", message: "login" }));

    const freshBytes = new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 109, 112, 52, 50]);
    globalThis.fetch = vi.fn(async () => new Response(freshBytes, {
      headers: { "content-type": "video/mp4" },
      status: 200,
    })) as typeof fetch;

    const result = await ensureLocalMediaFile({
      accountId: "u1",
      conversationId: "c1",
      fileName: "clip.mp4",
      kind: "video",
      url,
    });

    expect(result.filePath).toBe(filePath);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(await readFile(filePath)).toEqual(Buffer.from(freshBytes));
  });

  it("copies a preload-derived local media file into the app media cache", async () => {
    const { cacheLocalMediaFile } = await import("../../src/main/media-storage");
    const sourcePath = join(userDataDir, "..", "selected-video.mp4");
    const bytes = new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 109, 112, 52, 50]);
    await writeFile(sourcePath, bytes);

    const result = await cacheLocalMediaFile(
      {
        accountId: "u1",
        conversationId: "c1",
        fileName: "clip.mp4",
        kind: "video",
        url: "blob:local-video",
      },
      sourcePath,
    );

    expect(result.filePath).toBe(cachedVideoPath({
      accountId: "u1",
      conversationId: "c1",
      fileName: "clip.mp4",
      url: pathToFileURL(sourcePath).toString(),
      userDataDir,
    }));
    expect(result.fileUrl).toBe(pathToFileURL(result.filePath).toString());
    expect(await readFile(result.filePath)).toEqual(Buffer.from(bytes));
  });

  it("writes preload-materialized pasted file bytes into the app file cache", async () => {
    const { cacheLocalMediaFile } = await import("../../src/main/media-storage");
    const bytes = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]);

    const result = await cacheLocalMediaFile(
      {
        accountId: "u1",
        conversationId: "c1",
        fileName: "pasted.pdf",
        kind: "file",
        url: "local-file:pc-local-media-1",
      },
      { kind: "bytes", bytes },
    );

    expect(result.filePath).toBe(cachedMediaPath({
      accountId: "u1",
      conversationId: "c1",
      directory: "Files",
      fileName: "pasted.pdf",
      url: "local-file:pc-local-media-1",
      userDataDir,
    }));
    expect(result.fileUrl).toBe(pathToFileURL(result.filePath).toString());
    expect(await readFile(result.filePath)).toEqual(Buffer.from(bytes));
  });

  it("routes local sent media cache entries to the media kind directory", async () => {
    const { cacheLocalMediaFile } = await import("../../src/main/media-storage");
    const bytes = new Uint8Array([1, 2, 3]);

    const image = await cacheLocalMediaFile(
      {
        accountId: "u1",
        conversationId: "c1",
        fileName: "photo.png",
        kind: "image",
        url: "local-image:pc-local-media-2",
      },
      { kind: "bytes", bytes },
    );
    const video = await cacheLocalMediaFile(
      {
        accountId: "u1",
        conversationId: "c1",
        fileName: "clip.mp4",
        kind: "video",
        url: "local-video:pc-local-media-3",
      },
      { kind: "bytes", bytes },
    );

    expect(image.filePath).toContain(`${join("Images")}`);
    expect(video.filePath).toContain(`${join("Videos")}`);
  });

  it("rejects non-file local media sources", async () => {
    const { cacheLocalMediaFile } = await import("../../src/main/media-storage");
    const directoryPath = join(userDataDir, "not-a-file");
    await mkdir(directoryPath);

    await expect(
      cacheLocalMediaFile(
        {
          fileName: "clip.mp4",
          kind: "video",
          url: "blob:local-video",
        },
        directoryPath,
      ),
    ).rejects.toThrow("本地媒体文件不可用");

    await expect(stat(directoryPath)).resolves.toBeTruthy();
  });

  it("records local cache failure reasons without leaking source paths", async () => {
    const { cacheLocalMediaFile } = await import("../../src/main/media-storage");
    const sourcePath = join(userDataDir, "missing-video.mp4");

    await expect(
      cacheLocalMediaFile(
        {
          accountId: "u1",
          conversationId: "c1",
          fileName: "clip.mp4",
          kind: "video",
          url: "blob:local-video",
        },
        sourcePath,
      ),
    ).rejects.toThrow("source_file_unavailable");

    const snapshot = createElectronRuntimeDiagnosticsSnapshot();
    expect(snapshot.records[0]).toMatchObject({
      event: "media.local_cache_failed",
      reason: expect.stringContaining("source=source_file_unavailable"),
    });
    expect(snapshot.records[0]?.reason).not.toContain(sourcePath);
  });
});

function cachedVideoPath({
  accountId,
  conversationId,
  fileName,
  url,
  userDataDir,
}: {
  accountId: string;
  conversationId: string;
  fileName: string;
  url: string;
  userDataDir: string;
}) {
  const month = new Date().toISOString().slice(0, 7);
  const hash = createHash("sha1").update(url).digest("hex").slice(0, 16);
  return join(userDataDir, "lppchat-files", accountId, conversationId, "Videos", month, `${hash}-${fileName}`);
}

function cachedMediaPath({
  accountId,
  conversationId,
  directory,
  fileName,
  url,
  userDataDir,
}: {
  accountId: string;
  conversationId: string;
  directory: "Files" | "Images" | "Videos";
  fileName: string;
  url: string;
  userDataDir: string;
}) {
  const month = new Date().toISOString().slice(0, 7);
  const hash = createHash("sha1").update(url).digest("hex").slice(0, 16);
  return join(userDataDir, "lppchat-files", accountId, conversationId, directory, month, `${hash}-${fileName}`);
}
