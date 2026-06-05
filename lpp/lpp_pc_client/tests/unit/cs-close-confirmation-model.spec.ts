import { describe, expect, it } from "vitest";

import {
  createCustomerServiceCloseConfirmation,
  countPendingCustomerServiceCloseMessages,
  shouldConfirmCustomerServiceCloseAction,
} from "../../src/renderer/customer-service/models/csCloseConfirmationModel";

describe("customer service close confirmation model", () => {
  it("requires confirmation before closing an active customer service thread", () => {
    expect(shouldConfirmCustomerServiceCloseAction("close")).toBe(true);
    expect(shouldConfirmCustomerServiceCloseAction("claim")).toBe(false);
    expect(shouldConfirmCustomerServiceCloseAction("takeover")).toBe(false);
  });

  it("summarizes the business result of closing the current service thread", () => {
    expect(
      createCustomerServiceCloseConfirmation({
        customerTitle: "访客 12",
        pendingMessageCount: 0,
      }),
    ).toEqual({
      confirmLabel: { key: "customerService.closeConfirm.confirm" },
      detail: { key: "customerService.closeConfirm.detail" },
      riskText: { key: "customerService.closeConfirm.risk" },
      title: {
        key: "customerService.closeConfirm.title",
        params: { customer: "访客 12" },
      },
      warningText: null,
    });
  });

  it("warns when local messages are still pending", () => {
    expect(
      createCustomerServiceCloseConfirmation({
        customerTitle: "Mouse 客户",
        pendingMessageCount: 2,
      }).warningText,
    ).toEqual({
      key: "customerService.closeConfirm.pendingWarning",
      params: { count: 2 },
    });
  });

  it("counts close-blocking local send states inside the close domain model", () => {
    expect(
      countPendingCustomerServiceCloseMessages([
        { messageId: "m-1", status: "sending" },
        { messageId: "m-2", status: " queued " },
        { messageId: "m-3", status: "sent" },
        { messageId: "m-4", status: "failed" },
        { messageId: "m-5" },
      ]),
    ).toBe(3);
  });
});
