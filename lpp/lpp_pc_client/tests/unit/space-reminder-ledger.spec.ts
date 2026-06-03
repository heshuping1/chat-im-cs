import { beforeEach, describe, expect, it } from "vitest";

import {
  applySpaceNoticeReminder,
  clearSpaceReminder,
  getSpaceReminderSnapshot,
  reconcileSpaceUnreadSummary,
  resetSpaceReminderLedgerForTest,
  spaceReminderScopeKey,
} from "../../src/renderer/data/spaces/space-reminder-ledger";
import type { PlatformSpaceUnreadSummaryDto } from "../../src/renderer/data/api-client";

describe("space reminder ledger", () => {
  const scopeKey = spaceReminderScopeKey("https://api.example.test", "platform-token");

  beforeEach(() => {
    resetSpaceReminderLedgerForTest();
  });

  it("uses the first unread summary as a baseline without creating reminders", () => {
    reconcileSpaceUnreadSummary(scopeKey, summary("tenant-a", 100, 362));

    const snapshot = getSpaceReminderSnapshot(scopeKey);

    expect(snapshot.totalNewReminderCount).toBe(0);
    expect(snapshot.items["tenant:tenant-a"]).toMatchObject({
      baselineUnreadMessageCount: 362,
      hasNewReminder: false,
      latestUnreadMessageCount: 362,
      newReminderCount: 0,
    });
  });

  it("turns a space.notice target count above baseline into a delta reminder", () => {
    reconcileSpaceUnreadSummary(scopeKey, summary("tenant-a", 100, 362));

    applySpaceNoticeReminder(scopeKey, {
      spaceType: 2,
      targetUnreadMessageCount: 363,
      tenantId: "tenant-a",
    });

    const snapshot = getSpaceReminderSnapshot(scopeKey);
    expect(snapshot.totalNewReminderCount).toBe(1);
    expect(snapshot.items["tenant:tenant-a"]).toMatchObject({
      baselineUnreadMessageCount: 362,
      latestUnreadMessageCount: 363,
      newReminderCount: 1,
    });
  });

  it("does not treat a notice without baseline as the full target unread count", () => {
    applySpaceNoticeReminder(scopeKey, {
      spaceType: 2,
      targetUnreadMessageCount: 363,
      tenantId: "tenant-a",
    });

    const snapshot = getSpaceReminderSnapshot(scopeKey);
    expect(snapshot.totalNewReminderCount).toBe(1);
    expect(snapshot.items["tenant:tenant-a"]).toMatchObject({
      baselineUnreadMessageCount: null,
      latestUnreadMessageCount: 363,
      newReminderCount: 1,
    });
  });

  it("creates reminders when a later summary grows beyond the baseline", () => {
    reconcileSpaceUnreadSummary(scopeKey, summary("tenant-a", 2, 10));

    reconcileSpaceUnreadSummary(scopeKey, summary("tenant-a", 3, 14));

    const snapshot = getSpaceReminderSnapshot(scopeKey);
    expect(snapshot.items["tenant:tenant-a"]).toMatchObject({
      baselineUnreadMessageCount: 10,
      latestUnreadMessageCount: 14,
      newReminderCount: 4,
    });
  });

  it("clears new reminders after switching while keeping latest unread as baseline", () => {
    reconcileSpaceUnreadSummary(scopeKey, summary("tenant-a", 2, 10));
    applySpaceNoticeReminder(scopeKey, {
      spaceType: 2,
      targetUnreadMessageCount: 12,
      tenantId: "tenant-a",
    });

    clearSpaceReminder(scopeKey, "tenant:tenant-a");

    const snapshot = getSpaceReminderSnapshot(scopeKey);
    expect(snapshot.totalNewReminderCount).toBe(0);
    expect(snapshot.items["tenant:tenant-a"]).toMatchObject({
      baselineUnreadMessageCount: 12,
      latestUnreadMessageCount: 12,
      newReminderCount: 0,
    });
  });
});

function summary(
  tenantId: string,
  unreadConversationCount: number,
  unreadMessageCount: number,
): PlatformSpaceUnreadSummaryDto {
  return {
    spaces: [
      {
        hasUnread: unreadMessageCount > 0,
        logoUrl: null,
        spaceName: tenantId,
        spaceType: 2,
        tenantCode: tenantId.toUpperCase(),
        tenantId,
        unreadConversationCount,
        unreadMessageCount,
      },
    ],
    totalUnreadConversationCount: unreadConversationCount,
    totalUnreadMessageCount: unreadMessageCount,
    unreadSpaceCount: unreadMessageCount > 0 ? 1 : 0,
  };
}
