import { describe, expect, it } from "vitest";

import { workspaceScopeFromSession } from "../../src/renderer/data/workspace-scope";

describe("workspace scope", () => {
  it("separates personal and multiple tenant spaces for the same platform user", () => {
    const base = {
      apiBaseUrl: "https://api.example.test",
      displayName: "Alice",
      platformUserId: "platform-1",
      tenantToken: "token",
      userId: "user-1",
    };

    const personal = workspaceScopeFromSession({
      ...base,
      spaceType: 1,
      tenantId: "personal-tenant",
    });
    const tenantA = workspaceScopeFromSession({
      ...base,
      spaceType: 2,
      tenantId: "tenant-a",
    });
    const tenantB = workspaceScopeFromSession({
      ...base,
      spaceType: 2,
      tenantId: "tenant-b",
    });

    expect(new Set([personal.key, tenantA.key, tenantB.key]).size).toBe(3);
    expect(personal.missing).toEqual([]);
    expect(tenantA.key).toContain("tenant-a");
    expect(tenantB.key).toContain("tenant-b");
  });

  it("records missing server identity fields instead of silently trusting token", () => {
    const scope = workspaceScopeFromSession({
      apiBaseUrl: "https://api.example.test",
      displayName: "Legacy",
      tenantToken: "legacy-token",
    });

    expect(scope.missing).toEqual([
      "spaceType",
      "tenantId",
      "userId",
      "platformUserId",
    ]);
    expect(scope.key).toContain("missing-tenant:");
  });
});
