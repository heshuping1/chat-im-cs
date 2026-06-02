import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  notifyDesktopOrBrowser: vi.fn(),
  pushRealtimeReminder: vi.fn(),
}));

vi.mock("../../src/renderer/data/auth/auth-store", () => ({
  getAuthSessionSnapshot: () => ({ tenantToken: "tenant-token" }),
}));

vi.mock("../../src/renderer/data/reminder/reminder-store", () => ({
  getReminderActions: () => ({ pushRealtimeReminder: mocks.pushRealtimeReminder }),
}));

vi.mock("../../src/renderer/data/settings/settings-store", () => ({
  getPcSettingsSnapshot: () => ({
    desktopNotifications: true,
    notificationSound: true,
    serviceQueueNotifications: true,
  }),
}));

vi.mock("../../src/renderer/data/reminder/reminder-service", () => ({
  isRendererWindowFocused: () => false,
  notifyDesktopOrBrowser: mocks.notifyDesktopOrBrowser,
  shouldPushRealtimeReminder: () => true,
  shouldShowDesktopNotification: () => true,
  shouldShowDesktopNotificationForTarget: () => true,
}));

vi.mock("../../src/renderer/data/workspace-ui/workspace-ui-store", () => ({
  getWorkspaceUiSnapshot: () => ({
    activeModule: "messages",
    activeThreadId: "",
  }),
}));

describe("gateway customer service side effects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes source avatar into queue reminders and desktop notifications", async () => {
    const { notifyCustomerServiceQueue } = await import(
      "../../src/renderer/data/gateway/gateway-cs-side-effects"
    );

    notifyCustomerServiceQueue(
      {
        source: "官网",
        thread: {
          groupAvatarUrl: "https://assets.example/group.png",
          title: "官网访客",
        },
      },
      "thread-avatar-queue",
    );

    expect(mocks.pushRealtimeReminder).toHaveBeenCalledWith(
      expect.objectContaining({
        avatarLabel: "官",
        avatarUrl: "https://assets.example/group.png",
        body: "来自 官网 的访客正在排队，等待接入",
        targetId: "thread-avatar-queue",
        title: "官网访客",
      }),
    );
    expect(mocks.notifyDesktopOrBrowser).toHaveBeenCalledWith(
      expect.objectContaining({
        body: "来自 官网 的访客正在排队，等待接入",
        targetId: "thread-avatar-queue",
        title: "官网访客",
      }),
      expect.objectContaining({
        authToken: "tenant-token",
        iconUrl: "https://assets.example/group.png",
      }),
    );
  });

  it("pushes visitor messages into online-service serviceQueue reminders", async () => {
    const { mergeCustomerServiceGatewayMessage } = await import(
      "../../src/renderer/data/gateway/gateway-cs-side-effects"
    );
    const queryClient = {
      setQueriesData: vi.fn(),
    };

    mergeCustomerServiceGatewayMessage(
      queryClient as never,
      {
        conversationId: "im-conversation-cs-1",
        messageId: "visitor-message-1",
        messageType: "text",
        senderRole: "visitor",
        body: { text: "hello" },
      },
      "temp-session-1",
    );

    expect(mocks.pushRealtimeReminder).toHaveBeenCalledWith(
      expect.objectContaining({
        targetModule: "onlineService",
        targetId: "temp-session-1",
      }),
    );
    expect(mocks.notifyDesktopOrBrowser).toHaveBeenCalledWith(
      expect.objectContaining({
        targetModule: "onlineService",
        targetId: "temp-session-1",
      }),
      expect.objectContaining({
        channel: "serviceQueue",
      }),
    );
  });
});
