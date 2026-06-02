import { useEffect, useRef } from "react";

import type { AuthSession } from "../../data/auth/auth-session";
import type { CustomerServiceThread, MessageItemDto } from "../../data/api-client";
import {
  customerServiceMessageIdentity,
  latestCustomerServiceMessage,
} from "../../data/customer-service/cs-cache-adapter";
import { buildCustomerServiceNotificationPresentation } from "../../data/customer-service/cs-notification-presentation";
import { consumeCustomerServiceMessageReminder } from "../../data/customer-service/cs-reminder-model";
import {
  isRendererWindowFocused,
  notifyDesktopOrBrowser,
  shouldPushRealtimeReminder,
  shouldShowDesktopNotificationForTarget,
} from "../../data/reminder/reminder-service";
import { isExplicitCustomerServiceThreadOpenSource } from "../../data/customer-service/customer-service-read-visibility";
import type { PcRealtimeReminderInput } from "../../data/reminder/reminder-types";
import type { PcSettings } from "../../data/settings/pc-settings";
import { getWorkspaceUiSnapshot } from "../../data/workspace-ui/workspace-ui-store";

export function useCustomerServiceIncomingNotifications({
  detailLoaded,
  isMineMessage,
  messages,
  pcSettings,
  pushRealtimeReminder,
  readOnly,
  selectedThread,
  session,
  title,
}: {
  detailLoaded: boolean;
  isMineMessage: (message: MessageItemDto, session: AuthSession | null) => boolean;
  messages: MessageItemDto[];
  pcSettings: PcSettings;
  pushRealtimeReminder: (reminder: PcRealtimeReminderInput) => void;
  readOnly: boolean;
  selectedThread?: CustomerServiceThread;
  session: AuthSession | null;
  title: string;
}) {
  const seenIncomingMessageIdsRef = useRef<Set<string>>(new Set());
  const notificationBaselineThreadRef = useRef("");
  const notificationBaselineReadyRef = useRef(false);

  useEffect(() => {
    const threadKey = selectedThread?.threadId ?? "";
    if (notificationBaselineThreadRef.current !== threadKey) {
      notificationBaselineThreadRef.current = threadKey;
      notificationBaselineReadyRef.current = false;
      seenIncomingMessageIdsRef.current = new Set();
      return;
    }
    if (!selectedThread || readOnly || !detailLoaded) return;
    if (!notificationBaselineReadyRef.current) {
      notificationBaselineReadyRef.current = true;
      seenIncomingMessageIdsRef.current = new Set(
        messages
          .filter((message) => !isMineMessage(message, session))
          .map((message) => customerServiceMessageIdentity(message))
          .filter(Boolean),
      );
      return;
    }
    if (messages.length === 0) return;
    const latestIncoming = latestCustomerServiceMessage(
      messages.filter((message) => !isMineMessage(message, session)),
    );
    if (!latestIncoming) return;
    const messageId = customerServiceMessageIdentity(latestIncoming);
    if (!messageId || seenIncomingMessageIdsRef.current.has(messageId)) return;
    seenIncomingMessageIdsRef.current.add(messageId);
    notifyIncomingCustomerServiceMessage({
      message: latestIncoming,
      pcSettings,
      pushRealtimeReminder,
      thread: selectedThread,
      title,
      session,
    });
  }, [
    detailLoaded,
    isMineMessage,
    messages,
    pcSettings,
    pushRealtimeReminder,
    readOnly,
    selectedThread,
    session,
    title,
  ]);
}

function notifyIncomingCustomerServiceMessage({
  message,
  pcSettings,
  pushRealtimeReminder,
  session,
  thread,
  title,
}: {
  message: MessageItemDto;
  pcSettings: PcSettings;
  pushRealtimeReminder: (reminder: PcRealtimeReminderInput) => void;
  session: AuthSession | null;
  thread: CustomerServiceThread;
  title: string;
}) {
  if (!shouldPushRealtimeReminder(pcSettings, "serviceQueue")) return;
  const presentation = buildCustomerServiceNotificationPresentation({
    fallbackTitle: title,
    message,
    thread,
  });
  const targetId = presentation.targetId || thread.threadId || thread.conversationId || message.conversationId;
  const reminderDecision = consumeCustomerServiceMessageReminder({
    identity: session,
    message,
    source: "detail",
    targetId,
  });
  if (!reminderDecision.shouldNotify) return;
  pushRealtimeReminder({
    id: reminderDecision.reminderId,
    title: presentation.title,
    body: presentation.body,
    avatarLabel: presentation.avatarLabel,
    avatarUrl: presentation.avatarUrl,
    targetModule: "onlineService",
    targetId,
    severity: "warning",
    icon: "service",
  });
  const uiState = getWorkspaceUiSnapshot();
  const activeTargetId = isExplicitCustomerServiceThreadOpenSource(uiState.activeThreadOpenSource)
    ? uiState.activeThreadId
    : undefined;
  if (
    shouldShowDesktopNotificationForTarget(pcSettings, "serviceQueue", {
      activeModule: uiState.activeModule,
      activeTargetId,
      targetId,
      targetModule: "onlineService",
      windowFocused: isRendererWindowFocused(),
    })
  ) {
    void notifyDesktopOrBrowser(
      {
        title: presentation.title,
        body: presentation.body,
        conversationId: targetId,
        targetId,
        targetModule: "onlineService",
      },
      {
        authToken: session?.tenantToken,
        channel: "serviceQueue",
        iconUrl: presentation.avatarUrl,
        settings: pcSettings,
      },
    );
  }
}
