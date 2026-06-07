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

  it("records delivery diagnostics without raw scope keys or message body payloads", () => {
    const queryClient = new QueryClient();
    const service = createMessageDeliveryService({
      queryClient,
      scopeKey:
        "https://chat.example.test|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.raw.signature|tenant-1|user-1",
      session: {
        apiBaseUrl: "https://api.example.test",
        displayName: "Tester",
        tenantToken: "token",
      },
      setCustomerServiceStatus: vi.fn(),
    });

    service.deliverImMessage({
      conversationId: "direct-sensitive",
      conversationType: "direct",
      payload: {
        conversationId: "direct-sensitive",
        message: {
          body: { text: "sensitive message text" },
          conversationSeq: 2,
          messageId: "m-sensitive",
          messageType: "text",
          sentAt: "2026-06-02T11:13:21.000Z",
        },
      },
      route: "im-first-stage",
      source: "gateway-router",
    });

    const deliveryRecord = mocks.record.mock.calls.find(
      ([payload]) => payload.event === "message.delivery",
    )?.[0];

    expect(deliveryRecord).toMatchObject({
      classification: {
        owner: "im",
        scopeKey: expect.stringMatching(/^\[scope-key len=\d+ hash=[a-f0-9]{12}\]$/),
      },
      summary: expect.objectContaining({
        message: expect.objectContaining({
          messageId: "m-sensitive",
          messageType: "text",
        }),
      }),
    });
    expect(JSON.stringify(deliveryRecord)).not.toContain("eyJhbGci");
    expect(JSON.stringify(deliveryRecord)).not.toContain("sensitive message text");
  });

  it("accepts sourceType im direct messages into IM delivery instead of customer-service guard", () => {
    const queryClient = new QueryClient();
    const service = createTestDeliveryService(queryClient);

    service.deliverImMessage({
      conversationId: "direct-source-im-delivery",
      conversationType: "direct",
      payload: {
        conversationId: "direct-source-im-delivery",
        conversationType: "direct",
        sourceType: "im",
        conversationSeq: 2,
        message: {
          conversationId: "direct-source-im-delivery",
          conversationSeq: 2,
          messageId: "m-source-im-delivery",
          sourceType: "im",
        },
      },
      route: "im-first-stage",
      source: "gateway-router",
    });

    expect(mocks.mergeCustomerServiceGatewayMessage).not.toHaveBeenCalled();
    expect(mocks.mergeImGatewayMessage).toHaveBeenCalledWith(
      queryClient,
      expect.objectContaining({
        conversationId: "direct-source-im-delivery",
        sourceType: "im",
      }),
      "direct-source-im-delivery",
      "direct",
    );
    expect(mocks.record).not.toHaveBeenCalledWith(expect.objectContaining({
      event: "message.delivery.guard",
      phase: "skip",
      classification: expect.objectContaining({
        reason: "customer-service-payload",
      }),
    }));
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

  it("skips customer-service payloads before writing the IM cache", () => {
    const queryClient = new QueryClient();
    const service = createTestDeliveryService(queryClient);

    service.deliverImMessage({
      conversationId: "temp-1",
      conversationType: "temp_session",
      payload: {
        conversationId: "temp-1",
        conversationType: "temp_session",
        tempSession: { sessionId: "thread-1" },
        message: {
          conversationId: "temp-1",
          conversationSeq: 1,
          messageId: "m-temp",
        },
      },
      route: "im-first-stage",
      source: "gateway-router",
    });

    expect(mocks.mergeImGatewayMessage).not.toHaveBeenCalled();
    expect(mocks.record).toHaveBeenCalledWith(expect.objectContaining({
      event: "message.delivery.guard",
      phase: "skip",
      classification: expect.objectContaining({
        owner: "im",
        reason: "customer-service-payload",
      }),
    }));
  });

  it("skips non-strict IM conversation types before writing the IM cache", () => {
    const queryClient = new QueryClient();
    const service = createTestDeliveryService(queryClient);

    service.deliverImMessage({
      conversationId: "legacy-group-1",
      conversationType: "im_group",
      payload: {
        conversationId: "legacy-group-1",
        conversationType: "im_group",
        message: {
          conversationId: "legacy-group-1",
          conversationSeq: 1,
          messageId: "m-legacy-group",
        },
      },
      route: "im-first-stage",
      source: "gateway-router",
    });

    expect(mocks.mergeImGatewayMessage).not.toHaveBeenCalled();
    expect(mocks.record).toHaveBeenCalledWith(expect.objectContaining({
      event: "message.delivery.guard",
      phase: "skip",
      classification: expect.objectContaining({
        owner: "im",
        reason: "non-im-conversation-type",
      }),
    }));
  });

  it("skips unknown ownership gateway messages instead of defaulting them into IM cache", () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const service = createTestDeliveryService(queryClient);

    service.deliverImMessage({
      conversationId: "ambiguous-conversation",
      conversationType: "",
      payload: {
        conversationId: "ambiguous-conversation",
        conversationSeq: 4,
        messageId: "m-ambiguous",
        messageType: "text",
      },
      route: "im-first-stage",
      source: "gateway-router",
    });

    expect(mocks.mergeImGatewayMessage).not.toHaveBeenCalled();
    expect(invalidate).toHaveBeenCalledWith({ predicate: expect.any(Function) });
    expect(mocks.record).toHaveBeenCalledWith(expect.objectContaining({
      event: "message.delivery.guard",
      phase: "skip",
      classification: expect.objectContaining({
        owner: "im",
        reason: "unknown-ownership",
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
    expect(invalidate).toHaveBeenCalledWith({ predicate: expect.any(Function) });
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

  it("does not refetch IM queries after a read push is merged locally", () => {
    mocks.mergeReadEvent.mockReturnValueOnce(true);
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const service = createTestDeliveryService(queryClient);

    service.deliverImRead({
      conversationId: "direct-read",
      payload: {
        conversationId: "direct-read",
        conversationType: "direct",
        readSeq: 42,
      },
      route: "im-read",
      source: "gateway-router",
    });

    expect(mocks.mergeReadEvent).toHaveBeenCalledWith(
      queryClient,
      expect.objectContaining({ conversationId: "direct-read" }),
      expect.objectContaining({ tenantToken: "token" }),
    );
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("keeps query invalidation as a fallback when a read push cannot be merged", () => {
    mocks.mergeReadEvent.mockReturnValueOnce(false);
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const service = createTestDeliveryService(queryClient);

    service.deliverImRead({
      conversationId: "direct-read-fallback",
      payload: {
        conversationId: "direct-read-fallback",
      },
      route: "im-read",
      source: "gateway-router",
    });

    expect(invalidate).toHaveBeenCalledWith({ predicate: expect.any(Function) });
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
