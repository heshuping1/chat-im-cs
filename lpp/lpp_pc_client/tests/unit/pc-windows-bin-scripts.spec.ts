import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("PC Windows bin scripts", () => {
  it("preflights native SQLite dependencies before build-and-run", () => {
    const script = readFileSync(resolve(root, "bin/build-and-run-pc-windows.bat"), "utf8");

    expect(script).toContain("node_modules\\better-sqlite3\\package.json");
    expect(script).toContain("node_modules\\@types\\better-sqlite3");
    expect(script).toContain("npm.cmd ci");
    expect(script).toContain("npm.cmd install");
    expect(script.indexOf(":ensure_dependencies")).toBeLessThan(
      script.indexOf("npm.cmd run build"),
    );
  });
});
