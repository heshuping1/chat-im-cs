import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  rememberCustomerServiceConversationIndex,
  resetCustomerServiceConversationIndexForTest,
} from "../../src/renderer/data/customer-service/cs-conversation-index";
import { workspaceScopeKeyFromSession } from "../../src/renderer/data/workspace-scope";

const mocks = vi.hoisted(() => ({
  materializeReceivedMediaMessage: vi.fn(),
  notifyDesktopOrBrowser: vi.fn(),
  pushRealtimeReminder: vi.fn(),
  pcSettings: {
    desktopNotifications: true,
    customerServiceMessageNotifications: true,
    notificationSound: true,
    serviceQueueNotifications: true,
  },
}));

vi.mock("../../src/renderer/data/auth/auth-store", () => ({
  getAuthSessionSnapshot: () => ({
    apiBaseUrl: "https://api.example.test",
    platformUserId: "platform-user-1",
    spaceType: 2,
    tenantId: "tenant-1",
    tenantToken: "tenant-token",
    userId: "staff-1",
  }),
}));

vi.mock("../../src/renderer/data/reminder/reminder-store", () => ({
  getReminderActions: () => ({ pushRealtimeReminder: mocks.pushRealtimeReminder }),
}));

vi.mock("../../src/renderer/data/settings/settings-store", () => ({
  getPcSettingsSnapshot: () => mocks.pcSettings,
}));

vi.mock("../../src/renderer/data/reminder/reminder-service", () => ({
  isRendererWindowFocused: () => false,
  notifyDesktopOrBrowser: mocks.notifyDesktopOrBrowser,
  shouldPushCustomerServiceQueueReminder: (settings: { serviceQueueNotifications?: boolean }) =>
    settings.serviceQueueNotifications === true,
  shouldPushCustomerServiceThreadMessageReminder: (settings: { customerServiceMessageNotifications?: boolean }) =>
    settings.customerServiceMessageNotifications === true,
  shouldPushRealtimeReminder: () => true,
  shouldShowDesktopNotification: () => true,
  shouldShowCustomerServiceThreadMessageDesktopNotificationForTarget: (
    settings: { customerServiceMessageNotifications?: boolean },
  ) => settings.customerServiceMessageNotifications === true,
  shouldShowDesktopNotificationForTarget: () => true,
}));

