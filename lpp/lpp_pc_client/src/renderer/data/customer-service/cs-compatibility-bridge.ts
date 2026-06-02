import type { ConversationListItem } from "../api/types";
import { resolveConversationOwnership } from "../gateway/conversation-ownership-resolver";
import { asRecord, stringField } from "../gateway/gateway-record-utils";
import { recordMessageReminderDiagnostic } from "../diagnostics/message-reminder-diagnostics";
import {
  rememberCustomerServiceCompatUnreadCandidate,
  rememberCustomerServiceConversationIndex,
} from "./cs-conversation-index";

const loggedImListCompatSignatures = new Map<string, string>();
const maxLoggedImListCompatSignatures = 300;

export function rememberCustomerServiceConversationFromImList(
  item: ConversationListItem,
  scopeKey?: string,
) {
  const record = item as unknown as Record<string, unknown>;
  const ownership = resolveConversationOwnership({
    payload: record,
    scopeKey: scopeKey ?? "",
    source: "imList",
  });
  if (ownership.owner !== "customerService" || ownership.confidence !== "explicit") return;
  const tempSession = asRecord(record.tempSession ?? record.temp_session);
  const threadId =
    ownership.threadId ||
    stringField(tempSession, "sessionId", "session_id", "threadId", "thread_id") ||
    stringField(record, "threadId", "thread_id", "sessionId", "session_id");
  if (!item.conversationId || !threadId) return;
  rememberCustomerServiceConversationIndex({
    conversationId: item.conversationId,
    lastMessageAt: item.lastMessage?.sentAt ?? null,
    lastMessageId: item.lastMessage?.messageId,
    lastMessagePreview: item.lastMessage?.preview,
    scopeKey,
    source:
      stringField(tempSession, "sourceChannel", "source_channel", "source", "channel") ||
      stringField(record, "sourceChannel", "source_channel", "source", "channel"),
    threadId,
    threadType: "temp_session",
  });
  const compatUnreadTrust = resolveCompatUnreadTrust(item.lastMessage, tempSession);
  const compatDecision = rememberCustomerServiceCompatUnreadCandidate({
    conversationId: item.conversationId,
    lastMessageAt: item.lastMessage?.sentAt ?? null,
    lastMessageId: item.lastMessage?.messageId,
    lastMessagePreview: item.lastMessage?.preview,
    lastMessageSeq: item.lastMessageSeq,
    lastReadSeq: item.lastReadSeq,
    rawUnreadCount: item.unreadCount,
    scopeKey,
    source:
      stringField(tempSession, "sourceChannel", "source_channel", "source", "channel") ||
      stringField(record, "sourceChannel", "source_channel", "source", "channel"),
    threadId,
    threadType: "temp_session",
    trustedUnread: compatUnreadTrust.trusted,
    unreadCount: item.unreadCount,
    unreadReason: compatUnreadTrust.reason,
  });
  const logKey = `${threadId}:${item.conversationId}`;
  const logSignature = [
    item.lastMessage?.messageId ?? "",
    item.lastMessage?.preview ?? "",
    item.lastMessage?.sentAt ?? "",
    Math.max(0, Number(item.unreadCount ?? 0)),
    item.lastReadSeq ?? "",
    item.lastMessageSeq ?? "",
  ].join("|");
  if (!shouldRecordCustomerServiceImListCompatDiagnostic(logKey, logSignature)) return;

  recordMessageReminderDiagnostic({
    event: "cs.overlay.write",
    source: "cs-compatibility-bridge",
    phase: "write",
    route: "imListCompat",
    classification: {
      compatLastMessageSeq: compatDecision.lastMessageSeq,
      compatLastReadSeq: compatDecision.lastReadSeq,
      compatUnreadCandidate: compatDecision.candidate,
      conversationId: item.conversationId,
      imListUnreadCount: Math.max(0, Number(item.unreadCount ?? 0)),
      messageId: item.lastMessage?.messageId,
      previousReadClearedMessageId: compatDecision.previousReadClearedMessageId,
      previousReadClearedSeq: compatDecision.previousReadClearedSeq,
      scopeKey,
      source: "imListCompat",
      threadId,
      threadType: "temp_session",
    },
    summary: {
      item,
    },
  });
  recordMessageReminderDiagnostic({
    event: "cs.compat.candidate.evaluate",
    source: "cs-compatibility-bridge",
    phase: "evaluate",
    route: "imListCompat",
    classification: {
      compatRawUnreadCount: compatDecision.rawUnreadCount,
      compatTrustedUnreadCandidate: compatDecision.candidate,
      conversationId: item.conversationId,
      hasLastMessageDirection: compatUnreadTrust.hasDirection,
      hasLastMessageSender: compatUnreadTrust.hasSender,
      lastMessageDirection: compatUnreadTrust.direction,
      messageId: item.lastMessage?.messageId,
      reason: compatDecision.unreadReason,
      scopeKey,
      staffSentAfterRead: compatDecision.staffSentAfterRead,
      threadId,
      threadType: "temp_session",
      trusted: compatDecision.trustedUnread,
      unreadWindow: compatDecision.unreadWindow,
    },
    summary: {
      item,
      tempSession,
    },
  });
}

