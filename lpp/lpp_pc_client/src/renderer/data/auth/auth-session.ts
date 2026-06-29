import type { PlatformTenant } from "../api/types";
import type { DesktopAuthSessionPayload } from "../../../shared/desktop-api";
import { logAuthDiagnostic } from "./auth-diagnostics";
import { recoverAuthSession as recoverPersistedAuthSession } from "./auth-session-recovery";

export interface AuthSession {
  apiBaseUrl: string;
  adminBaseUrl?: string;
  tenantToken: string;
  platformToken?: string;
  platformRefreshToken?: string;
  platformRefreshTokenExpiresAt?: string | null;
  refreshToken?: string;
  deviceSessionToken?: string;
  deviceSessionIssuedAt?: string | null;
  deviceSessionInactiveExpiresAt?: string | null;
  tenantId?: string;
  tenantCode?: string;
  tenantName?: string;
  tenantLogoUrl?: string | null;
  userId?: string;
  platformUserId?: string;
  lppId?: string;
  displayName: string;
  avatarUrl?: string | null;
  userType?: number;
  membershipRole?: number;
  spaceType?: number;
  roleLabel?: string;
  tenants?: PlatformTenant[];
}

export interface AuthSessionEnv {
  tenantToken?: string;
  apiBaseUrl?: string;
}

export interface AuthSessionStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

export interface ReadStoredAuthSessionOptions {
  storage?: AuthSessionStorage;
  env?: AuthSessionEnv;
}

export const authStorageKey = "lpp.pc.authSession";
export const defaultAuthApiBaseUrl = "https://chat.hearteasechat.com";

export function createConfiguredAuthSession(env: AuthSessionEnv): AuthSession | null {
  if (!env.tenantToken) return null;
  return {
    apiBaseUrl: env.apiBaseUrl || defaultAuthApiBaseUrl,
    tenantToken: env.tenantToken,
    displayName: "褰撳墠璐﹀彿",
    roleLabel: "宸查厤缃?Token",
  };
}

export function readStoredAuthSession(
  options: ReadStoredAuthSessionOptions = {},
): AuthSession | null {
  const configured = createConfiguredAuthSession(options.env ?? currentAuthSessionEnv());
  if (configured) {
    logAuthDiagnostic({
      event: "auth.session.restore",
      phase: "restore",
      result: "success",
      reason: "configured_env",
      context: {
        apiBaseUrl: configured.apiBaseUrl,
        hasTenantToken: true,
      },
    });
    return configured;
  }

  const storage = options.storage ?? safeLocalStorage();
  if (!storage) {
    logAuthDiagnostic({
      event: "auth.session.restore",
      phase: "restore",
      result: "skipped",
      reason: "storage_unavailable",
    });
    return null;
  }

  try {
    const session = parseStoredAuthSession(storage.getItem(authStorageKey));
    if (session && hasDesktopSecureAuthSession()) persistAuthSession(session, storage);
    logAuthDiagnostic({
      event: "auth.session.restore",
      phase: "restore",
      result: session ? "success" : "skipped",
      reason: session ? "stored_session" : "empty_or_invalid_storage",
      context: {
        apiBaseUrl: session?.apiBaseUrl,
        hasTenantToken: Boolean(session?.tenantToken),
        hasPlatformToken: Boolean(session?.platformToken),
        tenantId: session?.tenantId,
        userId: session?.userId,
      },
    });
    return session;
  } catch (error) {
    logAuthDiagnostic({
      event: "auth.session.restore",
      phase: "restore",
      result: "failed",
      reason: "storage_read_failed",
      error,
    });
    return null;
  }
}

export function parseStoredAuthSession(raw: string | null): AuthSession | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch (error) {
    logAuthDiagnostic({
      event: "auth.session.parse",
      phase: "parse",
      result: "failed",
      reason: "malformed_storage_json",
      error,
    });
    return null;
  }
}

export function persistAuthSession(
  session: AuthSession,
  storage?: AuthSessionStorage,
) {
  const target = storage ?? safeLocalStorage();
  const desktopApi = safeDesktopApi();
  if (desktopApi?.saveAuthSession) {
    void desktopApi
      .saveAuthSession(toDesktopAuthSessionPayload(session))
      .then(() => {
        target?.removeItem(authStorageKey);
      })
      .catch((error) => {
        target?.setItem(authStorageKey, JSON.stringify(session));
        logAuthDiagnostic({
          event: "auth.session.persist",
          phase: "persist",
          result: "failed",
          reason: "secure_storage_write_failed",
          error,
        });
      });
    logAuthDiagnostic({
      event: "auth.session.persist",
      phase: "persist",
      result: "success",
      reason: "secure_storage_scheduled",
      context: {
        apiBaseUrl: session.apiBaseUrl,
        hasDeviceSessionToken: Boolean(session.deviceSessionToken),
        hasTenantToken: Boolean(session.tenantToken),
        hasPlatformToken: Boolean(session.platformToken),
        tenantId: session.tenantId,
        userId: session.userId,
      },
    });
    return;
  }
  if (!target) {
    logAuthDiagnostic({
      event: "auth.session.persist",
      phase: "persist",
      result: "skipped",
      reason: "storage_unavailable",
    });
    return;
  }
  try {
    target.setItem(authStorageKey, JSON.stringify(session));
    logAuthDiagnostic({
      event: "auth.session.persist",
      phase: "persist",
      result: "success",
      reason: "stored_session",
      context: {
        apiBaseUrl: session.apiBaseUrl,
        hasDeviceSessionToken: Boolean(session.deviceSessionToken),
        hasTenantToken: Boolean(session.tenantToken),
        hasPlatformToken: Boolean(session.platformToken),
        tenantId: session.tenantId,
        userId: session.userId,
      },
    });
  } catch (error) {
    logAuthDiagnostic({
      event: "auth.session.persist",
      phase: "persist",
      result: "failed",
      reason: "storage_write_failed",
      error,
    });
  }
}

