import { describe, expect, it, vi } from "vitest";

const electronMocks = vi.hoisted(() => {
  const show = vi.fn();
  const on = vi.fn();
  const notification = vi.fn(function Notification(this: unknown, _options: unknown) {
    Object.assign(this as object, { on, show });
  });
  Object.assign(notification, { isSupported: vi.fn(() => true) });
  return {
    createFromDataURL: vi.fn(),
    notification,
    on,
    show,
  };
});

vi.mock("electron", () => ({
  nativeImage: {
    createFromDataURL: electronMocks.createFromDataURL,
  },
  Notification: electronMocks.notification,
}));

describe("desktop notification", () => {
  it("uses notification icon data URL when it can create a native image", async () => {
    const nativeIcon = { isEmpty: () => false };
    electronMocks.createFromDataURL.mockReturnValue(nativeIcon);
    const { showDesktopNotification } = await import("../../src/main/desktop-notification");

    showDesktopNotification({
      appIconPath: "/app.ico",
      mainWindow: null,
      payload: {
        body: "B",
        iconDataUrl: "data:image/png;base64,abcd",
        title: "T",
      },
    });

    expect(electronMocks.createFromDataURL).toHaveBeenCalledWith("data:image/png;base64,abcd");
    expect(electronMocks.notification).toHaveBeenCalledWith(
      expect.objectContaining({ icon: nativeIcon }),
    );
  });

  it("falls back to the app icon when icon data is invalid", async () => {
    electronMocks.notification.mockClear();
    electronMocks.createFromDataURL.mockReturnValue({ isEmpty: () => true });
    const { showDesktopNotification } = await import("../../src/main/desktop-notification");

    showDesktopNotification({
      appIconPath: "/app.ico",
      mainWindow: null,
      payload: {
        body: "B",
        iconDataUrl: "data:image/png;base64,broken",
        title: "T",
      },
    });

    expect(electronMocks.notification).toHaveBeenCalledWith(
      expect.objectContaining({ icon: "/app.ico" }),
    );
  });
});
