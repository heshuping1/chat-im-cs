const chatScrollTraceFlag = "chatScrollTrace";
const legacyChatScrollTraceFlag = "lpp.chatScrollTrace";
const maxChatScrollTraceRecords = 400;

export interface ChatScrollMetrics {
  bottomDistance: number;
  clientHeight: number;
  scrollHeight: number;
  scrollTop: number;
}

export interface ChatScrollTraceRecord {
  context?: Record<string, unknown>;
  event: string;
  metrics?: ChatScrollMetrics;
  stack?: string;
  timestamp: number;
}

declare global {
  interface Window {
    __lppChatScrollTrace?: ChatScrollTraceRecord[];
  }
}

export function isChatScrollTraceEnabled() {
  const target = typeof window === "undefined" ? null : window;
  if (!target) return false;
  try {
    return (
      target.localStorage?.getItem(chatScrollTraceFlag) === "1" ||
      target.localStorage?.getItem(legacyChatScrollTraceFlag) === "1"
    );
  } catch {
    return false;
  }
}

export function chatScrollMetrics(element: HTMLElement | null | undefined): ChatScrollMetrics | undefined {
  if (!element) return undefined;
  return {
    bottomDistance: element.scrollHeight - element.scrollTop - element.clientHeight,
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    scrollTop: element.scrollTop,
  };
}

export function logChatScrollTrace({
  context,
  event,
  stack = false,
  stage,
}: {
  context?: Record<string, unknown>;
  event: string;
  stack?: boolean;
  stage?: HTMLElement | null;
}) {
  if (!isChatScrollTraceEnabled()) return undefined;
  const target = typeof window === "undefined" ? null : window;
  if (!target) return undefined;
  const record: ChatScrollTraceRecord = {
    context,
    event,
    metrics: chatScrollMetrics(stage),
    stack: stack ? new Error().stack : undefined,
    timestamp: Math.round(performance.now() * 100) / 100,
  };
  const current = target.__lppChatScrollTrace ?? [];
  target.__lppChatScrollTrace = [...current, record].slice(-maxChatScrollTraceRecords);
  console.debug("[lpp:chat-scroll]", record);
  return record;
}
