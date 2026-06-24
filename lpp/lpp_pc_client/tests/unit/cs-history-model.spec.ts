import { describe, expect, it } from "vitest";

import type { StaffServiceHistoryItem } from "../../src/renderer/data/api/types";
import { staffServiceHistoryItemToThread } from "../../src/renderer/data/customer-service/cs-history-model";

describe("customer service history model", () => {
  it("keeps assigned staff identity fields for monitor avatars", () => {
    const thread = staffServiceHistoryItemToThread({
      assignedStaffAvatarUrl: "assigned-avatar.png",
      assignedStaffDisplayName: "Assigned Agent",
      assignedStaffUserId: "staff-1",
      conversationId: "conversation-1",
      customerAvatarUrl: "customer.png",
      status: "closed_timeout",
      threadId: "thread-1",
      threadType: "temp_session",
    });

    expect(thread).toMatchObject({
      assignedStaffAvatarUrl: "assigned-avatar.png",
      assignedStaffDisplayName: "Assigned Agent",
      assignedStaffUserId: "staff-1",
      customerAvatarUrl: "customer.png",
      threadId: "thread-1",
    });
  });

  it("reads nested staff snapshots when history uses object fields", () => {
    const item = {
      conversationId: "conversation-2",
      staff: {
        avatarUrl: "staff-object.png",
        displayName: "Object Agent",
        userId: "staff-2",
      },
      status: "closed",
      threadId: "thread-2",
      threadType: "temp_session",
    } as StaffServiceHistoryItem & Record<string, unknown>;

    const thread = staffServiceHistoryItemToThread(item);

    expect(thread).toMatchObject({
      assignedStaffAvatarUrl: "staff-object.png",
      assignedStaffDisplayName: "Object Agent",
      assignedStaffUserId: "staff-2",
      staffAvatarUrl: "staff-object.png",
      staffDisplayName: "Object Agent",
      staffUserId: "staff-2",
    });
  });

  it("uses last_message_at as the history thread last-message time", () => {
    const item = {
      acceptedAt: "2026-06-18T13:03:17.000Z",
      closedAt: "2026-06-18T13:13:20.000Z",
      conversationId: "conversation-visit-time",
      last_message_at: "2026-06-18T13:03:19.000Z",
      status: "closed",
      threadId: "thread-visit-time",
      threadType: "temp_session",
    } as StaffServiceHistoryItem & Record<string, unknown>;

    const thread = staffServiceHistoryItemToThread(item);

    expect(thread.lastMessageAt).toBe("2026-06-18T13:03:19.000Z");
  });
});
