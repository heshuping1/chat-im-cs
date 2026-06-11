import { describe, expect, it } from "vitest";

import type {
  CustomerServiceStaffStatusDto,
  CustomerServiceThread,
  MessageItemDto,
} from "../../src/renderer/data/api/types";
import { createCustomerServiceStaffProfileViewModel } from "../../src/renderer/data/customer-service/cs-staff-profile-view-model";

describe("customer service staff profile view model", () => {
  it("prefers the live staff list avatar for an assigned thread", () => {
    const profile = createCustomerServiceStaffProfileViewModel({
      staffItems: [
        staff({
          avatarUrl: "staff-list.png",
          displayName: "Agent A",
          staffUserId: "staff-1",
        }),
      ],
      thread: thread({
        assignedStaffAvatarUrl: "thread-staff.png",
        assignedStaffName: "Thread agent",
        assignedStaffUserId: "staff-1",
      }),
    });

    expect(profile).toMatchObject({
      avatarUrl: "staff-list.png",
      displayName: "Thread agent",
      isAssigned: true,
      staffUserId: "staff-1",
    });
  });

  it("uses direct thread staff avatar fields when staff list misses", () => {
    const profile = createCustomerServiceStaffProfileViewModel({
      thread: thread({
        assignedStaffAvatarUrl: "direct.png",
        assignedStaffDisplayName: "Direct agent",
        assignedStaffUserId: "staff-2",
      }),
    });

    expect(profile).toMatchObject({
      avatarUrl: "direct.png",
      displayName: "Direct agent",
      isAssigned: true,
      staffUserId: "staff-2",
    });
  });

  it("falls back to the latest staff message snapshot", () => {
    const profile = createCustomerServiceStaffProfileViewModel({
      messages: [
        message({ senderAvatarUrl: "customer.png", senderRole: "customer" }),
        message({
          senderAvatarUrl: "staff-message.png",
          senderDisplayName: "Message agent",
          senderRole: "staff",
          senderUserId: "staff-3",
        }),
      ],
      thread: thread(),
    });

    expect(profile).toMatchObject({
      avatarUrl: "staff-message.png",
      displayName: "Message agent",
      isAssigned: true,
      staffUserId: "staff-3",
    });
  });

  it("does not create a fake assigned staff profile for queued threads", () => {
    const profile = createCustomerServiceStaffProfileViewModel({
      thread: thread({ status: "queued" }),
    });

    expect(profile).toMatchObject({
      avatarUrl: null,
      displayName: "--",
      isAssigned: false,
      staffUserId: "",
    });
  });
});

function thread(overrides: Partial<CustomerServiceThread> = {}): CustomerServiceThread {
  return {
    conversationId: "thread-1",
    status: "active",
    threadId: "thread-1",
    threadType: "temp_session",
    title: "Visitor",
    ...overrides,
  };
}

function staff(
  overrides: Partial<CustomerServiceStaffStatusDto> = {},
): CustomerServiceStaffStatusDto {
  return {
    staffUserId: "staff-1",
    ...overrides,
  };
}

function message(overrides: Partial<MessageItemDto> & Record<string, unknown>): MessageItemDto {
  return {
    messageId: "message-1",
    ...overrides,
  } as MessageItemDto;
}
