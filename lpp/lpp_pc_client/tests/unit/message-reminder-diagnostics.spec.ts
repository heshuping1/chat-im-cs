import { describe, expect, it } from "vitest";

import { reminderDiagnosticsTarget } from "../../src/main/message-reminder-diagnostics-routing";
import { summarizeMessageReminderDiagnosticValue } from "../../src/renderer/data/diagnostics/message-reminder-diagnostics";
import {
  messageTraceStageLabel,
  summarizeRecentMessageTraceGroups,
  type MessageTraceSample,
} from "../../src/renderer/data/diagnostics/message-trace-diagnostics";
import { gatewayFailureHint } from "../../src/renderer/data/gateway/gateway-health-diagnostics";
import { gatewayReminderDiagnosticClassification } from "../../src/renderer/data/gateway/gateway-message-reminder-diagnostics";

describe("message reminder diagnostics", () => {
  it("keeps plaintext diagnostics when plaintext mode is enabled", () => {
    expect(
      summarizeMessageReminderDiagnosticValue({
        activeDecision: false,
        conversationId: "conversation-abcdef",
        message: {
          body: { text: "haishibuxinga111" },
          messageId: "message-123456",
          senderRole: "visitor",
        },
        tenantToken: "secret-token",
        unreadAfter: 2,
      }, { plaintext: true }),
    ).toEqual({
      activeDecision: false,
      conversationId: "conversation-abcdef",
      message: {
        body: { text: "haishibuxinga111" },
        messageId: "message-123456",
        senderRole: "visitor",
      },
      tenantToken: "secret-token",
      unreadAfter: 2,
    });
  });

  it("redacts message content and sensitive values when plaintext mode is disabled", () => {
    expect(
      summarizeMessageReminderDiagnosticValue({
        activeDecision: false,
        conversationId: "conversation-abcdef",
        message: {
          body: { text: "message text should not be logged" },
          messageId: "message-123456",
          senderRole: "visitor",
        },
        tenantToken: "secret-token",
        unreadAfter: 2,
      }, { plaintext: false }),
    ).toEqual({
      activeDecision: false,
      conversationId: "...abcdef",
      message: {
        body: "[redacted-content len=44]",
        messageId: "...123456",
        senderRole: "visitor",
      },
      tenantToken: "[redacted]",
      unreadAfter: 2,
    });
  });

  it("summarizes gateway event identity without putting message text in classification", () => {
    const classification = gatewayReminderDiagnosticClassification({
        args: [
          {
            conversationId: "conversation-abcdef",
            conversationType: "direct",
            message: {
              body: { text: "haishibuxinga" },
              conversationSeq: 9,
              messageId: "message-123456",
              messageType: "text",
            },
          },
        ],
        eventName: "msg.new",
        route: "gateway",
      });
    expect(classification).toMatchObject({
      argCount: 1,
      conversationId: "conversation-abcdef",
      eventName: "msg.new",
      hasBody: true,
      hasMessage: true,
      messageId: "message-123456",
      messageSeq: 9,
      messageType: "text",
      previewLength: 13,
      route: "gateway",
    });
    expect(JSON.stringify(classification)).not.toContain("haishibuxinga");
  });

  it("keeps gateway diagnostic reason and scope searchable without raw content", () => {
    const classification = gatewayReminderDiagnosticClassification({
      args: [
        {
          conversationId: "conversation-abcdef",
          conversationType: "temp_session",
          message: {
            body: { text: "visitor raw text" },
            conversationSeq: 12,
            messageId: "message-abcdef",
            messageType: "text",
          },
          tempSession: {
            sessionId: "thread-abcdef",
          },
        },
      ],
      eventName: "customer_service.message.created",
      route: "customer-service",
      scopeKey: "scope-1",
    });

    expect(classification).toMatchObject({
      reason: "explicit-temp-session",
      route: "customer-service",
      scopeKey: "scope-1",
      threadId: "thread-abcdef",
    });
    expect(JSON.stringify(classification)).not.toContain("visitor raw text");
  });

  it("routes IM read diagnostics into the dedicated IM log file", () => {
    expect(reminderDiagnosticsTarget({
      event: "im.gateway.received",
      source: "gateway-im-side-effects",
    } as any)).toEqual({ fileName: "im-read.jsonl", maxLines: 1200 });

    expect(reminderDiagnosticsTarget({
      event: "gateway.event.received",
      source: "GatewayBridge",
      classification: { eventName: "msg.read" },
    } as any)).toEqual({ fileName: "im-read.jsonl", maxLines: 1200 });

    expect(reminderDiagnosticsTarget({
      event: "gateway.event.routed",
      source: "GatewayBridge",
      route: "im-first-stage",
    } as any)).toEqual({ fileName: "im-read.jsonl", maxLines: 1200 });
  });

  it("routes customer-service reminder diagnostics away from the IM log file", () => {
    expect(reminderDiagnosticsTarget({
      event: "cs.overlay.write",
      source: "cs-compatibility-bridge",
    } as any)).toEqual({ fileName: "customer-service-reminder.jsonl", maxLines: 800 });

    expect(reminderDiagnosticsTarget({
      event: "gateway.event.routed",
      source: "GatewayBridge",
      route: "customer-service",
    } as any)).toEqual({ fileName: "customer-service-reminder.jsonl", maxLines: 800 });

    expect(reminderDiagnosticsTarget({
      event: "app.renderer.mounted",
      source: "App",
    } as any)).toEqual({ fileName: "message-reminder.jsonl", maxLines: 800 });
  });

  it("routes gateway health, delivery and gap sync diagnostics into dedicated files", () => {
    expect(reminderDiagnosticsTarget({
      event: "gateway.health",
      source: "GatewayConnectionManager",
    } as any)).toEqual({ fileName: "gateway-health.jsonl", maxLines: 1200 });

    expect(reminderDiagnosticsTarget({
      event: "gateway.push.received",
      source: "gateway-bridge",
    } as any)).toEqual({ fileName: "message-delivery.jsonl", maxLines: 1600 });

    expect(reminderDiagnosticsTarget({
      event: "message.delivery",
      source: "gateway-router",
    } as any)).toEqual({ fileName: "message-delivery.jsonl", maxLines: 1600 });

    expect(reminderDiagnosticsTarget({
      event: "message.gap-sync.triggered",
      source: "gateway-bridge",
    } as any)).toEqual({ fileName: "message-gap-sync.jsonl", maxLines: 800 });

    expect(reminderDiagnosticsTarget({
      event: "message.source.observed",
      source: "messages-client",
    } as any)).toEqual({ fileName: "message-source.jsonl", maxLines: 2400 });

    expect(reminderDiagnosticsTarget({
      event: "message.trace",
      source: "message-trace",
    } as any)).toEqual({ fileName: "message-trace.jsonl", maxLines: 2400 });
  });

  it("summarizes message trace stages into PC observable timings", () => {
    const samples: MessageTraceSample[] = [
      traceSample("trace-1", "receive.gateway.observed", "2026-06-02T17:13:44.228Z", {
        latencyMs: 1401,
      }),
      traceSample("trace-1", "receive.cache.written", "2026-06-02T17:13:44.233Z"),
      traceSample("trace-1", "receive.ui.observed", "2026-06-02T17:13:44.253Z"),
    ];

    expect(summarizeRecentMessageTraceGroups(samples, 1)[0]).toMatchObject({
      gatewayToCacheMs: 5,
      gatewayToUiMs: 25,
      serverToGatewayMs: 1401,
      traceId: "trace-1",
    });
    expect(messageTraceStageLabel("receive.gateway.observed")).toBe("长连接收到");
    expect(messageTraceStageLabel("send.http.done")).toBe("发送请求完成");
  });

  it("classifies SignalR negotiate fetch failures for transport triage", () => {
    expect(gatewayFailureHint(new Error(
      "Failed to complete negotiation with the server: TypeError: Failed to fetch",
    ))).toEqual(expect.objectContaining({
      code: "gateway.negotiate_fetch_failed",
    }));
  });
});

function traceSample(
  traceId: string,
  stage: MessageTraceSample["stage"],
  at: string,
  overrides: Partial<MessageTraceSample> = {},
): MessageTraceSample {
  return {
    at,
    owner: "im",
    route: "gateway-push",
    sourceChannel: "gateway",
    stage,
    traceId,
    ...overrides,
  };
}
