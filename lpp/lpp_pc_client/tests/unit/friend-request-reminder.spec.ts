import { describe, expect, it } from "vitest";
import type { FriendRequestDto } from "../../src/renderer/data/api/types";
import {
  buildFriendRequestReminder,
  friendRequestReminderKey,
  pendingIncomingFriendRequests,
  shouldSuppressFriendRequestReminder,
} from "../../src/renderer/contacts/models/friendRequestReminderModel";
import { defaultPcSettings } from "../../src/renderer/data/settings/pc-settings";

describe("friend request reminder model", () => {
  it("counts only pending incoming friend requests", () => {
    const requests: FriendRequestDto[] = [
      request({ requestId: "incoming-1", status: "pending", toUserId: "me" }),
      request({ requestId: "incoming-2", status: undefined, toUserId: undefined }),
      request({ requestId: "outgoing", fromUserId: "me", toUserId: "u2" }),
      request({ requestId: "accepted", status: "accepted", toUserId: "me" }),
    ];

    expect(pendingIncomingFriendRequests(requests, "me").map((item) => item.requestId)).toEqual([
      "incoming-1",
      "incoming-2",
    ]);
  });

  it("builds a contacts-targeted reminder without leaking request messages", () => {
    const reminder = buildFriendRequestReminder(
      request({
        fromDisplayName: "张三",
        message: "这是我的手机号 13800000000",
        requestId: "r1",
      }),
    );

    expect(reminder).toEqual({
      id: "friend-request-r1",
      title: "新的好友申请",
      body: "张三想添加你为好友",
      targetModule: "contacts",
      targetId: "requests",
      severity: "info",
      icon: "contacts",
    });
  });

  it("uses stable request keys and suppresses reminders in the request review view", () => {
    expect(friendRequestReminderKey(request({ requestId: "r2", fromUserId: "u2" }))).toBe("r2");
    expect(friendRequestReminderKey(request({ requestId: "", fromUserId: "u3" }))).toBe("from:u3");
    expect(shouldSuppressFriendRequestReminder({
      activeModule: "contacts",
      contactFilter: "requests",
      settings: defaultPcSettings,
    })).toBe(true);
    expect(shouldSuppressFriendRequestReminder({
      activeModule: "messages",
      contactFilter: "all",
      settings: { ...defaultPcSettings, imNotifications: false },
    })).toBe(true);
    expect(shouldSuppressFriendRequestReminder({
      activeModule: "messages",
      contactFilter: "all",
      settings: defaultPcSettings,
    })).toBe(false);
  });
});

function request(overrides: Partial<FriendRequestDto>): FriendRequestDto {
  return {
    fromDisplayName: "申请人",
    fromUserId: "u1",
    requestId: "r1",
    status: "pending",
    ...overrides,
  };
}
