import { afterEach, describe, expect, it } from "vitest";

import type {
  CustomerProfileCard,
  CustomerServiceThread,
  StaffServiceHistoryItem,
} from "../../src/renderer/data/api/types";
import {
  createCustomerServiceMessageStageState,
  createCustomerServiceNoThreadState,
  createCustomerServiceWorkspaceViewModel,
  listCustomerServiceSelectableThreads,
  selectCustomerServiceThread,
} from "../../src/renderer/data/customer-service/cs-workspace-view-model";
import {
  rememberSilentCustomerServiceRecall,
  resetSilentCustomerServiceRecallForTest,
} from "../../src/renderer/data/customer-service/cs-silent-recall";

describe("customer service workspace view model", () => {
  afterEach(() => {
    resetSilentCustomerServiceRecallForTest();
  });

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

  it("uses the same current temp-session source for selectable workspace threads", () => {
    const selectableThreads = listCustomerServiceSelectableThreads({
      threads: {
        activeItems: [
          thread({ conversationId: "serving-1", status: "serving", threadId: "serving-1" }),
          thread({ status: "closed_by_staff", threadId: "closed-active", unreadCount: 4 }),
          thread({ status: "serving", threadId: "direct-1", threadType: "im_direct" }),
        ],
        queueItems: [
          thread({ conversationId: "queued-1", status: "queued", threadId: "queued-1" }),
          thread({ conversationId: "queued-2", status: "pending", threadId: "queued-2" }),
          thread({ status: "closed_timeout", threadId: "closed-queue" }),
        ],
      },
    });

    expect(selectableThreads.map((item) => item.threadId)).toEqual([
      "queued-1",
      "queued-2",
      "serving-1",
    ]);
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

  it("keeps recalled customer-service messages invisible in the agent workspace", () => {
    const vm = createCustomerServiceWorkspaceViewModel({
      detail: {
        messages: [
          message({ messageId: "m1", preview: "visible" }),
          message({ isRecalled: true, messageId: "m2", preview: "hidden" }),
          message({ messageId: "m3", preview: "hidden", status: "recalled" }),
        ],
        status: "serving",
      },
      selectedThread: thread({ status: "serving" }),
    });

    expect(vm.messages.map((item) => item.messageId)).toEqual(["m1"]);
  });

  it("keeps silently recalled customer-service messages invisible even if detail reloads them", () => {
    rememberSilentCustomerServiceRecall(thread(), "m2");
    const vm = createCustomerServiceWorkspaceViewModel({
      detail: {
        messages: [
          message({ messageId: "m1", preview: "visible" }),
          message({ messageId: "m2", preview: "must not render" }),
        ],
        status: "serving",
      },
      selectedThread: thread({ status: "serving" }),
    });

    expect(vm.messages.map((item) => item.messageId)).toEqual(["m1"]);
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
    expect(closed.closureReasonText).toEqual({
      key: "customerService.threadList.historyStatus.closedByStaff",
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

  it("keeps timeout-closed threads read-only in history until explicitly reopened", () => {
    const vm = createCustomerServiceWorkspaceViewModel({
      selectedThread: thread({ status: "closed_timeout", unreadCount: 2 }),
    });

    expect(vm.canReply).toBe(false);
    expect(vm.closedUnreadNoticeText).toEqual({
      key: "customerService.workspace.closedUnreadNotice",
      params: { count: 2 },
    });
    expect(vm.composerDisabledText).toEqual({
      key: "customerService.workspace.composerDisabled.readonly",
    });
    expect(vm.modeLabel).toEqual({ key: "customerService.workspace.mode.history" });
    expect(vm.readOnly).toBe(true);
    expect(vm.replyGate).toBe("readonly");
    expect(vm.selectedThreadIsLive).toBe(false);
    expect(vm.closureReasonText).toEqual({
      key: "customerService.threadList.historyStatus.closedTimeout",
    });
  });

  it("exposes visitor close reason for closed customer service conversations", () => {
    const vm = createCustomerServiceWorkspaceViewModel({
      selectedThread: thread({ status: "closed_by_visitor" }),
    });

    expect(vm.closureReasonText).toEqual({
      key: "customerService.threadList.historyStatus.closedByVisitor",
    });
  });

  it("disables replies after the thread is transferred away from the current agent", () => {
    const vm = createCustomerServiceWorkspaceViewModel({
      selectedThread: thread({
        accessMode: "management_readonly",
        status: "transferred",
        unreadCount: 0,
      }),
    });

    expect(vm.canReply).toBe(false);
    expect(vm.composerDisabledText).toEqual({
      key: "customerService.workspace.composerDisabled.transferred",
    });
    expect(vm.modeLabel).toEqual({ key: "customerService.workspace.mode.history" });
    expect(vm.readOnly).toBe(true);
    expect(vm.receptionText).toEqual({
      key: "customerService.workspace.reception.ended",
      params: { status: "customerService.threadList.historyStatus.transferred" },
    });
    expect(vm.replyGate).toBe("readonly");
    expect(vm.selectedThreadIsLive).toBe(false);
  });

  it("disables replies when assignment moved to another staff even if status is still serving", () => {
    const vm = createCustomerServiceWorkspaceViewModel({
      currentStaffIdentity: { platformUserId: "staff-1", userId: "staff-1-user" },
      selectedThread: thread({
        assignedStaffUserId: "staff-2",
        status: "serving",
      }),
    });

    expect(vm.canReply).toBe(false);
    expect(vm.composerDisabledText).toEqual({
      key: "customerService.workspace.composerDisabled.transferred",
    });
    expect(vm.closureReasonText).toEqual({
      key: "customerService.threadList.historyStatus.transferred",
    });
    expect(vm.readOnly).toBe(true);
    expect(vm.receptionText).toEqual({
      key: "customerService.workspace.reception.ended",
      params: { status: "customerService.threadList.historyStatus.transferred" },
    });
    expect(vm.replyGate).toBe("readonly");
    expect(vm.selectedThreadIsLive).toBe(false);
  });

  it("keeps the assigned staff able to reply to a serving transferred-in thread", () => {
    const vm = createCustomerServiceWorkspaceViewModel({
      currentStaffIdentity: { platformUserId: "staff-2" },
      selectedThread: thread({
        assignedStaffUserId: "staff-2",
        status: "serving",
      }),
    });

    expect(vm.canReply).toBe(true);
    expect(vm.composerDisabledText).toBeUndefined();
    expect(vm.readOnly).toBe(false);
    expect(vm.replyGate).toBe("open");
    expect(vm.selectedThreadIsLive).toBe(true);
  });

  it("treats management readonly live threads as non-replyable viewing mode", () => {
    const vm = createCustomerServiceWorkspaceViewModel({
      formatSourceLabel: () => "网页",
      selectedThread: thread({
        accessMode: "management_readonly",
        status: "serving",
      }),
    });

    expect(vm.canReply).toBe(false);
    expect(vm.composerDisabledText).toEqual({
      key: "customerService.workspace.composerDisabled.managementReadonly",
    });
    expect(vm.modeLabel).toEqual({ key: "customerService.workspace.mode.viewing" });
    expect(vm.readOnly).toBe(true);
    expect(vm.receptionText).toEqual({
      key: "customerService.workspace.reception.viewing",
      params: { source: "网页", status: "customerService.status.serving" },
    });
    expect(vm.replyGate).toBe("readonly");
    expect(vm.selectedThreadIsLive).toBe(false);
    expect(vm.threadState.label).toBe("查看中");
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