function resolveCompatUnreadTrust(
  lastMessage: ConversationListItem["lastMessage"],
  tempSession: Record<string, unknown>,
) {
  if (!lastMessage) {
    return {
      direction: "",
      hasDirection: false,
      hasSender: false,
      reason: "compat-missing-last-message",
      trusted: false,
    };
  }
  const record = lastMessage as Record<string, unknown>;
  const direction = String(record.direction ?? "").trim().toLowerCase();
  const senderIds = compactStrings([
    record.senderUserId,
    record.senderId,
    record.fromUserId,
    record.senderPlatformUserId,
    record.platformUserId,
    record.senderLppId,
    record.lppId,
  ]);
  const visitorIds = compactStrings([
    tempSession.visitorUserId,
    tempSession.visitor_user_id,
    tempSession.customerUserId,
    tempSession.customer_user_id,
    tempSession.customerId,
    tempSession.customer_id,
    tempSession.visitorId,
    tempSession.visitor_id,
    tempSession.platformUserId,
    tempSession.platform_user_id,
    tempSession.lppId,
    tempSession.lpp_id,
  ]);
  const staffIds = compactStrings([
    tempSession.staffUserId,
    tempSession.staff_user_id,
    tempSession.assignedStaffUserId,
    tempSession.assigned_staff_user_id,
    tempSession.assigneeUserId,
    tempSession.assignee_user_id,
    tempSession.serviceStaffUserId,
    tempSession.service_staff_user_id,
    tempSession.receptionistUserId,
    tempSession.receptionist_user_id,
  ]);
  const hasSender = senderIds.length > 0;
  const hasDirection = Boolean(direction);
  if (record.isSelf === true || record.isMine === true) {
    return { direction, hasDirection, hasSender, reason: "self-message-suppressed", trusted: false };
  }
  if (["out", "outgoing", "sent", "self"].includes(direction)) {
    return { direction, hasDirection, hasSender, reason: "self-message-suppressed", trusted: false };
  }
  if (hasSender && intersects(senderIds, staffIds)) {
    return { direction, hasDirection, hasSender, reason: "staff-message-suppressed", trusted: false };
  }
  if (["in", "incoming", "received", "visitor", "customer", "peer"].includes(direction)) {
    return { direction, hasDirection, hasSender, reason: "compat-inbound-trusted", trusted: true };
  }
  if (hasSender && intersects(senderIds, visitorIds)) {
    return { direction, hasDirection, hasSender, reason: "compat-visitor-sender-trusted", trusted: true };
  }
  return {
    direction,
    hasDirection,
    hasSender,
    reason: "compat-unknown-suppressed",
    trusted: false,
  };
}

function compactStrings(values: unknown[]) {
  return values
    .map((value) => (typeof value === "string" || typeof value === "number" ? String(value) : ""))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function intersects(left: string[], right: string[]) {
  if (left.length === 0 || right.length === 0) return false;
  const rightSet = new Set(right);
  return left.some((value) => rightSet.has(value));
}

export function shouldRecordCustomerServiceImListCompatDiagnostic(
  logKey: string,
  logSignature: string,
) {
  if (loggedImListCompatSignatures.get(logKey) === logSignature) return false;
  loggedImListCompatSignatures.set(logKey, logSignature);
  if (loggedImListCompatSignatures.size > maxLoggedImListCompatSignatures) {
    const oldest = loggedImListCompatSignatures.keys().next().value;
    if (oldest) loggedImListCompatSignatures.delete(oldest);
  }
  return true;
}
