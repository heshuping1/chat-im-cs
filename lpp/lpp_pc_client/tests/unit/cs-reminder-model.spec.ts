import { describe, expect, it, beforeEach } from "vitest";

import type { MessageItemDto } from "../../src/renderer/data/api/types";
import {
  consumeCustomerServiceMessageReminder,
  customerServiceMessageReminderKey,
  isMineCustomerServiceMessage,
  resetCustomerServiceMessageReminderDedupeForTest,
} from "../../src/renderer/data/customer-service/cs-reminder-model";

describe("customer service reminder model", () => {
  beforeEach(() => {
    resetCustomerServiceMessageReminderDedupeForTest();
  });

  it("does not notify for staff messages sent by the current account", () => {
    const identity = { displayName: "Agent", lppId: "lpp-1", platformUserId: "platform-1", userId: "staff-1" };

    expect(isMineCustomerServiceMessage(message({ senderUserId: "staff-1" }), identity)).toBe(true);
    expect(isMineCustomerServiceMessage(message({ direction: "out" }), identity)).toBe(true);
    expect(isMineCustomerServiceMessage(message({ isSelf: true }), identity)).toBe(true);
    expect(
      consumeCustomerServiceMessageReminder({
        identity,
        message: message({ messageId: "self-1", senderUserId: "staff-1" }),
        source: "gateway",
        targetId: "thread-1",
      }),
    ).toMatchObject({
      shouldNotify: false,
      skippedReason: "self_message",
    });
  });

  it("deduplicates the same visitor message across gateway, detail and thread sources", () => {
    const visitorMessage = message({
      direction: "in",
      messageId: "visitor-1",
      senderUserId: "visitor-1",
    });

    expect(
      consumeCustomerServiceMessageReminder({
        message: visitorMessage,
        source: "gateway",
        targetId: "thread-1",
      }),
    ).toMatchObject({
      reminderId: `cs-reminder-${customerServiceMessageReminderKey(visitorMessage, "thread-1")}`,
      shouldNotify: true,
    });
    expect(
      consumeCustomerServiceMessageReminder({
        message: visitorMessage,
        source: "detail",
        targetId: "thread-1",
      }),
    ).toMatchObject({
      shouldNotify: false,
      skippedReason: "duplicate",
    });
    expect(
      consumeCustomerServiceMessageReminder({
        message: visitorMessage,
        source: "thread",
        targetId: "thread-1",
      }),
    ).toMatchObject({
      shouldNotify: false,
      skippedReason: "duplicate",
    });
  });

  it("keeps different visitor messages independently notifiable", () => {
    expect(
      consumeCustomerServiceMessageReminder({
        message: message({ messageId: "visitor-1", senderUserId: "visitor-1" }),
        source: "gateway",
        targetId: "thread-1",
      }).shouldNotify,
    ).toBe(true);
    expect(
      consumeCustomerServiceMessageReminder({
        message: message({ messageId: "visitor-2", senderUserId: "visitor-1" }),
        source: "gateway",
        targetId: "thread-1",
      }).shouldNotify,
    ).toBe(true);
  });
});

function message(overrides: Partial<MessageItemDto>): MessageItemDto {
  return {
    body: { text: "hello" },
    conversationId: "thread-1",
    messageId: "message-1",
    messageType: "text",
    preview: "hello",
    ...overrides,
  };
}
