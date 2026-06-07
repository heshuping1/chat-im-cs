import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";

import { FileLocalDataDriver } from "../../src/main/local-data/local-data-file-driver";
import { createLocalDataService } from "../../src/main/local-data/local-data-service";
import { normalizeLocalDataMessage } from "../../src/shared/local-data-contract";

describe("local data file driver", () => {
  it("persists messages and search index across service instances", async () => {
    const root = await mkdtemp(join(tmpdir(), "lpp-local-data-"));
    try {
      const first = createLocalDataService({
        driver: new FileLocalDataDriver({ rootDir: root }),
      });
      await first.upsertMessages({
        messages: [
          normalizeLocalDataMessage({
            bodyJson: { text: "sqlite local first" },
            conversationId: "c1",
            conversationSeq: 1,
            conversationType: "direct",
            messageId: "m1",
            preview: "sqlite local first",
            scopeKey: "scope-a",
            sentAt: "2026-06-07T00:00:01.000Z",
          }),
        ],
        scopeKey: "scope-a",
      });

      const second = createLocalDataService({
        driver: new FileLocalDataDriver({ rootDir: root }),
      });

      expect(
        await second.listMessages({
          conversationId: "c1",
          conversationType: "direct",
          limit: 50,
          scopeKey: "scope-a",
        }),
      ).toMatchObject([{ messageId: "m1", preview: "sqlite local first" }]);
      expect(
        await second.searchMessages({
          keyword: "sqlite",
          limit: 10,
          scopeKey: "scope-a",
        }),
      ).toMatchObject([{ messageId: "m1" }]);
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });
});
