import type { QueryClient } from "@tanstack/react-query";
import type {
  ConversationListItem,
  ConversationListResponse,
  MessageItemDto,
} from "../api-client";
import { normalizeMessageType } from "../im-message-normalize";
import { reduceMessageCoreEvent } from "../message-core/message-core";
import {
  isStrictImConversationType,
  strictImConversationType,
} from "../im/im-conversation-boundary";
import { type CurrentUserIdentity } from "../message-display";
import type { ConversationReadView } from "../im-read-model";
import { recordMessageReminderDiagnostic } from "../diagnostics/message-reminder-diagnostics";
import { isQueryInWorkspaceScope } from "../workspace-scope";
import {
  getImMessageStore,
} from "../message-store/im-message-store";

export interface ApplyImGatewayMessageCacheInput {
  conversationId: string;
  conversationType: string;
  message: MessageItemDto;
  payload: Record<string, unknown>;
  currentTenantId?: string;
  scopeKey?: string;
  unreadCount?: number;
  readSeq?: number;
}

export interface ApplyImGatewayReadCacheInput {
  conversationId: string;
  readerIsCurrentUser: boolean;
  myReadSeq: number;
  peerReadSeq: number;
  previousPeerReadSeq: number;
  identity: CurrentUserIdentity | null;
  view?: ConversationReadView;
  currentTenantId?: string;
  scopeKey?: string;
}

export function applyImGatewayMessageCache(
  queryClient: QueryClient,
  input: ApplyImGatewayMessageCacheInput,
) {
  if (!isStrictImConversationType(input.conversationType)) return;
  if (!payloadTenantMatchesScope(input.payload, input.currentTenantId)) {
    recordImScopeCacheWrite(input, "skipped", "tenant_mismatch");
    return;
  }

  queryClient.setQueriesData<MessageItemDto[]>(
    {
      predicate: (query) =>
        query.queryKey[0] === "pc-im-messages" &&
        isQueryInWorkspaceScope(query, input.scopeKey) &&
        query.queryKey.includes(input.conversationId),
    },
    (old) => appendImMessageForConversation(old, input),
  );

  queryClient.setQueriesData<ConversationListResponse>(
    {
      predicate: (query) =>
        query.queryKey[0] === "pc-im-conversations" &&
        isQueryInWorkspaceScope(query, input.scopeKey),
    },
    (old) => updateImConversationList(old, input),
  );
  recordImScopeCacheWrite(input, "written", "current_scope");
}

export function applyImGatewayReadCache(
  queryClient: QueryClient,
  input: ApplyImGatewayReadCacheInput,
) {
  queryClient.setQueriesData<ConversationListResponse>(
    {
      predicate: (query) =>
        query.queryKey[0] === "pc-im-conversations" &&
        isQueryInWorkspaceScope(query, input.scopeKey),
    },
    (old) =>
      old
        ? {
            ...old,
            items: old.items.map((item) =>
              item.conversationId === input.conversationId
                ? updateImConversationReadReceiptItem(item, input)
                : item,
            ),
          }
        : old,
  );

  if (input.peerReadSeq > input.previousPeerReadSeq) {
    queryClient.setQueriesData<MessageItemDto[]>(
      {
        predicate: (query) =>
          query.queryKey[0] === "pc-im-messages" &&
          isQueryInWorkspaceScope(query, input.scopeKey) &&
          query.queryKey.includes(input.conversationId),
      },
      (old) => applyGatewayReadToMessages(old, input),
    );
  }
  if (input.scopeKey) {
    void getImMessageStore().applyReadMetadata(
      input.scopeKey,
      "direct",
      input.conversationId,
      {
        identity: input.identity,
        peerReadSeq: input.peerReadSeq,
        readSeq: input.myReadSeq,
      },
    );
  }
}

function payloadTenantMatchesScope(
  payload: Record<string, unknown>,
  currentTenantId?: string,
) {
  const payloadTenantId = stringField(payload, "tenantId", "tenant_id");
  if (!payloadTenantId || !currentTenantId) return true;
  return payloadTenantId === currentTenantId;
}

function recordImScopeCacheWrite(
  input: Pick<
    ApplyImGatewayMessageCacheInput,
    "conversationId" | "conversationType" | "currentTenantId" | "payload" | "scopeKey"
  >,
  result: "written" | "skipped",
  reason: string,
) {
  recordMessageReminderDiagnostic({
    event: "im.scope.cache-write",
    source: "im-gateway-cache",
    phase: "cache-write",
    route: "gateway-message",
    classification: {
      conversationId: input.conversationId,
      conversationType: input.conversationType,
      currentTenantId: input.currentTenantId,
      payloadTenantId: stringField(input.payload, "tenantId", "tenant_id"),
      result,
      scopeKey: input.scopeKey,
      reason,
    },
  });
}

