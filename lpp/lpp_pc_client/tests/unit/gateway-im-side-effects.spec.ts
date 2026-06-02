import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ConversationListResponse } from "../../src/renderer/data/api-client";
import { canAutoReadImConversation } from "../../src/renderer/messages/hooks/useImReadCommandExecutor";

const mocks = vi.hoisted(() => ({
  markConversationRead: vi.fn(),
  markImConversationReadLocally: vi.fn(),
}));

vi.mock("../../src/renderer/data/auth/auth-store", () => ({
  getAuthSessionSnapshot: () => ({
    apiBaseUrl: "https://api.example.test",
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
  getWorkspaceUiSnapshot: () => ({
    activeImConversationId: "",
    activeModule: "messages",
  }),
}));

vi.mock("../../src/renderer/data/reminder/reminder-store", () => ({
  getReminderActions: () => ({
    dismissRealtimeRemindersForTarget: vi.fn(),
  }),
}));

describe("gateway IM side effects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.markConversationRead.mockResolvedValue(undefined);
  });

  it("does not auto mark background conversations read just because a message query exists", async () => {
    const { mergeImGatewayMessage } = await import(
      "../../src/renderer/data/gateway/gateway-im-side-effects"
    );
    const queryClient = new QueryClient();
    queryClient.setQueryData(["pc-im-messages", "base", "tenant", "direct", "direct-1"], []);
    queryClient.setQueryData<ConversationListResponse>(["pc-im-conversations"], {
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
      queryClient.getQueryData<ConversationListResponse>(["pc-im-conversations"])
        ?.items[0]?.unreadCount,
    ).toBe(1);
  });

  it("does not write unread for gateway echoes of the current user's own IM message", async () => {
    const { mergeImGatewayMessage } = await import(
      "../../src/renderer/data/gateway/gateway-im-side-effects"
    );
    const queryClient = new QueryClient();
    queryClient.setQueryData<ConversationListResponse>(["pc-im-conversations"], {
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

    const item = queryClient.getQueryData<ConversationListResponse>([
      "pc-im-conversations",
    ])?.items[0];
    expect(item?.unreadCount).toBe(0);
    expect(item?.lastReadSeq).toBe(2);
  });

  it("allows automatic read only for visible conversations with loaded messages", () => {
    expect(
      canAutoReadImConversation({
        activeConversationId: "direct-1",
        activeConversationSource: "auto",
        activeConversationVisibility: "listOnly",
        conversationId: "direct-1",
        messagesLength: 5,
      }),
    ).toBe(false);
    expect(
      canAutoReadImConversation({
        activeConversationId: "direct-1",
        activeConversationSource: "auto",
        activeConversationVisibility: "paneVisible",
        conversationId: "direct-1",
        messagesLength: 5,
      }),
    ).toBe(true);
    expect(
      canAutoReadImConversation({
        activeConversationId: "direct-1",
        activeConversationSource: "user",
        activeConversationVisibility: "paneVisible",
        conversationId: "direct-1",
        messagesLength: 0,
      }),
    ).toBe(false);
    expect(
      canAutoReadImConversation({
        activeConversationId: "direct-1",
        activeConversationSource: "user",
        activeConversationVisibility: "paneVisible",
        conversationId: "direct-1",
        messagesLength: 5,
      }),
    ).toBe(true);
  });
});
