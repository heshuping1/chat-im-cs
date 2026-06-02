import { recordMessageReminderDiagnostic } from "./message-reminder-diagnostics";

export type MessageSourceChannel = "gateway" | "http-query";

export interface MessageSourceDiagnosticInput {
  clientMsgId?: string;
  conversationId?: string;
  conversationSeq?: number;
  conversationType?: string;
  itemCount?: number;
  messageId?: string;
  messageType?: string;
  owner?: "im" | "customerService" | "unknown";
  route:
    | "gateway-push"
    | "im-conversation-list"
    | "im-message-detail"
    | "cs-workbench"
    | "cs-thread-detail";
  serverSentAt?: string;
  source: string;
  sourceChannel: MessageSourceChannel;
  threadId?: string;
  threadType?: string;
  unreadCount?: number;
}

export function recordMessageSourceObserved(input: MessageSourceDiagnosticInput) {
  const clientObservedAt = new Date().toISOString();
  recordMessageReminderDiagnostic({
    event: "message.source.observed",
    source: input.source,
    phase: input.sourceChannel,
    route: input.route,
    classification: {
      clientMsgId: input.clientMsgId,
      conversationId: input.conversationId,
      conversationSeq: input.conversationSeq,
      conversationType: input.conversationType,
      itemCount: input.itemCount,
      messageId: input.messageId,
      messageType: input.messageType,
      owner: input.owner ?? "unknown",
      sourceChannel: input.sourceChannel,
      threadId: input.threadId,
      threadType: input.threadType,
      unreadCount: input.unreadCount,
    },
    summary: {
      clientObservedAt,
      latencyMs: sourceLatencyMs(input.serverSentAt, clientObservedAt),
      serverSentAt: input.serverSentAt,
    },
  });
}

function sourceLatencyMs(serverSentAt: string | undefined, clientObservedAt: string) {
  if (!serverSentAt) return undefined;
  const serverTime = Date.parse(serverSentAt);
  const clientTime = Date.parse(clientObservedAt);
  if (!Number.isFinite(serverTime) || !Number.isFinite(clientTime)) return undefined;
  return Math.max(0, clientTime - serverTime);
}
