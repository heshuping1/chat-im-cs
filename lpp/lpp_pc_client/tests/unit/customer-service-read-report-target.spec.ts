import { describe, expect, it } from "vitest";

import { resolveCustomerServiceReadReportTarget } from "../../src/renderer/customer-service/hooks/useCustomerServiceThreadLifecycle";

describe("resolveCustomerServiceReadReportTarget", () => {
  it("uses the customer-service conversationId and highest loaded message seq", () => {
    expect(
      resolveCustomerServiceReadReportTarget({
        detailLoaded: true,
        messages: [
          { messageId: "m1", conversationSeq: 4 },
          { messageId: "m2", conversationSeq: 9 },
          { messageId: "m3", conversationSeq: 7 },
        ],
        selectedThread: {
          conversationId: "conversation-1",
        },
        visibility: "detailVisible",
      }),
    ).toEqual({
      conversationId: "conversation-1",
      readSeq: 9,
    });
  });

  it("does not report read without visible detail or a valid loaded seq", () => {
    expect(
      resolveCustomerServiceReadReportTarget({
        detailLoaded: false,
        messages: [{ messageId: "m1", conversationSeq: 4 }],
        selectedThread: {
          conversationId: "conversation-1",
        },
        visibility: "detailVisible",
      }),
    ).toBeNull();

    expect(
      resolveCustomerServiceReadReportTarget({
        detailLoaded: true,
        messages: [{ messageId: "m1" }],
        selectedThread: {
          conversationId: "conversation-1",
        },
        visibility: "detailVisible",
      }),
    ).toBeNull();

    expect(
      resolveCustomerServiceReadReportTarget({
        detailLoaded: true,
        messages: [{ messageId: "m1", conversationSeq: 4 }],
        selectedThread: {
          conversationId: "conversation-1",
        },
        visibility: "listOnly",
      }),
    ).toBeNull();
  });
});
