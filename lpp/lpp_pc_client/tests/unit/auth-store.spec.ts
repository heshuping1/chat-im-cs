import { describe, expect, it, vi } from "vitest";
import {
  selectAuthSession,
  selectClearAuthSession,
  selectSetAuthSession,
} from "../../src/renderer/data/auth/auth-store";

describe("auth store selectors", () => {
  it("selects auth session and auth actions from compatible workspace state", () => {
    const session = {
      apiBaseUrl: "https://api.example.com",
      tenantToken: "tenant-token",
      displayName: "Tester",
    };
    const setAuthSession = vi.fn();
    const clearAuthSession = vi.fn();
    const state = {
      authSession: session,
      setAuthSession,
      clearAuthSession,
    };

    expect(selectAuthSession(state)).toBe(session);
    expect(selectSetAuthSession(state)).toBe(setAuthSession);
    expect(selectClearAuthSession(state)).toBe(clearAuthSession);
  });
});
