import { describe, expect, it } from "vitest";

import {
  buildSpaceRadarViewModel,
  currentSpaceSidebarBadgeCount,
  spaceRadarIdentityKey,
} from "../../src/renderer/spaces/models/spaceRadarModel";
import type {
  PlatformSpaceUnreadSummaryDto,
  PlatformTenant,
} from "../../src/renderer/data/api-client";
import type { AuthSession } from "../../src/renderer/data/auth/auth-session";

describe("space radar model", () => {
  it("merges current tenant, platform spaces and unread summary with current space first", () => {
    const viewModel = buildSpaceRadarViewModel({
      authSession: session({ tenantId: "tenant-current", tenantName: "Mouse 客服中心" }),
      currentTenant: {
        tenantCode: "MOUSE",
        tenantId: "tenant-current",
        tenantName: "Mouse 客服中心",
      },
      spaces: [
        tenant("tenant-other", "TikTok 跨境售后", "TT"),
        tenant("tenant-current", "Mouse 客服中心", "MOUSE"),
      ],
      unreadSummary: {
        spaces: [
          summary("tenant-other", "TikTok 跨境售后", 5, 12),
          summary("tenant-current", "Mouse 客服中心", 2, 3),
        ],
        totalUnreadConversationCount: 7,
        totalUnreadMessageCount: 15,
        unreadSpaceCount: 2,
      },
      unreadSummaryError: null,
      reminderSnapshot: {
        items: {
          "tenant:tenant-other": {
            baselineUnreadMessageCount: 12,
            hasNewReminder: true,
            identityKey: "tenant:tenant-other",
            latestUnreadMessageCount: 13,
            newReminderCount: 1,
          },
        },
        scopeKey: "scope",
        totalNewReminderCount: 1,
      },
    });

    expect(viewModel.totalUnreadMessageCount).toBe(15);
    expect(viewModel.totalNewReminderCount).toBe(1);
    expect(viewModel.unreadSpaceCount).toBe(2);
    expect(viewModel.items.map((item) => item.identityKey)).toEqual([
      "tenant:tenant-current",
      "tenant:tenant-other",
    ]);
    expect(viewModel.items[0]).toMatchObject({
      current: true,
      displayCode: "MOUSE",
      displayName: "Mouse 客服中心",
      syncState: "synced",
      backlogUnreadConversationCount: 2,
      backlogUnreadMessageCount: 3,
      hasNewReminder: false,
      newReminderCount: 0,
      unreadConversationCount: 2,
      unreadMessageCount: 3,
    });
    expect(viewModel.items[1]).toMatchObject({
      current: false,
      displayCode: "TT",
      backlogUnreadConversationCount: 5,
      backlogUnreadMessageCount: 12,
      hasNewReminder: true,
      newReminderCount: 1,
      unreadConversationCount: 5,
      unreadMessageCount: 12,
    });
  });

  it("keeps cold-start historical unread out of new reminder counts", () => {
    const viewModel = buildSpaceRadarViewModel({
      authSession: session({ tenantId: "tenant-current", tenantName: "Mouse 测试企业" }),
      currentTenant: {
        tenantCode: "mouse-corp",
        tenantId: "tenant-current",
        tenantName: "Mouse 测试企业",
      },
      spaces: [tenant("tenant-current", "Mouse 测试企业", "mouse-corp")],
      unreadSummary: {
        spaces: [summary("tenant-current", "Mouse 测试企业", 100, 362)],
        totalUnreadConversationCount: 100,
        totalUnreadMessageCount: 362,
        unreadSpaceCount: 1,
      },
      unreadSummaryError: null,
      reminderSnapshot: {
        items: {
          "tenant:tenant-current": {
            baselineUnreadMessageCount: 362,
            hasNewReminder: false,
            identityKey: "tenant:tenant-current",
            latestUnreadMessageCount: 362,
            newReminderCount: 0,
          },
        },
        scopeKey: "scope",
        totalNewReminderCount: 0,
      },
    });

    expect(viewModel.totalUnreadMessageCount).toBe(362);
    expect(viewModel.totalNewReminderCount).toBe(0);
    expect(viewModel.items[0]).toMatchObject({
      backlogUnreadConversationCount: 100,
      backlogUnreadMessageCount: 362,
      hasNewReminder: false,
      newReminderCount: 0,
    });
  });

  it("marks cross-space new message reminders as attention targets", () => {
    const viewModel = buildSpaceRadarViewModel({
      authSession: session({ tenantId: "tenant-current", tenantName: "Mouse 客服中心" }),
      currentTenant: {
        tenantCode: "MOUSE",
        tenantId: "tenant-current",
        tenantName: "Mouse 客服中心",
      },
      spaces: [
        tenant("tenant-current", "Mouse 客服中心", "MOUSE"),
        tenant("tenant-alert", "高优先级售后", "ALERT"),
      ],
      unreadSummary: {
        spaces: [
          summary("tenant-current", "Mouse 客服中心", 0, 0),
          summary("tenant-alert", "高优先级售后", 4, 18),
        ],
        totalUnreadConversationCount: 4,
        totalUnreadMessageCount: 18,
        unreadSpaceCount: 1,
      },
      unreadSummaryError: null,
      reminderSnapshot: {
        items: {
          "tenant:tenant-alert": {
            baselineUnreadMessageCount: 15,
            hasNewReminder: true,
            identityKey: "tenant:tenant-alert",
            latestUnreadMessageCount: 18,
            newReminderCount: 3,
          },
        },
        scopeKey: "scope",
        totalNewReminderCount: 3,
      },
    });

    const alertItem = viewModel.items.find(
      (item) => item.identityKey === "tenant:tenant-alert",
    );

    expect(alertItem).toMatchObject({
      attentionLevel: "new",
      attentionText: "3 条新消息",
      hasNewReminder: true,
      newReminderCount: 3,
    });
  });

  it("builds the current space sidebar badge from visible module counters", () => {
    expect(
      currentSpaceSidebarBadgeCount({
        contactRequestCount: 0,
        imUnreadCount: 3,
        serviceAlertCount: 3,
      }),
    ).toBe(6);

    expect(
      currentSpaceSidebarBadgeCount({
        contactRequestCount: 1,
        imUnreadCount: 3.9,
        serviceAlertCount: "4" as unknown as number,
      }),
    ).toBe(8);
  });

  it("keeps personal space addressable without a tenant id", () => {
    const viewModel = buildSpaceRadarViewModel({
      authSession: session({
        roleLabel: "个人空间",
        spaceType: 1,
        tenantId: undefined,
        tenantName: undefined,
      }),
      currentTenant: null,
      spaces: [],
      unreadSummary: {
        spaces: [
          {
            hasUnread: true,
            logoUrl: null,
            spaceName: "个人空间",
            spaceType: 1,
            tenantCode: null,
            tenantId: null,
            unreadConversationCount: 1,
            unreadMessageCount: 4,
          },
        ],
        totalUnreadConversationCount: 1,
        totalUnreadMessageCount: 4,
        unreadSpaceCount: 1,
      },
      unreadSummaryError: null,
    });

    expect(viewModel.items).toHaveLength(1);
    expect(viewModel.items[0]).toMatchObject({
      canSwitch: true,
      current: true,
      displayName: "个人空间",
      identityKey: "personal",
      unreadMessageCount: 4,
    });
  });

  it("does not fake zero unread counts when unread summary failed", () => {
    const viewModel = buildSpaceRadarViewModel({
      authSession: session({ tenantId: "tenant-current" }),
      currentTenant: null,
      spaces: [tenant("tenant-other", "Brand 商城咨询", "BRAND")],
      unreadSummary: undefined,
      unreadSummaryError: new Error("network"),
    });

    expect(viewModel.syncState).toBe("error");
    expect(viewModel.totalUnreadMessageCount).toBeNull();
    expect(viewModel.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          identityKey: "tenant:tenant-other",
          syncState: "error",
          unreadConversationCount: null,
          unreadMessageCount: null,
        }),
      ]),
    );
  });

  it("sorts unread non-current spaces by unread message count", () => {
    const viewModel = buildSpaceRadarViewModel({
      authSession: session({ tenantId: "tenant-current" }),
      currentTenant: null,
      spaces: [
        tenant("tenant-current", "当前空间", "CUR"),
        tenant("tenant-low", "低优先级", "LOW"),
        tenant("tenant-high", "高优先级", "HIGH"),
      ],
      unreadSummary: {
        spaces: [
          summary("tenant-low", "低优先级", 1, 2),
          summary("tenant-high", "高优先级", 3, 18),
          summary("tenant-current", "当前空间", 1, 1),
        ],
        totalUnreadConversationCount: 5,
        totalUnreadMessageCount: 21,
        unreadSpaceCount: 3,
      },
      unreadSummaryError: null,
    });

    expect(viewModel.items.map((item) => item.identityKey)).toEqual([
      "tenant:tenant-current",
      "tenant:tenant-high",
      "tenant:tenant-low",
    ]);
  });

  it("normalizes identity keys for tenant and personal spaces", () => {
    expect(spaceRadarIdentityKey({ spaceType: 1, tenantId: null })).toBe("personal");
    expect(spaceRadarIdentityKey({ spaceType: 2, tenantId: "tenant-1" })).toBe(
      "tenant:tenant-1",
    );
  });
});

function session(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    apiBaseUrl: "https://api.example.test",
    displayName: "客服",
    platformToken: "platform-token",
    platformUserId: "platform-user-1",
    tenantToken: "tenant-token",
    ...overrides,
  };
}

function tenant(
  tenantId: string,
  tenantName: string,
  tenantCode: string,
): PlatformTenant {
  return { logoUrl: null, membershipRole: 2, tenantCode, tenantId, tenantName };
}

function summary(
  tenantId: string,
  spaceName: string,
  unreadConversationCount: number,
  unreadMessageCount: number,
): NonNullable<PlatformSpaceUnreadSummaryDto["spaces"]>[number] {
  return {
    hasUnread: unreadMessageCount > 0,
    logoUrl: null,
    spaceName,
    spaceType: 2,
    tenantCode: tenantId.toUpperCase(),
    tenantId,
    unreadConversationCount,
    unreadMessageCount,
  };
}
