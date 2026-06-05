import {
  normalizeCustomerServiceThreadType,
  type CustomerProfileCard,
  type CustomerServiceThread,
  type CustomerServiceThreadType,
  type MessageItemDto,
  type StaffServiceHistoryItem,
} from "../api/types";
import { customerServiceHistoryStatusKey } from "../customer-service-display";
import { staffServiceHistoryItemToThread } from "./cs-history-model";
import {
  createCustomerServiceThreadState,
  type CustomerServiceReplyGate,
  type CustomerServiceThreadState,
} from "./cs-thread-state";
import {
  createCustomerServiceIdentityViewModel,
  type CustomerServiceIdentityViewModel,
} from "./cs-identity-view-model";

export interface CustomerServiceThreadDetailView {
  avatarUrl?: string | null;
  channel?: string;
  entryChannel?: string;
  from?: string;
  isVip?: boolean;
  lastMessageAt?: string | null;
  lastMessagePreview?: string;
  messages?: MessageItemDto[];
  platform?: string;
  provider?: string;
  source?: string;
  sourceChannel?: string;
  status?: string;
  title?: string;
}

export interface CustomerServiceWorkspaceViewModelInput {
  detail?: CustomerServiceThreadDetailView;
  detailErrorText?: string;
  detailLoading?: boolean;
  formatSourceLabel?: (source?: string) => string;
  historyItems?: StaffServiceHistoryItem[];
  profile?: CustomerProfileCard;
  selectedThread?: CustomerServiceThread;
  selectedThreadId?: string | null;
  threads?: {
    activeItems?: CustomerServiceThread[];
    queueItems?: CustomerServiceThread[];
  };
}

export type CustomerServiceWorkspaceInlineStateKind = "empty" | "error" | "loading";

export interface CustomerServiceWorkspaceInlineState {
  kind: CustomerServiceWorkspaceInlineStateKind;
  text: CustomerServiceWorkspaceTextDescriptor;
  tone: "error" | "muted";
}

export interface CustomerServiceWorkspaceTextDescriptor {
  key: string;
  params?: Record<string, string | number>;
}

export interface CustomerServiceWorkspaceViewModel {
  canReply: boolean;
  closedUnreadNoticeText?: CustomerServiceWorkspaceTextDescriptor;
  composerDisabledText?: CustomerServiceWorkspaceTextDescriptor;
  identity: CustomerServiceIdentityViewModel;
  messageStageState?: CustomerServiceWorkspaceInlineState;
  modeLabel: CustomerServiceWorkspaceTextDescriptor;
  messages: MessageItemDto[];
  readOnly: boolean;
  receptionText: CustomerServiceWorkspaceTextDescriptor;
  replyGate: CustomerServiceReplyGate;
  selectedThread?: CustomerServiceThread;
  selectedThreadIsLive: boolean;
  source?: string;
  status: string;
  threadId: string;
  threadState: CustomerServiceThreadState;
  threadType: CustomerServiceThreadType;
  title: string;
}

export function createCustomerServiceWorkspaceViewModel(
  input: CustomerServiceWorkspaceViewModelInput,
): CustomerServiceWorkspaceViewModel {
  const selectedThread =
    input.selectedThread ??
    selectCustomerServiceThread({
      historyItems: input.historyItems ?? [],
      selectedThreadId: input.selectedThreadId,
      threads: input.threads,
    });
  const threadType = selectedThread?.threadType ?? "temp_session";
  const threadId = selectedThread?.threadId ?? "";
  const status = String(input.detail?.status ?? selectedThread?.status ?? "");
  const threadState = createCustomerServiceThreadState(status);
  const readOnly = threadState.readOnly;
  const messages = input.detail?.messages ?? [];
  const title =
    usableThreadTitle(input.profile?.displayName) ||
    usableThreadTitle(input.detail?.title) ||
    usableThreadTitle(selectedThread?.title) ||
    (readOnly ? "customerService.visitor" : "customerService.threadList.unknownCustomer");
  const source =
    input.detail?.sourceChannel ??
    input.detail?.source ??
    input.detail?.channel ??
    input.detail?.from ??
    selectedThread?.sourceChannel ??
    selectedThread?.source ??
    selectedThread?.channel;
  const sourceLabel = input.formatSourceLabel?.(source) ?? source ?? "customerService.workspace.unknownSource";
  const identity = createCustomerServiceIdentityViewModel({
    fallbackName: title,
    history: readOnly,
    profile: input.profile,
    thread: selectedThread,
  });

  return {
    canReply: threadState.replyGate === "open",
    closedUnreadNoticeText: createCustomerServiceClosedUnreadNoticeText({
      readOnly,
      unreadCount: selectedThread?.unreadCount,
    }),
    composerDisabledText: createCustomerServiceComposerDisabledText(threadState.replyGate),
    identity,
    messageStageState: createCustomerServiceMessageStageState({
      errorText: input.detailErrorText,
      loading: input.detailLoading,
      messageCount: messages.length,
    }),
    messages,
    modeLabel: {
      key: readOnly ? "customerService.workspace.mode.history" : "customerService.workspace.mode.current",
    },
    readOnly,
    receptionText: createCustomerServiceReceptionText({
      readOnly,
      replyGate: threadState.replyGate,
      sourceLabel,
      status,
    }),
    replyGate: threadState.replyGate,
    selectedThread,
    selectedThreadIsLive: selectedThread
      ? !createCustomerServiceThreadState(selectedThread.status).readOnly
      : false,
    source,
    status,
    threadId,
    threadState,
    threadType,
    title,
  };
}

