import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  customerServiceReceptionPollIntervalMs,
  customerServiceRealtimePollIntervalMs,
} from "../../src/renderer/data/customer-service/cs-realtime-config";

const root = process.cwd();

describe("customer service realtime config", () => {
  it("uses shared push-first fallback intervals for workbench threads", () => {
    expect(customerServiceRealtimePollIntervalMs).toBe(10_000);
    expect(customerServiceReceptionPollIntervalMs).toBe(30_000);

    const sidebarSource = readSource("src/renderer/components/Sidebar.tsx");
    const onlineServiceSource = readSource("src/renderer/components/OnlineServicePage.tsx");
    const workspaceControllerSource = readSource(
      "src/renderer/customer-service/hooks/useCustomerServiceWorkspaceController.ts",
    );

    for (const source of [sidebarSource, onlineServiceSource, workspaceControllerSource]) {
      expect(source).toContain("customerServiceRealtimePollIntervalMs");
      expect(source).toContain("customerServiceRealtimeRefetchInBackground");
    }
    expect(sidebarSource).toContain("customerServiceReceptionPollIntervalMs");
    expect(onlineServiceSource).toContain("customerServiceReceptionPollIntervalMs");
  });
});

function readSource(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}
