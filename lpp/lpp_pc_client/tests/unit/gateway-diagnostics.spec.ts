import { describe, expect, it, vi } from "vitest";
import {
  createGatewayTraceId,
  diagnosticFromDispatchError,
  diagnosticFromGatewayEvent,
  diagnosticFromHandledGatewayEvent,
  logGatewayDiagnostic,
  getBufferedGatewayDiagnostics,
  sanitizeDiagnosticContext,
} from "../../src/renderer/data/gateway/gateway-diagnostics";
import type { GatewayTypedEvent } from "../../src/renderer/data/gateway/gateway-event-types";

describe("gateway diagnostics", () => {
  it("creates stable gateway trace ids", () => {
    expect(createGatewayTraceId("msg.new", 100)).toMatch(/^gw-msg-new-100-/);
    expect(createGatewayTraceId("msg.read", 101)).toMatch(/^gw-msg-read-101-/);
  });

  it("builds handled message diagnostics without leaking raw payload secrets", () => {
    const event: GatewayTypedEvent = {
      kind: "im.message.received",
      eventName: "msg.new",
      receivedAt: 100,
      traceId: "trace-1",
      rawPayload: {
        tenantToken: "secret-token",
        authorization: "Bearer secret-token",
      },
      conversationId: "direct-1",
      conversationType: "direct",
      message: {
        conversationId: "direct-1",
        messageId: "m1",
        conversationSeq: 7,
        senderUserId: "user-2",
      },
    };

    const diagnostic = diagnosticFromHandledGatewayEvent(event);

    expect(diagnostic.record).toMatchObject({
      traceId: "trace-1",
      module: "gateway",
      taskId: "P1-OBS-001",
      event: "im.message.received",
      phase: "handled",
      result: "ok",
      context: {
        eventName: "msg.new",
        conversationId: "direct-1",
        conversationType: "direct",
        messageId: "m1",
        conversationSeq: 7,
      },
    });
    expect(JSON.stringify(diagnostic.record)).not.toContain("secret-token");
    expect(JSON.stringify(diagnostic.record)).not.toContain("tenantToken");
    expect(JSON.stringify(diagnostic.record)).not.toContain("authorization");
  });

  it("builds invalid diagnostics with stable reason codes", () => {
    const event: GatewayTypedEvent = {
      kind: "invalid",
      eventName: "msg.new",
      receivedAt: 101,
      traceId: "trace-2",
      rawPayload: {},
      reason: "missing_conversation_id",
      diagnostics: ["gateway.im.missing_conversation_id"],
    };

    const diagnostic = diagnosticFromGatewayEvent(event);

    expect(diagnostic?.record).toMatchObject({
      traceId: "trace-2",
      module: "gateway",
      event: "invalid",
      phase: "adapted",
      result: "invalid",
      reason: "missing_conversation_id",
      context: {
        eventName: "msg.new",
        diagnostics: ["gateway.im.missing_conversation_id"],
      },
    });
  });

  it("sanitizes known sensitive diagnostic context fields", () => {
    expect(
      sanitizeDiagnosticContext({
        tenantToken: "secret-token",
        platformToken: "platform-secret",
        refreshToken: "refresh-secret",
        password: "pass",
        authorization: "Bearer secret",
        conversationId: "direct-1",
      }),
    ).toEqual({
      tenantToken: "[redacted]",
      platformToken: "[redacted]",
      refreshToken: "[redacted]",
      password: "[redacted]",
      authorization: "[redacted]",
      conversationId: "direct-1",
    });
  });

  it("builds handler error diagnostics with sanitized error summaries", () => {
    const event: GatewayTypedEvent = {
      kind: "im.read.received",
      eventName: "msg.read",
      receivedAt: 102,
      traceId: "trace-3",
      rawPayload: {},
      conversationId: "direct-1",
      conversationType: "direct",
      readerIdentity: { userId: "user-2" },
      readSeq: 9,
    };

    const diagnostic = diagnosticFromDispatchError({
      event,
      error: Object.assign(new Error("handler exploded"), { code: "E_HANDLER" }),
    });

    expect(diagnostic.record).toMatchObject({
      traceId: "trace-3",
      module: "gateway",
      event: "im.read.received",
      phase: "failed",
      result: "failed",
      reason: "handler_error",
      context: {
        eventName: "msg.read",
        conversationId: "direct-1",
        conversationType: "direct",
        readSeq: 9,
      },
      error: {
        name: "Error",
        message: "handler exploded",
        code: "E_HANDLER",
      },
    });
  });

  it("logs structured diagnostics through console methods in development", () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const globalWithWindow = globalThis as typeof globalThis & { window?: Window };
    const previousWindow = globalWithWindow.window;
    globalWithWindow.window = {
      __lppGatewayDiagnostics: [],
    } as Window & typeof globalThis;

    logGatewayDiagnostic({
      level: "debug",
      record: {
        traceId: "trace-4",
        module: "gateway",
        taskId: "P1-OBS-001",
        event: "im.message.received",
        phase: "handled",
        result: "ok",
        timestamp: 100,
        context: { eventName: "msg.new" },
      },
    });

    expect(debugSpy).toHaveBeenCalledWith("[gateway:diagnostic]", {
      traceId: "trace-4",
      module: "gateway",
      taskId: "P1-OBS-001",
      event: "im.message.received",
      phase: "handled",
      result: "ok",
      timestamp: 100,
      context: { eventName: "msg.new" },
    });
    expect(warnSpy).not.toHaveBeenCalled();
    expect(getBufferedGatewayDiagnostics()).toEqual([
      {
        traceId: "trace-4",
        module: "gateway",
        taskId: "P1-OBS-001",
        event: "im.message.received",
        phase: "handled",
        result: "ok",
        timestamp: 100,
        context: { eventName: "msg.new" },
      },
    ]);

    debugSpy.mockRestore();
    warnSpy.mockRestore();
    if (previousWindow) {
      globalWithWindow.window = previousWindow;
    } else {
      delete globalWithWindow.window;
    }
  });
});
