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
import { requireApiClient } from "../../data/runtime";

export interface CustomerServiceReadReportTarget {
  conversationId: string;
  readSeq: number;
}

export function resolveCustomerServiceReadReportTarget({
  detailLoaded,
  messages,
  selectedThread,
  visibility,
}: {
  detailLoaded: boolean;
  messages: MessageItemDto[];
  selectedThread?: Pick<CustomerServiceThread, "conversationId">;
  visibility: CustomerServiceThreadReadVisibility;
}): CustomerServiceReadReportTarget | null {
  if (
    !detailLoaded ||
    !selectedThread?.conversationId ||
    !canMarkCustomerServiceThreadRead({ visibility })
  ) {
    return null;
  }
  const readSeq = messages.reduce((maxSeq, message) => {
    const seq = Math.max(0, Math.floor(Number(message.conversationSeq ?? 0) || 0));
    return seq > maxSeq ? seq : maxSeq;
  }, 0);
  if (readSeq <= 0) return null;
  return {
    conversationId: selectedThread.conversationId,
    readSeq,
  };
}

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
  const reportedReadSeqByConversationRef = useRef<Record<string, number>>({});

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
    const reportTarget = resolveCustomerServiceReadReportTarget({
      detailLoaded: Boolean(detail),
      messages,
      selectedThread,
      visibility: readVisibility,
    });
    if (!session || !reportTarget) return;
    const previousReadSeq =
      reportedReadSeqByConversationRef.current[reportTarget.conversationId] ?? 0;
    if (previousReadSeq >= reportTarget.readSeq) return;
    reportedReadSeqByConversationRef.current[reportTarget.conversationId] =
      reportTarget.readSeq;
    void requireApiClient(session)
      .markConversationRead(
        "direct",
        reportTarget.conversationId,
        reportTarget.readSeq,
      )
      .catch((error) => {
        reportedReadSeqByConversationRef.current[reportTarget.conversationId] =
          previousReadSeq;
        recordMessageReminderDiagnostic({
          event: "cs.ui.read.report_failed",
          source: "use-customer-service-thread-lifecycle",
          phase: "execute",
          route: "direct-read",
          classification: {
            conversationId: reportTarget.conversationId,
            readSeq: reportTarget.readSeq,
            threadId: selectedThread.threadId,
          },
          summary: {
            error: error instanceof Error ? error.message : String(error),
            selectedThread,
          },
        });
      });
  }, [
    activeModule,
    activeThreadOpenSource,
    detail,
    dismissRealtimeRemindersForTarget,
    messages,
    queryClient,
    readVisibility,
    selectedThread,
    session,
  ]);
}
