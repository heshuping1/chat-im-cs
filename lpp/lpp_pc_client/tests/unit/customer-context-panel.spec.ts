import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("customer context panel empty state", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/renderer/components/CustomerContextPanel.tsx"),
    "utf8",
  );

  it("requires an explicit selected customer-service thread", () => {
    expect(source).not.toContain("currentThreads[0]");
    expect(source).not.toContain("historyThreads[0]");
    expect(source).toContain("if (!selectedThreadId) return undefined");
    expect(source).toContain("enabled: Boolean(client && selectedThread)");
  });

  it("shows a customer empty state without rendering customer cards", () => {
    expect(source).toContain("未选择客户");
    expect(source).toContain("从会话池选择排队、进行中或历史会话后查看客户资料。");
    expect(source).toContain('className="customer-context-empty-state panel-state muted"');
  });

  it("uses a quiet rail affordance before a customer is selected", () => {
    expect(source).toContain("选择会话后查看客户信息");
    expect(source).toContain("{selectedThread ? (");
    expect(source).toContain("<UserRound size={18}");
    expect(source).not.toContain('src="/customer-info-entry.svg"');
  });
});
