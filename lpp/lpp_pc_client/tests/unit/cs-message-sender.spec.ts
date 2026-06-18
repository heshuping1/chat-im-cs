import { describe, expect, it } from "vitest";
import {
  isCustomerServiceStaffSideMessage,
  isCustomerServiceSystemMessage,
  resolveCustomerServiceMessageAvatarFallbackName,
  resolveCustomerServiceMessageAvatarUrl,
  resolveCustomerServiceMessageSender,
} from "../../src/renderer/data/customer-service/message-domain";

describe("customer service message sender domain", () => {
  it("uses API senderRole to classify visitor and staff messages", () => {
    expect(
      resolveCustomerServiceMessageSender({
        senderDisplayName: "Visitor",
        senderRole: "visitor",
      }),
    ).toMatchObject({
      displayName: "Visitor",
      kind: "visitor",
      missingDisplayName: false,
      missingRole: false,
    });

    expect(
      resolveCustomerServiceMessageSender({
        senderDisplayName: "Customer Service 10",
        senderRole: "staff_reply",
      }),
    ).toMatchObject({
      displayName: "Customer Service 10",
      kind: "staff",
      missingDisplayName: false,
      missingRole: false,
    });
  });

  it("does not fabricate a staff display name when API omits senderDisplayName", () => {
    expect(
      resolveCustomerServiceMessageSender({
        senderRole: "staff_reply",
      }),
    ).toMatchObject({
      displayName: undefined,
      kind: "staff",
      missingDisplayName: true,
      missingRole: false,
    });
  });

  it("classifies system messages only from API role, type, or direction", () => {
    expect(isCustomerServiceSystemMessage({ senderRole: "system" })).toBe(true);
    expect(isCustomerServiceSystemMessage({ messageType: "notice" })).toBe(true);
    expect(isCustomerServiceSystemMessage({ direction: "system" })).toBe(true);
    expect(
      isCustomerServiceSystemMessage({
        messageType: "text",
        senderDisplayName: "Visitor",
        senderRole: "visitor",
      }),
    ).toBe(false);
  });

  it("places API staff-side customer-service messages on the mine side", () => {
    expect(isCustomerServiceStaffSideMessage({ senderRole: "staff_reply" })).toBe(true);
    expect(isCustomerServiceStaffSideMessage({ senderRole: "staff" })).toBe(true);
    expect(isCustomerServiceStaffSideMessage({ fromRole: "operator" })).toBe(true);
    expect(isCustomerServiceStaffSideMessage({ senderRole: "ai_bot" })).toBe(true);
    expect(isCustomerServiceStaffSideMessage({ senderRole: "manager_intervention" })).toBe(true);
  });

  it("keeps visitor and system customer-service messages off the mine side", () => {
    expect(isCustomerServiceStaffSideMessage({ senderRole: "visitor" })).toBe(false);
    expect(isCustomerServiceStaffSideMessage({ messageType: "notice" })).toBe(false);
    expect(isCustomerServiceStaffSideMessage({ direction: "system" })).toBe(false);
  });

  it("uses explicit API self and outgoing direction as customer-service staff-side signals", () => {
    expect(isCustomerServiceStaffSideMessage({ isSelf: true })).toBe(true);
    expect(isCustomerServiceStaffSideMessage({ isMine: true })).toBe(true);
    expect(isCustomerServiceStaffSideMessage({ direction: "outgoing" })).toBe(true);
  });

  it("uses API sender avatars for staff-side messages before the current staff avatar", () => {
    expect(
      resolveCustomerServiceMessageAvatarUrl({
        currentStaffAvatarUrl: "current-staff.png",
        senderAvatarUrl: "staff-10.png",
        senderRole: "staff_reply",
      }),
    ).toBe("staff-10.png");

    expect(
      resolveCustomerServiceMessageAvatarUrl({
        currentStaffAvatarUrl: "current-staff.png",
        senderRole: "staff_reply",
        staffAvatarUrl: "staff-profile.png",
      }),
    ).toBe("staff-profile.png");
  });

  it("uses sender profile avatars for staff-side messages before message avatar snapshots", () => {
    expect(
      resolveCustomerServiceMessageAvatarUrl({
        senderAvatarUrl: "message-snapshot.png",
        senderProfileAvatarUrl: "profile-staff.png",
        senderRole: "staff_reply",
      }),
    ).toBe("profile-staff.png");
  });

  it("does not replace transferred staff messages with the current staff avatar when API omits the sender avatar", () => {
    expect(
      resolveCustomerServiceMessageAvatarUrl({
        currentStaffAvatarUrl: "current-staff.png",
        senderRole: "staff_reply",
      }),
    ).toBeNull();
  });

  it("allows the current staff avatar only for API-explicit self messages", () => {
    expect(
      resolveCustomerServiceMessageAvatarUrl({
        currentStaffAvatarUrl: "current-staff.png",
        isSelf: true,
        senderRole: "staff_reply",
      }),
    ).toBe("current-staff.png");
  });

  it("uses visitor API avatars before the thread customer avatar", () => {
    expect(
      resolveCustomerServiceMessageAvatarUrl({
        avatarUrl: "visitor-message.png",
        customerAvatarUrl: "thread-customer.png",
        senderRole: "visitor",
      }),
    ).toBe("visitor-message.png");

    expect(
      resolveCustomerServiceMessageAvatarUrl({
        customerAvatarUrl: "thread-customer.png",
        senderRole: "visitor",
      }),
    ).toBe("thread-customer.png");
  });

  it("uses API sender display names as customer-service avatar fallback names", () => {
    expect(
      resolveCustomerServiceMessageAvatarFallbackName({
        senderDisplayName: "mouse客服123",
        senderRole: "staff_reply",
      }),
    ).toBe("mouse客服123");

    expect(
      resolveCustomerServiceMessageAvatarFallbackName({
        senderDisplayName: "mouse客服1",
        senderRole: "staff_reply",
      }),
    ).toBe("mouse客服1");
  });
});
