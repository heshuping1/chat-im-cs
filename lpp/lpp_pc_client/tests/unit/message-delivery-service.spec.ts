import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMessageDeliveryService,
  recordGatewayPushReceived,
  resetMessageDeliveryGuardForTest,
} from "../../src/renderer/data/gateway/message-delivery-service";

const mocks = vi.hoisted(() => ({
  mergeImGatewayMessage: vi.fn(),
  mergeReadEvent: vi.fn(),
  mergeCustomerServiceGatewayMessage: vi.fn(),
  notifyCustomerServiceQueue: vi.fn(),
  record: vi.fn(),
}));

vi.mock("../../src/renderer/data/gateway/gateway-im-side-effects", () => ({
  mergeImGatewayMessage: mocks.mergeImGatewayMessage,
  mergeReadEvent: mocks.mergeReadEvent,
}));

vi.mock("../../src/renderer/data/gateway/gateway-cs-side-effects", () => ({
  mergeCustomerServiceGatewayMessage: mocks.mergeCustomerServiceGatewayMessage,
  notifyCustomerServiceQueue: mocks.notifyCustomerServiceQueue,
}));

vi.mock("../../src/renderer/data/diagnostics/message-reminder-diagnostics", () => ({
  recordMessageReminderDiagnostic: mocks.record,
}));

