import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  createAppErrorFallbackModel,
  createAppErrorReferenceCode,
} from "../../src/renderer/components/AppErrorBoundary";

describe("AppErrorBoundary", () => {
  it("keeps React internal errors out of user-facing copy", () => {
    const model = createAppErrorFallbackModel(
      new Error("Should have a queue. This is likely a bug in React. Please file an issue."),
    );

    expect(model.title).toBe("PC 客户端暂时无法加载");
    expect(model.message).toContain("界面渲染出现异常");
    expect(model.message).not.toContain("Should have a queue");
    expect(model.message).not.toContain("bug in React");
    expect(model.referenceCode).toMatch(/^PC-ERR-[0-9A-Z]{6}$/);
  });

  it("creates stable, sanitized reference codes for the same error", () => {
    const error = new Error("token=secret Should have a queue");

    expect(createAppErrorReferenceCode(error)).toBe(createAppErrorReferenceCode(error));
    expect(createAppErrorReferenceCode(error)).not.toContain("secret");
  });

  it("offers retry before hard reload and records boundary context", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/renderer/components/AppErrorBoundary.tsx"),
      "utf8",
    );

    expect(source).toContain("重试界面");
    expect(source).toContain("重新加载");
    expect(source).toContain("this.setState({ error: null");
    expect(source).toContain("componentStack");
    expect(source).toContain("resetKey");
    expect(source).toContain("activeModule");
    expect(source).toContain("url");
  });
});
