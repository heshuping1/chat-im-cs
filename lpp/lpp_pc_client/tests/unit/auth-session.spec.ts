import { describe, expect, it, vi } from "vitest";
import {
  authStorageKey,
  clearStoredAuthSession,
  createConfiguredAuthSession,
  persistAuthSession,
  readDesktopStoredAuthSession,
  readStoredAuthSession,
} from "../../src/renderer/data/auth/auth-session";

function createMemoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
    values,
  };
}

describe("auth session service shell", () => {
  it("creates configured auth sessions from env token without touching storage", () => {
    const session = createConfiguredAuthSession({
      tenantToken: "tenant-token",
      apiBaseUrl: "https://api.example.com",
    });

    expect(session).toEqual({
      apiBaseUrl: "https://api.example.com",
      tenantToken: "tenant-token",
      displayName: "褰撳墠璐﹀彿",
      roleLabel: "宸查厤缃?Token",
    });
  });

  it("prefers configured env auth over persisted auth", () => {
    const storage = createMemoryStorage({
      [authStorageKey]: JSON.stringify({
        apiBaseUrl: "https://stored.example.com",
        tenantToken: "stored-token",
        displayName: "Stored",
      }),
    });

    const session = readStoredAuthSession({
      storage,
      env: {
        tenantToken: "env-token",
        apiBaseUrl: "https://env.example.com",
      },
    });

    expect(session?.tenantToken).toBe("env-token");
    expect(storage.getItem).not.toHaveBeenCalled();
  });

  it("reads persisted auth sessions", () => {
    const storage = createMemoryStorage({
      [authStorageKey]: JSON.stringify({
        apiBaseUrl: "https://stored.example.com",
        tenantToken: "stored-token",
        displayName: "Stored",
      }),
    });

    const session = readStoredAuthSession({ storage, env: {} });

    expect(session).toMatchObject({
      apiBaseUrl: "https://stored.example.com",
      tenantToken: "stored-token",
      displayName: "Stored",
    });
  });

  it("returns null for malformed persisted auth", () => {
    const storage = createMemoryStorage({
      [authStorageKey]: "{bad-json",
    });

    expect(readStoredAuthSession({ storage, env: {} })).toBeNull();
  });

  it("persists and clears auth sessions through the auth storage key", () => {
    const storage = createMemoryStorage();
    const session = {
      apiBaseUrl: "https://stored.example.com",
      tenantToken: "stored-token",
      displayName: "Stored",
    };

    persistAuthSession(session, storage);
    expect(storage.setItem).toHaveBeenCalledWith(authStorageKey, JSON.stringify(session));
    expect(storage.values.get(authStorageKey)).toBe(JSON.stringify(session));

    clearStoredAuthSession(storage);
    expect(storage.removeItem).toHaveBeenCalledWith(authStorageKey);
    expect(storage.values.has(authStorageKey)).toBe(false);
  });

  it("persists desktop sessions through secure desktop api when available", async () => {
    const storage = createMemoryStorage();
    const saveAuthSession = vi.fn(() => Promise.resolve());
    const clearAuthSession = vi.fn(() => Promise.resolve());
    vi.stubGlobal("window", {
      desktopApi: {
        clearAuthSession,
        saveAuthSession,
      },
    });
    const session = {
      apiBaseUrl: "https://stored.example.com",
      tenantToken: "stored-token",
      displayName: "Stored",
    };

    persistAuthSession(session, storage);
    await Promise.resolve();

    expect(saveAuthSession).toHaveBeenCalledWith(session);
    expect(storage.removeItem).toHaveBeenCalledWith(authStorageKey);

    clearStoredAuthSession(storage);
    await Promise.resolve();

    expect(clearAuthSession).toHaveBeenCalled();
    expect(storage.removeItem).toHaveBeenCalledWith(authStorageKey);
    vi.unstubAllGlobals();
  });

  it("reads desktop secure auth session asynchronously", async () => {
    vi.stubGlobal("window", {
      desktopApi: {
        readAuthSession: vi.fn(() =>
          Promise.resolve({
            apiBaseUrl: "https://secure.example.com",
            tenantToken: "secure-token",
            displayName: "Secure",
          }),
        ),
      },
    });

    await expect(readDesktopStoredAuthSession()).resolves.toMatchObject({
      apiBaseUrl: "https://secure.example.com",
      tenantToken: "secure-token",
      displayName: "Secure",
    });
    vi.unstubAllGlobals();
  });
});
