import { describe, expect, it } from "vitest";

import { pcQueryKeys } from "../../src/renderer/data/query-keys";

describe("pc query keys", () => {
  it("scopes account space unread summary by api base url and platform token", () => {
    expect(
      pcQueryKeys.accountSpaceUnreadSummary("https://api.example.test", "platform-token"),
    ).toEqual([
      "pc-account-space-unread-summary",
      "https://api.example.test",
      "platform-token",
    ]);
  });
});
