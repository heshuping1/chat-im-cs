import { describe, expect, it } from "vitest";

import type {
  FriendDto,
  FriendRequestDto,
} from "../../src/renderer/data/api/types";
import {
  contactCardMessageBody,
  normalizeContactCard,
  resolveContactCardRelation,
  resolveUserRelation,
} from "../../src/renderer/messages/models/contactCardModel";

describe("contact card model", () => {
  it("normalizes server and legacy card fields into the sendable contactCard body", () => {
    const card = normalizeContactCard({
      user_id: "u-card",
      display_name: "张三",
      avatar_url: "https://assets/avatar.png",
      phone: "138****0000",
      email: "z@example.com",
    });

    expect(card).toEqual({
      userId: "u-card",
      displayName: "张三",
      avatarUrl: "https://assets/avatar.png",
      mobile: "138****0000",
      email: "z@example.com",
      subtitle: "个人名片",
    });
    expect(contactCardMessageBody(card)).toEqual({
      contactCard: {
        userId: "u-card",
        displayName: "张三",
        avatarUrl: "https://assets/avatar.png",
        mobile: "138****0000",
        email: "z@example.com",
      },
    });
  });

  it("resolves self, friend, incoming, outgoing and none relation states", () => {
    const friends: FriendDto[] = [
      { friendUserId: "friend-1", displayName: "好友" },
    ];
    const requests: FriendRequestDto[] = [
      {
        fromDisplayName: "申请我",
        fromUserId: "incoming-1",
        requestId: "req-in",
        status: "pending",
        toUserId: "me",
      },
      {
        fromDisplayName: "我",
        fromUserId: "me",
        requestId: "req-out",
        status: "pending",
        toUserId: "outgoing-1",
      },
    ];

    expect(resolveContactCardRelation({
      card: { userId: "me", displayName: "我" },
      friends,
      requests,
      userId: "me",
    })).toEqual({ status: "self" });
    expect(resolveContactCardRelation({
      card: { userId: "friend-1", displayName: "好友" },
      friends,
      requests,
      userId: "me",
    })).toEqual({ status: "friend", friendUserId: "friend-1" });
    expect(resolveContactCardRelation({
      card: { userId: "incoming-1", displayName: "申请我" },
      friends,
      requests,
      userId: "me",
    })).toEqual({ requestId: "req-in", status: "incomingPending" });
    expect(resolveContactCardRelation({
      card: { userId: "outgoing-1", displayName: "我申请" },
      friends,
      requests,
      userId: "me",
    })).toEqual({ requestId: "req-out", status: "outgoingPending" });
    expect(resolveContactCardRelation({
      card: { userId: "stranger", displayName: "陌生人" },
      friends,
      requests,
      userId: "me",
    })).toEqual({ status: "none" });
  });

  it("adapts user search relation checks to the shared contact card relation model", () => {
    expect(resolveUserRelation({
      friends: [],
      localOutgoingUserIds: ["pending-1"],
      requests: [],
      targetUserId: "pending-1",
      userId: "me",
    })).toEqual({ requestId: "local", status: "outgoingPending" });
  });
});
