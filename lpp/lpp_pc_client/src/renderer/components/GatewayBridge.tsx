import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
  type HubConnection,
} from "@microsoft/signalr";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import type {
  ConversationListItem,
  ConversationListResponse,
  CustomerServiceThread,
  CustomerServiceThreadType,
  MessageItemDto,
} from "../data/api-client";
import {
  inferMessageType,
  messagePreviewFromBody,
  normalizeMessageItem,
  normalizeMessageType,
} from "../data/im-message-normalize";
import {
  isImConversation,
  isSelfSenderAny,
  type CurrentUserIdentity,
} from "../data/message-display";
import {
  applyDirectReadReceiptToMessages,
  readReceiptReaderIsCurrentUser,
} from "../data/read-receipts";
import { validateGatewayMessageContract } from "../data/im-api-contract";
import {
  conversationKey,
  reduceImCoreEvent,
  type ConversationReadView,
  type ImConversationType,
  type ImCoreCommand,
  type ImCoreEvent,
} from "../data/im-read-model";
import { requireApiClient } from "../data/runtime";
import { useWorkspaceStore } from "../data/store";

const gatewayEvents = [
  "msg.new",
  "message.new",
  "message.created",
  "chat.message",
  "chat.message.new",
  "im.message",
  "im.message.new",
  "msg.read",
  "msg.recalled",
  "space.notice",
  "temp_session.created",
  "temp_session.queued",
  "temp_session.waiting",
  "temp_session.message",
  "temp_session.message.new",
  "temp_session.message.created",
  "customer_service.queued",
  "customer_service.waiting",
  "customer_service.queue.created",
  "customer_service.queue.updated",
  "customer_service.thread.created",
  "customer_service.thread.queued",
  "customer_service.message",
  "customer_service.message.new",
  "customer_service.message.created",
  "customer_service.thread.message",
  "temp_session.assigned",
  "temp_session.closed",
  "temp_session.rated",
  "customer_service.assigned",
  "customer_service.status_changed",
  "customer_service.auto_status_changed",
  "customer_service.staff.status_changed",
  "customer_service.staff.auto_offline",
  "customer_service.sla.warning",
  "customer_service.sla.breached",
  "friend.request.created",
  "friend.request.accepted",
  "friend.request.rejected",
  "friend.profile.updated",
  "presence.changed",
  "auth.force_logout",
  "auth.session.revoked",
  "auth.device.kicked",
  "auth.password.changed",
  "auth.security.required",
  "auth.reuse.detected",
] as const;

const forceLogoutEvents = new Set([
  "auth.force_logout",
  "auth.session.revoked",
  "auth.device.kicked",
  "auth.password.changed",
  "auth.security.required",
  "auth.reuse.detected",
]);

const customerServiceEvents = new Set([
  "temp_session.assigned",
  "temp_session.closed",
  "temp_session.rated",
  "customer_service.assigned",
  "customer_service.status_changed",
  "customer_service.auto_status_changed",
  "customer_service.staff.status_changed",
  "customer_service.staff.auto_offline",
  "customer_service.sla.warning",
  "customer_service.sla.breached",
]);

const customerServiceMessageEvents = new Set([
  "temp_session.message",
  "temp_session.message.new",
  "temp_session.message.created",
  "customer_service.message",
  "customer_service.message.new",
  "customer_service.message.created",
  "customer_service.thread.message",
]);

const customerServiceQueueEvents = new Set([
  "temp_session.created",
  "temp_session.queued",
  "temp_session.waiting",
  "customer_service.queued",
  "customer_service.waiting",
  "customer_service.queue.created",
  "customer_service.queue.updated",
  "customer_service.thread.created",
  "customer_service.thread.queued",
]);

const notifiedCustomerServiceQueueIds = new Set<string>();

