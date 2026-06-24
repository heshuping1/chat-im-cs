import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("customer profile workspace copy", () => {
  const workspaceSource = readFileSync(
    resolve(process.cwd(), "src/renderer/components/CustomerProfileWorkspace.tsx"),
    "utf8",
  );
  const bitsSource = readFileSync(
    resolve(process.cwd(), "src/renderer/components/CustomerProfileBits.tsx"),
    "utf8",
  );

  it("uses channel application instead of package jargon for business ownership", () => {
    expect(workspaceSource).toContain('[t("customerProfile.fields.channelApp"), model.appName]');
    expect(workspaceSource).not.toContain('["马甲包", model.appName]');
  });

  it("keeps customer source and channel in the identity summary", () => {
    expect(workspaceSource).toContain('[t("customerProfile.fields.sourceChannel"), model.source]');
    expect(workspaceSource).not.toContain("model.level, model.kyc, model.risk, model.source");
    expect(workspaceSource).toContain('[t("customerProfile.fields.lppId"), model.lppId]');
    expect(workspaceSource).toContain('[t("customerProfile.fields.userId"), model.customerId]');
    expect(workspaceSource).toContain('[t("customerProfile.fields.source"), model.source]');
    expect(workspaceSource).toContain('[t("customerProfile.fields.channelApp"), model.channelApp]');
  });

  it("keeps a fixed VIP badge slot in the hero", () => {
    expect(workspaceSource).toContain('className="customer-360-vip"');
    expect(workspaceSource).toContain('data-empty={!isKnown(model.vipLevel)}');
    expect(workspaceSource).toContain('{isKnown(model.vipLevel) ? model.vipLevel : "VIP"}');
  });

  it("renders four compact customer handling rows", () => {
    expect(workspaceSource).not.toContain("<CustomerProfileActionRows");
    expect(workspaceSource).toContain('className="customer-360-action-list"');
    expect(workspaceSource).toContain('aria-label={t("customerProfile.actionAria")}');
    expect(workspaceSource).toContain('label={t("customerProfile.fields.tags")}');
    expect(workspaceSource).toContain('label={t("customerProfile.fields.remark")}');
    expect(workspaceSource).toContain('label={t("customerProfile.fields.followUp")}');
    expect(workspaceSource).toContain('label={t("customerProfile.fields.ticket")}');
  });

  it("shows explicit empty states for handling rows", () => {
    expect(workspaceSource).toContain('t("customerProfile.empty.remark")');
    expect(workspaceSource).toContain('t("customerProfile.empty.followUp")');
    expect(workspaceSource).toContain('t("customerProfile.empty.tickets")');
    expect(bitsSource).toContain('t("customerProfile.noTags")');
  });

  it("wires remark and tag rows to real update callbacks instead of placeholder-only actions", () => {
    expect(workspaceSource).toContain("onUpdateRemark");
    expect(workspaceSource).toContain("onUpdateTags");
    expect(workspaceSource).toContain('t("customerProfile.notice.missingFriendForRemark")');
    expect(workspaceSource).toContain('t("customerProfile.notice.missingFriendForTags")');
    expect(workspaceSource).toContain('aria-label={t("customerProfile.actions.editField", { field: label })}');
    expect(workspaceSource).toContain("parseCompactTagDraft");
    expect(workspaceSource).not.toContain("备注编辑接口待接入");
    expect(workspaceSource).not.toContain("标签编辑接口待接入");
  });

  it("uses a plus affordance for tags instead of an ambiguous add button label", () => {
    expect(bitsSource).toContain('aria-label={t("customerProfile.addTag")}');
    expect(bitsSource).toContain("+");
    expect(bitsSource).not.toContain("+ 添加");
  });

  it("does not render the remark edit command when the scene has no update permission", () => {
    expect(workspaceSource).toContain("actionLabel={");
    expect(workspaceSource).toContain('onUpdateRemark ? t("customerProfile.actions.edit") : undefined');
    expect(workspaceSource).toContain("{onAction && actionLabel && (");
  });

  it("keeps the ticket quick row wired to the existing ticket tab", () => {
    expect(workspaceSource).toContain('onOpenTickets={() =>');
    expect(workspaceSource).toContain('setActiveTab("tickets")');
    expect(workspaceSource).toContain('{ key: "tickets", icon: ClipboardList }');
  });

  it("expands more tabs inline instead of using a nested more menu", () => {
    expect(workspaceSource).toContain("const visibleTabs = overflowMenuOpen ? tabs : primaryTabs");
    expect(workspaceSource).toContain("{visibleTabs.map((tab) =>");
    expect(workspaceSource).toContain('t("customerProfile.more")');
    expect(workspaceSource).not.toContain("customer-profile-tabs-menu");
    expect(workspaceSource).not.toContain('aria-haspopup="menu"');
  });

  it("keeps overview account and language cards free of removed status copy", () => {
    expect(workspaceSource).not.toContain("自动翻译");
    expect(workspaceSource).not.toContain("已开启 · 发送前确认");
    expect(workspaceSource).not.toContain("7天 {");
    expect(workspaceSource).not.toContain("accountBalanceDelta");
  });
});
