import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import type { TenantInfoDto } from "../../data/api-client";
import { useAuthSession } from "../../data/auth/auth-store";
import { pcQueryKeys } from "../../data/query-keys";
import { requireApiClient } from "../../data/runtime";
import {
  clearSpaceReminder,
  getSpaceReminderSnapshot,
  reconcileSpaceUnreadSummary,
  spaceReminderScopeKey,
  subscribeSpaceReminderLedger,
} from "../../data/spaces/space-reminder-ledger";
import {
  buildSpaceRadarViewModel,
  type SpaceRadarItem,
} from "../models/spaceRadarModel";
import {
  spaceSwitchTargetIdentityKey,
  useSpaceSwitchController,
  type SpaceSwitchTarget,
} from "./useSpaceSwitchController";

export function useSpaceRadarController({
  currentTenant,
  enabled = true,
  onSwitchError,
  onSwitchSuccess,
}: {
  currentTenant?: TenantInfoDto | null;
  enabled?: boolean;
  onSwitchError?: (error: unknown) => void;
  onSwitchSuccess?: () => void;
} = {}) {
  const authSession = useAuthSession();
  const reminderScopeKey = useMemo(
    () => spaceReminderScopeKey(authSession?.apiBaseUrl, authSession?.platformToken),
    [authSession?.apiBaseUrl, authSession?.platformToken],
  );
  const [reminderSnapshot, setReminderSnapshot] = useState(() =>
    getSpaceReminderSnapshot(reminderScopeKey),
  );
  const spacesQuery = useQuery({
    queryKey: pcQueryKeys.accountSpaces(authSession?.apiBaseUrl, authSession?.platformToken),
    enabled: Boolean(enabled && authSession?.platformToken),
    staleTime: 60_000,
    queryFn: async () => requireApiClient(authSession).getPlatformTenants(),
  });
  const unreadSummaryQuery = useQuery({
    queryKey: pcQueryKeys.accountSpaceUnreadSummary(
      authSession?.apiBaseUrl,
      authSession?.platformToken,
    ),
    enabled: Boolean(authSession?.platformToken),
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
    queryFn: async () => requireApiClient(authSession).getPlatformSpaceUnreadSummary(),
  });
  const switchController = useSpaceSwitchController({
    onError: onSwitchError,
    onSuccess: (_result, target) => {
      clearSpaceReminder(reminderScopeKey, spaceSwitchTargetIdentityKey(target));
      onSwitchSuccess?.();
    },
  });
  useEffect(() => {
    setReminderSnapshot(getSpaceReminderSnapshot(reminderScopeKey));
    return subscribeSpaceReminderLedger(() => {
      setReminderSnapshot(getSpaceReminderSnapshot(reminderScopeKey));
    });
  }, [reminderScopeKey]);
  useEffect(() => {
    if (!authSession?.platformToken || !unreadSummaryQuery.data) return;
    reconcileSpaceUnreadSummary(reminderScopeKey, unreadSummaryQuery.data);
  }, [authSession?.platformToken, reminderScopeKey, unreadSummaryQuery.data]);
  const spaces = useMemo(
    () => normalizeSpaces(spacesQuery.data, authSession?.tenants),
    [authSession?.tenants, spacesQuery.data],
  );
  const viewModel = useMemo(
    () =>
      buildSpaceRadarViewModel({
        authSession,
        currentTenant,
        reminderSnapshot,
        spaces,
        unreadSummary: unreadSummaryQuery.data,
        unreadSummaryError: unreadSummaryQuery.error,
        unreadSummaryLoading: unreadSummaryQuery.isLoading,
      }),
    [
      authSession,
      currentTenant,
      reminderSnapshot,
      spaces,
      unreadSummaryQuery.data,
      unreadSummaryQuery.error,
      unreadSummaryQuery.isLoading,
    ],
  );

  return {
    authSession,
    spaces,
    spacesError: spacesQuery.error,
    spacesLoading: spacesQuery.isLoading,
    switchSpace: switchController.switchSpace,
    switchSpaceMutation: switchController.switchSpaceMutation,
    switchingIdentityKey: switchController.switchingIdentityKey,
    unreadSummaryError: unreadSummaryQuery.error,
    unreadSummaryLoading: unreadSummaryQuery.isLoading,
    viewModel,
  };
}

export function targetForSpaceRadarItem(item: SpaceRadarItem): SpaceSwitchTarget | null {
  if (item.spaceType === 1) return "personal";
  return item.tenant ?? null;
}

function normalizeSpaces(remote?: SpaceSwitchTarget[], fallback?: SpaceSwitchTarget[]) {
  const map = new Map<string, Exclude<SpaceSwitchTarget, "personal">>();
  [...(fallback ?? []), ...(remote ?? [])].forEach((item) => {
    if (item !== "personal" && item.tenantId) map.set(item.tenantId, item);
  });
  return Array.from(map.values());
}
