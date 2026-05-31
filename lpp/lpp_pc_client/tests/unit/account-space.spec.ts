import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("account space session identity", () => {
  const accountSpaceSource = readFileSync(
    resolve(process.cwd(), "src/renderer/components/AccountUtilityPages.tsx"),
    "utf8",
  );
  const authSessionSource = readFileSync(
    resolve(process.cwd(), "src/renderer/data/auth/auth-session.ts"),
    "utf8",
  );

  it("persists identity hints when switching tenant or personal space", () => {
    expect(accountSpaceSource).toContain("userType: profile?.userType");
    expect(accountSpaceSource).toContain("spaceType: space ? 2 : 1");
    expect(accountSpaceSource).toContain("membershipRole: space ? space.membershipRole : undefined");
  });

  it("keeps identity hints optional for legacy persisted sessions", () => {
    expect(authSessionSource).toContain("userType?: number");
    expect(authSessionSource).toContain("membershipRole?: number");
    expect(authSessionSource).toContain("spaceType?: number");
  });
});
