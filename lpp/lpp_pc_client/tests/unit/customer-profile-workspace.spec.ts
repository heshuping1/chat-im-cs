import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("customer profile workspace copy", () => {
  const workspaceSource = readFileSync(
    resolve(process.cwd(), "src/renderer/components/CustomerProfileWorkspace.tsx"),
    "utf8",
  );

  it("uses channel application instead of package jargon for business ownership", () => {
    expect(workspaceSource).toContain('["渠道应用", model.appName]');
    expect(workspaceSource).not.toContain('["马甲包", model.appName]');
  });
});
