import { describe, expect, it } from "vitest";

import {
  addOrReplaceWatchedThreadKey,
  addWatchedThreadKey,
  monitorThreadPriority,
  monitorLayoutCapacity,
  promoteWatchedThreadKey,
  pruneWatchedThreadKeys,
  removeWatchedThreadKey,
  replaceWatchedThreadKey,
  sortMonitorThreadsByPriority,
  trimWatchedThreadKeys,
} from "../../src/renderer/customer-service/models/monitorWallModel";
import type { CustomerServiceThread } from "../../src/renderer/data/api/types";

describe("monitor wall model", () => {
  it("maps layout modes to fixed capacities", () => {
    expect(monitorLayoutCapacity("1x1")).toBe(1);
    expect(monitorLayoutCapacity("2x1")).toBe(2);
    expect(monitorLayoutCapacity("2x2")).toBe(4);
    expect(monitorLayoutCapacity("3x2")).toBe(6);
    expect(monitorLayoutCapacity("3x3")).toBe(9);
  });

  it("trims watched conversations when switching to a smaller layout", () => {
    expect(
      trimWatchedThreadKeys(
        ["a", "b", "c", "d", "e", "f", "g"],
        "3x2",
      ),
    ).toEqual(["a", "b", "c", "d", "e", "f"]);
    expect(
      trimWatchedThreadKeys(
        ["a", "b", "c", "d", "e", "f", "g"],
        "2x2",
      ),
    ).toEqual(["a", "b", "c", "d"]);
    expect(
      trimWatchedThreadKeys(
        ["a", "b", "c"],
        "2x1",
      ),
    ).toEqual(["a", "b"]);
    expect(
      trimWatchedThreadKeys(
        ["a", "b", "c"],
        "1x1",
      ),
    ).toEqual(["a"]);
  });

  it("adds a conversation once and does not overflow the wall", () => {
    expect(addWatchedThreadKey(["a", "b"], "a", "2x2")).toEqual(["a", "b"]);
    expect(addWatchedThreadKey(["a", "b"], "c", "2x2")).toEqual(["a", "b", "c"]);
    expect(addWatchedThreadKey(["a", "b", "c", "d"], "e", "2x2")).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  it("removes and promotes watched conversations predictably", () => {
    expect(removeWatchedThreadKey(["a", "b", "c"], "b")).toEqual(["a", "c"]);
    expect(promoteWatchedThreadKey(["a", "b", "c"], "c", "2x2")).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("supports explicit replacement when the wall is full", () => {
    expect(addOrReplaceWatchedThreadKey(["a", "b", "c", "d"], "e", "2x2")).toEqual([
      "e",
      "a",
      "b",
      "c",
    ]);
    expect(replaceWatchedThreadKey(["a", "b", "c", "d"], "c", "e", "2x2")).toEqual([
      "a",
      "b",
      "e",
      "d",
    ]);
  });

  it("prunes conversations that are no longer visible after filtering", () => {
    expect(
      pruneWatchedThreadKeys(["temp:a", "temp:b", "temp:c"], ["temp:b"], "3x3"),
    ).toEqual(["temp:b"]);
  });

  it("prioritizes SLA risk, queued, and unassigned conversations", () => {
    const normal = thread("normal", "serving", "agent-1");
    const queued = thread("queued", "queued", "agent-1");
    const unassigned = thread("unassigned", "serving", "");
    const risky = thread("risky", "serving", "agent-1");

    const riskKeys = new Set(["temp_session:risky"]);

    expect(monitorThreadPriority(risky, riskKeys)).toBeGreaterThan(
      monitorThreadPriority(queued, riskKeys),
    );
    expect(sortMonitorThreadsByPriority([normal, queued, risky, unassigned], riskKeys).map((item) => item.threadId)).toEqual([
      "risky",
      "queued",
      "unassigned",
      "normal",
    ]);
  });
});

function thread(
  threadId: string,
  status: string,
  assignedStaffUserId: string,
): CustomerServiceThread {
  return {
    assignedStaffUserId,
    conversationId: threadId,
    status,
    threadId,
    threadType: "temp_session",
    title: threadId,
    updatedAt: "2026-06-11T00:00:00.000Z",
  } as CustomerServiceThread;
}
