import type { AuthSession } from "../auth/auth-session";
import { workspaceScopeKeyFromSession } from "../workspace-scope";

export function imMessageScopeKey(session: AuthSession | null | undefined) {
  return workspaceScopeKeyFromSession(session);
}

export function imMessageConversationKey(
  scopeKey: string,
  conversationType: string,
  conversationId: string,
) {
  return [scopeKey, normalizeKeyPart(conversationType), normalizeKeyPart(conversationId)].join(":");
}

export function imMessageRecordKey(
  conversationKey: string,
  messageId: string,
) {
  return `${conversationKey}:${normalizeKeyPart(messageId)}`;
}

function normalizeKeyPart(value: string) {
  return value.trim() || "unknown";
}
