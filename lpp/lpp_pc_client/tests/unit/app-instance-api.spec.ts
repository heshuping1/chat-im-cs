import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalFetch = globalThis.fetch;

describe("app instance api integration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("window", {
      desktopApi: {
        getAppInstanceProfile: vi.fn(async () => ({
          profileId: "client-2",
          profileName: "客服二号",
          deviceId: "device-1",
          clientInstanceId: "instance-2",
        })),
      },
    });
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          code: "OK",
          data: {
            platformUserId: "platform-user",
            lppId: "lpp",
            displayName: "Tester",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllGlobals();
  });

  it("adds device headers and login device fields", async () => {
    const { ApiClient } = await import("../../src/renderer/data/api-client");
    const client = new ApiClient({
      baseUrl: "https://api.example.com",
      platformToken: "platform-token",
      tenantToken: "tenant-token",
      traceId: "trace-1",
    });

    await client.platformLogin({ identifier: "tester", password: "secret" });

    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.get("X-Device-Id")).toBe("device-1");
    expect(headers.get("X-Client-Instance-Id")).toBe("instance-2");
    expect(headers.get("Authorization")).toBe("Bearer platform-token");
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      deviceId: "device-1",
      devicePlatform: "pc",
      clientInstanceId: "instance-2",
      profileName: "客服二号",
    });
  });

  it("uses the platform account devices endpoints", async () => {
    const { ApiClient } = await import("../../src/renderer/data/api-client");
    const client = new ApiClient({
      baseUrl: "https://api.example.com",
      platformToken: "platform-token",
      traceId: "trace-1",
    });

    await client.getAccountDevices();
    await client.revokeAccountDevice("device/2");

    expect(String(vi.mocked(globalThis.fetch).mock.calls[0][0])).toBe(
      "https://api.example.com/api/platform/v1/account/devices",
    );
    expect(String(vi.mocked(globalThis.fetch).mock.calls[1][0])).toBe(
      "https://api.example.com/api/platform/v1/account/devices/device%2F2",
    );
    expect(vi.mocked(globalThis.fetch).mock.calls[1][1]?.method).toBe("DELETE");
  });
});
