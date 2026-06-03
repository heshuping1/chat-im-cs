import { describe, expect, it } from "vitest";
import {
  activeDirectReadStatusRefetchIntervalMs,
  shouldEnableDirectReadStatusQuery,
} from "../../src/renderer/messages/models/imReadReceiptPolicy";

describe("im read receipt policy", () => {
  it("polls read-status every second only for the active direct conversation", () => {
    expect(
      shouldEnableDirectReadStatusQuery({
        hasActiveConversation: true,
        hasSession: true,
        conversationType: "direct",
      }),
    ).toBe(true);
    expect(activeDirectReadStatusRefetchIntervalMs()).toBe(1_000);
  });

  it("does not enable direct read-status polling for group or inactive conversations", () => {
    expect(
      shouldEnableDirectReadStatusQuery({
        hasActiveConversation: true,
        hasSession: true,
        conversationType: "group",
      }),
    ).toBe(false);
    expect(
      shouldEnableDirectReadStatusQuery({
        hasActiveConversation: false,
        hasSession: true,
        conversationType: "direct",
      }),
    ).toBe(false);
    expect(
      shouldEnableDirectReadStatusQuery({
        hasActiveConversation: true,
        hasSession: false,
        conversationType: "direct",
      }),
    ).toBe(false);
  });
});
