import { describe, expect, it } from "vitest";
import {
  activeDirectReadStatusFastTrackIntervalMs,
  activeDirectReadStatusFastTrackWindowMs,
  activeDirectReadStatusRefetchInBackground,
  activeDirectReadStatusRefetchIntervalMs,
  activeDirectReadStatusStaleMs,
  shouldEnableDirectReadStatusQuery,
} from "../../src/renderer/messages/models/imReadReceiptPolicy";

describe("im read receipt policy", () => {
  it("keeps read-status as a low-frequency fallback only for the active direct conversation", () => {
    expect(
      shouldEnableDirectReadStatusQuery({
        hasActiveConversation: true,
        hasSession: true,
        conversationType: "direct",
      }),
    ).toBe(true);
    expect(activeDirectReadStatusRefetchIntervalMs()).toBe(30_000);
    expect(activeDirectReadStatusRefetchInBackground()).toBe(false);
    expect(activeDirectReadStatusStaleMs()).toBe(10_000);
    expect(activeDirectReadStatusFastTrackIntervalMs()).toBe(1_000);
    expect(activeDirectReadStatusFastTrackWindowMs()).toBe(15_000);
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
