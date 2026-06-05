import { describe, expect, it } from "vitest";

import type {
  CustomerProfileCard,
  CustomerServiceThread,
  StaffServiceHistoryItem,
} from "../../src/renderer/data/api/types";
import {
  createCustomerServiceMessageStageState,
  createCustomerServiceNoThreadState,
  createCustomerServiceWorkspaceViewModel,
  selectCustomerServiceThread,
} from "../../src/renderer/data/customer-service/cs-workspace-view-model";

describe("customer service workspace view model", () => {
  it("does not select a thread without an explicit selected id", () => {
    const live = thread({ threadId: "live", status: "serving" });
    const closed = thread({ threadId: "closed", status: "closed_by_staff" });
    const history: StaffServiceHistoryItem = {
      status: "closed_by_staff",
      threadId: "history",
      threadType: "temp_session",
      title: "History",
    };

    expect(
      selectCustomerServiceThread({
        historyItems: [history],
        threads: {
          activeItems: [live],
          queueItems: [closed],
        },
      }),
    ).toBeUndefined();
  });

  it("selects explicit history thread when requested", () => {
    const history: StaffServiceHistoryItem = {
      status: "closed_by_staff",
      threadId: "history",
      threadType: "temp_session",
      title: "History",
    };

    expect(
      selectCustomerServiceThread({
        historyItems: [history],
        selectedThreadId: "history",
        threads: {
          activeItems: [thread({ threadId: "live", status: "serving" })],
          queueItems: [],
        },
      })?.threadId,
    ).toBe("history");
  });

  it("derives title, source, status, reply gate and messages", () => {
    const vm = createCustomerServiceWorkspaceViewModel({
      detail: {
        messages: [message({ messageId: "m1" })],
        sourceChannel: "web",
        status: "ai_assist",
        title: "Detail title",
      },
      profile: { displayName: "Profile name" } satisfies CustomerProfileCard,
      selectedThread: thread({ source: "app", status: "queued", title: "Thread title" }),
    });

    expect(vm).toMatchObject({
      canReply: false,
      identity: {
        avatarName: "Profile name",
        displayName: "Profile name",
      },
      readOnly: false,
      replyGate: "takeover",
      source: "web",
      status: "ai_assist",
      threadId: "thread-1",
      threadType: "temp_session",
      title: "Profile name",
    });
    expect(vm.messages).toHaveLength(1);
  });

  it("centralizes no-thread, loading, error and empty states", () => {
    expect(createCustomerServiceNoThreadState()).toMatchObject({
      kind: "empty",
      text: { key: "customerService.workspace.inline.noThread" },
      tone: "muted",
    });
    expect(createCustomerServiceMessageStageState({ loading: true, messageCount: 0 })).toMatchObject({
      kind: "loading",
      text: { key: "customerService.workspace.inline.loading" },
      tone: "muted",
    });
    expect(
      createCustomerServiceMessageStageState({
        errorText: "network",
        messageCount: 0,
      }),
    ).toMatchObject({
      kind: "error",
      text: {
        key: "customerService.workspace.inline.loadFailed",
        params: { error: "network" },
      },
      tone: "error",
    });
    expect(createCustomerServiceMessageStageState({ messageCount: 0 })).toMatchObject({
      kind: "empty",
      text: { key: "customerService.workspace.inline.emptyMessages" },
      tone: "muted",
    });
    expect(createCustomerServiceMessageStageState({ messageCount: 1 })).toBeUndefined();
  });

  it("derives reception and composer disabled texts", () => {
    const queued = createCustomerServiceWorkspaceViewModel({
      formatSourceLabel: () => "网页",
      selectedThread: thread({ status: "queued" }),
    });
    expect(queued).toMatchObject({
      composerDisabledText: { key: "customerService.workspace.composerDisabled.claim" },
      modeLabel: { key: "customerService.workspace.mode.current" },
      receptionText: {
        key: "customerService.workspace.reception.queued",
        params: { source: "网页" },
      },
    });

    const closed = createCustomerServiceWorkspaceViewModel({
      selectedThread: thread({ status: "closed_by_staff", unreadCount: 2 }),
    });
    expect(closed.closedUnreadNoticeText).toEqual({
      key: "customerService.workspace.closedUnreadNotice",
      params: { count: 2 },
    });
    expect(closed.composerDisabledText).toEqual({
      key: "customerService.workspace.composerDisabled.readonly",
    });
    expect(closed.modeLabel).toEqual({
      key: "customerService.workspace.mode.history",
    });
    expect(closed.receptionText).toEqual({
      key: "customerService.workspace.reception.ended",
      params: { status: "customerService.threadList.historyStatus.closedByStaff" },
    });
  });
});

function thread(overrides: Partial<CustomerServiceThread> = {}): CustomerServiceThread {
  return {
    conversationId: "thread-1",
    status: "queued",
    threadId: "thread-1",
    threadType: "temp_session",
    title: "Visitor",
    unreadCount: 0,
    ...overrides,
  };
}

function message(overrides: Partial<ReturnType<typeof baseMessage>>) {
  return {
    ...baseMessage(),
    ...overrides,
  };
}

function baseMessage() {
  return {
    body: { text: "hello" },
    conversationId: "thread-1",
    messageId: "m",
    messageType: "text",
    preview: "hello",
    sentAt: "2026-05-29T12:00:00.000Z",
  };
}
