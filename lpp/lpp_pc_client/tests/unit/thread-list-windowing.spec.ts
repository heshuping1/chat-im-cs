import { describe, expect, it } from "vitest";

import {
  createThreadRenderWindow,
  defaultThreadRenderWindowSize,
  threadRenderWindowExpandStep,
} from "../../src/renderer/customer-service/models/threadListWindowing";

describe("thread list windowing", () => {
  it("renders the full list when windowing is disabled", () => {
    const threads = Array.from({ length: 300 }, (_, index) => index);

    expect(createThreadRenderWindow({ enabled: false, threads })).toEqual({
      hiddenAfterCount: 0,
      renderedThreads: threads,
      totalCount: 300,
      windowed: false,
    });
  });

  it("renders the first thread segment by default", () => {
    const threads = Array.from({ length: 300 }, (_, index) => index);
    const window = createThreadRenderWindow({ enabled: true, threads });

    expect(window.renderedThreads).toHaveLength(defaultThreadRenderWindowSize);
    expect(window.renderedThreads[0]).toBe(0);
    expect(window.renderedThreads.at(-1)).toBe(defaultThreadRenderWindowSize - 1);
    expect(window.hiddenAfterCount).toBe(300 - defaultThreadRenderWindowSize);
    expect(window.windowed).toBe(true);
  });

  it("expands older thread rows in fixed steps", () => {
    const threads = Array.from({ length: 300 }, (_, index) => index);
    const window = createThreadRenderWindow({
      enabled: true,
      expandedCount: threadRenderWindowExpandStep,
      threads,
    });

    expect(window.renderedThreads).toHaveLength(
      defaultThreadRenderWindowSize + threadRenderWindowExpandStep,
    );
    expect(window.hiddenAfterCount).toBe(60);
  });
});
