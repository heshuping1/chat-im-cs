import { describe, expect, it } from "vitest";

import type { CustomerServiceThreadDetailDto, MessageItemDto } from "../../src/renderer/data/api/types";
import {
  applyCustomerServiceReadStatusToMessages,
  createCustomerServiceGatewayReadStatus,
  customerServiceMessageReadReceiptState,
  customerServiceReadStatusFromDirectStatus,
  mergeCustomerServiceReadStatuses,
  mergeCustomerServiceThreadDetailReadStatus,
} from "../../src/renderer/data/customer-service/cs-message-read-status";

describe("customer service message read status", () => {
  it("marks visitor messages from the staff read sequence", () => {
    const messages = [
      createMessage("visitor-read", 12, "visitor-1", "inbound"),
      createMessage("visitor-unread", 13, "visitor-1", "inbound"),
    ];
    const result = applyCustomerServiceReadStatusToMessages(
      createDetail({
        visitorUserId: "visitor-1",
        customerLastReadSeq: 0,
        staffLastReadSeq: 12,
      }),
      messages,
    );

    expect(result[0]).toMatchObject({
      isRead: true,
      readAt: "2026-06-11T10:00:00.000Z",
      readCount: 1,
    });
    expect(result[1]).toMatchObject({
      isRead: false,
      readAt: null,
      readCount: 0,
    });
  });

  it("marks staff messages from the customer read sequence", () => {
    const messages = [
      createMessage("staff-read", 8, "staff-1", "outbound"),
      createMessage("staff-unread", 9, "staff-1", "outbound"),
    ];
    const result = applyCustomerServiceReadStatusToMessages(
      createDetail({
        visitorUserId: "visitor-1",
        customerLastReadSeq: 8,
        staffLastReadSeq: 20,
      }),
      messages,
    );

    expect(result[0]).toMatchObject({
      isRead: true,
      readAt: "2026-06-11T09:00:00.000Z",
      readCount: 1,
    });
    expect(result[1]).toMatchObject({
      isRead: false,
      readAt: null,
      readCount: 0,
    });
  });

  it("merges detail, read-status query and realtime read status by highest sequence", () => {
    const detail = createDetail({
      visitorUserId: "visitor-1",
      customerLastReadSeq: 5,
      staffLastReadSeq: 20,
    });
    const queryStatus = {
      members: [
        {
          lastReadAt: "2026-06-11T09:05:00.000Z",
          lastReadSeq: 7,
          userId: "visitor-1",
        },
      ],
      visitorUserId: "visitor-1",
    };
    const realtimeStatus = createCustomerServiceGatewayReadStatus({
      readAt: "2026-06-11T09:06:00.000Z",
      readSeq: 9,
      readerUserId: "visitor-1",
      sessionId: "thread-1",
      visitorUserId: "visitor-1",
    });

    const mergedStatus = mergeCustomerServiceReadStatuses(
      detail.readStatus,
      queryStatus,
      realtimeStatus,
    );
    const mergedDetail = mergeCustomerServiceThreadDetailReadStatus(detail, mergedStatus);
    const result = applyCustomerServiceReadStatusToMessages(
      mergedDetail,
      [
        createMessage("staff-read", 9, "staff-1", "outbound"),
        createMessage("staff-unread", 10, "staff-1", "outbound"),
      ],
    );

    expect(result[0]).toMatchObject({
      isRead: true,
      readAt: "2026-06-11T09:06:00.000Z",
    });
    expect(result[1]).toMatchObject({
      isRead: false,
      readAt: null,
    });
  });

  it("normalizes direct customer-service read-status into the shared read status shape", () => {
    const status = customerServiceReadStatusFromDirectStatus(
      {
        peerLastReadAt: null,
        peerLastReadSeq: 11,
      },
      "direct-1",
    );
    const result = applyCustomerServiceReadStatusToMessages(
      { readStatus: status },
      [createMessage("staff-direct-read", 11, "staff-1", "outbound")],
    );

    expect(result[0]).toMatchObject({
      isRead: true,
      readAt: null,
      readCount: 1,
    });
    expect(customerServiceMessageReadReceiptState(result[0], true, "im_direct")).toBe("unknown");
  });
});

function createMessage(
  messageId: string,
  conversationSeq: number,
  senderUserId: string,
  direction: string,
): MessageItemDto {
  return {
    body: { text: messageId },
    conversationSeq,
    direction,
    messageId,
    messageType: "text",
    preview: messageId,
    senderUserId,
    sentAt: "2026-06-11T08:00:00.000Z",
    status: "sent",
  };
}

function createDetail({
  customerLastReadSeq,
  staffLastReadSeq,
  visitorUserId,
}: {
  customerLastReadSeq: number;
  staffLastReadSeq: number;
  visitorUserId: string;
}): CustomerServiceThreadDetailDto {
  return {
    messages: [],
    readStatus: {
      members: [
        {
          lastReadAt: "2026-06-11T09:00:00.000Z",
          lastReadSeq: customerLastReadSeq,
          userId: visitorUserId,
        },
        {
          lastReadAt: "2026-06-11T10:00:00.000Z",
          lastReadSeq: staffLastReadSeq,
          userId: "staff-1",
        },
      ],
      visitorUserId,
    },
    thread: {
      threadId: "thread-1",
      threadType: "temp_session",
      status: "active",
      title: "Visitor",
    },
  } as CustomerServiceThreadDetailDto;
}