describe("MessageDeliveryService", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    resetMessageDeliveryGuardForTest();
  });

  it("records push delivery latency while writing IM cache", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-02T11:13:22.500Z"));
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const service = createMessageDeliveryService({
      queryClient,
      scopeKey: "scope-1",
      session: {
        apiBaseUrl: "https://api.example.test",
        displayName: "Tester",
        tenantToken: "token",
      },
      setCustomerServiceStatus: vi.fn(),
    });

    service.deliverImMessage({
      conversationId: "direct-1",
      conversationType: "direct",
      payload: {
        conversationId: "direct-1",
        conversationType: "direct",
        message: {
          messageId: "m-1",
          sentAt: "2026-06-02T11:13:21.000Z",
        },
      },
      route: "im-first-stage",
      source: "gateway-router",
    });

    expect(mocks.mergeImGatewayMessage).toHaveBeenCalledWith(
      queryClient,
      expect.any(Object),
      "direct-1",
      "direct",
    );
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ["pc-im-conversations"] });
    expect(mocks.record).toHaveBeenCalledWith(expect.objectContaining({
      event: "message.delivery",
      route: "im-first-stage",
      summary: expect.objectContaining({
        latency: expect.objectContaining({
          latencyMs: 1500,
          source: "push",
          serverSentAt: "2026-06-02T11:13:21.000Z",
        }),
      }),
    }));
    vi.useRealTimers();
  });

  it("deduplicates repeated IM messages before writing cache", () => {
    const queryClient = new QueryClient();
    const service = createTestDeliveryService(queryClient);
    const input = {
      conversationId: "direct-dup",
      conversationType: "direct",
      payload: {
        conversationId: "direct-dup",
        conversationSeq: 10,
        message: { messageId: "m-dup" },
      },
      route: "im-first-stage",
      source: "gateway-router",
    };

    service.deliverImMessage(input);
    service.deliverImMessage(input);

    expect(mocks.mergeImGatewayMessage).toHaveBeenCalledTimes(1);
    expect(mocks.record).toHaveBeenCalledWith(expect.objectContaining({
      event: "message.delivery.guard",
      phase: "skip",
      classification: expect.objectContaining({
        reason: "duplicate-message-id",
      }),
    }));
  });

  it("records gateway push source without message body content", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-02T11:13:22.500Z"));

    recordGatewayPushReceived({
      eventName: "msg.new",
      payload: {
        conversationId: "direct-source",
        message: {
          body: { text: "secret body" },
          messageId: "m-source",
          messageType: "text",
          preview: "secret preview",
          sentAt: "2026-06-02T11:13:21.000Z",
        },
      },
      source: "GatewayBridge",
    });

    expect(mocks.record).toHaveBeenCalledWith(expect.objectContaining({
      event: "message.source.observed",
      phase: "gateway",
      route: "gateway-push",
      classification: expect.objectContaining({
        conversationId: "direct-source",
        messageId: "m-source",
        sourceChannel: "gateway",
      }),
      summary: expect.objectContaining({
        latencyMs: 1500,
        serverSentAt: "2026-06-02T11:13:21.000Z",
      }),
    }));
    const sourceRecord = mocks.record.mock.calls.find(
      ([payload]) => payload.event === "message.source.observed",
    )?.[0];
    expect(JSON.stringify(sourceRecord)).not.toContain("secret body");
    expect(JSON.stringify(sourceRecord)).not.toContain("secret preview");
    vi.useRealTimers();
  });

  it("deduplicates the same IM message across push, refetch compensation and detail routes", () => {
    const queryClient = new QueryClient();
    const service = createTestDeliveryService(queryClient);
    const payload = {
      conversationId: "direct-multi-source",
      conversationSeq: 10,
      message: { messageId: "m-multi-source" },
    };

    service.deliverImMessage({
      conversationId: "direct-multi-source",
      conversationType: "direct",
      payload,
      route: "gateway-push",
      source: "gateway-router",
    });
    service.deliverImMessage({
      conversationId: "direct-multi-source",
      conversationType: "direct",
      payload,
      route: "refetch-compensation",
      source: "message-gap-sync",
    });
    service.deliverImMessage({
      conversationId: "direct-multi-source",
      conversationType: "direct",
      payload,
      route: "detail-history",
      source: "message-detail",
    });

    expect(mocks.mergeImGatewayMessage).toHaveBeenCalledTimes(1);
    expect(mocks.record).toHaveBeenCalledWith(expect.objectContaining({
      event: "message.delivery.guard",
      phase: "skip",
      classification: expect.objectContaining({
        reason: "duplicate-message-id",
      }),
    }));
  });

  it("uses conversationId plus seq as weak idempotency when messageId is missing", () => {
    const queryClient = new QueryClient();
    const service = createTestDeliveryService(queryClient);
    const input = {
      conversationId: "direct-weak-id",
      conversationType: "direct",
      payload: {
        conversationId: "direct-weak-id",
        conversationSeq: 15,
        message: { messageType: "text" },
      },
      route: "gateway-push",
      source: "gateway-router",
    };

    service.deliverImMessage(input);
    service.deliverImMessage({ ...input, route: "refetch-compensation" });

    expect(mocks.mergeImGatewayMessage).toHaveBeenCalledTimes(1);
    expect(mocks.record).toHaveBeenCalledWith(expect.objectContaining({
      event: "message.delivery.guard",
      phase: "skip",
      classification: expect.objectContaining({
        reason: "duplicate-or-stale-seq",
        seq: 15,
      }),
    }));
  });

  it("does not deduplicate through legacy message id aliases", () => {
    const queryClient = new QueryClient();
    const service = createTestDeliveryService(queryClient);

    service.deliverImMessage({
      conversationId: "direct-legacy-alias",
      conversationType: "direct",
      payload: {
        conversationId: "direct-legacy-alias",
        conversationSeq: 1,
        message: { message_id: "legacy-message-id" },
      },
      route: "gateway-push",
      source: "gateway-router",
    });
    service.deliverImMessage({
      conversationId: "direct-legacy-alias",
      conversationType: "direct",
      payload: {
        conversationId: "direct-legacy-alias",
        conversationSeq: 2,
        message: { message_id: "legacy-message-id" },
      },
      route: "refetch-compensation",
      source: "message-gap-sync",
    });

    expect(mocks.mergeImGatewayMessage).toHaveBeenCalledTimes(2);
    expect(mocks.record).not.toHaveBeenCalledWith(expect.objectContaining({
      event: "message.delivery.guard",
      classification: expect.objectContaining({
        messageId: "legacy-message-id",
        reason: "duplicate-message-id",
      }),
    }));
  });

  it("skips stale IM sequence updates so older push cannot overwrite newer cache", () => {
    const queryClient = new QueryClient();
    const service = createTestDeliveryService(queryClient);

    service.deliverImMessage({
      conversationId: "direct-seq",
      conversationType: "direct",
      payload: {
        conversationId: "direct-seq",
        conversationSeq: 12,
        message: { messageId: "m-12" },
      },
      route: "im-first-stage",
      source: "gateway-router",
    });
    service.deliverImMessage({
      conversationId: "direct-seq",
      conversationType: "direct",
      payload: {
        conversationId: "direct-seq",
        conversationSeq: 11,
        message: { messageId: "m-11" },
      },
      route: "im-first-stage",
      source: "gateway-router",
    });

    expect(mocks.mergeImGatewayMessage).toHaveBeenCalledTimes(1);
    expect(mocks.record).toHaveBeenCalledWith(expect.objectContaining({
      event: "message.delivery.guard",
      phase: "skip",
      classification: expect.objectContaining({
        reason: "duplicate-or-stale-seq",
        seq: 11,
      }),
    }));
  });

  it("detects IM sequence gaps and triggers gap sync without blocking current push", () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const service = createTestDeliveryService(queryClient);

    service.deliverImMessage({
      conversationId: "direct-gap",
      conversationType: "direct",
      payload: {
        conversationId: "direct-gap",
        conversationSeq: 4,
        message: { messageId: "m-4" },
      },
      route: "im-first-stage",
      source: "gateway-router",
    });
    service.deliverImMessage({
      conversationId: "direct-gap",
      conversationType: "direct",
      payload: {
        conversationId: "direct-gap",
        conversationSeq: 7,
        message: { messageId: "m-7" },
      },
      route: "im-first-stage",
      source: "gateway-router",
    });

    expect(mocks.mergeImGatewayMessage).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["pc-im-conversations"] });
    expect(mocks.record).toHaveBeenCalledWith(expect.objectContaining({
      event: "message.delivery.guard",
      phase: "gap",
      classification: expect.objectContaining({
        gapSize: 2,
        reason: "seq-gap",
      }),
    }));
    expect(mocks.record).toHaveBeenCalledWith(expect.objectContaining({
      event: "message.gap-sync.triggered",
      phase: "push-seq-gap",
    }));
  });

  it("deduplicates customer-service messages before writing service cache", () => {
    const queryClient = new QueryClient();
    const service = createTestDeliveryService(queryClient);
    const input = {
      payload: {
        conversationId: "compat-conversation",
        conversationSeq: 8,
        message: { messageId: "cs-dup" },
      },
      route: "customer-service-first-stage",
      source: "gateway-router",
      threadId: "temp-thread",
    };

    service.deliverCustomerServiceMessage(input);
    service.deliverCustomerServiceMessage(input);

    expect(mocks.mergeCustomerServiceGatewayMessage).toHaveBeenCalledTimes(1);
    expect(mocks.record).toHaveBeenCalledWith(expect.objectContaining({
      event: "message.delivery.guard",
      phase: "skip",
      classification: expect.objectContaining({
        owner: "customerService",
        reason: "duplicate-message-id",
      }),
    }));
  });

  it("detects customer-service sequence gaps and triggers refetch compensation", () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const service = createTestDeliveryService(queryClient);

    service.deliverCustomerServiceMessage({
      payload: {
        conversationId: "cs-conversation-gap",
        conversationSeq: 100,
        message: { messageId: "cs-100" },
      },
      route: "customer-service-first-stage",
      source: "gateway-router",
      threadId: "thread-gap",
    });
    service.deliverCustomerServiceMessage({
      payload: {
        conversationId: "cs-conversation-gap",
        conversationSeq: 105,
        message: { messageId: "cs-105" },
      },
      route: "customer-service-first-stage",
      source: "gateway-router",
      threadId: "thread-gap",
    });

    expect(mocks.mergeCustomerServiceGatewayMessage).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["pc-cs-workbench-threads"] });
    expect(mocks.record).toHaveBeenCalledWith(expect.objectContaining({
      event: "message.delivery.guard",
      phase: "gap",
      classification: expect.objectContaining({
        gapSize: 4,
        owner: "customerService",
        reason: "seq-gap",
      }),
    }));
  });
});

function createTestDeliveryService(queryClient: QueryClient) {
  return createMessageDeliveryService({
    queryClient,
    scopeKey: "scope-1",
    session: {
      apiBaseUrl: "https://api.example.test",
      displayName: "Tester",
      tenantToken: "token",
    },
    setCustomerServiceStatus: vi.fn(),
  });
}
