import { useEffect, useMemo } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createApiClient } from "../../data/runtime";
import type { MessageItemDto } from "../../data/api-client";
import { useAuthSession } from "../../data/auth/auth-store";
import { pcQueryKeys } from "../../data/query-keys";
import {
  invalidateCustomerServiceQueries,
  markCustomerServiceThreadClaimed,
  markCustomerServiceThreadClosed,
  markCustomerServiceThreadTransferred,
  reconcileCustomerServiceThreadDetailMessages,
} from "../../data/customer-service/cs-cache-adapter";
import {
  canReadCustomerServiceHistory,
} from "../../data/customer-service/cs-role-capabilities";
import {
  listLocalCustomerServiceThreadSnapshots,
  profileFromLocalCustomerSnapshot,
  upsertLocalCustomerServiceProfileSnapshot,
  upsertLocalCustomerServiceThreads,
} from "../../data/customer-service/cs-local-data-repository";
import {
  customerServiceRealtimePollIntervalMs,
  customerServiceRealtimeRefetchInBackground,
} from "../../data/customer-service/cs-realtime-config";
import {
  customerServiceReadStatusFromDirectStatus,
  mergeCustomerServiceThreadDetailReadStatus,
} from "../../data/customer-service/cs-message-read-status";
import { createCustomerServiceThreadState } from "../../data/customer-service/cs-thread-state";
import {
  isCustomerServiceThreadActionEnabled,
  resolveCustomerServiceThreadActionPolicy,
} from "../../data/customer-service/cs-thread-action-policy";
import {
  createCustomerServiceWorkspaceViewModel,
  isCustomerServiceThreadAssignedAwayFromCurrentStaff,
  listCustomerServiceSelectableThreads,
  selectCustomerServiceThread,
} from "../../data/customer-service/cs-workspace-view-model";
import {
  executeCustomerServiceThreadAction,
  executeCustomerServiceThreadTransfer,
  type CustomerServiceThreadAction,
  type CustomerServiceThreadTransferPayload,
} from "../../data/customer-service/cs-action-service";
import {
  type CustomerServiceTypingPreview,
} from "../../data/customer-service/cs-typing-preview";
import { formatError } from "../../lib/format";
import { useMessageDetailSync } from "../../lib/useMessageDetailSync";

const staffServiceHistoryPageSize = 50;

