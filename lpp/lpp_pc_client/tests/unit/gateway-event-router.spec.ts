import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  rememberCustomerServiceConversationIndex,
  resetCustomerServiceConversationIndexForTest,
} from "../../src/renderer/data/customer-service/cs-conversation-index";

const mocks = vi.hoisted(() => ({
  applySpaceNoticeReminder: vi.fn(),
  mergeCustomerServiceGatewayMessage: vi.fn(),
  mergeImGatewayMessage: vi.fn(),
  mergeReadEvent: vi.fn(),
  notifyCustomerServiceQueue: vi.fn(),
  spaceReminderScopeKey: vi.fn(
    (apiBaseUrl?: string, platformToken?: string) =>
      `scope:${apiBaseUrl ?? ""}:${platformToken ?? ""}`,
  ),
}));

vi.mock("../../src/renderer/data/gateway/gateway-cs-side-effects", () => ({
  mergeCustomerServiceGatewayMessage: mocks.mergeCustomerServiceGatewayMessage,
  notifyCustomerServiceQueue: mocks.notifyCustomerServiceQueue,
}));

vi.mock("../../src/renderer/data/gateway/gateway-im-side-effects", () => ({
  mergeImGatewayMessage: mocks.mergeImGatewayMessage,
  mergeReadEvent: mocks.mergeReadEvent,
}));

vi.mock("../../src/renderer/data/spaces/space-reminder-ledger", () => ({
  applySpaceNoticeReminder: mocks.applySpaceNoticeReminder,
  spaceReminderScopeKey: mocks.spaceReminderScopeKey,
}));

