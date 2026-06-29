import {
  ApiClient,
  ApiError,
  type DeviceSessionExchangeResult,
  type PlatformTenant,
  type PlatformTokenRefreshResult,
  type TenantAuthResult,
  type TenantInfoDto,
  type UserProfileDto,
} from "../api-client";
import { createTraceId } from "../runtime";
import { authTenantRoleLabel, mergePlatformTenants } from "./auth-tenant-role";
import type { AuthSession } from "./auth-session";

export interface RecoverAuthSessionOptions {
  fallbackToStoredSessionOnError?: boolean;
}

export async function recoverAuthSession(
  session: AuthSession,
  options: RecoverAuthSessionOptions = {},
): Promise<AuthSession | null> {
  try {
    const platformRecovery = await recoverFromPlatformSession(session);
    if (platformRecovery) {
      return rebuildAuthSessionFromPlatformRecovery(session, platformRecovery);
    }

    if (session.refreshToken) {
      return rebuildAuthSessionFromTenantRefresh(session);
    }

    return options.fallbackToStoredSessionOnError ? session : null;
  } catch (error) {
    if (options.fallbackToStoredSessionOnError && !isCredentialFailure(error)) {
      return session;
    }
    return null;
  }
}

async function recoverFromPlatformSession(session: AuthSession) {
  const refreshedPlatformSession = await refreshPlatformSession(session);
  if (!refreshedPlatformSession?.platformToken) return null;

  const platformClient = createPlatformApiClient(session, refreshedPlatformSession.platformToken);
  const tenant = await selectSessionSpace(platformClient, session);
  const sessionClient = createTenantApiClient(session, tenant.accessToken, refreshedPlatformSession.platformToken);
  const [profile, tenantInfo, platformTenants] = await Promise.all([
    sessionClient.getMyProfile().catch(() => null),
    isPersonalSpace(session) ? Promise.resolve(null) : sessionClient.getTenantInfo().catch(() => null),
    platformClient.getPlatformTenants().catch(() => session.tenants),
  ]);

  return {
    platformSession: refreshedPlatformSession,
    platformTenants,
    profile,
    tenant,
    tenantInfo,
  };
}

async function rebuildAuthSessionFromTenantRefresh(session: AuthSession) {
  const tenantClient = createTenantApiClient(session, session.tenantToken, session.platformToken);
  const refreshedTenant = await tenantClient.refreshTenantToken(session.refreshToken ?? "");
  const sessionClient = createTenantApiClient(
    session,
    refreshedTenant.accessToken,
    session.platformToken,
  );
  const [profile, tenantInfo] = await Promise.all([
    sessionClient.getMyProfile().catch(() => null),
    isPersonalSpace(session) ? Promise.resolve(null) : sessionClient.getTenantInfo().catch(() => null),
  ]);

  return {
    ...session,
    tenantToken: refreshedTenant.accessToken,
    refreshToken: refreshedTenant.refreshToken ?? session.refreshToken,
    userId: profile?.userId ?? refreshedTenant.userId ?? session.userId,
    platformUserId: profile?.platformUserId ?? session.platformUserId,
    lppId: profile?.lppId ?? session.lppId,
    displayName: profile?.displayName ?? session.displayName,
    avatarUrl: profile?.avatarUrl ?? session.avatarUrl,
    userType: profile?.userType ?? session.userType,
    tenantCode: isPersonalSpace(session)
      ? undefined
      : tenantInfo?.tenantCode ?? session.tenantCode,
    tenantName: isPersonalSpace(session)
      ? undefined
      : tenantInfo?.tenantName ?? session.tenantName,
    tenantLogoUrl: isPersonalSpace(session)
      ? undefined
      : tenantInfo?.logoUrl ?? session.tenantLogoUrl,
  } satisfies AuthSession;
}

async function refreshPlatformSession(session: AuthSession) {
  const authClient = createPlatformApiClient(session);
  if (session.deviceSessionToken) {
    const deviceSessionResult = await authClient.deviceSessionExchange({
      deviceSessionToken: session.deviceSessionToken,
      issueRefreshToken: true,
    });
    return {
      ...deviceSessionResult,
      deviceSessionToken: session.deviceSessionToken,
      deviceSessionIssuedAt: session.deviceSessionIssuedAt,
      deviceSessionInactiveExpiresAt: session.deviceSessionInactiveExpiresAt,
    };
  }
  if (session.platformRefreshToken) {
    return authClient.refreshPlatformTokenByRefreshToken(session.platformRefreshToken);
  }
  if (session.platformToken) {
    return {
      platformToken: session.platformToken,
      platformRefreshToken: session.platformRefreshToken,
      platformRefreshTokenExpiresAt: session.platformRefreshTokenExpiresAt,
      displayName: session.displayName,
      lppId: session.lppId,
      platformUserId: session.platformUserId,
      userType: session.userType,
    } satisfies PlatformTokenRefreshResult;
  }
  return null;
}

