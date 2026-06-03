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
      confirmLabel: "确认关闭",
      detail: "关闭后，本次服务会话将进入历史记录，输入区会变为只读。",
      riskText: "访客后续再次咨询时，将按服务端规则重新排队或生成新的客服线程。",
      title: "关闭「访客 12」的会话？",
      warningText: null,
    });
  });

  it("warns when local messages are still pending", () => {
    expect(
      createCustomerServiceCloseConfirmation({
        customerTitle: "Mouse 客户",
        pendingMessageCount: 2,
      }).warningText,
    ).toBe("当前还有 2 条消息未完成发送，建议处理后再关闭。");
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