describe("createGatewayEventRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCustomerServiceConversationIndexForTest();
  });

  it("routes msg.new temp-session messages to customer service without touching IM conversations", async () => {
    const { createGatewayEventRouter } = await import(
      "../../src/renderer/data/gateway/gateway-event-router"
    );
    const queryClient = {
      clear: vi.fn(),
      invalidateQueries: vi.fn(),
    };
    const router = createGatewayEventRouter({
      clearAuthSession: vi.fn(),
      queryClient: queryClient as never,
      session: {} as never,
      setCustomerServiceStatus: vi.fn(),
    });

    router.handleEvent("msg.new", [
      {
        data: {
          message: {
            conversationId: "thread-1",
            conversationType: "temp_session",
            conversationSeq: 9,
            messageId: "m1",
            messageType: "text",
            senderRole: "visitor",
            body: { text: "hello" },
          },
        },
      },
    ]);

    expect(mocks.mergeCustomerServiceGatewayMessage).toHaveBeenCalledWith(
      queryClient,
      expect.objectContaining({
        message: expect.objectContaining({ conversationType: "temp_session" }),
      }),
      "thread-1",
    );
    expect(mocks.mergeImGatewayMessage).not.toHaveBeenCalled();
    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: ["pc-im-conversations"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["pc-cs-workbench-threads"],
    });
  });

  it("routes sourceType im direct messages to IM before customer-service handling", async () => {
    const { createGatewayEventRouter } = await import(
      "../../src/renderer/data/gateway/gateway-event-router"
    );
    const queryClient = {
      clear: vi.fn(),
      invalidateQueries: vi.fn(),
    };
    const router = createGatewayEventRouter({
      clearAuthSession: vi.fn(),
      queryClient: queryClient as never,
      session: {} as never,
      setCustomerServiceStatus: vi.fn(),
    });

    router.handleEvent("msg.new", [
      {
        data: {
          message: {
            conversationId: "direct-source-im",
            conversationType: "direct",
            conversationSeq: 11,
            messageId: "m-source-im",
            messageType: "text",
            senderUserId: "user-1",
            sourceType: "im",
            body: { text: "hello" },
          },
        },
      },
    ]);

    expect(mocks.mergeCustomerServiceGatewayMessage).not.toHaveBeenCalled();
    expect(mocks.mergeImGatewayMessage).toHaveBeenCalledWith(
      queryClient,
      expect.objectContaining({
        message: expect.objectContaining({
          conversationId: "direct-source-im",
          conversationType: "direct",
          sourceType: "im",
        }),
      }),
      "direct-source-im",
      "direct",
    );
  });

  it("routes direct-customer messages to customer service without touching IM conversations", async () => {
    const { createGatewayEventRouter } = await import(
      "../../src/renderer/data/gateway/gateway-event-router"
    );
    const queryClient = {
      clear: vi.fn(),
      invalidateQueries: vi.fn(),
    };
    const router = createGatewayEventRouter({
      clearAuthSession: vi.fn(),
      queryClient: queryClient as never,
      session: {} as never,
      setCustomerServiceStatus: vi.fn(),
    });

    router.handleEvent("msg.new", [
      {
        data: {
          message: {
            conversationId: "thread-direct-customer",
            conversationType: "direct_customer",
            conversationSeq: 10,
            messageId: "m2",
            messageType: "text",
            senderRole: "visitor",
            body: { text: "hello" },
          },
        },
      },
    ]);

    expect(mocks.mergeCustomerServiceGatewayMessage).toHaveBeenCalledWith(
      queryClient,
      expect.objectContaining({
        message: expect.objectContaining({ conversationType: "direct_customer" }),
      }),
      "thread-direct-customer",
    );
    expect(mocks.mergeImGatewayMessage).not.toHaveBeenCalled();
    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: ["pc-im-conversations"],
    });
  });

  it("routes unmarked msg.new payloads through the customer-service conversation index", async () => {
    rememberCustomerServiceConversationIndex({
      conversationId: "im-conversation-cs-1",
      source: "temp-chat-widget",
      threadId: "temp-session-1",
      threadType: "temp_session",
    });
    const { createGatewayEventRouter } = await import(
      "../../src/renderer/data/gateway/gateway-event-router"
    );
    const queryClient = {
      clear: vi.fn(),
      invalidateQueries: vi.fn(),
    };
    const router = createGatewayEventRouter({
      clearAuthSession: vi.fn(),
      queryClient: queryClient as never,
      session: {} as never,
      setCustomerServiceStatus: vi.fn(),
    });

    router.handleEvent("msg.new", [
      {
        data: {
          conversationId: "im-conversation-cs-1",
          conversationSeq: 4,
          messageId: "m-indexed",
          messageType: "text",
          senderUserId: "visitor-1",
          body: { text: "codex-test" },
        },
      },
    ]);

    expect(mocks.mergeCustomerServiceGatewayMessage).toHaveBeenCalledWith(
      queryClient,
      expect.objectContaining({
        conversationId: "im-conversation-cs-1",
        messageId: "m-indexed",
      }),
      "temp-session-1",
    );
    expect(mocks.mergeImGatewayMessage).not.toHaveBeenCalled();
    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: ["pc-im-conversations"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["pc-cs-workbench-threads"],
    });
  });

  it("does not route unmarked msg.new payloads to IM when ownership is unknown", async () => {
    const { createGatewayEventRouter } = await import(
      "../../src/renderer/data/gateway/gateway-event-router"
    );
    const queryClient = {
      clear: vi.fn(),
      invalidateQueries: vi.fn(),
    };
    const router = createGatewayEventRouter({
      clearAuthSession: vi.fn(),
      queryClient: queryClient as never,
      session: {} as never,
      setCustomerServiceStatus: vi.fn(),
    });

    router.handleEvent("msg.new", [
      {
        data: {
          conversationId: "direct-unmarked-1",
          conversationSeq: 4,
          messageId: "m-unmarked",
          messageType: "text",
          senderUserId: "user-1",
          body: { text: "hello" },
        },
      },
    ]);

    expect(mocks.mergeImGatewayMessage).not.toHaveBeenCalled();
    expect(mocks.mergeCustomerServiceGatewayMessage).not.toHaveBeenCalled();
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["pc-im-conversations"],
    });
  });

  it("invalidates platform space unread summary for space.notice without reading message details", async () => {
    const { createGatewayEventRouter } = await import(
      "../../src/renderer/data/gateway/gateway-event-router"
    );
    const queryClient = {
      clear: vi.fn(),
      invalidateQueries: vi.fn(),
    };
    const router = createGatewayEventRouter({
      clearAuthSession: vi.fn(),
      queryClient: queryClient as never,
      session: {
        apiBaseUrl: "https://api.example.test",
        platformToken: "platform-token",
        tenantToken: "tenant-token",
      } as never,
      setCustomerServiceStatus: vi.fn(),
    });

    router.handleEvent("space.notice", [
      {
        data: {
          noticeType: "message",
          requiresSwitch: true,
          spaceType: 2,
          targetUnreadConversationCount: 1,
          targetUnreadMessageCount: 3,
          tenantId: "tenant-other",
          totalUnreadConversationCount: 1,
          totalUnreadMessageCount: 3,
          unreadSpaceCount: 1,
        },
      },
    ]);

    expect(mocks.mergeImGatewayMessage).not.toHaveBeenCalled();
    expect(mocks.mergeCustomerServiceGatewayMessage).not.toHaveBeenCalled();
    expect(mocks.applySpaceNoticeReminder).toHaveBeenCalledWith(
      "scope:https://api.example.test:platform-token",
      {
        noticeType: "message",
        requiresSwitch: true,
        spaceType: 2,
        targetUnreadConversationCount: 1,
        targetUnreadMessageCount: 3,
        tenantId: "tenant-other",
        totalUnreadConversationCount: 1,
        totalUnreadMessageCount: 3,
        unreadSpaceCount: 1,
      },
    );
    expect(mocks.applySpaceNoticeReminder.mock.calls[0][1]).not.toHaveProperty("body");
    expect(mocks.applySpaceNoticeReminder.mock.calls[0][1]).not.toHaveProperty(
      "conversationId",
    );
    expect(mocks.applySpaceNoticeReminder.mock.calls[0][1]).not.toHaveProperty(
      "messageType",
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: [
        "pc-account-space-unread-summary",
        "https://api.example.test",
        "platform-token",
      ],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["pc-im-conversations"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["pc-cs-workbench-threads"],
    });
  });
});
