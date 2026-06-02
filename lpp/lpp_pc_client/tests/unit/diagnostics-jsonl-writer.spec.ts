import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { DiagnosticsJsonlWriter } from "../../src/main/diagnostics-jsonl-writer";

let tmpDirs: string[] = [];

describe("diagnostics jsonl writer", () => {
  afterEach(async () => {
    await Promise.all(tmpDirs.map((dir) => rm(dir, { force: true, recursive: true })));
    tmpDirs = [];
  });

  it("serializes concurrent writes into valid json lines", async () => {
    const filePath = await tempFilePath();
    const writer = new DiagnosticsJsonlWriter({ filePath, maxLines: 200 });

    await Promise.all(
      Array.from({ length: 100 }, (_, index) =>
        writer.write({ event: "diagnostic", index, text: `message-${index}` }),
      ),
    );

    const records = await readJsonl(filePath);
    expect(records).toHaveLength(100);
    expect(records.map((record) => record.index)).toEqual(
      Array.from({ length: 100 }, (_, index) => index),
    );
  });

  it("keeps only the newest records after exceeding the line limit", async () => {
    const filePath = await tempFilePath();
    const writer = new DiagnosticsJsonlWriter({ filePath, maxLines: 5 });

    for (let index = 0; index < 10; index += 1) {
      await writer.write({ event: "diagnostic", index });
    }

    const records = await readJsonl(filePath);
    expect(records.map((record) => record.index)).toEqual([5, 6, 7, 8, 9]);
  });

  it("removes existing invalid json lines during compaction", async () => {
    const filePath = await tempFilePath();
    await writeFile(filePath, 'not-json\n{"event":"old"}\n{"event":\n', "utf8");
    const writer = new DiagnosticsJsonlWriter({ filePath, maxLines: 10 });

    await writer.write({ event: "new" });

    const rawLines = (await readFile(filePath, "utf8")).trim().split(/\r?\n/);
    expect(rawLines.every((line) => JSON.parse(line))).toBe(true);
    expect(rawLines).toHaveLength(2);
    expect(await readJsonl(filePath)).toEqual([{ event: "old" }, { event: "new" }]);
  });
});

async function tempFilePath() {
  const dir = await mkdtemp(join(tmpdir(), "lpp-diagnostics-jsonl-"));
  tmpDirs.push(dir);
  return join(dir, "diagnostics.jsonl");
}

async function readJsonl(filePath: string) {
  return (await readFile(filePath, "utf8"))
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { event: string; index?: number; text?: string });
}