vi.mock("../../src/renderer/media/runtime/mediaMaterialization", () => ({
  accountIdFromSession: (session: {
    lppId?: string;
    platformUserId?: string;
    tenantId?: string;
    userId?: string;
  } | null) => session?.userId || session?.platformUserId || session?.lppId || session?.tenantId,
  materializeReceivedMediaMessage: mocks.materializeReceivedMediaMessage,
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
    mocks.pcSettings.desktopNotifications = true;
    mocks.pcSettings.customerServiceMessageNotifications = true;
    mocks.pcSettings.notificationSound = true;
    mocks.pcSettings.serviceQueueNotifications = true;
    resetCustomerServiceConversationIndexForTest();
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

  it("pushes visitor messages into online-service thread message reminders", async () => {
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

  it("starts background media materialization when a customer service media message is received", async () => {
    const { mergeCustomerServiceGatewayMessage } = await import(
      "../../src/renderer/data/gateway/gateway-cs-side-effects"
    );
    const queryClient = {
      setQueriesData: vi.fn(),
    };

    [
      {
        body: {
          image: {
            fileName: "visitor.png",
            signedUrl: "/media/visitor-image?sig=cs",
          },
        },
        conversationId: "im-conversation-cs-1",
        messageId: "visitor-image-1",
        messageType: "image",
        senderRole: "visitor",
      },
      {
        body: {
          video: {
            fileName: "visitor.mp4",
            signedUrl: "/media/visitor-video?sig=cs",
          },
        },
        conversationId: "im-conversation-cs-1",
        messageId: "visitor-video-1",
        messageType: "video",
        senderRole: "visitor",
      },
      {
        body: {
          file: {
            fileName: "visitor.zip",
            signedUrl: "/media/visitor-file?sig=cs",
          },
        },
        conversationId: "im-conversation-cs-1",
        messageId: "visitor-file-1",
        messageType: "file",
        senderRole: "visitor",
      },
    ].forEach((payload) => {
      mergeCustomerServiceGatewayMessage(queryClient as never, payload, "temp-session-1");
    });

    expect(mocks.materializeReceivedMediaMessage).toHaveBeenCalledTimes(3);
    expect(mocks.materializeReceivedMediaMessage).toHaveBeenCalledWith({
      accountId: "staff-1",
      assetBaseUrl: "https://api.example.test",
      authToken: "tenant-token",
      conversationId: "temp-session-1",
      message: expect.objectContaining({
        conversationId: "im-conversation-cs-1",
        messageId: "visitor-image-1",
        messageType: "image",
      }),
      reason: "cs-gateway-received",
    });
  });

  it("does not let queue reminder settings block active thread visitor messages", async () => {
    mocks.pcSettings.serviceQueueNotifications = false;
    const { mergeCustomerServiceGatewayMessage } = await import(
      "../../src/renderer/data/gateway/gateway-cs-side-effects"
    );
    const queryClient = {
      setQueriesData: vi.fn(),
    };

    mergeCustomerServiceGatewayMessage(
      queryClient as never,
      {
        conversationId: "active-service-conversation",
        messageId: "visitor-message-with-queue-off",
        messageType: "text",
        senderRole: "visitor",
        body: { text: "new visitor message" },
      },
      "active-service-thread",
    );

    expect(mocks.pushRealtimeReminder).toHaveBeenCalledWith(
      expect.objectContaining({
        targetId: "active-service-thread",
        targetModule: "onlineService",
      }),
    );
  });

  it("uses thread message settings to block active visitor message reminders", async () => {
    mocks.pcSettings.customerServiceMessageNotifications = false;
    const { mergeCustomerServiceGatewayMessage } = await import(
      "../../src/renderer/data/gateway/gateway-cs-side-effects"
    );
    const queryClient = {
      setQueriesData: vi.fn(),
    };

    mergeCustomerServiceGatewayMessage(
      queryClient as never,
      {
        conversationId: "active-service-conversation",
        messageId: "visitor-message-with-message-off",
        messageType: "text",
        senderRole: "visitor",
        body: { text: "new visitor message" },
      },
      "active-service-thread",
    );

    expect(mocks.pushRealtimeReminder).not.toHaveBeenCalled();
    expect(mocks.notifyDesktopOrBrowser).not.toHaveBeenCalled();
  });

  it("uses queue settings to block queue reminders", async () => {
    mocks.pcSettings.serviceQueueNotifications = false;
    const { notifyCustomerServiceQueue } = await import(
      "../../src/renderer/data/gateway/gateway-cs-side-effects"
    );

    notifyCustomerServiceQueue(
      {
        source: "官网",
        thread: {
          title: "官网访客",
        },
      },
      "thread-queue-disabled",
    );

    expect(mocks.pushRealtimeReminder).not.toHaveBeenCalled();
    expect(mocks.notifyDesktopOrBrowser).not.toHaveBeenCalled();
  });

  it("uses indexed temp-session threadId for widget gateway messages that only carry conversationId", async () => {
    const { mergeCustomerServiceGatewayMessage } = await import(
      "../../src/renderer/data/gateway/gateway-cs-side-effects"
    );
    const scopeKey = workspaceScopeKeyFromSession({
      apiBaseUrl: "https://api.example.test",
      platformUserId: "platform-user-1",
      spaceType: 2,
      tenantId: "tenant-1",
      tenantToken: "tenant-token",
      userId: "staff-1",
    });
    rememberCustomerServiceConversationIndex({
      conversationId: "widget-conversation-1",
      scopeKey,
      threadId: "widget-thread-1",
      threadType: "temp_session",
    });
    const queryClient = {
      setQueriesData: vi.fn(),
    };

    mergeCustomerServiceGatewayMessage(
      queryClient as never,
      {
        conversationId: "widget-conversation-1",
        conversationType: "temp_session",
        messageId: "widget-message-1",
        messageType: "text",
        senderRole: "visitor",
        sourceType: "widget",
        body: { text: "99998888" },
      },
      "widget-conversation-1",
    );

    const detailUpdate = queryClient.setQueriesData.mock.calls[1]?.[1] as
      | ((old: unknown) => unknown)
      | undefined;
    expect(detailUpdate?.({ messages: [] })).toMatchObject({
      threadId: "widget-thread-1",
      threadType: "temp_session",
    });
    expect(mocks.pushRealtimeReminder).toHaveBeenCalledWith(
      expect.objectContaining({
        targetId: "widget-thread-1",
        targetModule: "onlineService",
      }),
    );
  });

  it("does not notify or increment unread for current staff gateway echoes", async () => {
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
        messageId: "staff-message-1",
        messageType: "text",
        senderRole: "staff",
        senderUserId: "staff-1",
        body: { text: "agent reply" },
      },
      "temp-session-1",
    );

    expect(mocks.pushRealtimeReminder).not.toHaveBeenCalled();
    expect(mocks.notifyDesktopOrBrowser).not.toHaveBeenCalled();
    expect(queryClient.setQueriesData).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Function),
    );
    const update = queryClient.setQueriesData.mock.calls.at(-1)?.[1] as
      | ((old: unknown) => unknown)
      | undefined;
    expect(
      update?.({
        activeItems: [],
        queueItems: [
          {
            conversationId: "temp-session-1",
            threadId: "temp-session-1",
            threadType: "temp_session",
            unreadCount: 3,
          },
        ],
      }),
    ).toMatchObject({
      queueItems: [{ unreadCount: 3 }],
    });
  });

  it("uses sourceType as channel ownership rather than sender role in side effects", async () => {
    const { mergeCustomerServiceGatewayMessage } = await import(
      "../../src/renderer/data/gateway/gateway-cs-side-effects"
    );
    const queryClient = {
      setQueriesData: vi.fn(),
    };

    mergeCustomerServiceGatewayMessage(
      queryClient as never,
      {
        conversationId: "im-customer-service-thread",
        messageId: "staff-source-type-im",
        messageType: "text",
        senderUserId: "staff-1",
        sourceType: "im",
        body: { text: "agent reply" },
      },
      "im-customer-service-thread",
    );

    expect(mocks.pushRealtimeReminder).not.toHaveBeenCalled();
    expect(mocks.notifyDesktopOrBrowser).not.toHaveBeenCalled();

    const detailUpdate = queryClient.setQueriesData.mock.calls[1]?.[1] as
      | ((old: unknown) => unknown)
      | undefined;
    expect(detailUpdate?.({ messages: [] })).toMatchObject({
      threadId: "im-customer-service-thread",
      threadType: "im_direct",
    });

    const listUpdate = queryClient.setQueriesData.mock.calls.at(-1)?.[1] as
      | ((old: unknown) => unknown)
      | undefined;
    expect(
      listUpdate?.({
        activeItems: [],
        queueItems: [
          {
            conversationId: "im-customer-service-thread",
            threadId: "im-customer-service-thread",
            threadType: "im_direct",
            unreadCount: 2,
          },
        ],
      }),
    ).toMatchObject({
      activeItems: [],
      queueItems: [{ threadType: "im_direct", unreadCount: 2 }],
    });
  });
});
