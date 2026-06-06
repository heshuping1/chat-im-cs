import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ConversationListResponse } from "../../src/renderer/data/api-client";
import { canAutoReadImConversation } from "../../src/renderer/messages/hooks/useImReadCommandExecutor";

const mocks = vi.hoisted(() => ({
  markConversationRead: vi.fn(),
  markImConversationReadLocally: vi.fn(),
  materializeReceivedImageMessage: vi.fn(),
  notifyDesktopOrBrowser: vi.fn(),
  pcSettings: {
    desktopNotifications: true,
    doNotDisturb: false,
    imNotifications: true,
    notificationPreview: true,
    notificationSound: true,
  },
  recordMessageReminderDiagnostic: vi.fn(),
  rendererWindowFocused: false,
  workspaceUiSnapshot: {
    activeImConversationId: "",
    activeImConversationVisibility: "hidden",
    activeModule: "messages",
  },
}));

vi.mock("../../src/renderer/data/auth/auth-store", () => ({
  getAuthSessionSnapshot: () => ({
    apiBaseUrl: "https://api.example.test",
    platformUserId: "platform-staff-1",
    spaceType: 2,
    tenantId: "tenant-1",
    tenantToken: "tenant-token",
    userId: "staff-1",
  }),
}));

vi.mock("../../src/renderer/data/runtime", () => ({
  requireApiClient: () => ({
    markConversationRead: mocks.markConversationRead,
  }),
}));

vi.mock("../../src/renderer/data/im-read/im-read-store", () => ({
  getImReadActions: () => ({
    clearPendingImRead: vi.fn(),
    markImConversationReadLocally: mocks.markImConversationReadLocally,
    markImPeerReadReceipt: vi.fn(),
    upsertImReadState: vi.fn(),
  }),
  getImReadSnapshot: () => ({ imReadStateByConversation: {} }),
}));

vi.mock("../../src/renderer/data/workspace-ui/workspace-ui-store", () => ({
  getWorkspaceUiSnapshot: () => mocks.workspaceUiSnapshot,
}));

vi.mock("../../src/renderer/data/settings/settings-store", () => ({
  getPcSettingsSnapshot: () => mocks.pcSettings,
}));

vi.mock("../../src/renderer/data/diagnostics/message-reminder-diagnostics", () => ({
  recordMessageReminderDiagnostic: mocks.recordMessageReminderDiagnostic,
}));

vi.mock("../../src/renderer/data/reminder/reminder-store", () => ({
  getReminderActions: () => ({
    dismissRealtimeRemindersForTarget: vi.fn(),
  }),
}));

vi.mock("../../src/renderer/data/reminder/reminder-service", async () => {
  const actual = await vi.importActual<typeof import("../../src/renderer/data/reminder/reminder-service")>(
    "../../src/renderer/data/reminder/reminder-service",
  );
  return {
    ...actual,
    isRendererWindowFocused: () => mocks.rendererWindowFocused,
    notifyDesktopOrBrowser: mocks.notifyDesktopOrBrowser,
  };
});

vi.mock("../../src/renderer/media/runtime/imageMaterialization", () => ({
  accountIdFromSession: (session: {
    lppId?: string;
    platformUserId?: string;
    tenantId?: string;
    userId?: string;
  } | null) => session?.userId || session?.platformUserId || session?.lppId || session?.tenantId,
  materializeReceivedImageMessage: mocks.materializeReceivedImageMessage,
}));

