import { ApiClient } from './api-client';
import type { AuthSession } from './store';

export const defaultApiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  'https://chat.hearteasechat.com';

export function createTraceId(prefix = 'pc') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createApiClient(session: AuthSession) {
  return new ApiClient({
    baseUrl: session.apiBaseUrl,
    tenantToken: session.tenantToken,
    platformToken: session.platformToken,
    traceId: createTraceId(),
  });
}

export function requireApiClient(session?: AuthSession | null) {
  if (!session) {
    throw new Error('登录状态已失效，请重新登录');
  }
  return createApiClient(session);
}
