import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  rememberCustomerServiceConversationIndex,
  resetCustomerServiceConversationIndexForTest,
} from "../../src/renderer/data/customer-service/cs-conversation-index";

const mocks = vi.hoisted(() => ({
  mergeCustomerServiceGatewayMessage: vi.fn(),
  mergeImGatewayMessage: vi.fn(),
  mergeReadEvent: vi.fn(),
  notifyCustomerServiceQueue: vi.fn(),
}));

vi.mock("../../src/renderer/data/gateway/gateway-cs-side-effects", () => ({
  mergeCustomerServiceGatewayMessage: mocks.mergeCustomerServiceGatewayMessage,
  notifyCustomerServiceQueue: mocks.notifyCustomerServiceQueue,
}));

vi.mock("../../src/renderer/data/gateway/gateway-im-side-effects", () => ({
  mergeImGatewayMessage: mocks.mergeImGatewayMessage,
  mergeReadEvent: mocks.mergeReadEvent,
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

  it("routes direct-customer compatibility messages to IM without touching customer service", async () => {
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

    expect(mocks.mergeImGatewayMessage).toHaveBeenCalledWith(
      queryClient,
      expect.objectContaining({
        message: expect.objectContaining({ conversationType: "direct_customer" }),
      }),
      "thread-direct-customer",
      "direct",
    );
    expect(mocks.mergeCustomerServiceGatewayMessage).not.toHaveBeenCalled();
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
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

  it("routes unmarked msg.new payloads to IM when no temp-session index exists", async () => {
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

    expect(mocks.mergeImGatewayMessage).toHaveBeenCalledWith(
      queryClient,
      expect.objectContaining({
        conversationId: "direct-unmarked-1",
        messageId: "m-unmarked",
      }),
      "direct-unmarked-1",
      "direct",
    );
    expect(mocks.mergeCustomerServiceGatewayMessage).not.toHaveBeenCalled();
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["pc-im-conversations"],
    });
  });
});
