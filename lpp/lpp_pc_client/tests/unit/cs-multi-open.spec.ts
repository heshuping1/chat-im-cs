import { describe, expect, it } from "vitest";

import {
  closeServiceThread,
  maxOpenServiceThreads,
  openServiceThread,
} from "../../src/renderer/data/customer-service/cs-multi-open";

describe("customer service multi-open model", () => {
  it("opens a thread once and keeps the most recent thread active in the list", () => {
    expect(openServiceThread(["a", "b"], "a")).toEqual(["b", "a"]);
    expect(openServiceThread(["a", "b"], "")).toEqual(["a", "b"]);
  });

  it("limits open threads to a bounded recent set", () => {
    const ids = ["a", "b", "c", "d", "e"];

    expect(openServiceThread(ids, "f")).toEqual(["b", "c", "d", "e", "f"]);
    expect(openServiceThread(ids, "f")).toHaveLength(maxOpenServiceThreads);
  });

  it("moves active selection to the previous open thread when closing active", () => {
    expect(
      closeServiceThread({
        activeThreadId: "c",
        closingThreadId: "c",
        openThreadIds: ["a", "b", "c"],
      }),
    ).toEqual({
      activeThreadId: "b",
      openThreadIds: ["a", "b"],
    });
  });

  it("keeps active selection when closing an inactive thread", () => {
    expect(
      closeServiceThread({
        activeThreadId: "c",
        closingThreadId: "a",
        openThreadIds: ["a", "b", "c"],
      }),
    ).toEqual({
      activeThreadId: "c",
      openThreadIds: ["b", "c"],
    });
  });
});