export function clearStoredAuthSession(
  storage?: AuthSessionStorage,
) {
  const target = storage ?? safeLocalStorage();
  const desktopApi = safeDesktopApi();
  if (desktopApi?.clearAuthSession) {
    void desktopApi.clearAuthSession().catch((error) => {
      logAuthDiagnostic({
        event: "auth.session.clear",
        phase: "clear",
        result: "failed",
        reason: "secure_storage_remove_failed",
        error,
      });
    });
  }
  if (!target) {
    logAuthDiagnostic({
      event: "auth.session.clear",
      phase: "clear",
      result: "skipped",
      reason: "storage_unavailable",
    });
    return;
  }
  try {
    target.removeItem(authStorageKey);
    logAuthDiagnostic({
      event: "auth.session.clear",
      phase: "clear",
      result: "success",
      reason: "storage_removed",
    });
  } catch (error) {
    logAuthDiagnostic({
      event: "auth.session.clear",
      phase: "clear",
      result: "failed",
      reason: "storage_remove_failed",
      error,
    });
  }
}

export async function readDesktopStoredAuthSession(): Promise<AuthSession | null> {
  const storedSession = await readRawDesktopStoredAuthSession();
  if (!storedSession) return null;
  const recoveredSession = await recoverPersistedAuthSession(storedSession, {
    fallbackToStoredSessionOnError: true,
  });
  const session = recoveredSession ?? storedSession;
  logAuthDiagnostic({
    event: "auth.session.restore",
    phase: "restore",
    result: "success",
    reason:
      recoveredSession && recoveredSession !== storedSession
        ? "secure_storage_recovered"
        : "secure_storage",
    context: {
      apiBaseUrl: session.apiBaseUrl,
      hasDeviceSessionToken: Boolean(session.deviceSessionToken),
      hasTenantToken: Boolean(session.tenantToken),
      hasPlatformToken: Boolean(session.platformToken),
      tenantId: session.tenantId,
      userId: session.userId,
    },
  });
  return session;
}

export async function recoverAuthSession(session: AuthSession) {
  const recoveredSession = await recoverPersistedAuthSession(session);
  if (!recoveredSession) {
    logAuthDiagnostic({
      event: "auth.session.restore",
      phase: "restore",
      result: "failed",
      reason: "session_recovery_failed",
      context: {
        hasDeviceSessionToken: Boolean(session.deviceSessionToken),
        hasPlatformRefreshToken: Boolean(session.platformRefreshToken),
        hasTenantRefreshToken: Boolean(session.refreshToken),
        tenantId: session.tenantId,
        userId: session.userId,
      },
    });
    return null;
  }
  logAuthDiagnostic({
    event: "auth.session.restore",
    phase: "restore",
    result: "success",
    reason: "session_recovered",
    context: {
      hasDeviceSessionToken: Boolean(recoveredSession.deviceSessionToken),
      hasTenantToken: Boolean(recoveredSession.tenantToken),
      hasPlatformToken: Boolean(recoveredSession.platformToken),
      tenantId: recoveredSession.tenantId,
      userId: recoveredSession.userId,
    },
  });
  return recoveredSession;
}

function currentAuthSessionEnv(): AuthSessionEnv {
  return {
    tenantToken: import.meta.env.VITE_TENANT_TOKEN as string | undefined,
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL as string | undefined,
  };
}

function safeLocalStorage(): AuthSessionStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function safeDesktopApi() {
  if (typeof window === "undefined") return undefined;
  try {
    return window.desktopApi;
  } catch {
    return undefined;
  }
}

function hasDesktopSecureAuthSession() {
  return Boolean(safeDesktopApi()?.saveAuthSession);
}

function toDesktopAuthSessionPayload(session: AuthSession): DesktopAuthSessionPayload {
  return { ...session };
}

function fromDesktopAuthSessionPayload(payload: DesktopAuthSessionPayload): AuthSession {
  return {
    ...payload,
    displayName: payload.displayName || "褰撳墠璐﹀彿",
    tenants: Array.isArray(payload.tenants) ? (payload.tenants as PlatformTenant[]) : undefined,
  };
}

async function readRawDesktopStoredAuthSession(): Promise<AuthSession | null> {
  const desktopApi = safeDesktopApi();
  if (!desktopApi?.readAuthSession) return null;
  try {
    const payload = await desktopApi.readAuthSession();
    if (!payload?.tenantToken) {
      logAuthDiagnostic({
        event: "auth.session.restore",
        phase: "restore",
        result: "skipped",
        reason: "secure_storage_empty",
      });
      return null;
    }
    return fromDesktopAuthSessionPayload(payload);
  } catch (error) {
    logAuthDiagnostic({
      event: "auth.session.restore",
      phase: "restore",
      result: "failed",
      reason: "secure_storage_read_failed",
      error,
    });
    return null;
  }
}
