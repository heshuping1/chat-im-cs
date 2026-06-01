import { useEffect, useRef } from "react";

import type { AuthSession } from "../../data/auth/auth-session";
import type { CustomerServiceThread, MessageItemDto } from "../../data/api-client";
import type { PcSettings } from "../../data/settings/pc-settings";
import {
  notifyDesktopOrBrowser,
  shouldPushRealtimeReminder,
  shouldShowDesktopNotification,
} from "../../data/reminder/reminder-service";
import type { PcRealtimeReminderInput } from "../../data/reminder/reminder-types";
import {
  customerServiceMessageIdentity,
  latestCustomerServiceMessage,
  previewFromCustomerServiceMessage,
} from "../../data/customer-service/cs-cache-adapter";

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
  thread,
  title,
}: {
  message: MessageItemDto;
  pcSettings: PcSettings;
  pushRealtimeReminder: (reminder: PcRealtimeReminderInput) => void;
  thread: CustomerServiceThread;
  title: string;
}) {
  if (!shouldPushRealtimeReminder(pcSettings, "serviceQueue")) return;
  const body = previewFromCustomerServiceMessage(message) || "当前在线客服会话有新消息";
  const targetId = thread.threadId || thread.conversationId || message.conversationId;
  pushRealtimeReminder({
    id: `cs-detail-message-${targetId}-${customerServiceMessageIdentity(message)}`,
    title: title || thread.title || "在线客服新消息",
    body,
    targetModule: "onlineService",
    targetId,
    severity: "warning",
    icon: "service",
  });
  if (shouldShowDesktopNotification(pcSettings, "serviceQueue")) {
    void notifyDesktopOrBrowser(
      {
        title: title || thread.title || "在线客服新消息",
        body,
        conversationId: targetId,
      },
      { channel: "serviceQueue", settings: pcSettings },
    );
  }
}
