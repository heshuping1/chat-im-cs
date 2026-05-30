import { describe, expect, it } from "vitest";
import { createSettingsDiagnosticRecord } from "../../src/renderer/data/settings/settings-diagnostics";

describe("settings diagnostics", () => {
  it("creates structured settings diagnostic records", () => {
    const record = createSettingsDiagnosticRecord({
      event: "settings.update",
      phase: "update",
      result: "success",
      reason: "field_updated",
      context: {
        key: "theme",
        valueType: "string",
      },
    });

    expect(record.module).toBe("settings");
    expect(record.taskId).toBe("P2-ST-002D");
    expect(record.traceId).toMatch(/^settings-update-/);
    expect(record.context).toEqual({
      key: "theme",
      valueType: "string",
    });
  });
});