async function selectSessionSpace(client: ApiClient, session: AuthSession) {
  if (isPersonalSpace(session)) {
    return client.selectPersonalSpace();
  }
  return client.selectTenant(session.tenantId ?? "");
}

function rebuildAuthSessionFromPlatformRecovery(
  session: AuthSession,
  recovery: {
    platformSession: PlatformSessionRecoveryResult;
    platformTenants?: PlatformTenant[];
    profile: UserProfileDto | null;
    tenant: TenantAuthResult;
    tenantInfo: TenantInfoDto | null;
  },
): AuthSession {
  const { platformSession, platformTenants, profile, tenant, tenantInfo } = recovery;
  const personalSpace = tenant.spaceContext?.spaceType === 1 || isPersonalSpace(session);
  const tenants = mergePlatformTenants(platformTenants, session.tenants);
  const currentTenant = personalSpace
    ? undefined
    : tenants.find((item) => item.tenantId === (tenant.tenantId ?? session.tenantId));
  const membershipRole =
    personalSpace ? undefined : tenant.membershipRole ?? currentTenant?.membershipRole ?? session.membershipRole;

  return {
    ...session,
    tenantToken: tenant.accessToken,
    platformToken: platformSession.platformToken,
    platformRefreshToken:
      platformSession.platformRefreshToken ?? session.platformRefreshToken,
    platformRefreshTokenExpiresAt:
      platformSession.platformRefreshTokenExpiresAt ??
      session.platformRefreshTokenExpiresAt,
    refreshToken: tenant.refreshToken ?? session.refreshToken,
    tenantId: personalSpace ? undefined : tenant.tenantId ?? currentTenant?.tenantId ?? session.tenantId,
    tenantCode: personalSpace
      ? undefined
      : tenantInfo?.tenantCode ?? currentTenant?.tenantCode ?? session.tenantCode,
    tenantName: personalSpace
      ? undefined
      : tenantInfo?.tenantName ?? currentTenant?.tenantName ?? session.tenantName,
    tenantLogoUrl: personalSpace
      ? undefined
      : tenantInfo?.logoUrl ?? currentTenant?.logoUrl ?? session.tenantLogoUrl,
    userId: profile?.userId ?? tenant.userId ?? session.userId,
    platformUserId:
      platformSession.platformUserId ??
      profile?.platformUserId ??
      tenant.platformUserId ??
      session.platformUserId,
    lppId: platformSession.lppId ?? profile?.lppId ?? tenant.lppId ?? session.lppId,
    displayName:
      profile?.displayName ??
      platformSession.displayName ??
      tenant.displayName ??
      session.displayName,
    avatarUrl: profile?.avatarUrl ?? tenant.avatarUrl ?? session.avatarUrl,
    userType:
      profile?.userType ?? platformSession.userType ?? session.userType,
    membershipRole,
    spaceType: tenant.spaceContext?.spaceType ?? (personalSpace ? 1 : 2),
    roleLabel: personalSpace
      ? session.roleLabel
      : authTenantRoleLabel(membershipRole),
    tenants,
    deviceSessionToken:
      platformSession.deviceSessionToken ?? session.deviceSessionToken,
    deviceSessionIssuedAt:
      platformSession.deviceSessionIssuedAt ?? session.deviceSessionIssuedAt,
    deviceSessionInactiveExpiresAt:
      platformSession.deviceSessionInactiveExpiresAt ??
      session.deviceSessionInactiveExpiresAt,
  };
}

function createPlatformApiClient(session: AuthSession, platformToken?: string) {
  return new ApiClient({
    baseUrl: session.apiBaseUrl,
    platformToken,
    traceId: createTraceId("pc-auth-platform"),
  });
}

function createTenantApiClient(
  session: AuthSession,
  tenantToken: string,
  platformToken?: string,
) {
  return new ApiClient({
    baseUrl: session.apiBaseUrl,
    tenantToken,
    platformToken,
    tenantId: session.tenantId,
    traceId: createTraceId("pc-auth-tenant"),
  });
}

function isPersonalSpace(session: Pick<AuthSession, "spaceType" | "tenantId">) {
  return session.spaceType === 1 || !session.tenantId;
}

function isCredentialFailure(error: unknown) {
  if (!(error instanceof ApiError)) return false;
  if (error.status === 401) return true;
  const code = (error.code ?? "").toUpperCase();
  return (
    code.includes("DEVICE_SESSION") ||
    code.includes("REFRESH_TOKEN") ||
    code.includes("TOKEN") ||
    code.includes("UNAUTHORIZED")
  );
}

type PlatformSessionRecoveryResult =
  | (PlatformTokenRefreshResult & {
      deviceSessionToken?: string;
      deviceSessionIssuedAt?: string | null;
      deviceSessionInactiveExpiresAt?: string | null;
    })
  | (DeviceSessionExchangeResult & {
      deviceSessionToken?: string;
      deviceSessionIssuedAt?: string | null;
      deviceSessionInactiveExpiresAt?: string | null;
    });