export function isImEventMessage(message: MessageItemDto) {
  const type = normalizeMessageType(message);
  return type === "event" || type === "system" || type === "notice";
}

function applyGatewayMessageToConversation(
  item: ConversationListItem,
  input: ApplyImGatewayMessageCacheInput,
) {
  const conversationType = strictImConversationType(input.conversationType);
  if (!conversationType) return item;
  return reduceMessageCoreEvent(
    { conversation: item, messages: [] },
    {
      type: "message.gateway_received",
      conversationId: input.conversationId,
      conversationType,
      message: input.message,
      readSeq: input.readSeq,
      unreadCount: input.unreadCount,
    },
  ).state.conversation ?? item;
}

function applyReadToConversation(
  item: ConversationListItem,
  input: ApplyImGatewayReadCacheInput,
) {
  return reduceMessageCoreEvent(
    { conversation: item, messages: [] },
    {
      type: "read.updated",
      conversationId: input.conversationId,
      conversationType: item.conversationType === "group" ? "group" : "direct",
      readSeq: input.myReadSeq,
      peerReadSeq: input.peerReadSeq,
      identity: input.identity,
    },
  ).state.conversation ?? item;
}

function appendImMessageForConversation(
  old: MessageItemDto[] | undefined,
  input: ApplyImGatewayMessageCacheInput,
) {
  const conversationType = strictImConversationType(input.conversationType);
  if (!conversationType) return old ?? [];
  return reduceMessageCoreEvent(
    { messages: old ?? [] },
    {
      type: "message.gateway_received",
      conversationId: input.conversationId,
      conversationType,
      message: input.message,
      readSeq: input.readSeq,
      unreadCount: input.unreadCount,
    },
  ).state.messages;
}

function applyGatewayReadToMessages(
  old: MessageItemDto[] | undefined,
  input: ApplyImGatewayReadCacheInput,
) {
  if (!old) return old;
  return reduceMessageCoreEvent(
    { messages: old },
    {
      type: "read.updated",
      conversationId: input.conversationId,
      conversationType: "direct",
      readSeq: input.myReadSeq,
      peerReadSeq: input.peerReadSeq,
      identity: input.identity,
    },
  ).state.messages;
}

function updateImConversationList(
  old: ConversationListResponse | undefined,
  input: ApplyImGatewayMessageCacheInput,
) {
  if (!old) return old;
  let found = false;
  const items = old.items.map((item) => {
    if (item.conversationId !== input.conversationId) return item;
    found = true;
    if (!isStrictImConversationType(item.conversationType)) return item;
    return applyGatewayMessageToConversation(item, input);
  });
  if (!found) {
    const conversation = gatewayConversation(input.payload, input);
    if (conversation) {
      items.unshift(conversation);
    }
  }
  return { ...old, items };
}

function updateImConversationReadReceiptItem(
  item: ConversationListItem,
  input: ApplyImGatewayReadCacheInput,
): ConversationListItem {
  if (input.readerIsCurrentUser) {
    return {
      ...applyReadToConversation(item, input),
      unreadCount: input.view?.unreadCount ?? 0,
    };
  }
  return item;
}

function gatewayConversation(
  payload: Record<string, unknown>,
  input: ApplyImGatewayMessageCacheInput,
): ConversationListItem | null {
  const conversationType = strictImConversationType(input.conversationType);
  if (!conversationType) return null;
  const raw = asRecord(payload.conversation);
  const title =
    stringField(raw, "title", "name", "displayName") ||
    stringField(payload, "conversationTitle", "title") ||
    input.message.senderDisplayName ||
    "New conversation";
  return {
    conversationId: input.conversationId,
    conversationType,
    title,
    avatarUrl:
      stringField(raw, "avatarUrl") ||
      stringField(payload, "conversationAvatarUrl", "avatarUrl") ||
      input.message.senderAvatarUrl ||
      null,
    lastMessage: {
      messageId: input.message.messageId,
      messageType: input.message.messageType,
      preview: input.message.preview,
      sentAt: input.message.sentAt,
      senderUserId: input.message.senderUserId,
      senderId: input.message.senderId,
      fromUserId: input.message.fromUserId,
      senderPlatformUserId: input.message.senderPlatformUserId,
      platformUserId: input.message.platformUserId,
      senderLppId: input.message.senderLppId,
      lppId: input.message.lppId,
      senderDisplayName: input.message.senderDisplayName,
      isSelf: input.message.isSelf,
      isMine: input.message.isMine,
      direction: input.message.direction,
    },
    unreadCount: input.unreadCount ?? 0,
    lastReadSeq: input.readSeq,
    lastMessageSeq: input.message.conversationSeq,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function stringField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}
