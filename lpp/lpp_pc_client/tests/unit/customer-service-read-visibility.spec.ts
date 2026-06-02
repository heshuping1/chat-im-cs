import { describe, expect, it } from "vitest";

import {
  canMarkCustomerServiceThreadRead,
  resolveCustomerServiceThreadReadVisibility,
} from "../../src/renderer/data/customer-service/customer-service-read-visibility";

describe("customer service read visibility", () => {
  it("does not mark a thread read just because the online-service module is opened", () => {
    const visibility = resolveCustomerServiceThreadReadVisibility({
      activeModule: "onlineService",
      activeThreadId: "",
      activeThreadOpenSource: "none",
      detailLoaded: true,
      threadId: "thread-1",
    });

    expect(visibility).toBe("hidden");
    expect(canMarkCustomerServiceThreadRead({ visibility })).toBe(false);
  });

  it("keeps auto-selected service threads list-only even after detail data exists", () => {
    const visibility = resolveCustomerServiceThreadReadVisibility({
      activeModule: "onlineService",
      activeThreadId: "thread-1",
      activeThreadOpenSource: "auto",
      detailLoaded: true,
      threadId: "thread-1",
    });

    expect(visibility).toBe("listOnly");
    expect(canMarkCustomerServiceThreadRead({ visibility })).toBe(false);
  });

  it("marks read only after an explicitly opened service thread detail is loaded", () => {
    const loading = resolveCustomerServiceThreadReadVisibility({
      activeModule: "onlineService",
      activeThreadId: "thread-1",
      activeThreadOpenSource: "user",
      detailLoaded: false,
      threadId: "thread-1",
    });
    const loaded = resolveCustomerServiceThreadReadVisibility({
      activeModule: "onlineService",
      activeThreadId: "thread-1",
      activeThreadOpenSource: "user",
      detailLoaded: true,
      threadId: "thread-1",
    });

    expect(loading).toBe("listOnly");
    expect(canMarkCustomerServiceThreadRead({ visibility: loading })).toBe(false);
    expect(loaded).toBe("detailVisible");
    expect(canMarkCustomerServiceThreadRead({ visibility: loaded })).toBe(true);
  });

  it("treats reminder and claim opens as explicit read intent after detail load", () => {
    for (const source of ["reminder", "claim"] as const) {
      const visibility = resolveCustomerServiceThreadReadVisibility({
        activeModule: "onlineService",
        activeThreadId: "conversation-1",
        activeThreadOpenSource: source,
        conversationId: "conversation-1",
        detailLoaded: true,
        threadId: "thread-1",
      });

      expect(visibility).toBe("detailVisible");
    }
  });
});
