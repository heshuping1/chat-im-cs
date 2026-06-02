import type { QueryClient } from "@tanstack/react-query";
import type { AuthSession } from "../auth/auth-session";
import { recordMessageReminderDiagnostic } from "../diagnostics/message-reminder-diagnostics";
import { recordMessageSourceObserved } from "../diagnostics/message-source-diagnostics";
import { recordMessageTraceEvent } from "../diagnostics/message-trace-diagnostics";
import type { CustomerServiceStatus } from "../types";
import {
  mergeCustomerServiceGatewayMessage,
  notifyCustomerServiceQueue,
} from "./gateway-cs-side-effects";
import {
  mergeImGatewayMessage,
  mergeReadEvent,
} from "./gateway-im-side-effects";
import {
  invalidateCustomerServiceGatewayQueries,
} from "./gateway-query-invalidation";
import {
  messageRecord,
  numberField,
  stringField,
} from "./gateway-payload-utils";
import { triggerMessageGapSync } from "./message-gap-sync-coordinator";

export interface MessageDeliveryServiceOptions {
  queryClient: QueryClient;
  scopeKey: string;
  session: AuthSession;
  setCustomerServiceStatus: (status: CustomerServiceStatus) => void;
}

export interface DeliverImMessageInput {
  conversationId?: string;
  conversationType?: string;
  payload: Record<string, unknown>;
  route: string;
  source: string;
}

export interface DeliverCustomerServiceMessageInput {
  payload: Record<string, unknown>;
  route: string;
  source: string;
  threadId?: string;
}

export function createMessageDeliveryService(options: MessageDeliveryServiceOptions) {
  const { queryClient, scopeKey, session } = options;
  const invalidateCustomerService = (threadId?: string) =>
    invalidateCustomerServiceGatewayQueries(queryClient, threadId);

  return {
    deliverCustomerServiceMessage(input: DeliverCustomerServiceMessageInput) {
      const guard = evaluateDeliveryGuard({
        conversationId: input.threadId,
        owner: "customerService",
        payload: input.payload,
        scopeKey,
      });
      recordDeliveryGuardDiagnostic({
        guard,
        owner: "customerService",
        route: input.route,
        scopeKey,
        source: input.source,
      });
      if (guard.decision === "skip") return;
      if (guard.decision === "gap") {
        triggerMessageGapSync(queryClient, {
          conversationId: guard.conversationId,
          reason: "push-seq-gap",
          scopeKey,
          source: "message-delivery-service",
        });
      }
      recordMessageDeliveryDiagnostic({
        owner: "customerService",
        phase: "cache-write",
        route: input.route,
        scopeKey,
        source: input.source,
        summary: {
          latency: deliveryLatencySummary(input.payload),
          payload: input.payload,
          threadId: input.threadId,
        },
      });
      recordDeliveryTraceEvent({
        owner: "customerService",
        payload: input.payload,
        route: input.route,
        source: input.source,
        stage: "receive.cache.written",
        threadId: input.threadId,
      });
      mergeCustomerServiceGatewayMessage(queryClient, input.payload, input.threadId ?? "");
      invalidateCustomerService(input.threadId);
    },

    deliverCustomerServiceQueue(input: DeliverCustomerServiceMessageInput) {
      recordMessageDeliveryDiagnostic({
        owner: "customerService",
        phase: "queue",
        route: input.route,
        scopeKey,
        source: input.source,
        summary: {
          latency: deliveryLatencySummary(input.payload),
          payload: input.payload,
          threadId: input.threadId,
        },
      });
      invalidateCustomerService(input.threadId);
      notifyCustomerServiceQueue(input.payload, input.threadId ?? "");
    },

    deliverImMessage(input: DeliverImMessageInput) {
      const guard = evaluateDeliveryGuard({
        conversationId: input.conversationId,
        owner: "im",
        payload: input.payload,
        scopeKey,
      });
      recordDeliveryGuardDiagnostic({
        guard,
        owner: "im",
        route: input.route,
        scopeKey,
        source: input.source,
      });
      if (guard.decision === "skip") return;
      if (guard.decision === "gap") {
        triggerMessageGapSync(queryClient, {
          conversationId: guard.conversationId,
          reason: "push-seq-gap",
          scopeKey,
          source: "message-delivery-service",
        });
      }
      recordMessageDeliveryDiagnostic({
        owner: "im",
        phase: "cache-write",
        route: input.route,
        scopeKey,
        source: input.source,
        summary: {
          conversationId: input.conversationId,
          conversationType: input.conversationType,
          latency: deliveryLatencySummary(input.payload),
          payload: input.payload,
        },
      });
      recordDeliveryTraceEvent({
        conversationId: input.conversationId,
        conversationType: input.conversationType,
        owner: "im",
        payload: input.payload,
        route: input.route,
        source: input.source,
        stage: "receive.cache.written",
      });
      mergeImGatewayMessage(
        queryClient,
        input.payload,
        input.conversationId ?? "",
        input.conversationType ?? "",
      );
    },

    deliverImRead(input: Omit<DeliverImMessageInput, "conversationType">) {
      recordMessageDeliveryDiagnostic({
        owner: "im",
        phase: "read",
        route: input.route,
        scopeKey,
        source: input.source,
        summary: {
          conversationId: input.conversationId,
          latency: deliveryLatencySummary(input.payload),
          payload: input.payload,
        },
      });
      mergeReadEvent(queryClient, input.payload, session);
      void queryClient.invalidateQueries({ queryKey: ["pc-im-conversations"] });
    },
  };
}

