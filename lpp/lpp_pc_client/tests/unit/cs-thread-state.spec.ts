import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createCustomerServiceThreadState,
  isQueuedCustomerServiceThreadStatus,
  logCustomerServiceThreadStateTransition,
  transitionCustomerServiceThreadState,
} from "../../src/renderer/data/customer-service/cs-thread-state";

describe("customer service thread state", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps queued states to claim gate", () => {
    expect(createCustomerServiceThreadState("queued")).toMatchObject({
      kind: "queued",
      readOnly: false,
      replyGate: "claim",
    });
    expect(createCustomerServiceThreadState("waiting_for_staff")).toMatchObject({
      kind: "queued",
      replyGate: "claim",
    });
    expect(createCustomerServiceThreadState("pending")).toMatchObject({
      kind: "queued",
      replyGate: "claim",
    });
    expect(isQueuedCustomerServiceThreadStatus("pending")).toBe(true);
    expect(isQueuedCustomerServiceThreadStatus("serving")).toBe(false);
  });

  it("maps AI states to takeover gate", () => {
    expect(createCustomerServiceThreadState("ai_assist")).toMatchObject({
      kind: "ai",
      readOnly: false,
      replyGate: "takeover",
    });
    expect(createCustomerServiceThreadState("bot")).toMatchObject({
      kind: "ai",
      replyGate: "takeover",
    });
  });

  it("maps terminal and rated states to readonly", () => {
    expect(createCustomerServiceThreadState("closed_by_staff")).toMatchObject({
      kind: "closed",
      readOnly: true,
      replyGate: "readonly",
      terminal: true,
    });
    expect(createCustomerServiceThreadState("rated")).toMatchObject({
      kind: "rated",
      readOnly: true,
      replyGate: "readonly",
    });
  });

  it("keeps timeout-closed conversations in history until explicitly reopened", () => {
    expect(createCustomerServiceThreadState("closed_timeout")).toMatchObject({
      kind: "closed",
      normalizedStatus: "closed_timeout",
      readOnly: true,
      replyGate: "readonly",
      terminal: true,
    });
    expect(createCustomerServiceThreadState("7")).toMatchObject({
      kind: "closed",
      readOnly: true,
      replyGate: "readonly",
    });
  });

  it("keeps transferred-away conversations readonly for the previous agent", () => {
    expect(createCustomerServiceThreadState("transferred")).toMatchObject({
      kind: "closed",
      normalizedStatus: "transferred",
      readOnly: true,
      replyGate: "readonly",
      terminal: true,
    });
    expect(createCustomerServiceThreadState("assigned-away")).toMatchObject({
      kind: "closed",
      normalizedStatus: "assigned_away",
      readOnly: true,
      replyGate: "readonly",
    });
  });

  it("keeps unknown active statuses open to preserve legacy behavior", () => {
    expect(createCustomerServiceThreadState("serving")).toMatchObject({
      kind: "serving",
      readOnly: false,
      replyGate: "open",
    });
    expect(createCustomerServiceThreadState("unexpected_status")).toMatchObject({
      kind: "serving",
      replyGate: "open",
    });
  });

  it("creates transition diagnostics", () => {
    vi.stubGlobal("window", {});
    const transition = transitionCustomerServiceThreadState("queued", "serving");

    logCustomerServiceThreadStateTransition(transition, { threadId: "thread-1" });

    const diagnostics = globalThis.window.__lppCustomerServiceStateDiagnostics ?? [];
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      event: "state.transition",
      result: "ok",
      from: { kind: "queued", status: "queued" },
      to: { kind: "serving", status: "serving" },
      context: { threadId: "thread-1" },
    });
  });
});
