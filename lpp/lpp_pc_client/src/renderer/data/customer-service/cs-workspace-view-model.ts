import {
  normalizeCustomerServiceThreadType,
  type CustomerProfileCard,
  type CustomerServiceThread,
  type CustomerServiceThreadType,
  type MessageItemDto,
  type StaffServiceHistoryItem,
} from "../api/types";
import { customerServiceHistoryStatusLabel } from "../customer-service-display";
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
  text: string;
  tone: "error" | "muted";
}

export interface CustomerServiceWorkspaceViewModel {
  canReply: boolean;
  closedUnreadNoticeText?: string;
  composerDisabledText?: string;
  identity: CustomerServiceIdentityViewModel;
  messageStageState?: CustomerServiceWorkspaceInlineState;
  modeLabel: string;
  messages: MessageItemDto[];
  readOnly: boolean;
  receptionText: string;
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
    (readOnly ? "访客" : "未知客户");
  const source =
    input.detail?.sourceChannel ??
    input.detail?.source ??
    input.detail?.channel ??
    input.detail?.from ??
    selectedThread?.sourceChannel ??
    selectedThread?.source ??
    selectedThread?.channel;
  const sourceLabel = input.formatSourceLabel?.(source) ?? source ?? "未知来源";
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
    modeLabel: readOnly ? "历史会话" : "当前接待",
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
    text: "选择排队、进行中或历史会话后开始处理。",
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
      text: "正在加载会话...",
      tone: "muted",
    };
  }
  if (input.errorText) {
    return {
      kind: "error",
      text: `会话加载失败：${input.errorText}`,
      tone: "error",
    };
  }
  if (input.messageCount === 0) {
    return {
      kind: "empty",
      text: "暂无消息记录，可先查看客户资料或等待访客发起对话。",
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
  if (!title || title.startsWith("历史会话")) return undefined;
  return title;
}

function createCustomerServiceReceptionText(input: {
  readOnly: boolean;
  replyGate: CustomerServiceReplyGate;
  sourceLabel: string;
  status: string;
}) {
  if (input.readOnly) return `会话已结束 · ${customerServiceHistoryStatusLabel(input.status)}`;
  if (input.replyGate === "claim") {
    return `客户正在排队 · 来自 ${input.sourceLabel} · 接入后才能人工回复`;
  }
  if (input.replyGate === "takeover") {
    return `当前由 AI 接待 · 来自 ${input.sourceLabel} · 接管后才能人工回复`;
  }
  return `会话已接入 · 来自 ${input.sourceLabel} · 可继续沟通`;
}

function createCustomerServiceComposerDisabledText(replyGate: CustomerServiceReplyGate) {
  if (replyGate === "claim") return "当前会话仍在排队中，请先点击“接入”。";
  if (replyGate === "takeover") return "当前会话仍由 AI 接待，请先点击“人工接管”。";
  if (replyGate === "readonly") return "会话已结束，无法继续回复";
  return undefined;
}

function createCustomerServiceClosedUnreadNoticeText(input: {
  readOnly: boolean;
  unreadCount?: number | null;
}) {
  const unreadCount = Math.max(0, Number(input.unreadCount ?? 0));
  if (!input.readOnly || unreadCount <= 0) return undefined;
  return `有 ${unreadCount} 条关闭前未读消息`;
}
