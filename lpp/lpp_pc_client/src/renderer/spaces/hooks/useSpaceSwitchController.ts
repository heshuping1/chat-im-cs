import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  ApiClient,
  type PlatformTenant,
  type TenantAuthResult,
  type TenantInfoDto,
  type UserProfileDto,
} from "../../data/api-client";
import { useAuthSession, useSetAuthSession } from "../../data/auth/auth-store";
import type { AuthSession } from "../../data/auth/auth-session";
import { writeRendererAppLog } from "../../data/logging/app-log";
import { createTraceId } from "../../data/runtime";
import { roleLabel } from "../models/spaceRadarModel";

export type SpaceSwitchTarget = PlatformTenant | "personal";

export type SpaceSwitchResult = {
  currentTenant: TenantInfoDto | null;
  profile: UserProfileDto | null;
  space: PlatformTenant | null;
  tenant: TenantAuthResult;
};

export function useSpaceSwitchController({
  onError,
  onSuccess,
}: {
  onError?: (error: unknown) => void;
  onSuccess?: (result: SpaceSwitchResult, target: SpaceSwitchTarget) => void;
} = {}) {
  const authSession = useAuthSession();
  const setAuthSession = useSetAuthSession();
  const queryClient = useQueryClient();
  const switchSpaceMutation = useMutation({
    mutationFn: async (space: SpaceSwitchTarget) => {
      if (!authSession?.platformToken) {
        throw new Error("The current sign-in did not keep a platform session. Sign in again before switching spaces.");
      }
      const client = new ApiClient({
        baseUrl: authSession.apiBaseUrl,
        platformToken: authSession.platformToken,
        traceId: createTraceId("pc-space"),
      });
      const tenant =
        space === "personal"
          ? await client.selectPersonalSpace()
          : await client.selectTenant(space.tenantId);
      const sessionClient = new ApiClient({
        baseUrl: authSession.apiBaseUrl,
        platformToken: authSession.platformToken,
        tenantToken: tenant.accessToken,
        traceId: createTraceId("pc-space-profile"),
      });
      const [profile, currentTenant] = await Promise.all([
        sessionClient.getMyProfile().catch(() => null),
        sessionClient.getTenantInfo().catch(() => null),
      ]);
      return {
        currentTenant,
        profile,
        space: space === "personal" ? null : space,
        tenant,
      } satisfies SpaceSwitchResult;
    },
    onError,
    onSuccess: async (result, target) => {
      if (!authSession) return;
      setAuthSession(buildSwitchedAuthSession(authSession, result));
      await queryClient.invalidateQueries();
      onSuccess?.(result, target);
    },
  });

  return {
    switchSpace: (target: SpaceSwitchTarget) => switchSpaceMutation.mutate(target),
    switchSpaceMutation,
    switchingIdentityKey: switchSpaceMutation.variables
      ? spaceSwitchTargetIdentityKey(switchSpaceMutation.variables)
      : "",
  };
}

export function spaceSwitchTargetIdentityKey(target: SpaceSwitchTarget) {
  return target === "personal" ? "personal" : `tenant:${target.tenantId}`;
}

function buildSwitchedAuthSession(
  authSession: AuthSession,
  { currentTenant, profile, space, tenant }: SpaceSwitchResult,
): AuthSession {
  const isPersonalSpace = !space;
  const sessionRole = space ? space.membershipRole : undefined;
  writeRendererAppLog({
    module: "auth",
    event: "auth.space.switch.apply",
    phase: "role",
    result: "ok",
    context: {
      tenantId: isPersonalSpace ? null : tenant.tenantId,
      spaceType: tenant.spaceContext?.spaceType ?? (space ? 2 : 1),
      spaceRole: space?.membershipRole ?? null,
      tenantRole: tenant.membershipRole ?? null,
      sessionRole: sessionRole ?? null,
      userType: profile?.userType ?? authSession.userType ?? null,
      roleLabel: isPersonalSpace ? "personal" : roleLabel(sessionRole),
    },
  });
  return {
    ...authSession,
    avatarUrl: profile?.avatarUrl ?? tenant.avatarUrl,
    displayName: profile?.displayName ?? tenant.displayName,
    lppId: profile?.lppId ?? tenant.lppId,
    membershipRole: sessionRole,
    platformUserId: profile?.platformUserId ?? tenant.platformUserId,
    refreshToken: tenant.refreshToken,
    roleLabel: space ? roleLabel(space.membershipRole) : "Personal space",
    spaceType: tenant.spaceContext?.spaceType ?? (space ? 2 : 1),
    tenantCode: currentTenant?.tenantCode ?? space?.tenantCode,
    tenantId: isPersonalSpace ? undefined : tenant.tenantId,
    tenantLogoUrl: currentTenant?.logoUrl ?? space?.logoUrl,
    tenantName: isPersonalSpace
      ? "Personal space"
      : currentTenant?.tenantName ?? space?.tenantName ?? authSession.tenantName,
    tenantToken: tenant.accessToken,
    userId: profile?.userId ?? tenant.userId,
    userType: profile?.userType ?? authSession.userType,
  };
}
