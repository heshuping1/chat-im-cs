import type { QueryClient } from "@tanstack/react-query";
import type { MessageItemDto } from "../api-client";
import { getAuthSessionSnapshot } from "../auth/auth-store";
import { applyCustomerServiceGatewayMessageCache } from "../customer-service/cs-cache-adapter";
import { customerServiceIndexScopeKey } from "../customer-service/cs-conversation-index";
import { buildCustomerServiceNotificationPresentation } from "../customer-service/cs-notification-presentation";
import { consumeCustomerServiceMessageReminder } from "../customer-service/cs-reminder-model";
import {
  isRendererWindowFocused,
  notifyDesktopOrBrowser,
  shouldPushCustomerServiceQueueReminder,
  shouldPushCustomerServiceThreadMessageReminder,
  shouldShowCustomerServiceThreadMessageDesktopNotificationForTarget,
  shouldShowDesktopNotification,
} from "../reminder/reminder-service";
import { getReminderActions } from "../reminder/reminder-store";
import { getPcSettingsSnapshot } from "../settings/settings-store";
import { getWorkspaceUiSnapshot } from "../workspace-ui/workspace-ui-store";
import { workspaceScopeKeyFromSession } from "../workspace-scope";
import {
  accountIdFromSession,
  materializeReceivedImageMessage,
} from "../../media/runtime/imageMaterialization";
import {
  isExplicitCustomerServiceThreadOpenSource,
  resolveCustomerServiceThreadReadVisibility,
} from "../customer-service/customer-service-read-visibility";
import { recordMessageReminderDiagnostic } from "../diagnostics/message-reminder-diagnostics";
import {
  asRecord,
  customerServiceThreadId,
  gatewayMessage,
  imConversationId,
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
  const session = getAuthSessionSnapshot();
  const scopeKey = workspaceScopeKeyFromSession(session);
  const threadId =
    stringField(payload, "threadId", "sessionId") ||
    stringField(asRecord(payload.thread), "threadId", "sessionId") ||
    customerServiceThreadId(payload, scopeKey) ||
    fallbackThreadId;
  if (!threadId) return;
  const threadType = normalizeThreadType(
    stringField(payload, "sourceType", "source_type") ||
      stringField(asRecord(payload.thread), "sourceType", "source_type") ||
      stringField(payload, "threadType", "conversationType") ||
      stringField(asRecord(payload.thread), "threadType"),
  );
  const message = gatewayMessage(payload, threadId);
  const self = isSelfCustomerServiceGatewayMessage(payload, message, session);
  const uiState = getWorkspaceUiSnapshot();
  const visibility = resolveCustomerServiceThreadReadVisibility({
    activeModule: uiState.activeModule,
    activeThreadId: uiState.activeThreadId,
    activeThreadOpenSource: uiState.activeThreadOpenSource,
    conversationId: imConversationId(payload) || message.conversationId,
    detailLoaded: false,
    threadId,
  });
  const read = self;
  recordMessageReminderDiagnostic({
    event: "cs.gateway.read-decision",
    source: "gateway-cs-side-effects",
    phase: "evaluate",
    route: read ? "read" : "unread",
    classification: {
      activeModule: uiState.activeModule,
      activeThreadId: uiState.activeThreadId,
      activeThreadOpenSource: uiState.activeThreadOpenSource,
      conversationId: imConversationId(payload) || message.conversationId,
      detailLoaded: false,
      messageId: message.messageId,
      self,
      threadId,
      threadType,
      visibility,
    },
    summary: {
      message,
      payload,
    },
  });

  applyCustomerServiceGatewayMessageCache(queryClient, {
    conversationId: imConversationId(payload) || message.conversationId,
    message,
    read,
    scopeKey,
    selfMessage: self,
    threadId,
    threadType,
  });
  void materializeReceivedImageMessage({
    accountId: accountIdFromSession(session),
    assetBaseUrl: session?.apiBaseUrl,
    authToken: session?.tenantToken,
    conversationId: threadId,
    message,
    reason: "cs-gateway-received",
  });

  if (!self) {
    notifyCustomerServiceMessage(payload, message, {
      active: visibility === "detailVisible",
      identity: session,
      targetId: threadId,
    });
  }
}

