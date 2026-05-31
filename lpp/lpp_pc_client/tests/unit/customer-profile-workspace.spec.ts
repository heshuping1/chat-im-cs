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
  const actionRowsSource = readFileSync(
    resolve(process.cwd(), "src/renderer/components/CustomerProfileActionRows.tsx"),
    "utf8",
  );

  it("uses channel application instead of package jargon for business ownership", () => {
    expect(workspaceSource).toContain('["渠道应用", model.appName]');
    expect(workspaceSource).not.toContain('["马甲包", model.appName]');
  });

  it("keeps customer source as profile detail instead of hero summary", () => {
    expect(workspaceSource).toContain('["客户来源", model.source]');
    expect(workspaceSource).not.toContain("model.level, model.kyc, model.risk, model.source");
    expect(workspaceSource).toContain("暂无客户识别信息");
  });

  it("renders four compact customer handling rows", () => {
    expect(workspaceSource).toContain("<CustomerProfileActionRows");
    expect(actionRowsSource).toContain('aria-label="客户处理"');
    expect(actionRowsSource).toContain('label="备注"');
    expect(actionRowsSource).toContain('label="跟进"');
    expect(actionRowsSource).toContain('label="工单"');
    expect(actionRowsSource).toContain("标签");
  });

  it("shows explicit empty states for handling rows", () => {
    expect(actionRowsSource).toContain('"暂无备注"');
    expect(actionRowsSource).toContain('"未设置跟进"');
    expect(actionRowsSource).toContain('"暂无工单"');
    expect(bitsSource).toContain("暂无标签");
  });

  it("wires remark and tag rows to real update callbacks instead of placeholder-only actions", () => {
    expect(workspaceSource).toContain("onUpdateRemark");
    expect(workspaceSource).toContain("onUpdateTags");
    expect(actionRowsSource).toContain("当前客户缺少好友 ID，无法编辑备注");
    expect(actionRowsSource).toContain("当前客户缺少好友 ID，无法编辑标签");
    expect(actionRowsSource).toContain('aria-label={`编辑${label}`}');
    expect(actionRowsSource).toContain('aria-label="编辑标签"');
    expect(actionRowsSource).not.toContain("备注编辑接口待接入");
    expect(actionRowsSource).not.toContain("标签编辑接口待接入");
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
});
