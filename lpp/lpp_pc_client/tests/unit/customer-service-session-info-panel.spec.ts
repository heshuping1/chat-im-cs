import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("customer-service session info sidebar", () => {
  const customerContextPanel = readFileSync(
    resolve(process.cwd(), "src/renderer/components/CustomerContextPanel.tsx"),
    "utf8",
  );
  const onlineServicePage = readFileSync(
    resolve(process.cwd(), "src/renderer/components/OnlineServicePage.tsx"),
    "utf8",
  );
  const sessionInfoPanel = readFileSync(
    resolve(process.cwd(), "src/renderer/customer-service/components/CustomerServiceSessionInfoPanel.tsx"),
    "utf8",
  );
  const workspaceStoreCore = readFileSync(
    resolve(process.cwd(), "src/renderer/data/workspace-ui/workspace-store-core.ts"),
    "utf8",
  );

  it("does not render session notes from the visitor information panel", () => {
    expect(customerContextPanel).not.toContain("CustomerServiceSessionNotesPanel");
    expect(customerContextPanel).not.toContain("profileActions=");
  });

  it("adds conversation info as an online-service side pane", () => {
    expect(workspaceStoreCore).toContain("'sessionInfo'");
    expect(customerContextPanel).toContain('activeAssistantPane === "sessionInfo"');
    expect(customerContextPanel).toContain('onToggleAssistantPane("sessionInfo")');
    expect(onlineServicePage).toContain("CustomerServiceSessionInfoPanel");
    expect(onlineServicePage).toContain('pane === "sessionInfo"');
  });

  it("keeps session summary and session notes in the conversation info panel", () => {
    expect(sessionInfoPanel).toContain("customerService.contextPanel.sessionSummary");
    expect(sessionInfoPanel).toContain("customerService.contextPanel.sessionSummaryEmpty");
    expect(sessionInfoPanel).toContain("CustomerServiceSessionNotesPanel");
    expect(sessionInfoPanel).toContain("threadType === \"temp_session\"");
  });
});