export function notifyCustomerServiceQueue(payload: Record<string, unknown>, threadId: string) {
  const reminderActions = getReminderActions();
  const settings = getPcSettingsSnapshot();
  if (!shouldPushCustomerServiceQueueReminder(settings)) return;
  const session = getAuthSessionSnapshot();
  const scopeKey = customerServiceIndexScopeKey(session ?? undefined);
  const normalizedThreadId = threadId || customerServiceThreadId(payload, scopeKey);
  if (!normalizedThreadId) return;
  const reminderId = `cs-queue-${normalizedThreadId}`;
  if (notifiedCustomerServiceQueueIds.has(reminderId)) return;
  notifiedCustomerServiceQueueIds.add(reminderId);

  const title =
    stringField(asRecord(payload.thread), "title", "customerName", "visitorName") ||
    stringField(payload, "threadTitle", "customerName", "visitorName", "title") ||
    "新的客服会话";
  const source =
    stringField(payload, "source", "channel", "sourceChannel", "entryChannel") ||
    stringField(asRecord(payload.thread), "source", "channel", "sourceChannel", "entryChannel");
  const body = source
    ? `来自 ${source} 的访客正在排队，等待接入`
    : "访客正在排队，等待接入";
  const presentation = buildCustomerServiceNotificationPresentation({
    fallbackTitle: title,
    payload,
  });

  reminderActions.pushRealtimeReminder({
    id: reminderId,
    title: presentation.title,
    body,
    avatarLabel: presentation.avatarLabel,
    avatarUrl: presentation.avatarUrl,
    targetModule: "onlineService",
    targetId: normalizedThreadId,
    severity: "warning",
    icon: "service",
  });
  if (shouldShowDesktopNotification(settings, "serviceQueue")) {
    void notifyDesktopOrBrowser(
      {
        title: presentation.title,
        body,
        conversationId: normalizedThreadId,
        targetId: normalizedThreadId,
        targetModule: "onlineService",
      },
      {
        authToken: session?.tenantToken,
        channel: "serviceQueue",
        iconUrl: presentation.avatarUrl,
        settings,
      },
    );
  }
}

function notifyCustomerServiceMessage(
  payload: Record<string, unknown>,
  message: MessageItemDto,
  options: {
    active?: boolean;
    identity?: ReturnType<typeof getAuthSessionSnapshot>;
    targetId?: string;
  } = {},
) {
  const reminderActions = getReminderActions();
  const settings = getPcSettingsSnapshot();
  if (!shouldPushCustomerServiceThreadMessageReminder(settings)) return;
  const targetId =
    options.targetId ||
    customerServiceThreadId(payload, customerServiceIndexScopeKey(options.identity ?? undefined)) ||
    stringField(payload, "threadId", "sessionId") ||
    message.conversationId;
  const presentation = buildCustomerServiceNotificationPresentation({
    message,
    payload,
  });
  const body = options.active && presentation.preview === "[Message]"
    ? "The current customer service conversation has a new message"
    : presentation.body;
  const nextTargetId = targetId || presentation.targetId;
  const reminderDecision = consumeCustomerServiceMessageReminder({
    identity: options.identity,
    message,
    source: "gateway",
    targetId: nextTargetId,
  });
  if (!reminderDecision.shouldNotify) return;

  reminderActions.pushRealtimeReminder({
    id: reminderDecision.reminderId,
    title: presentation.title,
    body,
    avatarLabel: presentation.avatarLabel,
    avatarUrl: presentation.avatarUrl,
    targetModule: "onlineService",
    targetId: nextTargetId,
    severity: "warning",
    icon: "service",
  });
  const uiState = getWorkspaceUiSnapshot();
  const activeTargetId = isExplicitCustomerServiceThreadOpenSource(uiState.activeThreadOpenSource)
    ? uiState.activeThreadId
    : undefined;
  if (
    shouldShowCustomerServiceThreadMessageDesktopNotificationForTarget(settings, {
      activeModule: uiState.activeModule,
      activeTargetId,
      targetId: nextTargetId,
      targetModule: "onlineService",
      windowFocused: isRendererWindowFocused(),
    })
  ) {
    void notifyDesktopOrBrowser(
      {
        title: presentation.title,
        body,
        conversationId: nextTargetId,
        targetId: nextTargetId,
        targetModule: "onlineService",
      },
      {
        authToken: options.identity?.tenantToken,
        channel: "serviceQueue",
        iconUrl: presentation.avatarUrl,
        settings,
      },
    );
  }
}
