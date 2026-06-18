import { describe, expect, it } from "vitest";

import {
  createCustomerServiceTransferRecordViewModels,
  normalizeCustomerServiceTransferRecordFromGateway,
  normalizeCustomerServiceTransferRecordsFromDetail,
} from "../../src/renderer/data/customer-service/cs-transfer-records";

describe("customer-service transfer records", () => {
  it("normalizes transfer history and event timeline records from explicit API fields", () => {
    const records = normalizeCustomerServiceTransferRecordsFromDetail(
      {
        events: [
          {
            eventId: "message-event",
            eventType: "message_sent",
            reason: "must not be parsed as transfer",
          },
          {
            createdAt: "2026-06-17T09:00:00.000Z",
            detail: {
              fromStaffUserId: "staff-07",
              reason: "needs second-line support",
              toStaffUserId: "staff-10",
            },
            eventId: "transfer-event-1",
            eventType: "temp_session.transferred",
          },
        ],
        transferHistory: [
          {
            fromStaffUserId: "staff-10",
            reason: "customer requested senior agent",
            toStaffUserId: "staff-12",
            transferId: "transfer-history-1",
            transferredAt: "2026-06-17T10:00:00.000Z",
          },
        ],
      },
      {
        conversationId: "conversation-1",
        threadId: "thread-1",
        threadType: "temp_session",
      },
    );

    expect(records).toHaveLength(2);
    expect(records).toEqual([
      expect.objectContaining({
        recordId: "transfer-event-1",
        fromStaffUserId: "staff-07",
        reason: "needs second-line support",
        toStaffUserId: "staff-10",
        transferredAt: "2026-06-17T09:00:00.000Z",
      }),
      expect.objectContaining({
        recordId: "transfer-history-1",
        fromStaffUserId: "staff-10",
        reason: "customer requested senior agent",
        toStaffUserId: "staff-12",
        transferredAt: "2026-06-17T10:00:00.000Z",
      }),
    ]);
  });

  it("projects dialog records newest first and exposes contract issues", () => {
    const viewModels = createCustomerServiceTransferRecordViewModels({
      formatTransferredAt: (value) => `formatted:${value}`,
      records: [
        {
          recordId: "old",
          fromStaffUserId: "staff-1",
          reason: "old reason",
          toStaffUserId: "staff-2",
          transferredAt: "2026-06-17T09:00:00.000Z",
        },
        {
          recordId: "new",
          fromStaffUserId: "",
          reason: null,
          toStaffUserId: "",
          transferredAt: null,
        },
      ],
    });

    expect(viewModels[0]).toMatchObject({
      recordId: "old",
      reason: "old reason",
      transferredAtText: "formatted:2026-06-17T09:00:00.000Z",
    });
    expect(viewModels[1]).toMatchObject({
      recordId: "new",
      reason: undefined,
      transferredAtText: undefined,
    });
    expect(viewModels[1].contractIssues).toEqual([
      expect.objectContaining({
        code: "cs.transfer_record.from_staff_user_id_missing",
        field: "fromStaffUserId",
        level: "warning",
      }),
      expect.objectContaining({
        code: "cs.transfer_record.to_staff_user_id_missing",
        field: "toStaffUserId",
        level: "warning",
      }),
      expect.objectContaining({
        code: "cs.transfer_record.transferred_at_missing",
        field: "transferredAt",
        level: "warning",
      }),
    ]);
  });

  it("normalizes realtime gateway transfer payload without message text inference", () => {
    const record = normalizeCustomerServiceTransferRecordFromGateway(
      {
        fromStaffUserId: "staff-07",
        reason: "handoff context",
        status: "transferred_out",
        threadId: "thread-1",
        toStaffUserId: "staff-10",
        transferredAt: "2026-06-17T09:10:00.000Z",
      },
      {
        threadId: "thread-1",
        threadType: "im_direct",
      },
    );

    expect(record).toMatchObject({
      fromStaffUserId: "staff-07",
      reason: "handoff context",
      threadId: "thread-1",
      threadType: "im_direct",
      toStaffUserId: "staff-10",
      transferredAt: "2026-06-17T09:10:00.000Z",
    });
  });
});