type MessageOwner = "im" | "customerService";

type DeliveryGuardDecision = "accept" | "gap" | "skip";

interface DeliveryGuardInput {
  conversationId?: string;
  owner: MessageOwner;
  payload: Record<string, unknown>;
  scopeKey: string;
}

interface DeliveryGuardResult {
  conversationId?: string;
  decision: DeliveryGuardDecision;
  gapSize?: number;
  highestSeqBefore?: number;
  messageId?: string;
  reason: "accepted" | "duplicate-message-id" | "duplicate-or-stale-seq" | "seq-gap";
  seq?: number;
}

const deliveredMessageIds = new Set<string>();
const highestSeqByConversation = new Map<string, number>();
const maxGuardEntries = 5000;

function evaluateDeliveryGuard(input: DeliveryGuardInput): DeliveryGuardResult {
  const metadata = deliveryMetadata(input);
  if (metadata.messageId) {
    const messageKey = `${input.scopeKey}|${input.owner}|message|${metadata.messageId}`;
    if (deliveredMessageIds.has(messageKey)) {
      return {
        conversationId: metadata.conversationId,
        decision: "skip",
        messageId: metadata.messageId,
        reason: "duplicate-message-id",
        seq: metadata.seq,
      };
    }
    deliveredMessageIds.add(messageKey);
    trimSet(deliveredMessageIds, maxGuardEntries);
  }

  const seq = metadata.seq;
  if (!metadata.conversationId || seq === undefined) {
    return {
      conversationId: metadata.conversationId,
      decision: "accept",
      messageId: metadata.messageId,
      reason: "accepted",
      seq,
    };
  }

  const seqKey = `${input.scopeKey}|${input.owner}|conversation|${metadata.conversationId}`;
  const highestSeqBefore = highestSeqByConversation.get(seqKey) ?? 0;
  if (seq <= highestSeqBefore) {
    return {
      conversationId: metadata.conversationId,
      decision: "skip",
      highestSeqBefore,
      messageId: metadata.messageId,
      reason: "duplicate-or-stale-seq",
      seq,
    };
  }

  highestSeqByConversation.set(seqKey, seq);
  trimMap(highestSeqByConversation, maxGuardEntries);
  if (highestSeqBefore > 0 && seq > highestSeqBefore + 1) {
    return {
      conversationId: metadata.conversationId,
      decision: "gap",
      gapSize: seq - highestSeqBefore - 1,
      highestSeqBefore,
      messageId: metadata.messageId,
      reason: "seq-gap",
      seq,
    };
  }

  return {
    conversationId: metadata.conversationId,
    decision: "accept",
    highestSeqBefore,
    messageId: metadata.messageId,
    reason: "accepted",
    seq,
  };
}

function deliveryMetadata(input: DeliveryGuardInput) {
  const payload = input.payload ?? {};
  const message = messageRecord(payload);
  const conversationId =
    input.conversationId ||
    stringField(message, "conversationId", "threadId") ||
    stringField(input.payload, "conversationId", "threadId");
  const messageId =
    stringField(message, "messageId", "clientMsgId") ||
    stringField(input.payload, "messageId", "clientMsgId");
  const seq =
    numberField(message, "conversationSeq", "seq") ||
    numberField(input.payload, "conversationSeq", "seq");
  return { conversationId, messageId, seq };
}

function recordDeliveryGuardDiagnostic(input: {
  guard: DeliveryGuardResult;
  owner: MessageOwner;
  route: string;
  scopeKey: string;
  source: string;
}) {
  recordMessageReminderDiagnostic({
    event: "message.delivery.guard",
    source: input.source,
    phase: input.guard.decision,
    route: input.route,
    classification: {
      conversationId: input.guard.conversationId,
      decision: input.guard.decision,
      gapSize: input.guard.gapSize,
      highestSeqBefore: input.guard.highestSeqBefore,
      messageId: input.guard.messageId,
      owner: input.owner,
      reason: input.guard.reason,
      scopeKey: input.scopeKey,
      seq: input.guard.seq,
    },
  });
}

function trimSet<T>(set: Set<T>, maxEntries: number) {
  while (set.size > maxEntries) {
    const first = set.values().next();
    if (first.done) return;
    set.delete(first.value);
  }
}

function trimMap<K, V>(map: Map<K, V>, maxEntries: number) {
  while (map.size > maxEntries) {
    const first = map.keys().next();
    if (first.done) return;
    map.delete(first.value);
  }
}

