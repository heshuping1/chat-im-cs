import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("customer-service transfer remarks UI boundary", () => {
  const chatWorkspace = readFileSync(
    resolve(process.cwd(), "src/renderer/components/ChatWorkspace.tsx"),
    "utf8",
  );
  const header = readFileSync(
    resolve(process.cwd(), "src/renderer/customer-service/components/CustomerServiceWorkspaceHeader.tsx"),
    "utf8",
  );
  const messageStage = readFileSync(
    resolve(process.cwd(), "src/renderer/customer-service/components/CustomerServiceMessageStage.tsx"),
    "utf8",
  );
  const dialog = readFileSync(
    resolve(process.cwd(), "src/renderer/customer-service/components/CustomerServiceTransferRemarksDialog.tsx"),
    "utf8",
  );

  it("builds transfer remark view models before passing data to UI components", () => {
    expect(chatWorkspace).toContain("createCustomerServiceTransferRecordViewModels");
    expect(chatWorkspace).toContain("records: detail?.transferRecords ?? []");
    expect(chatWorkspace).toContain("transferRemarks={transferRemarkViewModels}");
    expect(chatWorkspace).toContain("records={transferRemarkViewModels}");
  });

  it("places the transfer remarks action before chat history lookup", () => {
    const remarkIndex = header.indexOf("customerService.transferRemarks.open");
    const lookupIndex = header.indexOf("messages.chatHeader.searchMessages");

    expect(remarkIndex).toBeGreaterThan(-1);
    expect(lookupIndex).toBeGreaterThan(-1);
    expect(remarkIndex).toBeLessThan(lookupIndex);
  });

  it("renders internal remark events from view models without parsing message text or raw DTOs", () => {
    expect(messageStage).toContain("transferRemarks?: CustomerServiceTransferRecordViewModel[]");
    expect(messageStage).toContain('kind: "transfer_remark"');
    expect(messageStage).toContain("customerService.transferRemarks.inlineLabel");
    expect(messageStage).not.toContain("transferHistory");
    expect(messageStage).not.toContain("eventType");
    expect(messageStage).not.toContain(".includes(");
  });

  it("keeps the dialog read-only and view-model driven", () => {
    expect(dialog).toContain("CustomerServiceTransferRecordViewModel");
    expect(dialog).toContain("records.map");
    expect(dialog).not.toContain("textarea");
    expect(dialog).not.toContain("input");
    expect(dialog).not.toContain("transferHistory");
  });
});
