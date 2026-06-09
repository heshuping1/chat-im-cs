import { ApiClient } from './api-client';
import { deriveAdminApiBaseUrl } from './api/base';
import type { AuthSession } from './auth/auth-session';

export const defaultApiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  'https://chat.hearteasechat.com';

export function createTraceId(prefix = 'pc') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createApiClient(session: AuthSession) {
  return new ApiClient({
    baseUrl: session.apiBaseUrl,
    adminBaseUrl: session.adminBaseUrl || deriveAdminApiBaseUrl(session.apiBaseUrl),
    tenantToken: session.tenantToken,
    platformToken: session.platformToken,
    tenantId: session.tenantId,
    platformUserId: session.platformUserId,
    lppId: session.lppId,
    displayName: session.displayName,
    spaceType: session.spaceType,
    userId: session.userId,
    membershipRole: session.membershipRole,
    traceId: createTraceId(),
  });
}

export function requireApiClient(session?: AuthSession | null) {
  if (!session) {
    throw new Error('Sign-in state expired. Sign in again.');
  }
  return createApiClient(session);
}
