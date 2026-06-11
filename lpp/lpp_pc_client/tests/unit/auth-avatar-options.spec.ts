import { describe, expect, it } from "vitest";

import { registerAvatarOptions } from "../../src/renderer/data/auth/register-avatar-options";

describe("register avatar options", () => {
  it("offers AI beauty, cartoon and startlink themed avatars", () => {
    expect(registerAvatarOptions).toHaveLength(18);
    expect(registerAvatarOptions.filter((item) => item.category === "ai_beauty")).toHaveLength(6);
    expect(registerAvatarOptions.filter((item) => item.category === "cartoon")).toHaveLength(6);
    expect(registerAvatarOptions.filter((item) => item.category === "green_bubble")).toHaveLength(6);
    expect(registerAvatarOptions.some((item) => item.label.includes("AI"))).toBe(true);
    expect(registerAvatarOptions.some((item) => item.label.includes("卡通"))).toBe(true);
    expect(registerAvatarOptions.some((item) => item.label.includes("星络"))).toBe(true);
  });

  it("keeps every preset as a local unique svg data url", () => {
    const urls = registerAvatarOptions.map((item) => item.avatarUrl);

    expect(new Set(urls).size).toBe(registerAvatarOptions.length);
    for (const option of registerAvatarOptions) {
      const decoded = decodeURIComponent(option.avatarUrl);
      expect(option.avatarUrl).toMatch(/^data:image\/svg\+xml,/);
      expect(decoded).toContain("<svg");
      expect(decoded).not.toContain("<image");
      expect(decoded).not.toMatch(/href=["']https?:/);
    }
  });
});
