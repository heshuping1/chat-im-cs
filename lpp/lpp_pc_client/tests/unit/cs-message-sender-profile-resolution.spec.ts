import { describe, expect, it } from "vitest";

import type { MessageItemDto, TenantMemberDto } from "../../src/renderer/data/api-client";
import { customerServiceStaffSenderProfileTargetIds } from "../../src/renderer/data/customer-service/cs-message-sender-profile-resolution";

describe("customer service message sender profile resolution", () => {
  it("requests profiles only for staff senderUserIds missing from local contact avatars", () => {
    const messages = [
      staffMessage("m-current", "staff-current"),
      staffMessage("m-known", "staff-known"),
      staffMessage("m-missing", "staff-missing"),
      staffMessage("m-missing-duplicate", "staff-missing"),
      {
        messageId: "m-visitor",
        senderRole: "visitor",
        senderUserId: "visitor-1",
      } as MessageItemDto,
      {
        messageId: "m-system",
        messageType: "notice",
        senderUserId: "system-1",
      } as MessageItemDto,
    ];

    expect(
      customerServiceStaffSenderProfileTargetIds({
        currentUserIds: ["staff-current"],
        messages,
        tenantMembers: [
          {
            avatarUrl: "known.png",
            displayName: "Known Staff",
            userId: "staff-known",
          } as TenantMemberDto,
        ],
      }),
    ).toEqual(["staff-missing"]);
  });

  it("refreshes staff profiles when local contacts exist without avatars", () => {
    expect(
      customerServiceStaffSenderProfileTargetIds({
        messages: [staffMessage("m1", "staff-no-avatar")],
        tenantMembers: [
          {
            avatarUrl: "",
            displayName: "Staff Without Avatar",
            userId: "staff-no-avatar",
          } as TenantMemberDto,
        ],
      }),
    ).toEqual(["staff-no-avatar"]);
  });
});

function staffMessage(messageId: string, senderUserId: string) {
  return {
    messageId,
    senderRole: "staff_reply",
    senderUserId,
  } as MessageItemDto;
}
