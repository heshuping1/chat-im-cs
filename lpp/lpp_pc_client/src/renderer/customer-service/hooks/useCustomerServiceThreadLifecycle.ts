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
import type { CustomerServiceThreadDetailView } from "../../data/customer-service/cs-workspace-view-model";
import { prefetchImageMessages } from "../../media/runtime/imagePrecache";

export function useCustomerServiceThreadLifecycle({
  detail,
  dismissRealtimeRemindersForTarget,
  messages,
  queryClient,
  selectedThread,
  session,
  status,
  threadState,
}: {
  detail?: CustomerServiceThreadDetailView;
  dismissRealtimeRemindersForTarget: (targetModule: "onlineService", targetId?: string) => void;
  messages: MessageItemDto[];
  queryClient: QueryClient;
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
    prefetchImageMessages({
      accountId:
        session.userId ||
        session.platformUserId ||
        session.lppId ||
        session.tenantId,
      assetBaseUrl: session.apiBaseUrl,
      authToken: session.tenantToken,
      conversationId: selectedThread.threadId || selectedThread.conversationId,
      messages,
    });
  }, [messages, selectedThread, session]);

  useEffect(() => {
    if (!selectedThread || !detail) return;
    mergeLoadedCustomerServiceThreadDetail(queryClient, selectedThread, detail);
    markCustomerServiceThreadReadInCache(queryClient, selectedThread.threadId);
    dismissRealtimeRemindersForTarget("onlineService", selectedThread.threadId);
    if (selectedThread.conversationId !== selectedThread.threadId) {
      dismissRealtimeRemindersForTarget("onlineService", selectedThread.conversationId);
    }
  }, [detail, dismissRealtimeRemindersForTarget, queryClient, selectedThread]);
}
