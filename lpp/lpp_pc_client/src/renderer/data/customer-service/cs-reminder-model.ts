import type { CustomerServiceThread, MessageItemDto } from "../api/types";
import type { CurrentUserIdentity } from "../message-display";
import { isSelfSender } from "../message-display";
import { recordMessageReminderDiagnostic } from "../diagnostics/message-reminder-diagnostics";
import { customerServiceMessageIdentity } from "./cs-cache-message-model";

export type CustomerServiceReminderSource = "gateway" | "detail" | "thread";

export interface CustomerServiceMessageReminderInput {
  identity?: CurrentUserIdentity | null;
  message: MessageItemDto;
  source: CustomerServiceReminderSource;
  targetId?: string;
}

export interface CustomerServiceMessageReminderDecision {
  key: string;
  reminderId: string;
  shouldNotify: boolean;
  skippedReason?: "self_message" | "duplicate" | "missing_key";
}

const consumedCustomerServiceMessageReminderKeys = new Set<string>();

export function consumeCustomerServiceMessageReminder(
  input: CustomerServiceMessageReminderInput,
): CustomerServiceMessageReminderDecision {
  const key = customerServiceMessageReminderKey(input.message, input.targetId);
  if (!key) {
    recordCustomerServiceReminderDecision(input, {
      key: "",
      reminderId: "",
      shouldNotify: false,
      skippedReason: "missing_key",
    });
    return { key: "", reminderId: "", shouldNotify: false, skippedReason: "missing_key" };
  }
  const reminderId = customerServiceMessageReminderId(key);
  if (isMineCustomerServiceMessage(input.message, input.identity)) {
    const decision = { key, reminderId, shouldNotify: false, skippedReason: "self_message" as const };
    recordCustomerServiceReminderDecision(input, decision);
    return decision;
  }
  if (consumedCustomerServiceMessageReminderKeys.has(key)) {
    const decision = { key, reminderId, shouldNotify: false, skippedReason: "duplicate" as const };
    recordCustomerServiceReminderDecision(input, decision);
    return decision;
  }
  consumedCustomerServiceMessageReminderKeys.add(key);
  const decision = { key, reminderId, shouldNotify: true };
  recordCustomerServiceReminderDecision(input, decision);
  return decision;
}

export function rememberCustomerServiceMessageReminder(message: MessageItemDto, targetId?: string) {
  const key = customerServiceMessageReminderKey(message, targetId);
  if (key) consumedCustomerServiceMessageReminderKeys.add(key);
}

export function customerServiceMessageReminderKey(
  message: MessageItemDto,
  targetId?: string,
) {
  const identity = customerServiceMessageIdentity(message);
  if (!identity) return "";
  return ["cs-message", targetId || message.conversationId || "", identity].join(":");
}

export function customerServiceMessageReminderId(key: string) {
  return key ? `cs-reminder-${key}` : "";
}

export function isMineCustomerServiceMessage(
  message: MessageItemDto,
  identity?: CurrentUserIdentity | null,
) {
  const record = message as unknown as Record<string, unknown>;
  return Boolean(
    record.isSelf === true ||
      record.isMine === true ||
      ["out", "outgoing", "sent", "self"].includes(
        String(record.direction ?? "").trim().toLowerCase(),
      ) ||
      isSelfSender(message.senderUserId, message.senderDisplayName, identity) ||
      isSelfSender(message.senderId, message.senderDisplayName, identity) ||
      isSelfSender(message.fromUserId, message.senderDisplayName, identity) ||
      isSelfSender(
        typeof record.senderPlatformUserId === "string"
          ? record.senderPlatformUserId
          : undefined,
        message.senderDisplayName,
        identity,
      ) ||
      isSelfSender(
        typeof record.senderLppId === "string" ? record.senderLppId : undefined,
        message.senderDisplayName,
        identity,
      ),
  );
}

export function customerServiceThreadReminderTarget(thread: Pick<CustomerServiceThread, "conversationId" | "threadId">) {
  return thread.threadId || thread.conversationId;
}

export function resetCustomerServiceMessageReminderDedupeForTest() {
  consumedCustomerServiceMessageReminderKeys.clear();
}

function recordCustomerServiceReminderDecision(
  input: CustomerServiceMessageReminderInput,
  decision: CustomerServiceMessageReminderDecision,
) {
  recordMessageReminderDiagnostic({
    event: "cs.reminder.consume",
    source: "cs-reminder-model",
    phase: "consume",
    route: input.source,
    classification: {
      key: decision.key,
      messageId: input.message.messageId,
      reminderId: decision.reminderId,
      shouldNotify: decision.shouldNotify,
      skippedReason: decision.skippedReason,
      source: input.source,
      targetId: input.targetId,
    },
    summary: {
      message: input.message,
    },
  });
}
