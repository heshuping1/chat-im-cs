import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createApiClient } from "../../data/runtime";
import { useAuthSession } from "../../data/auth/auth-store";
import { pcQueryKeys } from "../../data/query-keys";
import {
  invalidateCustomerServiceQueries,
  markCustomerServiceThreadClosed,
} from "../../data/customer-service/cs-cache-adapter";
import { canUseCustomerServiceStaffEndpoints } from "../../data/customer-service/cs-role-capabilities";
import { customerServiceRealtimePollIntervalMs } from "../../data/customer-service/cs-realtime-config";
import { createCustomerServiceThreadState } from "../../data/customer-service/cs-thread-state";
import {
  createCustomerServiceWorkspaceViewModel,
  listCustomerServiceSelectableThreads,
  selectCustomerServiceThread,
} from "../../data/customer-service/cs-workspace-view-model";
import {
  executeCustomerServiceThreadAction,
  type CustomerServiceThreadAction,
} from "../../data/customer-service/cs-action-service";
import { formatError } from "../../lib/format";
import { useMessageDetailSync } from "../../lib/useMessageDetailSync";

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
  const canUseStaffEndpoints = canUseCustomerServiceStaffEndpoints(session);

  const threadsQuery = useQuery({
    queryKey: pcQueryKeys.customerServiceThreads(...queryBaseKey),
    enabled: Boolean(client),
    queryFn: async () => client!.getWorkbenchThreads(),
    refetchInterval: customerServiceRealtimePollIntervalMs,
    refetchIntervalInBackground: true,
  });
  const historyQuery = useQuery({
    queryKey: pcQueryKeys.customerServiceHistory(...queryBaseKey),
    enabled: Boolean(client && canUseStaffEndpoints),
    queryFn: async () =>
      client!.getStaffServiceHistory({ threadType: "temp_session", limit: 50 }),
  });

  const selectedThread = useMemo(() => {
    return selectCustomerServiceThread({
      historyItems: historyQuery.data?.items ?? [],
      selectedThreadId,
      threads: threadsQuery.data,
    });
  }, [historyQuery.data, selectedThreadId, threadsQuery.data]);
  const selectableThreads = useMemo(
    () =>
      listCustomerServiceSelectableThreads({
        historyItems: historyQuery.data?.items ?? [],
        threads: threadsQuery.data,
      }),
    [historyQuery.data?.items, threadsQuery.data],
  );

  const threadType = selectedThread?.threadType ?? "temp_session";
  const threadId = selectedThread?.threadId ?? "";
  const selectedThreadIsLive = useMemo(
    () => (selectedThread ? !createCustomerServiceThreadState(selectedThread.status).readOnly : false),
    [selectedThread],
  );

  const detailQuery = useQuery({
    queryKey: pcQueryKeys.customerServiceThreadDetail(...queryBaseKey, threadType, threadId),
    enabled: Boolean(client && selectedThread),
    queryFn: async () => client!.getWorkbenchThreadDetail(threadType, threadId),
    refetchInterval: selectedThreadIsLive ? 2_500 : false,
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

  const detail = detailQuery.data;
  const profile = profileQuery.data;
  const workspaceViewModel = useMemo(
    () =>
      createCustomerServiceWorkspaceViewModel({
        detail,
        detailErrorText: detailQuery.error ? formatError(detailQuery.error) : undefined,
        detailLoading: detailQuery.isLoading,
        formatSourceLabel,
        profile,
        selectedThread,
      }),
    [detail, detailQuery.error, detailQuery.isLoading, formatSourceLabel, profile, selectedThread],
  );

  const threadActionMutation = useMutation({
    mutationFn: async (action: CustomerServiceThreadAction) => {
      if (!client || !selectedThread) throw new Error("请选择在线客服会话");
      return executeCustomerServiceThreadAction({ action, client, thread: selectedThread });
    },
    onSuccess: async (result, action) => {
      if (action === "close" && selectedThread) {
        markCustomerServiceThreadClosed(queryClient, selectedThread, result);
      }
      setNotice(actionSuccessText(action));
      await invalidateCustomerServiceQueries(queryClient);
    },
    onError: (error) => {
      setNotice(formatError(error));
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
    workspaceViewModel,
  };
}

function actionSuccessText(action: CustomerServiceThreadAction) {
  if (action === "claim") return "已接入会话。";
  if (action === "takeover") return "已人工接管会话。";
  return "会话已关闭。";
}
