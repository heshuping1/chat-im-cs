import type { Query } from "@tanstack/react-query";

import type { AuthSession } from "./auth/auth-session";

export type WorkspaceSpaceType = "personal" | "tenant" | "unknown";

export interface WorkspaceScope {
  apiBaseUrl: string;
  key: string;
  missing: string[];
  platformUserId: string;
  spaceType: WorkspaceSpaceType;
  tenantId: string;
  userId: string;
}

export function workspaceScopeFromSession(
  session?: Partial<AuthSession> | null,
): WorkspaceScope {
  const apiBaseUrl = normalizedPart(session?.apiBaseUrl);
  const rawSpaceType = Number(session?.spaceType ?? 0);
  const spaceType: WorkspaceSpaceType =
    rawSpaceType === 1 ? "personal" : rawSpaceType === 2 ? "tenant" : "unknown";
  const tenantId = normalizedPart(session?.tenantId);
  const userId = normalizedPart(session?.userId);
  const platformUserId = normalizedPart(session?.platformUserId);
  const missing = [
    apiBaseUrl ? "" : "apiBaseUrl",
    spaceType === "unknown" ? "spaceType" : "",
    tenantId ? "" : "tenantId",
    userId ? "" : "userId",
    platformUserId ? "" : "platformUserId",
  ].filter(Boolean);
  const fallbackToken = normalizedPart(session?.tenantToken);
  const key = [
    "workspace",
    apiBaseUrl || "missing-api",
    spaceType,
    tenantId || `missing-tenant:${tokenFingerprint(fallbackToken)}`,
    userId || "missing-user",
    platformUserId || "missing-platform-user",
  ].join("|");
  return {
    apiBaseUrl,
    key,
    missing,
    platformUserId,
    spaceType,
    tenantId,
    userId,
  };
}

export function workspaceScopeKeyFromSession(session?: Partial<AuthSession> | null) {
  return workspaceScopeFromSession(session).key;
}

export function isQueryInWorkspaceScope(
  query: Query | { queryKey: readonly unknown[] },
  scopeKey?: string,
) {
  if (!scopeKey) return true;
  return query.queryKey.includes(scopeKey);
}

export function workspaceScopeDiagnostic(scope?: WorkspaceScope | string) {
  if (!scope) return { scopeKey: "" };
  if (typeof scope === "string") {
    return {
      scopeKey: scope,
    };
  }
  return {
    apiBaseUrl: scope.apiBaseUrl,
    missing: scope.missing,
    platformUserId: scope.platformUserId,
    scopeKey: scope.key,
    spaceType: scope.spaceType,
    tenantId: scope.tenantId,
    userId: scope.userId,
  };
}

function normalizedPart(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function tokenFingerprint(token: string) {
  if (!token) return "none";
  return token.length <= 8 ? `token:${token.length}` : `token:${token.slice(-8)}`;
}
