import { useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { TenantJoinRequestDto } from "../../data/api-client";
import { useAuthSession } from "../../data/auth/auth-store";
import { pcQueryKeys } from "../../data/query-keys";
import { usePushRealtimeReminder } from "../../data/reminder/reminder-store";
import { requireApiClient } from "../../data/runtime";
import {
  reconcileTenantJoinRequestReminders,
  tenantJoinRequestStatus,
  tenantJoinRequestsPollIntervalMs,
  type TenantJoinReminderState,
} from "../models/tenantJoinReminderModel";

const emptyTenantJoinReminderState = (): TenantJoinReminderState => ({
  initialized: false,
  previous: [],
  next: [],
  notifiedIds: new Set(),
});

export function useTenantJoinReminderController() {
  const authSession = useAuthSession();
  const queryClient = useQueryClient();
  const pushRealtimeReminder = usePushRealtimeReminder();
  const stateRef = useRef<TenantJoinReminderState>(emptyTenantJoinReminderState());
  const sessionKey = authSession
    ? `${authSession.apiBaseUrl}|${authSession.platformToken ?? ""}|${authSession.platformUserId ?? ""}`
    : "";

  const joinRequestsQuery = useQuery({
    queryKey: pcQueryKeys.tenantJoinRequests(
      authSession?.apiBaseUrl,
      authSession?.platformToken,
    ),
    enabled: Boolean(authSession?.platformToken),
    staleTime: 60_000,
    refetchInterval: (query) =>
      tenantJoinRequestsPollIntervalMs(
        (query.state.data as TenantJoinRequestDto[] | undefined) ?? [],
      ),
    refetchIntervalInBackground: true,
    queryFn: async () => requireApiClient(authSession).getMyTenantJoinRequests(),
  });

  useEffect(() => {
    stateRef.current = emptyTenantJoinReminderState();
  }, [sessionKey]);

  useEffect(() => {
    if (!joinRequestsQuery.isSuccess) return;
    const next = joinRequestsQuery.data ?? [];
    const previousHadPending = stateRef.current.previous.some(
      (request) => tenantJoinRequestStatus(request) === "pending",
    );
    const nextHasPending = next.some(
      (request) => tenantJoinRequestStatus(request) === "pending",
    );
    const result = reconcileTenantJoinRequestReminders({
      initialized: stateRef.current.initialized,
      previous: stateRef.current.previous,
      next,
      notifiedIds: stateRef.current.notifiedIds,
    });

    stateRef.current = result;
    result.reminders.forEach(pushRealtimeReminder);

    if (result.reminders.length > 0 || (previousHadPending && !nextHasPending)) {
      void queryClient.invalidateQueries({
        queryKey: pcQueryKeys.accountSpaces(
          authSession?.apiBaseUrl,
          authSession?.platformToken,
        ),
      });
    }
  }, [
    authSession?.apiBaseUrl,
    authSession?.platformToken,
    joinRequestsQuery.data,
    joinRequestsQuery.isSuccess,
    pushRealtimeReminder,
    queryClient,
  ]);

  const pendingTenantJoinRequestCount = useMemo(
    () =>
      (joinRequestsQuery.data ?? []).filter(
        (request) => tenantJoinRequestStatus(request) === "pending",
      ).length,
    [joinRequestsQuery.data],
  );

  return {
    joinRequests: joinRequestsQuery.data ?? [],
    joinRequestsQuery,
    pendingTenantJoinRequestCount,
  };
}