describe("gateway IM side effects", () => {
  const scopedConversationsKey = [
    "pc-im-conversations",
    "workspace|https://api.example.test|tenant|tenant-1|staff-1|platform-staff-1",
    100,
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.workspaceUiSnapshot = {
      activeImConversationId: "",
      activeImConversationVisibility: "hidden",
      activeModule: "messages",
    };
    mocks.pcSettings = {
      desktopNotifications: true,
      doNotDisturb: false,
      imNotifications: true,
      notificationPreview: true,
      notificationSound: true,
    };
    mocks.rendererWindowFocused = false;
    mocks.markConversationRead.mockResolvedValue(undefined);
  });

  it("does not auto mark background conversations read just because a message query exists", async () => {
    const { mergeImGatewayMessage } = await import(
      "../../src/renderer/data/gateway/gateway-im-side-effects"
    );
    const queryClient = new QueryClient();
    queryClient.setQueryData(["pc-im-messages", "base", "tenant", "direct", "direct-1"], []);
    queryClient.setQueryData<ConversationListResponse>(scopedConversationsKey, {
      items: [
        {
          conversationId: "direct-1",
          conversationType: "direct",
          lastMessageSeq: 0,
          lastReadSeq: 0,
          title: "Direct",
          unreadCount: 0,
        },
      ],
    });

    mergeImGatewayMessage(
      queryClient,
      {
        conversationId: "direct-1",
        conversationSeq: 1,
        messageId: "m-1",
        messageType: "text",
        senderUserId: "user-2",
      },
      "direct-1",
      "direct",
    );

    expect(mocks.markImConversationReadLocally).not.toHaveBeenCalled();
    expect(mocks.markConversationRead).not.toHaveBeenCalled();
    expect(
      queryClient.getQueryData<ConversationListResponse>(scopedConversationsKey)
        ?.items[0]?.unreadCount,
    ).toBe(1);
  });

  it("does not write unread for gateway echoes of the current user's own IM message", async () => {
    const { mergeImGatewayMessage } = await import(
      "../../src/renderer/data/gateway/gateway-im-side-effects"
    );
    const queryClient = new QueryClient();
    queryClient.setQueryData<ConversationListResponse>(scopedConversationsKey, {
      items: [
        {
          conversationId: "direct-1",
          conversationType: "direct",
          lastMessageSeq: 0,
          lastReadSeq: 0,
          title: "Direct",
          unreadCount: 0,
        },
      ],
    });

    mergeImGatewayMessage(
      queryClient,
      {
        conversationId: "direct-1",
        conversationSeq: 2,
        messageId: "m-self-1",
        messageType: "text",
        senderUserId: "staff-1",
      },
      "direct-1",
      "direct",
    );

    const item = queryClient.getQueryData<ConversationListResponse>(
      scopedConversationsKey,
    )?.items[0];
    expect(item?.unreadCount).toBe(0);
    expect(item?.lastReadSeq).toBe(2);
  });

  it("does not mark an active conversation read from gateway when the chat pane is not visible", async () => {
    mocks.workspaceUiSnapshot = {
      activeImConversationId: "direct-1",
      activeImConversationVisibility: "listOnly",
      activeModule: "messages",
    };
    const { mergeImGatewayMessage } = await import(
      "../../src/renderer/data/gateway/gateway-im-side-effects"
    );
    const queryClient = new QueryClient();
    queryClient.setQueryData<ConversationListResponse>(scopedConversationsKey, {
      items: [
        {
          conversationId: "direct-1",
          conversationType: "direct",
          lastMessageSeq: 0,
          lastReadSeq: 0,
          title: "Direct",
          unreadCount: 0,
        },
      ],
    });

    mergeImGatewayMessage(
      queryClient,
      {
        conversationId: "direct-1",
        conversationSeq: 1,
        messageId: "m-1",
        messageType: "text",
        senderUserId: "user-2",
        text: "9999999999",
      },
      "direct-1",
      "direct",
    );

    expect(mocks.markImConversationReadLocally).not.toHaveBeenCalled();
    expect(mocks.markConversationRead).not.toHaveBeenCalled();
    expect(
      queryClient.getQueryData<ConversationListResponse>(scopedConversationsKey)
        ?.items[0]?.unreadCount,
    ).toBe(1);
  });

  it("marks a peer gateway message read only when the active conversation pane is visible", async () => {
    mocks.workspaceUiSnapshot = {
      activeImConversationId: "direct-1",
      activeImConversationVisibility: "paneVisible",
      activeModule: "messages",
    };
    const { mergeImGatewayMessage } = await import(
      "../../src/renderer/data/gateway/gateway-im-side-effects"
    );
    const queryClient = new QueryClient();
    queryClient.setQueryData<ConversationListResponse>(scopedConversationsKey, {
      items: [
        {
          conversationId: "direct-1",
          conversationType: "direct",
          lastMessageSeq: 0,
          lastReadSeq: 0,
          title: "Direct",
          unreadCount: 0,
        },
      ],
    });

    mergeImGatewayMessage(
      queryClient,
      {
        conversationId: "direct-1",
        conversationSeq: 2,
        messageId: "m-visible",
        messageType: "text",
        senderUserId: "user-2",
      },
      "direct-1",
      "direct",
    );

    expect(mocks.markImConversationReadLocally).toHaveBeenCalledWith("direct-1", 2);
    expect(mocks.markConversationRead).toHaveBeenCalledWith("direct", "direct-1", 2);
    expect(
      queryClient.getQueryData<ConversationListResponse>(scopedConversationsKey)
        ?.items[0]?.unreadCount,
    ).toBe(0);
  });

  it("sends a desktop notification for background peer IM messages", async () => {
    const { mergeImGatewayMessage } = await import(
      "../../src/renderer/data/gateway/gateway-im-side-effects"
    );
    const queryClient = new QueryClient();
    queryClient.setQueryData<ConversationListResponse>(scopedConversationsKey, {
      items: [
        {
          conversationId: "direct-1",
          conversationType: "direct",
          lastMessageSeq: 0,
          lastReadSeq: 0,
          title: "Direct",
          unreadCount: 0,
        },
      ],
    });

    mergeImGatewayMessage(
      queryClient,
      imTextPayload({
        conversation: { title: "Alice" },
        preview: "hello from Alice",
      }),
      "direct-1",
      "direct",
    );

    expect(mocks.notifyDesktopOrBrowser).toHaveBeenCalledWith(
      {
        body: "hello from Alice",
        channel: "im",
        conversationId: "direct-1",
        targetId: "direct-1",
        targetModule: "messages",
        title: "Alice",
      },
      {
        channel: "im",
        settings: mocks.pcSettings,
      },
    );
    expect(mocks.recordMessageReminderDiagnostic).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "im.desktop-notify.decision",
        phase: "sent",
        classification: expect.objectContaining({
          reason: "notify-desktop",
          windowFocused: false,
        }),
      }),
    );
  });

  it("starts background image materialization when an IM image message is received", async () => {
    const { mergeImGatewayMessage } = await import(
      "../../src/renderer/data/gateway/gateway-im-side-effects"
    );

    mergeImGatewayMessage(
      new QueryClient(),
      imTextPayload({
        body: {
          image: {
            fileName: "received.png",
            signedUrl: "/media/received-image?sig=gateway",
          },
        },
        messageId: "image-received-1",
        messageType: "image",
      }),
      "direct-1",
      "direct",
    );

    expect(mocks.materializeReceivedImageMessage).toHaveBeenCalledWith({
      accountId: "staff-1",
      assetBaseUrl: "https://api.example.test",
      authToken: "tenant-token",
      conversationId: "direct-1",
      message: expect.objectContaining({
        conversationId: "direct-1",
        messageId: "image-received-1",
        messageType: "image",
      }),
      reason: "im-gateway-received",
    });
  });

  it("does not notify for the active visible IM conversation while focused", async () => {
    mocks.rendererWindowFocused = true;
    mocks.workspaceUiSnapshot = {
      activeImConversationId: "direct-1",
      activeImConversationVisibility: "paneVisible",
      activeModule: "messages",
    };
    const { mergeImGatewayMessage } = await import(
      "../../src/renderer/data/gateway/gateway-im-side-effects"
    );

    mergeImGatewayMessage(new QueryClient(), imTextPayload(), "direct-1", "direct");

    expect(mocks.notifyDesktopOrBrowser).not.toHaveBeenCalled();
    expect(mocks.recordMessageReminderDiagnostic).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "im.desktop-notify.decision",
        phase: "skipped",
        classification: expect.objectContaining({
          reason: "active-visible-conversation",
          windowFocused: true,
        }),
      }),
    );
  });

  it("does not notify for the current user's own IM gateway echo", async () => {
    const { mergeImGatewayMessage } = await import(
      "../../src/renderer/data/gateway/gateway-im-side-effects"
    );

    mergeImGatewayMessage(
      new QueryClient(),
      imTextPayload({
        messageId: "m-self",
        senderUserId: "staff-1",
      }),
      "direct-1",
      "direct",
    );

    expect(mocks.notifyDesktopOrBrowser).not.toHaveBeenCalled();
    expect(mocks.recordMessageReminderDiagnostic).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "im.desktop-notify.decision",
        phase: "skipped",
        classification: expect.objectContaining({
          reason: "self-message",
          selfMessage: true,
        }),
      }),
    );
  });

  it("does not notify for IM event or system messages", async () => {
    const { mergeImGatewayMessage } = await import(
      "../../src/renderer/data/gateway/gateway-im-side-effects"
    );

    mergeImGatewayMessage(
      new QueryClient(),
      imTextPayload({
        messageId: "m-event",
        messageType: "system",
      }),
      "direct-1",
      "direct",
    );

    expect(mocks.notifyDesktopOrBrowser).not.toHaveBeenCalled();
    expect(mocks.recordMessageReminderDiagnostic).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "im.desktop-notify.decision",
        phase: "skipped",
        classification: expect.objectContaining({
          eventMessage: true,
          reason: "event-message",
        }),
      }),
    );
  });

  it("does not notify when IM desktop policy is disabled", async () => {
    const { mergeImGatewayMessage } = await import(
      "../../src/renderer/data/gateway/gateway-im-side-effects"
    );
    for (const disabledSettings of [
      { desktopNotifications: false },
      { imNotifications: false },
      { doNotDisturb: true },
    ]) {
      vi.clearAllMocks();
      mocks.pcSettings = {
        ...mocks.pcSettings,
        desktopNotifications: true,
        doNotDisturb: false,
        imNotifications: true,
        ...disabledSettings,
      };

      mergeImGatewayMessage(
        new QueryClient(),
        imTextPayload({ messageId: `m-policy-${Object.keys(disabledSettings)[0]}` }),
        "direct-1",
        "direct",
      );

      expect(mocks.notifyDesktopOrBrowser).not.toHaveBeenCalled();
      expect(mocks.recordMessageReminderDiagnostic).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "im.desktop-notify.decision",
          phase: "skipped",
          classification: expect.objectContaining({
            reason: "policy-disabled",
          }),
        }),
      );
    }
  });

  it("allows automatic read only for visible conversations with loaded messages", () => {
    expect(
      canAutoReadImConversation({
        activeConversationId: "direct-1",
        activeConversationSource: "auto",
        activeConversationVisibility: "listOnly",
        conversationId: "direct-1",
        messagesLoaded: true,
      }),
    ).toBe(false);
    expect(
      canAutoReadImConversation({
        activeConversationId: "direct-1",
        activeConversationSource: "auto",
        activeConversationVisibility: "paneVisible",
        conversationId: "direct-1",
        messagesLoaded: true,
      }),
    ).toBe(true);
    expect(
      canAutoReadImConversation({
        activeConversationId: "direct-1",
        activeConversationSource: "user",
        activeConversationVisibility: "paneVisible",
        conversationId: "direct-1",
        messagesLoaded: false,
      }),
    ).toBe(false);
    expect(
      canAutoReadImConversation({
        activeConversationId: "direct-1",
        activeConversationSource: "user",
        activeConversationVisibility: "paneVisible",
        conversationId: "direct-1",
        messagesLoaded: true,
      }),
    ).toBe(true);
  });
});

function imTextPayload(overrides: Record<string, unknown> = {}) {
  return {
    conversation: {
      title: "Direct",
    },
    conversationId: "direct-1",
    conversationSeq: 1,
    conversationType: "direct",
    messageId: "m-1",
    messageType: "text",
    preview: "hello",
    senderDisplayName: "Alice",
    senderUserId: "user-2",
    ...overrides,
  };
}
