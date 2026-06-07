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

export function parseImMessageConversationKey(conversationKey: string) {
  const conversationIdSeparator = conversationKey.lastIndexOf(":");
  if (conversationIdSeparator < 0) return null;
  const withoutConversationId = conversationKey.slice(0, conversationIdSeparator);
  const conversationTypeSeparator = withoutConversationId.lastIndexOf(":");
  if (conversationTypeSeparator < 0) return null;
  return {
    conversationId: conversationKey.slice(conversationIdSeparator + 1),
    conversationType: withoutConversationId.slice(conversationTypeSeparator + 1),
    scopeKey: withoutConversationId.slice(0, conversationTypeSeparator),
  };
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
