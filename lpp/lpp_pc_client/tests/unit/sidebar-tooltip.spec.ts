import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("collapsed sidebar tooltips", () => {
  it("delays hover tooltips and keeps labels horizontal during reload recovery", () => {
    const source = readFileSync(
      join(process.cwd(), "src/renderer/styles/shared/porcelain-shell.css"),
      "utf8",
    );

    expect(source).toContain("--sidebar-tooltip-delay: 280ms");
    expect(source).toContain("visibility: hidden");
    expect(source).toContain("opacity: 0");
    expect(source).toContain("transition:");
    expect(source).toContain("writing-mode: horizontal-tb");
    expect(source).toContain("text-overflow: ellipsis");
    expect(source).toContain("max-width: min(260px, calc(100vw - 120px))");
  });
});
