import { describe, expect, it } from "vitest";

import {
  buildCustomerServiceNotificationPresentation,
  customerServiceNotificationPreview,
} from "../../src/renderer/data/customer-service/cs-notification-presentation";
import type { MessageItemDto } from "../../src/renderer/data/api/types";

describe("customer service notification presentation", () => {
  it("builds a visitor text notification from thread and sender", () => {
    expect(
      buildCustomerServiceNotificationPresentation({
        message: message({
          body: { text: "2222" },
          direction: "in",
          senderDisplayName: "访客",
        }),
        thread: {
          threadId: "t1",
          title: "目标-Fuyuan（富元）",
        },
      }),
    ).toMatchObject({
      avatarLabel: "目",
      body: "访客: 2222",
      preview: "2222",
      senderLabel: "访客",
      targetId: "t1",
      title: "目标-Fuyuan（富元）",
    });
  });

  it("uses readable media placeholders", () => {
    expect(customerServiceNotificationPreview(message({ messageType: "image" }))).toBe("[图片]");
    expect(customerServiceNotificationPreview(message({ messageType: "file" }))).toBe("[文件]");
  });

  it("prioritizes group or source avatars before visitor avatars", () => {
    expect(
      buildCustomerServiceNotificationPresentation({
        message: message({
          avatarUrl: "visitor.png",
          senderAvatarUrl: "sender.png",
        }),
        payload: {
          groupAvatarUrl: "group.png",
          customerAvatarUrl: "customer.png",
        },
        thread: {
          avatarUrl: "thread.png",
          customerAvatarUrl: "thread-customer.png",
          title: "群来源访客",
        },
      }),
    ).toMatchObject({
      avatarLabel: "群",
      avatarUrl: "group.png",
      title: "群来源访客",
    });

    expect(
      buildCustomerServiceNotificationPresentation({
        message: message({
          avatarUrl: "visitor.png",
          senderAvatarUrl: "sender.png",
        }),
        payload: {
          groupIconUrl: "group-icon.png",
          customerAvatarUrl: "customer.png",
        },
      }),
    ).toMatchObject({
      avatarUrl: "group-icon.png",
    });

    expect(
      buildCustomerServiceNotificationPresentation({
        message: message({ senderAvatarUrl: "sender.png" }),
        thread: {
          avatarUrl: "thread.png",
          title: "来源会话",
        },
      }),
    ).toMatchObject({
      avatarUrl: "thread.png",
    });
  });

  it("falls back to visitor avatar and keeps label when no image exists", () => {
    expect(
      buildCustomerServiceNotificationPresentation({
        message: message({ senderAvatarUrl: "visitor.png" }),
        thread: { title: "访客A" },
      }),
    ).toMatchObject({
      avatarLabel: "访",
      avatarUrl: "visitor.png",
    });

    expect(
      buildCustomerServiceNotificationPresentation({
        thread: { title: "无头像访客" },
      }),
    ).toMatchObject({
      avatarLabel: "无",
      avatarUrl: null,
    });
  });

  it("falls back when title or sender is missing", () => {
    expect(
      buildCustomerServiceNotificationPresentation({
        message: message({ body: { text: "hello" }, direction: "out" }),
      }),
    ).toMatchObject({
      body: "hello",
      preview: "hello",
      title: "在线客服新消息",
    });
  });
});

function message(overrides: Partial<MessageItemDto>): MessageItemDto {
  return {
    messageId: "m1",
    messageType: "text",
    ...overrides,
  };
}