export function resetMessageDeliveryGuardForTest() {
  deliveredMessageIds.clear();
  highestSeqByConversation.clear();
}

export function recordGatewayPushReceived(input: {
  args?: unknown[];
  eventName: string;
  payload?: Record<string, unknown>;
  scopeKey?: string;
  source: string;
}) {
  const payload = input.payload ?? {};
  const message = messageRecord(payload);
  const clientMsgId = stringField(message, "clientMsgId", "clientMessageId") || undefined;
  const conversationId =
    stringField(message, "conversationId", "threadId") ||
    stringField(payload, "conversationId", "threadId") ||
    undefined;
  const conversationSeq =
    numberField(message, "conversationSeq", "seq") ||
    numberField(payload, "conversationSeq", "seq") ||
    undefined;
  const messageId =
    stringField(message, "messageId") ||
    stringField(payload, "messageId") ||
    undefined;
  const messageType =
    stringField(message, "messageType", "type") ||
    stringField(payload, "messageType", "type") ||
    undefined;
  const serverSentAt =
    stringField(message, "sentAt", "sendTime", "createdAt", "serverTime", "timestamp") ||
    stringField(payload, "sentAt", "sendTime", "createdAt", "serverTime", "timestamp") ||
    undefined;
  recordMessageSourceObserved({
    clientMsgId,
    conversationId,
    conversationSeq,
    messageId,
    messageType:
      messageType,
    route: "gateway-push",
    serverSentAt,
    source: input.source,
    sourceChannel: "gateway",
  });
  recordMessageTraceEvent({
    clientMsgId,
    conversationId,
    conversationSeq,
    messageId,
    owner: "unknown",
    route: "gateway-push",
    serverSentAt,
    source: input.source,
    sourceChannel: "gateway",
    stage: "receive.gateway.observed",
  });
  recordMessageReminderDiagnostic({
    event: "gateway.push.received",
    source: input.source,
    phase: "received",
    route: "push",
    classification: {
      argCount: input.args?.length ?? 0,
      eventName: input.eventName,
      scopeKey: input.scopeKey,
    },
    summary: {
      latency: deliveryLatencySummary(input.payload),
      payload: input.payload,
    },
  });
}

function recordDeliveryTraceEvent(input: {
  conversationId?: string;
  conversationType?: string;
  owner: "im" | "customerService";
  payload: Record<string, unknown>;
  route: string;
  source: string;
  stage: "receive.cache.written";
  threadId?: string;
}) {
  const message = messageRecord(input.payload);
  const clientMsgId = stringField(message, "clientMsgId", "clientMessageId") || undefined;
  const messageId =
    stringField(message, "messageId") ||
    stringField(input.payload, "messageId") ||
    undefined;
  recordMessageTraceEvent({
    clientMsgId,
    conversationId:
      input.conversationId ||
      stringField(message, "conversationId", "threadId") ||
      stringField(input.payload, "conversationId", "threadId") ||
      undefined,
    conversationSeq:
      numberField(message, "conversationSeq", "seq") ||
      numberField(input.payload, "conversationSeq", "seq") ||
      undefined,
    conversationType: input.conversationType,
    messageId,
    owner: input.owner,
    route: input.route,
    serverSentAt:
      stringField(message, "sentAt", "sendTime", "createdAt", "serverTime", "timestamp") ||
      stringField(input.payload, "sentAt", "sendTime", "createdAt", "serverTime", "timestamp") ||
      undefined,
    source: input.source,
    sourceChannel: "gateway",
    stage: input.stage,
    threadId: input.threadId,
  });
}

function deliveryLatencySummary(payload: Record<string, unknown> | undefined) {
  if (!payload) return undefined;
  const message = messageRecord(payload);
  const serverSentAt =
    stringField(message, "sentAt", "sendTime", "createdAt", "serverTime", "timestamp") ||
    stringField(payload, "sentAt", "sendTime", "createdAt", "serverTime", "timestamp");
  const clientObservedAt = new Date().toISOString();
  const serverTimeMs = Date.parse(serverSentAt);
  const clientTimeMs = Date.parse(clientObservedAt);
  return {
    clientObservedAt,
    latencyMs:
      Number.isFinite(serverTimeMs) && Number.isFinite(clientTimeMs)
        ? Math.max(0, clientTimeMs - serverTimeMs)
        : undefined,
    source: "push",
    serverSentAt: serverSentAt || undefined,
  };
}

function recordMessageDeliveryDiagnostic(input: {
  owner: "im" | "customerService";
  phase: string;
  route: string;
  scopeKey: string;
  source: string;
  summary?: Record<string, unknown>;
}) {
  recordMessageReminderDiagnostic({
    event: "message.delivery",
    source: input.source,
    phase: input.phase,
    route: input.route,
    classification: {
      owner: input.owner,
      scopeKey: input.scopeKey,
    },
    summary: input.summary,
  });
}
