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
    expect(workspaceSource).toContain('["渠道应用", model.appName]');
    expect(workspaceSource).not.toContain('["马甲包", model.appName]');
  });

  it("keeps customer source and channel in the identity summary", () => {
    expect(workspaceSource).toContain('["来源渠道", model.source]');
    expect(workspaceSource).not.toContain("model.level, model.kyc, model.risk, model.source");
    expect(workspaceSource).toContain('["绿泡泡号", model.lppId]');
    expect(workspaceSource).toContain('["用户ID", model.customerId]');
    expect(workspaceSource).toContain('["来源", model.source]');
    expect(workspaceSource).toContain('["渠道应用", model.channelApp]');
  });

  it("keeps a fixed VIP badge slot in the hero", () => {
    expect(workspaceSource).toContain('className="customer-360-vip"');
    expect(workspaceSource).toContain('data-empty={!isKnown(model.vipLevel)}');
    expect(workspaceSource).toContain('{isKnown(model.vipLevel) ? model.vipLevel : "VIP"}');
  });

  it("renders four compact customer handling rows", () => {
    expect(workspaceSource).not.toContain("<CustomerProfileActionRows");
    expect(workspaceSource).toContain('className="customer-360-action-list"');
    expect(workspaceSource).toContain('aria-label="客户处理"');
    expect(workspaceSource).toContain('label="标签"');
    expect(workspaceSource).toContain('label="备注"');
    expect(workspaceSource).toContain('label="跟进"');
    expect(workspaceSource).toContain('label="工单"');
  });

  it("shows explicit empty states for handling rows", () => {
    expect(workspaceSource).toContain('"暂无备注"');
    expect(workspaceSource).toContain('"未设置跟进"');
    expect(workspaceSource).toContain('"暂无工单"');
    expect(bitsSource).toContain("暂无标签");
  });

  it("wires remark and tag rows to real update callbacks instead of placeholder-only actions", () => {
    expect(workspaceSource).toContain("onUpdateRemark");
    expect(workspaceSource).toContain("onUpdateTags");
    expect(workspaceSource).toContain("当前客户缺少好友 ID，无法编辑备注");
    expect(workspaceSource).toContain("当前客户缺少好友 ID，无法编辑标签");
    expect(workspaceSource).toContain('aria-label={`编辑${label}`}');
    expect(workspaceSource).toContain("parseCompactTagDraft");
    expect(workspaceSource).not.toContain("备注编辑接口待接入");
    expect(workspaceSource).not.toContain("标签编辑接口待接入");
  });

  it("uses a plus affordance for tags instead of an ambiguous add button label", () => {
    expect(bitsSource).toContain('aria-label="添加标签"');
    expect(bitsSource).toContain("+");
    expect(bitsSource).not.toContain("+ 添加");
  });

  it("keeps the ticket quick row wired to the existing ticket tab", () => {
    expect(workspaceSource).toContain('onOpenTickets={() =>');
    expect(workspaceSource).toContain('setActiveTab("tickets")');
    expect(workspaceSource).toContain('{ key: "tickets", label: "工单"');
  });

  it("expands more tabs inline instead of using a nested more menu", () => {
    expect(workspaceSource).toContain("const visibleTabs = overflowMenuOpen ? tabs : primaryTabs");
    expect(workspaceSource).toContain("{visibleTabs.map((tab) =>");
    expect(workspaceSource).toContain("更多");
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