export function GatewayBridge() {
  const session = useWorkspaceStore((state) => state.authSession);
  const clearAuthSession = useWorkspaceStore((state) => state.clearAuthSession);
  const setCustomerServiceStatus = useWorkspaceStore(
    (state) => state.setCustomerServiceStatus,
  );
  const queryClient = useQueryClient();
  const connectionRef = useRef<HubConnection | null>(null);
  const sessionKey = useMemo(
    () =>
      session
        ? `${session.apiBaseUrl.replace(/\/$/, "")}|${session.tenantToken}`
        : "",
    [session],
  );

  useEffect(() => {
    let disposed = false;
    const previous = connectionRef.current;
    connectionRef.current = null;
    void previous?.stop().catch(() => undefined);

    if (!session || !sessionKey) return;

    const connection = new HubConnectionBuilder()
      .withUrl(`${session.apiBaseUrl.replace(/\/$/, "")}/ws/client`, {
        accessTokenFactory: () => session.tenantToken,
      })
      .withAutomaticReconnect([0, 2_000, 5_000, 10_000, 30_000])
      .configureLogging(LogLevel.Warning)
      .build();

    connectionRef.current = connection;

    const invalidateIm = (conversationId?: string) => {
      void queryClient.invalidateQueries({ queryKey: ["pc-im-conversations"] });
      if (conversationId) {
        void queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey[0] === "pc-im-messages" &&
            query.queryKey.includes(conversationId),
        });
      } else {
        void queryClient.invalidateQueries({ queryKey: ["pc-im-messages"] });
      }
    };

    const invalidateCustomerService = (threadId?: string) => {
      void queryClient.invalidateQueries({ queryKey: ["pc-cs-workbench-threads"] });
      void queryClient.invalidateQueries({ queryKey: ["pc-cs-staff-service-history"] });
      void queryClient.invalidateQueries({ queryKey: ["pc-cs-reception-status"] });
      if (threadId) {
        void queryClient.invalidateQueries({
          predicate: (query) =>
            (query.queryKey[0] === "pc-cs-thread-detail" ||
              query.queryKey[0] === "pc-cs-thread-profile") &&
            query.queryKey.includes(threadId),
        });
      } else {
        void queryClient.invalidateQueries({ queryKey: ["pc-cs-thread-detail"] });
        void queryClient.invalidateQueries({ queryKey: ["pc-cs-thread-profile"] });
      }
    };

    const handleEvent = (eventName: string, args: unknown[]) => {
      const payload = eventPayload(args);
      if (forceLogoutEvents.has(eventName)) {
        queryClient.clear();
        clearAuthSession();
        return;
      }

      if (isPlainMessageEvent(eventName)) {
        const isCustomerServiceMessage = isCustomerServiceGatewayPayload(payload);
        const conversationType = normalizeType(
          stringField(payload, "conversationType", "conversation_type", "threadType", "thread_type") ||
            stringField(conversationRecord(payload), "conversationType", "conversation_type", "threadType", "thread_type"),
        );
        const conversationId =
          imConversationId(payload) ||
          stringField(payload, "threadId", "thread_id", "sessionId", "session_id") ||
          stringField(conversationRecord(payload), "conversationId", "conversation_id", "chatId", "chat_id");
        if (isCustomerServiceMessage) {
          const threadId = customerServiceThreadId(payload) || conversationId;
          mergeCustomerServiceGatewayMessage(queryClient, payload, threadId);
          invalidateCustomerService(threadId);
          invalidateIm(conversationId);
        } else {
          mergeImGatewayMessage(queryClient, payload, conversationId, conversationType);
          void queryClient.invalidateQueries({ queryKey: ["pc-im-conversations"] });
        }
        return;
      }

      if (customerServiceMessageEvents.has(eventName)) {
        const threadId =
          customerServiceThreadId(payload) ||
          stringField(payload, "conversationId", "chatId", "threadId", "sessionId");
        mergeCustomerServiceGatewayMessage(queryClient, payload, threadId);
        invalidateCustomerService(threadId);
        return;
      }

      if (customerServiceQueueEvents.has(eventName)) {
        const threadId =
          customerServiceThreadId(payload) ||
          stringField(payload, "conversationId", "chatId", "threadId", "sessionId");
        invalidateCustomerService(threadId);
        notifyCustomerServiceQueue(payload, threadId);
        return;
      }

      if (eventName === "msg.read" || eventName === "msg.recalled" || eventName === "space.notice") {
        if (eventName === "msg.read") {
          mergeReadEvent(queryClient, payload, session);
          void queryClient.invalidateQueries({ queryKey: ["pc-im-conversations"] });
          return;
        }
        invalidateIm(stringField(payload, "conversationId", "chatId"));
        if (eventName === "space.notice") invalidateCustomerService();
        return;
      }

      if (customerServiceEvents.has(eventName)) {
        const nextStatus = stringField(payload, "serviceStatus", "status", "staffStatus");
        if (isCustomerServiceStatus(nextStatus)) setCustomerServiceStatus(nextStatus);
        invalidateCustomerService(stringField(payload, "threadId", "sessionId"));
        return;
      }

      if (eventName.startsWith("friend.")) {
        void queryClient.invalidateQueries({ queryKey: ["pc-friends"] });
        void queryClient.invalidateQueries({ queryKey: ["pc-friend-requests"] });
        void queryClient.invalidateQueries({ queryKey: ["pc-im-conversations"] });
        return;
      }

      if (eventName === "friend.profile.updated" || eventName === "presence.changed") {
        void queryClient.invalidateQueries({ queryKey: ["pc-friends"] });
        void queryClient.invalidateQueries({ queryKey: ["pc-tenant-members"] });
        void queryClient.invalidateQueries({ queryKey: ["pc-im-conversations"] });
      }
    };

    gatewayEvents.forEach((eventName) => {
      connection.on(eventName, (...args: unknown[]) => handleEvent(eventName, args));
    });

    connection.onreconnected(() => {
      invalidateIm();
      invalidateCustomerService();
      void heartbeat(connection);
    });

    connection.onclose(() => {
      if (disposed) return;
      // SignalR automatic reconnect handles transient drops; the next successful
      // reconnect performs a full query refresh to compensate for missed events.
    });

    void connection
      .start()
      .then(() => {
        if (disposed) return;
        void heartbeat(connection);
      })
      .catch(() => {
        // Gateway is an accelerator, not a blocker. Query pages remain usable and
        // manual refresh/refetch still works if the websocket endpoint is down.
      });

    const heartbeatTimer = window.setInterval(() => {
      if (connection.state === HubConnectionState.Connected) {
        void heartbeat(connection);
      }
    }, 30_000);

    if (import.meta.env.DEV) {
      window.__lppTestPushImMessage = (payload) => {
        const record = asRecord(payload);
        mergeImGatewayMessage(
          queryClient,
          record,
          imConversationId(record) || fallbackConversationIdFromPeer(record),
          normalizeType(
            stringField(record, "conversationType", "conversation_type", "chatType", "chat_type"),
          ),
        );
      };
    }

    return () => {
      disposed = true;
      window.clearInterval(heartbeatTimer);
      if (window.__lppTestPushImMessage) delete window.__lppTestPushImMessage;
      gatewayEvents.forEach((eventName) => connection.off(eventName));
      void connection.stop().catch(() => undefined);
      if (connectionRef.current === connection) connectionRef.current = null;
    };
  }, [clearAuthSession, queryClient, session, sessionKey, setCustomerServiceStatus]);

  return null;
}

async function heartbeat(connection: HubConnection) {
  try {
    await connection.invoke("HeartbeatAsync", "pc");
  } catch {
    // Older gateway builds may not require explicit heartbeat.
  }
}

