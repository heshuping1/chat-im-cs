import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ConversationListResponse } from "../../src/renderer/data/api-client";
import { canAutoReadImConversation } from "../../src/renderer/messages/hooks/useImReadCommandExecutor";

const mocks = vi.hoisted(() => ({
  markConversationRead: vi.fn(),
  markImConversationReadLocally: vi.fn(),
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

vi.mock("../../src/renderer/data/reminder/reminder-store", () => ({
  getReminderActions: () => ({
    dismissRealtimeRemindersForTarget: vi.fn(),
  }),
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
