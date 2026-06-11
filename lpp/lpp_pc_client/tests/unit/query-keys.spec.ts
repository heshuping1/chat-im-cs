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

  it("scopes customer-service temp-session stats by api base url and tenant token", () => {
    expect(
      pcQueryKeys.customerServiceTempSessionStats(
        "https://api.example.test",
        "tenant-token",
      ),
    ).toEqual([
      "pc-cs-temp-session-stats",
      "https://api.example.test",
      "tenant-token",
    ]);
  });

  it("scopes customer-service export tasks by api base url and tenant token", () => {
    expect(
      pcQueryKeys.customerServiceExportTasks(
        "https://api.example.test",
        "tenant-token",
      ),
    ).toEqual([
      "pc-cs-export-tasks",
      "https://api.example.test",
      "tenant-token",
    ]);
  });

  it("scopes customer-service temp-session notes by api base url, tenant token, and session id", () => {
    expect(
      pcQueryKeys.customerServiceTempSessionNotes(
        "https://api.example.test",
        "tenant-token",
        "session-1",
      ),
    ).toEqual([
      "pc-cs-temp-session-notes",
      "https://api.example.test",
      "tenant-token",
      "session-1",
    ]);
  });
});