export function createCustomerServiceNoThreadState(): CustomerServiceWorkspaceInlineState {
  return {
    kind: "empty",
    text: { key: "customerService.workspace.inline.noThread" },
    tone: "muted",
  };
}

export function createCustomerServiceMessageStageState(input: {
  errorText?: string;
  loading?: boolean;
  messageCount: number;
}): CustomerServiceWorkspaceInlineState | undefined {
  if (input.loading) {
    return {
      kind: "loading",
      text: { key: "customerService.workspace.inline.loading" },
      tone: "muted",
    };
  }
  if (input.errorText) {
    return {
      kind: "error",
      text: { key: "customerService.workspace.inline.loadFailed", params: { error: input.errorText } },
      tone: "error",
    };
  }
  if (input.messageCount === 0) {
    return {
      kind: "empty",
      text: { key: "customerService.workspace.inline.emptyMessages" },
      tone: "muted",
    };
  }
  return undefined;
}

export function selectCustomerServiceThread(input: {
  historyItems?: StaffServiceHistoryItem[];
  selectedThreadId?: string | null;
  threads?: {
    activeItems?: CustomerServiceThread[];
    queueItems?: CustomerServiceThread[];
  };
}) {
  const selectedThreadId = input.selectedThreadId?.trim();
  if (!selectedThreadId) return undefined;
  const selectableThreads = listCustomerServiceSelectableThreads(input);

  return selectableThreads.find((thread) => thread.threadId === selectedThreadId);
}

export function listCustomerServiceSelectableThreads(input: {
  historyItems?: StaffServiceHistoryItem[];
  threads?: {
    activeItems?: CustomerServiceThread[];
    queueItems?: CustomerServiceThread[];
  };
}) {
  const currentThreads = [
    ...(input.threads?.queueItems ?? []),
    ...(input.threads?.activeItems ?? []),
  ]
    .filter((thread) => normalizeCustomerServiceThreadType(thread.threadType) === "temp_session")
    .filter(
      (thread) =>
        thread.accessMode === "management_readonly" ||
        !createCustomerServiceThreadState(thread.status).readOnly,
    );
  const historyThreads = (input.historyItems ?? [])
    .map(staffServiceHistoryItemToThread)
    .filter((thread) => thread.threadType === "temp_session");

  return dedupeCustomerServiceThreads([...currentThreads, ...historyThreads]);
}

function dedupeCustomerServiceThreads(threads: CustomerServiceThread[]) {
  const seen = new Set<string>();
  return threads.filter((thread) => {
    const key = `${thread.threadType}-${thread.threadId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function usableThreadTitle(value?: string | null) {
  const title = value?.trim();
  if (!title || title.startsWith("\u5386\u53f2\u4f1a\u8bdd")) return undefined;
  return title;
}

function createCustomerServiceReceptionText(input: {
  readOnly: boolean;
  replyGate: CustomerServiceReplyGate;
  sourceLabel: string;
  status: string;
}): CustomerServiceWorkspaceTextDescriptor {
  if (input.readOnly) {
    return {
      key: "customerService.workspace.reception.ended",
      params: { status: customerServiceHistoryStatusKey(input.status) },
    };
  }
  if (input.replyGate === "claim") {
    return { key: "customerService.workspace.reception.queued", params: { source: input.sourceLabel } };
  }
  if (input.replyGate === "takeover") {
    return { key: "customerService.workspace.reception.ai", params: { source: input.sourceLabel } };
  }
  return { key: "customerService.workspace.reception.serving", params: { source: input.sourceLabel } };
}

function createCustomerServiceComposerDisabledText(replyGate: CustomerServiceReplyGate) {
  if (replyGate === "claim") return { key: "customerService.workspace.composerDisabled.claim" };
  if (replyGate === "takeover") return { key: "customerService.workspace.composerDisabled.takeover" };
  if (replyGate === "readonly") return { key: "customerService.workspace.composerDisabled.readonly" };
  return undefined;
}

function createCustomerServiceClosedUnreadNoticeText(input: {
  readOnly: boolean;
  unreadCount?: number | null;
}) {
  const unreadCount = Math.max(0, Number(input.unreadCount ?? 0));
  if (!input.readOnly || unreadCount <= 0) return undefined;
  return { key: "customerService.workspace.closedUnreadNotice", params: { count: unreadCount } };
}
