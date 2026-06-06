import type { QueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import type {
  CustomerServiceThread,
  MessageItemDto,
} from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import type { CustomerServiceThreadState } from "../../data/customer-service/cs-thread-state";
import {
  logCustomerServiceThreadStateTransition,
  transitionCustomerServiceThreadState,
} from "../../data/customer-service/cs-thread-state";
import {
  markCustomerServiceThreadReadInCache,
  mergeLoadedCustomerServiceThreadDetail,
} from "../../data/customer-service/cs-cache-adapter";
import {
  canMarkCustomerServiceThreadRead,
  type CustomerServiceThreadReadVisibility,
} from "../../data/customer-service/customer-service-read-visibility";
import type { CustomerServiceThreadDetailView } from "../../data/customer-service/cs-workspace-view-model";
import type { CustomerServiceThreadOpenSource } from "../../data/workspace-ui/workspace-ui-store";
import { recordMessageReminderDiagnostic } from "../../data/diagnostics/message-reminder-diagnostics";
import {
  accountIdFromSession,
  materializeMediaMessages,
} from "../../media/runtime/mediaMaterialization";

export function useCustomerServiceThreadLifecycle({
  activeModule,
  activeThreadOpenSource,
  detail,
  dismissRealtimeRemindersForTarget,
  messages,
  queryClient,
  readVisibility,
  selectedThread,
  session,
  status,
  threadState,
}: {
  activeModule: string;
  activeThreadOpenSource: CustomerServiceThreadOpenSource;
  detail?: CustomerServiceThreadDetailView;
  dismissRealtimeRemindersForTarget: (targetModule: "onlineService", targetId?: string) => void;
  messages: MessageItemDto[];
  queryClient: QueryClient;
  readVisibility: CustomerServiceThreadReadVisibility;
  selectedThread?: CustomerServiceThread;
  session: AuthSession | null;
  status?: string;
  threadState: CustomerServiceThreadState;
}) {
  const previousThreadStateRef = useRef<{
    status?: string;
    threadId?: string;
  }>({});

  useEffect(() => {
    if (!selectedThread) return;
    const previous = previousThreadStateRef.current;
    if (previous.threadId === selectedThread.threadId && previous.status === status) return;
    logCustomerServiceThreadStateTransition(
      transitionCustomerServiceThreadState(previous.status, status),
      {
        threadId: selectedThread.threadId,
        threadType: selectedThread.threadType,
        stateKind: threadState.kind,
      },
    );
    previousThreadStateRef.current = {
      status,
      threadId: selectedThread.threadId,
    };
  }, [selectedThread, status, threadState.kind]);

  useEffect(() => {
    if (!session || !selectedThread || messages.length === 0) return;
    materializeMediaMessages({
      accountId: accountIdFromSession(session),
      assetBaseUrl: session.apiBaseUrl,
      authToken: session.tenantToken,
      conversationId: selectedThread.threadId || selectedThread.conversationId,
      messages,
      reason: "conversation-snapshot",
    });
  }, [messages, selectedThread, session]);

  useEffect(() => {
    if (!selectedThread || !detail) return;
    mergeLoadedCustomerServiceThreadDetail(queryClient, selectedThread, detail);
  }, [detail, queryClient, selectedThread]);

  useEffect(() => {
    const canMarkRead = canMarkCustomerServiceThreadRead({ visibility: readVisibility });
    recordMessageReminderDiagnostic({
      event: "cs.ui.read.evaluate",
      source: "use-customer-service-thread-lifecycle",
      phase: "evaluate",
      route: canMarkRead ? "allow" : "skip",
      classification: {
        activeModule,
        activeThreadOpenSource,
        conversationId: selectedThread?.conversationId,
        detailLoaded: Boolean(detail),
        threadId: selectedThread?.threadId,
        unreadBefore: selectedThread?.unreadCount,
        visibility: readVisibility,
      },
      summary: {
        selectedThread,
      },
    });
    if (!selectedThread || !detail || !canMarkRead) return;
    recordMessageReminderDiagnostic({
      event: "cs.ui.read.command",
      source: "use-customer-service-thread-lifecycle",
      phase: "execute",
      route: "detail-visible",
      classification: {
        activeModule,
        activeThreadOpenSource,
        conversationId: selectedThread.conversationId,
        detailLoaded: true,
        threadId: selectedThread.threadId,
        unreadAfter: 0,
        unreadBefore: selectedThread.unreadCount,
        visibility: readVisibility,
      },
      summary: {
        selectedThread,
      },
    });
    markCustomerServiceThreadReadInCache(
      queryClient,
      selectedThread.threadId,
      selectedThread.conversationId,
    );
    dismissRealtimeRemindersForTarget("onlineService", selectedThread.threadId);
    if (selectedThread.conversationId !== selectedThread.threadId) {
      dismissRealtimeRemindersForTarget("onlineService", selectedThread.conversationId);
    }
  }, [
    activeModule,
    activeThreadOpenSource,
    detail,
    dismissRealtimeRemindersForTarget,
    queryClient,
    readVisibility,
    selectedThread,
  ]);
}
