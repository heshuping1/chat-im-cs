import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createVideoPlayerDocument } from "../../src/main/video-player-document";

describe("video player document", () => {
  it("writes the player html to a file URL document instead of a data URL", async () => {
    const userDataPath = await mkdtemp(join(tmpdir(), "lpp-player-doc-"));
    try {
      const document = await createVideoPlayerDocument({
        html: "<!doctype html><video></video>",
        userDataPath,
      });

      expect(document.fileUrl).toMatch(/^file:\/\//);
      expect(document.fileUrl).not.toContain("data:text/html");
      expect(document.filePath).toContain("startlink-player");
      await expect(readFile(document.filePath, "utf8")).resolves.toContain("<video>");
    } finally {
      await rm(userDataPath, { force: true, recursive: true });
    }
  });
});
