import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("renderer hooks stability gate", () => {
  it("exposes a renderer-wide hooks lint script", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.["lint:hooks"]).toContain("src/renderer/**/*.{ts,tsx}");
    expect(packageJson.scripts?.["lint:hooks"]).toContain("react-hooks/rules-of-hooks");
    expect(packageJson.scripts?.["lint:hooks"]).toContain("@typescript-eslint/no-unused-vars: off");
    expect(packageJson.scripts?.["lint:hooks"]).toContain("no-extra-boolean-cast: off");
  });
});
