import type { QueryClient } from "@tanstack/react-query";

import type {
  ConversationListItem,
  ConversationListResponse,
  DirectChatCreatedDto,
  GroupChatCreatedDto,
} from "../../data/api/types";
import type { AuthSession } from "../../data/auth/auth-session";
import { pcQueryKeys } from "../../data/query-keys";
import {
  isQueryInWorkspaceScope,
  workspaceScopeKeyFromSession,
} from "../../data/workspace-scope";

export interface DirectConversationPreviewInput {
  avatarUrl?: string | null;
  name?: string | null;
  peerLppId?: string | null;
  peerUserId?: string | null;
}

export function extractCreatedDirectConversationId(result: unknown) {
  return extractCreatedConversationId(result, ["conversationId", "chatId", "id"]);
}

export function extractCreatedConversationId(result: unknown, keys: string[]) {
  if (!result || typeof result !== "object") return "";
  const record = result as Record<string, unknown>;
  return stringField(record, ...keys) ?? "";
}

export function buildCreatedDirectConversationItem(
  chat: DirectChatCreatedDto,
  fallback: DirectConversationPreviewInput = {},
): ConversationListItem | null {
  const conversationId = extractCreatedDirectConversationId(chat);
  if (!conversationId) return null;
  const peerDisplayName = chat.peerDisplayName || fallback.name || "";
  return {
    avatarUrl: chat.peerAvatarUrl ?? fallback.avatarUrl ?? null,
    conversationId,
    conversationType: "direct",
    lastMessage: null,
    lastMessageSeq: 0,
    lastReadSeq: 0,
    peerDisplayName,
    peerLppId: fallback.peerLppId,
    peerReadSeq: 0,
    peerUserId: chat.peerUserId || fallback.peerUserId || null,
    title: peerDisplayName || "Direct chat",
    unreadCount: 0,
  };
}

export function buildCreatedGroupConversationItem(
  group: GroupChatCreatedDto,
): ConversationListItem | null {
  const conversationId = extractCreatedConversationId(group, [
    "conversationId",
    "chatId",
    "groupId",
    "id",
  ]);
  if (!conversationId) return null;
  return {
    conversationId,
    conversationType: "group",
    lastMessage: null,
    lastMessageSeq: 0,
    lastReadSeq: 0,
    memberCount: group.memberCount,
    peerReadSeq: 0,
    title: group.title || group.name || "Group chat",
    unreadCount: 0,
  };
}

export function upsertImConversationListItem(
  queryClient: QueryClient,
  session: AuthSession | null,
  item: ConversationListItem,
) {
  const scopeKey = workspaceScopeKeyFromSession(session);
  const queryKey = pcQueryKeys.imConversationsForSession(session);
  const upsert = (old?: ConversationListResponse) =>
    upsertConversationListResponse(old, item);

  queryClient.setQueryData<ConversationListResponse>(queryKey, upsert);
  queryClient.setQueriesData<ConversationListResponse>(
    {
      predicate: (query) =>
        query.queryKey[0] === "pc-im-conversations" &&
        isQueryInWorkspaceScope(query, scopeKey),
    },
    upsert,
  );
}

export function upsertConversationListResponse(
  old: ConversationListResponse | undefined,
  item: ConversationListItem,
): ConversationListResponse {
  if (!old) return { items: [item] };
  const existing = old.items.find(
    (candidate) => candidate.conversationId === item.conversationId,
  );
  if (!existing) return { ...old, items: [item, ...old.items] };
  const merged = {
    ...item,
    ...existing,
    conversationId: item.conversationId,
    conversationType: existing.conversationType || item.conversationType,
  };
  return {
    ...old,
    items: old.items.map((candidate) =>
      candidate.conversationId === item.conversationId ? merged : candidate,
    ),
  };
}

function stringField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}