export function useCustomerServiceWorkspaceController({
  selectedThreadId,
  setNotice,
  formatSourceLabel,
}: {
  selectedThreadId?: string | null;
  setNotice: (notice: string | null) => void;
  formatSourceLabel: (channel?: string | null) => string;
}) {
  const session = useAuthSession();
  const queryClient = useQueryClient();
  const client = useMemo(
    () => (session ? createApiClient(session) : null),
    [session],
  );
  const queryBaseKey = [session?.apiBaseUrl, session?.tenantToken] as const;
  const canReadHistory = canReadCustomerServiceHistory(session);

  const threadsQuery = useQuery({
    queryKey: pcQueryKeys.customerServiceThreads(...queryBaseKey),
    enabled: Boolean(client),
    queryFn: async () => client!.getWorkbenchThreads(),
    refetchInterval: customerServiceRealtimePollIntervalMs,
    refetchIntervalInBackground: customerServiceRealtimeRefetchInBackground,
  });
  const historyQuery = useInfiniteQuery({
    queryKey: pcQueryKeys.customerServiceHistory(...queryBaseKey),
    enabled: Boolean(client && canReadHistory),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) =>
      client!.getCustomerServiceHistoryThreads({
        cursor: pageParam,
        limit: staffServiceHistoryPageSize,
        threadType: "temp_session",
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });
  const historyItems = useMemo(
    () => historyQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [historyQuery.data],
  );

  const selectedThread = useMemo(() => {
    return selectCustomerServiceThread({
      historyThreads: historyItems,
      selectedThreadId,
      threads: threadsQuery.data,
    });
  }, [historyItems, selectedThreadId, threadsQuery.data]);
  const selectableThreads = useMemo(
    () =>
      listCustomerServiceSelectableThreads({
        historyThreads: historyItems,
        threads: threadsQuery.data,
      }),
    [historyItems, threadsQuery.data],
  );

  const threadType = selectedThread?.threadType ?? "temp_session";
  const threadId = selectedThread?.threadId ?? "";
  const typingPreviewQueryKey = useMemo(
    () => pcQueryKeys.customerServiceTypingPreview(...queryBaseKey, threadType, threadId),
    [session?.apiBaseUrl, session?.tenantToken, threadId, threadType],
  );
  const selectedThreadIsLive = useMemo(
    () =>
      selectedThread
        ? selectedThread.accessMode !== "management_readonly" &&
          !createCustomerServiceThreadState(selectedThread.status).readOnly &&
          !isCustomerServiceThreadAssignedAwayFromCurrentStaff(selectedThread, session)
        : false,
    [selectedThread, session],
  );

  const detailQueryKey = useMemo(
    () => pcQueryKeys.customerServiceThreadDetail(...queryBaseKey, threadType, threadId),
    [queryBaseKey, threadId, threadType],
  );
  const detailQuery = useQuery({
    queryKey: detailQueryKey,
    enabled: Boolean(client && selectedThread),
    queryFn: async () => {
      const previous = queryClient.getQueryData<{ messages?: MessageItemDto[] }>(
        detailQueryKey,
      );
      const detail = await client!.getWorkbenchThreadDetail(threadType, threadId);
      return {
        ...detail,
        messages: reconcileCustomerServiceThreadDetailMessages(
          previous?.messages,
          detail.messages,
        ),
      };
    },
    refetchInterval: selectedThreadIsLive ? 2_500 : false,
    refetchIntervalInBackground: true,
  });
  const readStatusQuery = useQuery({
    queryKey: pcQueryKeys.customerServiceThreadReadStatus(...queryBaseKey, threadType, threadId),
    enabled: Boolean(client && selectedThread),
    queryFn: async () => {
      if (!client || !selectedThread) return null;
      if (selectedThread.threadType === "temp_session") {
        return client.getTempSessionReadStatus(selectedThread.threadId);
      }
      const directConversationId = selectedThread.conversationId || selectedThread.threadId;
      const directStatus = await client.getDirectReadStatus(directConversationId);
      return customerServiceReadStatusFromDirectStatus(
        directStatus,
        directConversationId,
      );
    },
    refetchInterval: selectedThreadIsLive ? 10_000 : false,
    refetchIntervalInBackground: true,
  });
  useMessageDetailSync({
    enabled: Boolean(client && selectedThread && selectedThreadIsLive),
    isFetching: detailQuery.isFetching,
    messages: detailQuery.data?.messages ?? [],
    refetch: detailQuery.refetch,
    target: selectedThread
      ? {
          targetId: selectedThread.threadId,
          targetType: selectedThread.threadType,
          alternateTargetIds: [selectedThread.conversationId],
          lastMessageAt: selectedThread.lastMessageAt,
          lastMessagePreview: selectedThread.lastMessagePreview,
        }
      : null,
  });
  const profileQuery = useQuery({
    queryKey: pcQueryKeys.customerServiceThreadProfile(
      ...queryBaseKey,
      selectedThread?.threadType,
      selectedThread?.threadId,
    ),
    enabled: Boolean(client && selectedThread),
    queryFn: async () =>
      client!.getThreadProfileCard(selectedThread!.threadType, selectedThread!.threadId),
  });
  const localThreadsQuery = useQuery({
    queryKey: [
      "pc-local-data-cs-threads",
      session?.apiBaseUrl,
      session?.tenantId,
      session?.userId,
      selectedThread?.threadId ?? "",
    ],
    enabled: Boolean(session && selectedThread),
    queryFn: async () => listLocalCustomerServiceThreadSnapshots(session),
    staleTime: 30_000,
  });
  const transferTargetsQuery = useQuery({
    queryKey: pcQueryKeys.tenantMembers(...queryBaseKey),
    enabled: Boolean(client && selectedThread),
    queryFn: async () => client!.getTenantMembers(),
    staleTime: 60_000,
  });
  const typingPreviewQuery = useQuery<CustomerServiceTypingPreview | null>({
    queryKey: typingPreviewQueryKey,
    enabled: false,
    queryFn: async () => null,
    initialData: null,
    staleTime: Infinity,
    gcTime: 30_000,
  });

  useEffect(() => {
    if (!session || !threadsQuery.data) return;
    const threads = [
      ...(threadsQuery.data.queueItems ?? []),
      ...(threadsQuery.data.activeItems ?? []),
    ];
    upsertLocalCustomerServiceThreads(session, threads);
  }, [session, threadsQuery.data]);

  useEffect(() => {
    if (!session || !selectedThread || !profileQuery.data) return;
    upsertLocalCustomerServiceProfileSnapshot({
      profile: profileQuery.data,
      session,
      thread: selectedThread,
    });
  }, [profileQuery.data, selectedThread, session]);
  const detail = useMemo(
    () => mergeCustomerServiceThreadDetailReadStatus(detailQuery.data, readStatusQuery.data),
    [detailQuery.data, readStatusQuery.data],
  );
  const localSelectedThread = localThreadsQuery.data?.find(
    (thread) =>
      thread.threadId === selectedThread?.threadId &&
      thread.threadType === selectedThread?.threadType,
  );
  const localProfile = profileFromLocalCustomerSnapshot(localSelectedThread?.customerSnapshotJson);
  const profile = profileQuery.data ?? (profileQuery.error ? localProfile : undefined);
  const workspaceViewModel = useMemo(
    () =>
      createCustomerServiceWorkspaceViewModel({
        currentStaffIdentity: session,
        detail,
        detailErrorText: detailQuery.error ? formatError(detailQuery.error) : undefined,
        detailLoading: detailQuery.isLoading,
        formatSourceLabel,
        profile,
        selectedThread,
      }),
    [detail, detailQuery.error, detailQuery.isLoading, formatSourceLabel, profile, selectedThread, session],
  );

  const threadActionMutation = useMutation({
    mutationFn: async (action: CustomerServiceThreadAction) => {
      if (!client || !selectedThread) throw new Error("Select a customer service conversation.");
      const actionPolicy = resolveCustomerServiceThreadActionPolicy({
        hasThread: true,
        session,
        state: createCustomerServiceThreadState(selectedThread.status),
      });
      if (!isCustomerServiceThreadActionEnabled(actionPolicy, action)) {
        throw new Error(action === "close"
          ? "Only customer service staff, administrators, or owners can close this conversation."
          : "Only customer service staff can perform this action.");
      }
      return executeCustomerServiceThreadAction({
        action,
        client,
        mode: action === "close" ? actionPolicy.close.mode ?? "staff" : "staff",
        thread: selectedThread,
      });
    },
    onSuccess: async (result, action) => {
      if (selectedThread) {
        if (action === "close") markCustomerServiceThreadClosed(queryClient, selectedThread, result);
        if (action === "claim" || action === "takeover") {
          markCustomerServiceThreadClaimed(queryClient, selectedThread, result);
        }
      }
      setNotice(actionSuccessText(action));
      await invalidateCustomerServiceQueries(queryClient);
    },
    onError: (error) => {
      setNotice(formatCustomerServiceActionError(error));
      void invalidateCustomerServiceQueries(queryClient);
    },
  });
  const transferThreadMutation = useMutation({
    mutationFn: async (payload: CustomerServiceThreadTransferPayload) => {
      if (!client || !selectedThread) throw new Error("Select a customer service conversation.");
      const actionPolicy = resolveCustomerServiceThreadActionPolicy({
        hasThread: true,
        session,
        state: createCustomerServiceThreadState(selectedThread.status),
      });
      if (!actionPolicy.transferDialog.enabled) {
        throw new Error("Only customer service staff, administrators, or owners can transfer this conversation.");
      }
      return executeCustomerServiceThreadTransfer({
        client,
        mode: actionPolicy.transferDialog.mode === "assign" ? "management" : "staff",
        payload,
        thread: selectedThread,
      });
    },
    onSuccess: async (result) => {
      if (selectedThread) {
        markCustomerServiceThreadTransferred(queryClient, selectedThread, result);
      }
      setNotice("Conversation transferred.");
      await invalidateCustomerServiceQueries(queryClient);
    },
    onError: (error) => {
      setNotice(formatCustomerServiceActionError(error));
      void invalidateCustomerServiceQueries(queryClient);
    },
  });

  return {
    client,
    detail,
    detailLoading: detailQuery.isLoading,
    queryClient,
    selectedThread,
    selectableThreads,
    session,
    threadActionMutation,
    typingPreview: typingPreviewQuery.data ?? null,
    transferTargetsQuery,
    transferThreadMutation,
    workspaceViewModel,
  };
}


function actionSuccessText(action: CustomerServiceThreadAction) {
  if (action === "claim") return "Conversation claimed.";
  if (action === "takeover") return "Conversation taken over.";
  return "Conversation closed.";
}

function formatCustomerServiceActionError(error: unknown) {
  if (apiErrorCode(error) === "TEMP_SESSION_STAFF_NOT_FOUND") {
    return "当前账号不是客服坐席，不能直接接入会话。请指派给在线客服。";
  }
  return formatError(error);
}

function apiErrorCode(error: unknown) {
  const value = error && typeof error === "object" ? (error as { code?: unknown }) : null;
  return typeof value?.code === "string" ? value.code : undefined;
}