function eventPayload(args: unknown[]) {
  const first = asRecord(args[0]);
  const nested = asRecord(first.data ?? first.Data ?? first.payload ?? first.Payload);
  return Object.keys(nested).length ? nested : first;
}

export function imCoreEventFromGatewayMessageForTest(params: {
  payload: Record<string, unknown>;
  active: boolean;
  fallbackConversationId?: string;
  fallbackConversationType?: string;
}): ImCoreEvent | undefined {
  const payload = params.payload;
  const raw = messageRecord(payload);
  const conversationId =
    imConversationId(payload, params.fallbackConversationId) ||
    stringField(raw, "conversationId", "conversation_id", "chatId", "chat_id");
  const conversationType =
    inferImConversationType(payload, params.fallbackConversationType) || "direct";
  const validation = validateGatewayMessageContract(gatewayMessageContractInput(payload));

  if (!conversationId || validation.level === "blocking") return undefined;

  return {
    type: "gateway.message_received",
    conversationId,
    conversationType,
    message: {
      ...validation.normalized,
      conversationId: validation.normalized.conversationId || conversationId,
    },
    isActiveConversation: params.active,
  };
}

export function imCoreEventFromGatewayReadForTest(
  payload: Record<string, unknown>,
): ImCoreEvent | undefined {
  const conversationId = stringField(payload, "conversationId", "conversation_id", "chatId", "chat_id");
  const readSeq =
    numberField(payload, "readSeq", "read_seq", "lastReadSeq", "last_read_seq", "conversationSeq", "conversation_seq") ??
    0;
  if (!conversationId || readSeq <= 0) return undefined;
  return {
    type: "gateway.read_received",
    conversationId,
    conversationType:
      inferImConversationType(
        payload,
        stringField(payload, "conversationType", "conversation_type", "chatType", "chat_type"),
      ) || "direct",
    readerIdentity: readReceiptReaderIdentity(payload),
    readSeq,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function isPlainMessageEvent(eventName: string) {
  return [
    "msg.new",
    "message.new",
    "message.created",
    "chat.message",
    "chat.message.new",
    "im.message",
    "im.message.new",
  ].includes(eventName);
}

function messageRecord(payload: Record<string, unknown>) {
  return firstRecord(
    payload.message,
    payload.msg,
    payload.messageInfo,
    payload.message_info,
    payload.messageDto,
    payload.message_dto,
    payload.item,
  );
}

function conversationRecord(payload: Record<string, unknown>) {
  return firstRecord(
    payload.conversation,
    payload.chat,
    payload.directChat,
    payload.direct_chat,
    payload.groupChat,
    payload.group_chat,
  );
}

function gatewayMessageContractInput(payload: Record<string, unknown>) {
  const raw = messageRecord(payload);
  return {
    ...raw,
    conversationId:
      stringField(raw, "conversationId", "conversation_id", "chatId", "chat_id") ||
      stringField(payload, "conversationId", "conversation_id", "chatId", "chat_id"),
    conversationSeq:
      numberField(raw, "conversationSeq", "conversation_seq", "seq", "messageSeq", "message_seq") ??
      numberField(payload, "conversationSeq", "conversation_seq", "seq", "messageSeq", "message_seq"),
    senderUserId:
      stringField(raw, "senderUserId", "sender_user_id", "userId", "user_id") ||
      stringField(payload, "senderUserId", "sender_user_id", "userId", "user_id"),
    senderId:
      stringField(raw, "senderId", "sender_id") ||
      stringField(payload, "senderId", "sender_id"),
    fromUserId:
      stringField(raw, "fromUserId", "from_user_id") ||
      stringField(payload, "fromUserId", "from_user_id"),
    senderPlatformUserId:
      stringField(
        raw,
        "senderPlatformUserId",
        "sender_platform_user_id",
        "platformUserId",
        "platform_user_id",
      ) ||
      stringField(
        payload,
        "senderPlatformUserId",
        "sender_platform_user_id",
        "platformUserId",
        "platform_user_id",
      ),
    senderLppId:
      stringField(raw, "senderLppId", "sender_lpp_id", "lppId", "lpp_id") ||
      stringField(payload, "senderLppId", "sender_lpp_id", "lppId", "lpp_id"),
    direction: stringField(raw, "direction") || stringField(payload, "direction"),
    isSelf: booleanField(raw, "isSelf", "is_self", "isMine", "is_mine"),
    isMine: booleanField(raw, "isMine", "is_mine"),
    messageType:
      stringField(raw, "messageType", "message_type", "type") ||
      stringField(payload, "messageType", "message_type", "type"),
    sentAt:
      stringField(raw, "sentAt", "sent_at", "createdAt", "created_at") ||
      stringField(payload, "sentAt", "sent_at", "createdAt", "created_at"),
  };
}

function firstRecord(...values: unknown[]) {
  return values.map(asRecord).find((record) => Object.keys(record).length > 0) ?? {};
}

function stringField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function normalizeType(value: string) {
  return value.trim().toLowerCase().replace(/-/g, "_");
}

function normalizeImConversationType(value: string): "direct" | "group" | "" {
  const normalized = normalizeType(value);
  if (
    [
      "direct",
      "im_direct",
      "direct_chat",
      "direct_customer",
      "customer_direct",
      "private",
      "single",
      "single_chat",
      "one_to_one",
      "p2p",
      "friend",
      "friend_chat",
    ].includes(normalized)
  ) {
    return "direct";
  }
  if (["group", "im_group", "group_chat"].includes(normalized)) return "group";
  return "";
}

function imConversationId(payload: Record<string, unknown>, fallbackConversationId = "") {
  const raw = messageRecord(payload);
  const conversation = conversationRecord(payload);
  return (
    stringField(raw, "conversationId", "conversation_id", "chatId", "chat_id", "directChatId", "direct_chat_id", "directId", "direct_id", "groupChatId", "group_chat_id", "groupId", "group_id") ||
    stringField(payload, "conversationId", "conversation_id", "chatId", "chat_id", "directChatId", "direct_chat_id", "directId", "direct_id", "groupChatId", "group_chat_id", "groupId", "group_id") ||
    stringField(conversation, "conversationId", "conversation_id", "chatId", "chat_id", "directChatId", "direct_chat_id", "directId", "direct_id", "groupChatId", "group_chat_id", "groupId", "group_id") ||
    fallbackConversationId
  );
}

function inferImConversationType(
  payload: Record<string, unknown>,
  fallbackConversationType = "",
): "direct" | "group" | "" {
  const raw = messageRecord(payload);
  const conversation = conversationRecord(payload);
  const explicit = normalizeImConversationType(
    fallbackConversationType ||
      stringField(raw, "conversationType", "conversation_type", "chatType", "chat_type", "type") ||
      stringField(payload, "conversationType", "conversation_type", "chatType", "chat_type", "type") ||
      stringField(conversation, "conversationType", "conversation_type", "chatType", "chat_type", "type"),
  );
  if (explicit) return explicit;

  const groupMarker =
    stringField(raw, "groupChatId", "group_chat_id", "groupId", "group_id") ||
    stringField(payload, "groupChatId", "group_chat_id", "groupId", "group_id") ||
    stringField(conversation, "groupChatId", "group_chat_id", "groupId", "group_id");
  if (groupMarker) return "group";

  const directMarker =
    stringField(raw, "directChatId", "direct_chat_id", "directId", "direct_id", "peerUserId", "peer_user_id", "targetUserId", "target_user_id", "receiverUserId", "receiver_user_id", "toUserId", "to_user_id") ||
    stringField(payload, "directChatId", "direct_chat_id", "directId", "direct_id", "peerUserId", "peer_user_id", "targetUserId", "target_user_id", "receiverUserId", "receiver_user_id", "toUserId", "to_user_id") ||
    stringField(conversation, "directChatId", "direct_chat_id", "directId", "direct_id", "peerUserId", "peer_user_id", "targetUserId", "target_user_id", "receiverUserId", "receiver_user_id", "toUserId", "to_user_id");
  if (directMarker) return "direct";

  return imConversationId(payload, fallbackConversationIdFromPeer(payload)) ? "direct" : "";
}

function fallbackConversationIdFromPeer(payload: Record<string, unknown>) {
  const raw = messageRecord(payload);
  const conversation = conversationRecord(payload);
  return (
    stringField(raw, "peerUserId", "peer_user_id", "targetUserId", "target_user_id", "receiverUserId", "receiver_user_id", "toUserId", "to_user_id", "fromUserId", "from_user_id", "senderUserId", "sender_user_id") ||
    stringField(payload, "peerUserId", "peer_user_id", "targetUserId", "target_user_id", "receiverUserId", "receiver_user_id", "toUserId", "to_user_id", "fromUserId", "from_user_id", "senderUserId", "sender_user_id") ||
    stringField(conversation, "peerUserId", "peer_user_id", "targetUserId", "target_user_id", "receiverUserId", "receiver_user_id", "toUserId", "to_user_id")
  );
}

function isCustomerServiceStatus(
  value: string,
): value is "online" | "busy" | "break" | "offline" {
  return ["online", "busy", "break", "offline"].includes(value);
}

function isCustomerServiceGatewayPayload(payload: Record<string, unknown>) {
  const conversation = conversationRecord(payload);
  const thread = asRecord(payload.thread);
  const markers = [
    stringField(payload, "threadType", "thread_type", "conversationType", "conversation_type"),
    stringField(conversation, "threadType", "thread_type", "conversationType", "conversation_type"),
    stringField(thread, "threadType", "thread_type", "conversationType", "conversation_type"),
  ].map(normalizeType);
  if (markers.some((value) => value === "temp_session")) {
    return true;
  }
  if (asRecord(payload.tempSession).sessionId || asRecord(payload.temp_session).sessionId) {
    return true;
  }
  const sessionId = stringField(payload, "sessionId", "visitorSessionId", "tempSessionId");
  return Boolean(sessionId && (stringField(payload, "visitorId", "visitorUserId") || stringField(thread, "threadId")));
}

function customerServiceThreadId(payload: Record<string, unknown>) {
  return (
    stringField(payload, "threadId", "sessionId", "visitorSessionId", "tempSessionId") ||
    stringField(asRecord(payload.thread), "threadId", "sessionId") ||
    stringField(asRecord(payload.tempSession), "sessionId", "threadId") ||
    stringField(asRecord(payload.temp_session), "sessionId", "threadId")
  );
}

function mergeImGatewayMessage(
  queryClient: QueryClient,
  payload: Record<string, unknown>,
  fallbackConversationId: string,
  fallbackConversationType: string,
) {
  if (isCustomerServiceGatewayPayload(payload)) return;
  const fallbackId =
    fallbackConversationId || imConversationId(payload) || fallbackConversationIdFromPeer(payload);
  const message = gatewayMessage(payload, fallbackId);
  const state = useWorkspaceStore.getState();
  const identity = state.authSession;
  const eventMessage = isEventMessage(message);
  if (!message.conversationId) {
    return;
  }
  const imConversationType =
    inferImConversationType(payload, fallbackConversationType) || "direct";
  const active =
    state.activeModule === "messages" &&
    (state.activeImConversationId
      ? state.activeImConversationId === message.conversationId
      : hasMessageQuery(queryClient, message.conversationId));
  const modelEvent = eventMessage
    ? undefined
    : imCoreEventFromGatewayMessageForTest({
        payload,
        active,
        fallbackConversationId: fallbackId,
        fallbackConversationType,
      });
  const modelResult = modelEvent
    ? reduceImCoreEvent({
        identity,
        stateByConversation: state.imReadStateByConversation,
        event: modelEvent,
      })
    : undefined;
  const modelKey = modelEvent
    ? conversationKey(modelEvent.conversationType, modelEvent.conversationId)
    : "";
  const modelState = modelKey ? modelResult?.stateByConversation[modelKey] : undefined;
  const modelView = modelKey ? modelResult?.viewByConversation[modelKey] : undefined;

  if (modelState) {
    state.upsertImReadState(modelState);
  }
  if (modelResult) {
    executeImCoreCommands(modelResult.commands, state, identity, queryClient);
  }

  queryClient.setQueriesData<MessageItemDto[]>(
    {
      predicate: (query) =>
        query.queryKey[0] === "pc-im-messages" &&
        query.queryKey.includes(message.conversationId),
    },
    (old) => appendMessage(old, message),
  );

  queryClient.setQueriesData<ConversationListResponse>(
    { queryKey: ["pc-im-conversations"] },
    (old) =>
      updateConversationList(old, {
        conversationId: message.conversationId!,
        conversationType: imConversationType,
        message,
        unreadCount: modelView?.unreadCount,
        readSeq: modelState ? modelState.myReadSeq : undefined,
        payload,
      }),
  );

}

function hasMessageQuery(queryClient: QueryClient, conversationId?: string) {
  if (!conversationId) return false;
  return queryClient
    .getQueryCache()
    .findAll({
      predicate: (query) =>
        query.queryKey[0] === "pc-im-messages" &&
        query.queryKey.includes(conversationId),
    })
    .length > 0;
}

function executeImCoreCommands(
  commands: ImCoreCommand[],
  state: ReturnType<typeof useWorkspaceStore.getState>,
  identity: ReturnType<typeof useWorkspaceStore.getState>["authSession"],
  queryClient: QueryClient,
) {
  for (const command of commands) {
    if (command.type === "mark_read" || command.type === "retry_pending_read") {
      state.markImConversationReadLocally(command.conversationId, command.readSeq);
      if (identity) {
        void requireApiClient(identity)
          .markConversationRead(
            command.conversationType,
            command.conversationId,
            command.readSeq,
          )
          .then(() => {
            state.clearPendingImRead(
              command.conversationType,
              command.conversationId,
              command.readSeq,
            );
            return queryClient.invalidateQueries({ queryKey: ["pc-im-conversations"] });
          })
          .catch(() => undefined);
      }
    }
    if (command.type === "clear_new_message_jump") {
      state.dismissRealtimeRemindersForTarget("messages", command.conversationId);
    }
  }
}

function mergeReadEvent(
  queryClient: QueryClient,
  payload: Record<string, unknown>,
  identity: CurrentUserIdentity | null,
) {
  const event = imCoreEventFromGatewayReadForTest(payload);
  if (!event || event.type !== "gateway.read_received") return;

  const store = useWorkspaceStore.getState();
  const key = conversationKey(event.conversationType, event.conversationId);
  const previousState = store.imReadStateByConversation[key];
  const result = reduceImCoreEvent({
    identity,
    stateByConversation: store.imReadStateByConversation,
    event,
  });
  const nextState = result.stateByConversation[key];
  const nextView = result.viewByConversation[key];
  if (!nextState) return;

  store.upsertImReadState(nextState);

  const readerIds = readReceiptReaderIds(payload);
  const readerIsCurrentUser = readReceiptReaderIsCurrentUser(readerIds, identity);
  const peerReadSeq = nextState.peerReadSeq;
  const previousPeerReadSeq = previousState?.peerReadSeq ?? 0;
  const hasPeerReadUpdate = peerReadSeq > previousPeerReadSeq;

  queryClient.setQueriesData<ConversationListResponse>(
    { queryKey: ["pc-im-conversations"] },
    (old) =>
      old
        ? {
            ...old,
            items: old.items.map((item) =>
              item.conversationId === event.conversationId
                ? updateConversationReadReceiptItem(item, {
                    readerIsCurrentUser,
                    view: nextView,
                    myReadSeq: nextState.myReadSeq,
                  })
                : item,
            ),
          }
        : old,
  );
  if (hasPeerReadUpdate) {
    store.markImPeerReadReceipt(event.conversationId, peerReadSeq);
    queryClient.setQueriesData<MessageItemDto[]>(
      {
        predicate: (query) =>
          query.queryKey[0] === "pc-im-messages" &&
          query.queryKey.includes(event.conversationId),
      },
      (old) =>
        old
          ? applyDirectReadReceiptToMessages(old, peerReadSeq, identity)
          : old,
    );
  }
}

function readReceiptReaderIds(payload: Record<string, unknown>) {
  return [
    stringField(payload, "userId", "user_id"),
    stringField(payload, "readerUserId", "reader_user_id"),
    stringField(payload, "readUserId", "read_user_id"),
    stringField(payload, "readerId", "reader_id"),
    stringField(payload, "platformUserId", "platform_user_id"),
    stringField(payload, "readerPlatformUserId", "reader_platform_user_id"),
    stringField(payload, "lppId", "lpp_id"),
    stringField(payload, "readerLppId", "reader_lpp_id"),
  ];
}

function readReceiptReaderIdentity(payload: Record<string, unknown>) {
  return {
    userId:
      stringField(payload, "userId", "user_id", "readerUserId", "reader_user_id", "readUserId", "read_user_id") ||
      undefined,
    platformUserId:
      stringField(payload, "platformUserId", "platform_user_id", "readerPlatformUserId", "reader_platform_user_id") ||
      undefined,
    lppId:
      stringField(payload, "lppId", "lpp_id", "readerLppId", "reader_lpp_id") ||
      undefined,
    displayName:
      stringField(payload, "displayName", "display_name", "readerDisplayName", "reader_display_name") ||
      undefined,
  };
}

function mergeCustomerServiceGatewayMessage(
  queryClient: QueryClient,
  payload: Record<string, unknown>,
  fallbackThreadId: string,
) {
  const threadId =
    stringField(payload, "threadId", "sessionId") ||
    stringField(asRecord(payload.thread), "threadId", "sessionId") ||
    fallbackThreadId;
  if (!threadId) return;
  const threadType = normalizeThreadType(
    stringField(payload, "threadType", "conversationType") ||
      stringField(asRecord(payload.thread), "threadType"),
  );
  const message = gatewayMessage(payload, threadId);
  const state = useWorkspaceStore.getState();
  const self = isSelfCustomerServiceGatewayMessage(payload, message, state.authSession);
  const active = state.activeModule === "onlineService" && state.activeThreadId === threadId;

  queryClient.setQueriesData<{ messages?: MessageItemDto[] }>(
    {
      predicate: (query) =>
        query.queryKey[0] === "pc-cs-thread-detail" && query.queryKey.includes(threadId),
    },
    (old) =>
      old
        ? {
            ...old,
            threadType,
            threadId,
            messages: appendMessage(old.messages, message),
          }
        : old,
  );

  queryClient.setQueriesData<{
    queueItems: CustomerServiceThread[];
    activeItems: CustomerServiceThread[];
    summary?: Record<string, number>;
  }>(
    { queryKey: ["pc-cs-workbench-threads"] },
    (old) => updateCustomerServiceThreads(old, threadId, message, self || active),
  );

  if (!self) {
    notifyCustomerServiceMessage(payload, message, { active });
  }
}

function updateCustomerServiceThreads(
  old:
    | {
        queueItems: CustomerServiceThread[];
        activeItems: CustomerServiceThread[];
        summary?: Record<string, number>;
      }
    | undefined,
  threadId: string,
  message: MessageItemDto,
  read: boolean,
) {
  if (!old) return old;
  const update = (thread: CustomerServiceThread): CustomerServiceThread =>
    thread.threadId === threadId || thread.conversationId === threadId
      ? {
          ...thread,
          lastMessagePreview: message.preview ?? thread.lastMessagePreview,
          lastMessageAt: message.sentAt ?? thread.lastMessageAt,
          unreadCount: read ? 0 : Math.max(0, Number(thread.unreadCount ?? 0) + 1),
        }
      : thread;
  return {
    ...old,
    queueItems: old.queueItems.map(update),
    activeItems: old.activeItems.map(update),
  };
}

function notifyCustomerServiceMessage(
  payload: Record<string, unknown>,
  message: MessageItemDto,
  options: { active?: boolean } = {},
) {
  const state = useWorkspaceStore.getState();
  const settings = state.pcSettings;
  if (!settings.serviceQueueNotifications) return;
  const title =
    stringField(asRecord(payload.thread), "title", "customerName", "visitorName") ||
    stringField(payload, "threadTitle", "customerName", "visitorName") ||
    message.senderDisplayName ||
    "在线客服新消息";
  const targetId =
    customerServiceThreadId(payload) ||
    stringField(payload, "threadId", "sessionId") ||
    message.conversationId;
  state.pushRealtimeReminder({
    id: `cs-${message.messageId}`,
    title,
    body: options.active
      ? message.preview || "当前在线客服会话有新消息"
      : message.preview || "收到一条在线客服消息",
    targetModule: "onlineService",
    targetId,
    severity: "warning",
    icon: "service",
  });
  if (settings.desktopNotifications) {
    notifyDesktopOrBrowser({
      title,
      body: options.active
        ? message.preview || "当前在线客服会话有新消息"
        : message.preview || "收到一条在线客服消息",
      conversationId: targetId,
    });
  }
}

function notifyCustomerServiceQueue(payload: Record<string, unknown>, threadId: string) {
  const state = useWorkspaceStore.getState();
  const settings = state.pcSettings;
  if (!settings.serviceQueueNotifications) return;
  const normalizedThreadId = threadId || customerServiceThreadId(payload);
  if (!normalizedThreadId) return;
  const reminderId = `cs-queue-${normalizedThreadId}`;
  if (notifiedCustomerServiceQueueIds.has(reminderId)) return;
  notifiedCustomerServiceQueueIds.add(reminderId);

  const title =
    stringField(asRecord(payload.thread), "title", "customerName", "visitorName") ||
    stringField(payload, "threadTitle", "customerName", "visitorName", "title") ||
    "新的在线客服会话";
  const source =
    stringField(payload, "source", "channel", "sourceChannel", "entryChannel") ||
    stringField(asRecord(payload.thread), "source", "channel", "sourceChannel", "entryChannel");
  const body = source
    ? `来自 ${source} 的访客正在排队，等待接入`
    : "有访客正在排队，等待接入";

  state.pushRealtimeReminder({
    id: reminderId,
    title,
    body,
    targetModule: "onlineService",
    targetId: normalizedThreadId,
    severity: "warning",
    icon: "service",
  });
  if (settings.desktopNotifications) {
    notifyDesktopOrBrowser({
      title,
      body,
      conversationId: normalizedThreadId,
    });
  }
}

function gatewayMessage(
  payload: Record<string, unknown>,
  fallbackConversationId: string,
): MessageItemDto {
  const nestedMessage = messageRecord(payload);
  const raw = Object.keys(nestedMessage).length ? nestedMessage : payload;
  const conversationId = imConversationId(payload, fallbackConversationId);
  const body = asRecord(raw.body ?? raw.messageBody ?? raw.message_body ?? raw.content) ?? {};
  const messageType =
    stringField(raw, "messageType", "message_type", "type") ||
    stringField(body, "messageType", "message_type", "type") ||
    inferMessageType(body) ||
    "text";
  return normalizeMessageItem({
    messageId:
      stringField(raw, "messageId", "message_id", "id", "serverMessageId", "server_message_id") ||
      `gateway-${conversationId}-${numberField(raw, "conversationSeq", "seq") ?? Date.now()}`,
    conversationId,
    conversationSeq: numberField(raw, "conversationSeq", "conversation_seq", "seq", "messageSeq", "message_seq"),
    senderUserId: stringField(raw, "senderUserId", "sender_user_id", "senderId", "sender_id", "fromUserId", "from_user_id", "userId", "user_id") || stringField(payload, "senderUserId", "sender_user_id", "senderId", "sender_id", "fromUserId", "from_user_id", "userId", "user_id"),
    senderId: stringField(raw, "senderId", "sender_id") || stringField(payload, "senderId", "sender_id"),
    fromUserId: stringField(raw, "fromUserId", "from_user_id") || stringField(payload, "fromUserId", "from_user_id"),
    senderPlatformUserId: stringField(raw, "senderPlatformUserId", "sender_platform_user_id", "platformUserId", "platform_user_id") || stringField(payload, "senderPlatformUserId", "sender_platform_user_id", "platformUserId", "platform_user_id"),
    senderLppId: stringField(raw, "senderLppId", "sender_lpp_id", "lppId", "lpp_id") || stringField(payload, "senderLppId", "sender_lpp_id", "lppId", "lpp_id"),
    senderDisplayName: stringField(raw, "senderDisplayName", "sender_display_name", "senderName", "sender_name", "nickname", "nickName", "nick_name") || stringField(payload, "senderDisplayName", "sender_display_name", "senderName", "sender_name", "nickname", "nickName", "nick_name"),
    senderAvatarUrl: stringField(raw, "senderAvatarUrl", "sender_avatar_url", "avatarUrl", "avatar_url") || null,
    messageType,
    body: bodyWithType(body, messageType),
    preview: stringField(raw, "preview", "text", "content") || previewFromBody(body),
    sentAt:
      stringField(raw, "sentAt", "sent_at", "createdAt", "created_at", "serverTime", "server_time", "timestamp") ||
      new Date().toISOString(),
    isSelf: booleanField(raw, "isSelf", "is_self", "isMine", "is_mine"),
    direction: stringField(raw, "direction"),
  });
}

function normalizeThreadType(value: string): CustomerServiceThreadType {
  return normalizeType(value) === "im_direct" ? "im_direct" : "temp_session";
}

function bodyWithType(body: Record<string, unknown>, messageType: string) {
  return body.messageType || body.type ? body : { ...body, messageType };
}

function appendMessage(old: MessageItemDto[] | undefined, message: MessageItemDto) {
  const items = old ? [...old] : [];
  if (items.some((item) => item.messageId === message.messageId)) return old;
  items.push(message);
  items.sort((a, b) => {
    const seqA = a.conversationSeq ?? 0;
    const seqB = b.conversationSeq ?? 0;
    if (seqA !== seqB) return seqA - seqB;
    return Date.parse(a.sentAt ?? "") - Date.parse(b.sentAt ?? "");
  });
  return items;
}

function updateConversationList(
  old: ConversationListResponse | undefined,
  params: {
    conversationId: string;
    conversationType: string;
    message: MessageItemDto;
    unreadCount?: number;
    readSeq?: number;
    payload: Record<string, unknown>;
  },
) {
  if (!old) return old;
  let found = false;
  const items = old.items.map((item) => {
    if (item.conversationId !== params.conversationId) return item;
    found = true;
    return updateConversationItem(item, params);
  });
  if (!found) {
    const conversation = gatewayConversation(params.payload, params);
    if (conversation && isImConversation(conversation)) {
      items.unshift(conversation);
    }
  }
  return { ...old, items };
}

function updateConversationItem(
  item: ConversationListItem,
  params: {
    conversationId: string;
    conversationType: string;
    message: MessageItemDto;
    unreadCount?: number;
    readSeq?: number;
  },
): ConversationListItem {
  const lastSeq = params.message.conversationSeq ?? item.lastMessageSeq ?? 0;
  const alreadyMerged = isSameOrOlderConversationMessage(item, params.message);
  const nextReadSeq =
    params.readSeq !== undefined
      ? Math.max(item.lastReadSeq ?? 0, params.readSeq)
      : item.lastReadSeq;
  if (alreadyMerged) {
    return params.readSeq !== undefined || params.unreadCount !== undefined
      ? {
          ...item,
          unreadCount: params.unreadCount ?? 0,
          lastReadSeq: nextReadSeq,
        }
      : item;
  }
  return {
    ...item,
    lastMessage: {
      messageId: params.message.messageId,
      messageType: params.message.messageType,
      preview: params.message.preview,
      sentAt: params.message.sentAt,
      senderUserId: params.message.senderUserId,
      senderId: params.message.senderId,
      fromUserId: params.message.fromUserId,
      senderPlatformUserId: params.message.senderPlatformUserId,
      platformUserId: params.message.platformUserId,
      senderLppId: params.message.senderLppId,
      lppId: params.message.lppId,
      senderDisplayName: params.message.senderDisplayName,
      isSelf: params.message.isSelf,
      isMine: params.message.isMine,
      direction: params.message.direction,
    },
    lastMessageSeq: Math.max(item.lastMessageSeq ?? 0, lastSeq),
    lastReadSeq: nextReadSeq,
    unreadCount:
      params.unreadCount !== undefined
        ? params.unreadCount
        : params.readSeq !== undefined
          ? 0
        : item.unreadCount,
  };
}

function updateConversationReadReceiptItem(
  item: ConversationListItem,
  params: {
    readerIsCurrentUser: boolean;
    view?: ConversationReadView;
    myReadSeq: number;
  },
): ConversationListItem {
  if (params.readerIsCurrentUser) {
    return {
      ...item,
      unreadCount: params.view?.unreadCount ?? 0,
      lastReadSeq: Math.max(item.lastReadSeq ?? 0, params.myReadSeq),
    };
  }
  return item;
}

function gatewayConversation(
  payload: Record<string, unknown>,
  params: {
    conversationId: string;
    conversationType: string;
    message: MessageItemDto;
    unreadCount?: number;
    readSeq?: number;
  },
): ConversationListItem | null {
  const raw = asRecord(payload.conversation);
  const title =
    stringField(raw, "title", "name", "displayName") ||
    stringField(payload, "conversationTitle", "title") ||
    params.message.senderDisplayName ||
    "新会话";
  return {
    conversationId: params.conversationId,
    conversationType: params.conversationType,
    title,
    avatarUrl:
      stringField(raw, "avatarUrl") ||
      stringField(payload, "conversationAvatarUrl", "avatarUrl") ||
      params.message.senderAvatarUrl ||
      null,
    lastMessage: {
      messageId: params.message.messageId,
      messageType: params.message.messageType,
      preview: params.message.preview,
      sentAt: params.message.sentAt,
      senderUserId: params.message.senderUserId,
      senderId: params.message.senderId,
      fromUserId: params.message.fromUserId,
      senderPlatformUserId: params.message.senderPlatformUserId,
      platformUserId: params.message.platformUserId,
      senderLppId: params.message.senderLppId,
      lppId: params.message.lppId,
      senderDisplayName: params.message.senderDisplayName,
      isSelf: params.message.isSelf,
      isMine: params.message.isMine,
      direction: params.message.direction,
    },
    unreadCount: params.unreadCount ?? 0,
    lastReadSeq: params.readSeq,
    lastMessageSeq: params.message.conversationSeq,
  };
}

function isSelfGatewayMessage(
  message: MessageItemDto,
  identity:
    | {
        userId?: string | null;
        platformUserId?: string | null;
        lppId?: string | null;
        displayName?: string | null;
      }
    | null,
) {
  const senderIds = [
    message.senderUserId,
    message.senderId,
    message.fromUserId,
    message.senderPlatformUserId,
    message.platformUserId,
    message.senderLppId,
    message.lppId,
  ];
  if (message.isSelf || message.isMine) return true;
  if (["out", "outgoing", "sent", "self"].includes(normalizeType(message.direction ?? ""))) {
    return true;
  }
  if (hasAnyIdentityValue(senderIds)) {
    return isSelfSenderAny(senderIds, undefined, identity);
  }
  return isSelfSenderAny([], message.senderDisplayName, identity);
}

function hasAnyIdentityValue(values: Array<string | null | undefined>) {
  return values.some((value) => typeof value === "string" && value.trim());
}

function isEventMessage(message: MessageItemDto) {
  const type = normalizeMessageType(message);
  return type === "event" || type === "system" || type === "notice";
}

function isSameOrOlderConversationMessage(
  item: ConversationListItem,
  message: MessageItemDto,
) {
  const incomingId = message.messageId;
  const existingId = item.lastMessage?.messageId;
  if (incomingId && existingId && incomingId === existingId) return true;
  const incomingSeq = message.conversationSeq ?? 0;
  const existingSeq = item.lastMessageSeq ?? 0;
  return incomingSeq > 0 && existingSeq > 0 && incomingSeq <= existingSeq;
}

function isSelfCustomerServiceGatewayMessage(
  payload: Record<string, unknown>,
  message: MessageItemDto,
  identity:
    | {
        userId?: string | null;
        platformUserId?: string | null;
        lppId?: string | null;
        displayName?: string | null;
      }
    | null,
) {
  const raw = asRecord(payload.message ?? payload.msg) ?? payload;
  const roleText = [
    stringField(raw, "senderRole", "senderType", "authorType", "fromType", "role", "sourceType"),
    stringField(payload, "senderRole", "senderType", "authorType", "fromType", "role", "sourceType"),
    stringField(asRecord(payload.thread), "senderRole", "senderType", "authorType", "fromType"),
  ]
    .map(normalizeType)
    .join("|");
  if (
    [
      "visitor",
      "guest",
      "customer",
      "client",
      "user",
      "end_user",
      "widget",
    ].some((marker) => roleText.includes(marker))
  ) {
    return false;
  }
  if (
    ["staff", "agent", "operator", "customer_service", "service_staff", "kefu"].some(
      (marker) => roleText.includes(marker),
    )
  ) {
    return isSelfGatewayMessage(message, identity);
  }
  const direction = normalizeType(message.direction ?? "");
  if (["in", "incoming", "inbound", "received", "receive"].includes(direction)) {
    return false;
  }
  if (isSelfSenderAny(
    [
      message.senderUserId,
      message.senderId,
      message.fromUserId,
      message.senderPlatformUserId,
      message.platformUserId,
      message.senderLppId,
      message.lppId,
    ],
    message.senderDisplayName,
    identity,
  )) {
    return true;
  }
  return Boolean(message.isSelf || message.isMine);
}

function notifyDesktopOrBrowser(payload: {
  title: string;
  body: string;
  conversationId?: string;
}) {
  if (window.desktopApi?.notify) {
    void window.desktopApi.notify(payload);
    return;
  }
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(payload.title, { body: payload.body });
    return;
  }
  if (Notification.permission === "default") {
    void Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        new Notification(payload.title, { body: payload.body });
      }
    });
  }
}

function previewFromBody(body: Record<string, unknown>) {
  return messagePreviewFromBody(body, inferMessageType(body));
}

function numberField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return undefined;
}

function booleanField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value === true || value === "true" || value === 1 || value === "1") return true;
  }
  return false;
}
