import type { QueryClient } from "@tanstack/react-query";
import type { MessageItemDto } from "../api-client";
import { getAuthSessionSnapshot } from "../auth/auth-store";
import { applyCustomerServiceGatewayMessageCache } from "../customer-service/cs-cache-adapter";
import {
  notifyDesktopOrBrowser,
  shouldPushRealtimeReminder,
  shouldShowDesktopNotification,
} from "../reminder/reminder-service";
import { getReminderActions } from "../reminder/reminder-store";
import { getPcSettingsSnapshot } from "../settings/settings-store";
import { getWorkspaceUiSnapshot } from "../workspace-ui/workspace-ui-store";
import {
  asRecord,
  customerServiceThreadId,
  gatewayMessage,
  isSelfCustomerServiceGatewayMessage,
  normalizeThreadType,
  stringField,
} from "./gateway-payload-utils";

const notifiedCustomerServiceQueueIds = new Set<string>();

export function mergeCustomerServiceGatewayMessage(
  queryClient: QueryClient,
  payload: Record<string, unknown>,
  fallbackThreadId: string,
) {
  const threadId =
    stringField(payload, "threadId", "sessionId") ||
    stringField(asRecord(payload.thread), "threadId", "sessionId") ||
    fallbackThreadId;
  if (!threadId) return;
  const threadType = normalizeThreadType(
    stringField(payload, "threadType", "conversationType") ||
      stringField(asRecord(payload.thread), "threadType"),
  );
  const message = gatewayMessage(payload, threadId);
  const self = isSelfCustomerServiceGatewayMessage(
    payload,
    message,
    getAuthSessionSnapshot(),
  );
  const uiState = getWorkspaceUiSnapshot();
  const active = uiState.activeModule === "onlineService" && uiState.activeThreadId === threadId;

  applyCustomerServiceGatewayMessageCache(queryClient, {
    message,
    read: self || active,
    threadId,
    threadType,
  });

  if (!self) {
    notifyCustomerServiceMessage(payload, message, { active });
  }
}

export function notifyCustomerServiceQueue(payload: Record<string, unknown>, threadId: string) {
  const reminderActions = getReminderActions();
  const settings = getPcSettingsSnapshot();
  if (!shouldPushRealtimeReminder(settings, "serviceQueue")) return;
  const normalizedThreadId = threadId || customerServiceThreadId(payload);
  if (!normalizedThreadId) return;
  const reminderId = `cs-queue-${normalizedThreadId}`;
  if (notifiedCustomerServiceQueueIds.has(reminderId)) return;
  notifiedCustomerServiceQueueIds.add(reminderId);

  const title =
    stringField(asRecord(payload.thread), "title", "customerName", "visitorName") ||
    stringField(payload, "threadTitle", "customerName", "visitorName", "title") ||
    "新的在线客服会话";
  const source =
    stringField(payload, "source", "channel", "sourceChannel", "entryChannel") ||
    stringField(asRecord(payload.thread), "source", "channel", "sourceChannel", "entryChannel");
  const body = source
    ? `来自 ${source} 的访客正在排队，等待接入`
    : "有访客正在排队，等待接入";

  reminderActions.pushRealtimeReminder({
    id: reminderId,
    title,
    body,
    targetModule: "onlineService",
    targetId: normalizedThreadId,
    severity: "warning",
    icon: "service",
  });
  if (shouldShowDesktopNotification(settings, "serviceQueue")) {
    void notifyDesktopOrBrowser(
      {
        title,
        body,
        conversationId: normalizedThreadId,
      },
      { channel: "serviceQueue", settings },
    );
  }
}

function notifyCustomerServiceMessage(
  payload: Record<string, unknown>,
  message: MessageItemDto,
  options: { active?: boolean } = {},
) {
  const reminderActions = getReminderActions();
  const settings = getPcSettingsSnapshot();
  if (!shouldPushRealtimeReminder(settings, "serviceQueue")) return;
  const title =
    stringField(asRecord(payload.thread), "title", "customerName", "visitorName") ||
    stringField(payload, "threadTitle", "customerName", "visitorName") ||
    message.senderDisplayName ||
    "在线客服新消息";
  const targetId =
    customerServiceThreadId(payload) ||
    stringField(payload, "threadId", "sessionId") ||
    message.conversationId;
  reminderActions.pushRealtimeReminder({
    id: `cs-${message.messageId}`,
    title,
    body: options.active
      ? message.preview || "当前在线客服会话有新消息"
      : message.preview || "收到一条在线客服消息",
    targetModule: "onlineService",
    targetId,
    severity: "warning",
    icon: "service",
  });
  if (shouldShowDesktopNotification(settings, "serviceQueue")) {
    void notifyDesktopOrBrowser(
      {
        title,
        body: options.active
          ? message.preview || "当前在线客服会话有新消息"
          : message.preview || "收到一条在线客服消息",
        conversationId: targetId,
      },
      { channel: "serviceQueue", settings },
    );
  }
}
