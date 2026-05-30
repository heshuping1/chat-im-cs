import { describe, expect, it } from "vitest";
import { adaptGatewayEvent } from "../../src/renderer/data/gateway/gateway-event-adapter";
import {
  diagnosticFromGatewayEvent,
  diagnosticFromHandledGatewayEvent,
} from "../../src/renderer/data/gateway/gateway-diagnostics";
import { gatewayContractFixtures } from "./gateway-contract-fixtures";

describe("gateway contract fixtures", () => {
  it.each(gatewayContractFixtures)("$name", ({ input, expected }) => {
    const event = adaptGatewayEvent(input);

    expect(event.kind).toBe(expected.kind);
    if (event.kind === "ignored" || event.kind === "invalid") {
      expect(event.reason).toBe(expected.reason);
      if (expected.diagnostics) {
        expect(event.diagnostics).toEqual(expect.arrayContaining(expected.diagnostics));
      }
      return;
    }

    if (event.kind === "im.message.received") {
      expect(event.contractStatus).toBe(expected.contractStatus);
      if (expected.diagnostics) {
        expect(event.diagnostics).toEqual(expect.arrayContaining(expected.diagnostics));
      }
    }
  });

  it("records degraded gateway contracts in unified diagnostics", () => {
    const fixture = gatewayContractFixtures.find(
      (item) => item.expected.contractStatus === "degraded",
    );
    expect(fixture).toBeDefined();
    const event = adaptGatewayEvent(fixture!.input);
    expect(event.kind).toBe("im.message.received");
    if (event.kind !== "im.message.received") return;

    const diagnostic = diagnosticFromHandledGatewayEvent(event);

    expect(diagnostic.level).toBe("warning");
    expect(diagnostic.record).toMatchObject({
      taskId: "P3-API-006C",
      phase: "handled",
      result: "degraded",
      reason: "contract_degraded",
      contract: {
        status: "degraded",
        issues: [{ code: "im.read.missing_sender", level: "warning" }],
      },
    });
  });

  it("records invalid and ignored gateway contracts in unified diagnostics", () => {
    const invalid = adaptGatewayEvent(
      gatewayContractFixtures.find((item) => item.expected.kind === "invalid")!.input,
    );
    const ignored = adaptGatewayEvent(
      gatewayContractFixtures.find((item) => item.expected.reason === "customer_service_event")!
        .input,
    );

    expect(diagnosticFromGatewayEvent(invalid)?.record).toMatchObject({
      taskId: "P3-API-006C",
      result: "invalid",
      contract: {
        status: "invalid",
        issues: [{ code: "im.read.missing_seq", level: "error" }],
      },
    });
    expect(diagnosticFromGatewayEvent(ignored)?.record).toMatchObject({
      taskId: "P3-API-006C",
      result: "ignored",
      reason: "customer_service_event",
    });
  });
});
