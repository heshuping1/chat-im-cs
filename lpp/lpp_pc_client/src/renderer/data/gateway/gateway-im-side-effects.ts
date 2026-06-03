import type { QueryClient } from "@tanstack/react-query";
import type { AuthSession } from "../auth/auth-session";
import type { CurrentUserIdentity } from "../message-display";
import { isSelfSenderAny } from "../message-display";
import type { MessageItemDto } from "../api-client";
import { readReceiptReaderIsCurrentUser } from "../read-receipts";
import { getAuthSessionSnapshot } from "../auth/auth-store";
import {
  getImReadActions,
  getImReadSnapshot,
} from "../im-read/im-read-store";
import { logImReadDiagnostic } from "../im-read/im-read-diagnostics";
import {
  applyImGatewayMessageCache,
  applyImGatewayReadCache,
  isImEventMessage,
} from "./im-gateway-cache";
import {
  fallbackConversationIdFromPeer,
  gatewayMessage,
  imConversationId,
  imCoreEventFromGatewayMessageForTest,
  imCoreEventFromGatewayReadForTest,
  inferImConversationType,
  readReceiptReaderIds,
} from "./gateway-payload-utils";
import {
  conversationKey,
  reduceImCoreEvent,
  type ImCoreCommand,
} from "../im-read-model";
import { requireApiClient } from "../runtime";
import { getReminderActions } from "../reminder/reminder-store";
import { getWorkspaceUiSnapshot } from "../workspace-ui/workspace-ui-store";
import { recordMessageReminderDiagnostic } from "../diagnostics/message-reminder-diagnostics";
import { workspaceScopeFromSession } from "../workspace-scope";

export function mergeImGatewayMessage(
  queryClient: QueryClient,
  payload: Record<string, unknown>,
  fallbackConversationId: string,
  fallbackConversationType: string,
) {
  const fallbackId =
    fallbackConversationId || imConversationId(payload) || fallbackConversationIdFromPeer(payload);
  const message = gatewayMessage(payload, fallbackId);
  const identity = getAuthSessionSnapshot();
  const workspaceScope = workspaceScopeFromSession(identity);
  const readSnapshot = getImReadSnapshot();
  const readActions = getImReadActions();
  const eventMessage = isImEventMessage(message);
  const selfMessage = isSelfGatewayImMessage(message, identity);
  if (!message.conversationId) {
    return;
  }
  const imConversationType = inferImConversationType(payload, fallbackConversationType);
  if (!imConversationType) {
    return;
  }
  const uiState = getWorkspaceUiSnapshot();
  const active =
    uiState.activeModule === "messages" &&
    uiState.activeImConversationId === message.conversationId &&
    uiState.activeImConversationVisibility === "paneVisible";
  const previousKey = conversationKey(
    imConversationType === "group" ? "group" : "direct",
    message.conversationId,
  );
  const previousState = readSnapshot.imReadStateByConversation[previousKey];
  recordMessageReminderDiagnostic({
    event: "im.gateway.received",
    source: "gateway-im-side-effects",
    phase: "received",
    route: "messages",
    classification: {
      activeDecision: active,
      activeImConversationId: uiState.activeImConversationId,
      activeImConversationVisibility: uiState.activeImConversationVisibility,
      activeModule: uiState.activeModule,
      conversationId: message.conversationId,
      conversationType: imConversationType,
      eventMessage,
      currentIdentity: identityDiagnostic(identity),
      messageSeq: message.conversationSeq,
      senderIdentity: messageSenderDiagnostic(message),
      selfMessage,
    },
    summary: {
      payload,
      previousState,
    },
  });
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
        stateByConversation: readSnapshot.imReadStateByConversation,
        event: modelEvent,
      })
    : undefined;
  const modelKey = modelEvent
    ? conversationKey(modelEvent.conversationType, modelEvent.conversationId)
    : "";
  const modelState = modelKey ? modelResult?.stateByConversation[modelKey] : undefined;
  const modelView = modelKey ? modelResult?.viewByConversation[modelKey] : undefined;
  if (modelEvent && modelResult) {
    recordMessageReminderDiagnostic({
      event: "im.read.reduce",
      source: "gateway-im-side-effects",
      phase: "reduce",
      route: active ? "active_conversation" : "background_conversation",
      classification: {
        activeDecision: active,
        commands: modelResult.commands.map((command) => command.type),
        conversationId: modelEvent.conversationId,
        conversationType: modelEvent.conversationType,
        messageSeq:
          modelEvent.type === "gateway.message_received"
            ? modelEvent.message.conversationSeq
            : undefined,
        myReadSeqAfter: modelState?.myReadSeq,
        myReadSeqBefore: previousState?.myReadSeq,
        selfMessage,
        unreadAfter: modelView?.unreadCount,
        unreadBefore: previousState?.unreadCount,
      },
      summary: {
        commands: modelResult.commands,
      },
    });
  }

  const effectiveReadSeq = selfMessage
    ? Math.max(modelState?.myReadSeq ?? 0, normalizedGatewaySeq(message))
    : modelState?.myReadSeq;
  const effectiveUnreadCount = selfMessage ? 0 : modelView?.unreadCount;
  const effectiveModelState =
    selfMessage && modelState
      ? {
          ...modelState,
          myReadSeq: effectiveReadSeq ?? modelState.myReadSeq,
          unreadCount: 0,
        }
      : modelState;

  if (effectiveModelState) {
    readActions.upsertImReadState(effectiveModelState);
  }
  if (modelResult) {
    executeImCoreCommands(modelResult.commands, identity, queryClient);
  }

  applyImGatewayMessageCache(queryClient, {
    conversationId: message.conversationId,
    conversationType: imConversationType,
    message,
    unreadCount: effectiveUnreadCount,
    readSeq: effectiveReadSeq,
    payload,
    currentTenantId: workspaceScope.tenantId,
    scopeKey: workspaceScope.key,
  });
  recordMessageReminderDiagnostic({
    event: "im.cache.write",
    source: "gateway-im-side-effects",
    phase: "write",
    route: "messages",
    classification: {
      conversationId: message.conversationId,
      conversationType: imConversationType,
      messageSeq: message.conversationSeq,
      readSeq: effectiveReadSeq,
      selfMessage,
      unreadCount: effectiveUnreadCount,
    },
    summary: {
      message,
    },
  });
}

export function mergeReadEvent(
  queryClient: QueryClient,
  payload: Record<string, unknown>,
  identity: CurrentUserIdentity | null,
) {
  const event = imCoreEventFromGatewayReadForTest(payload);
  if (!event || event.type !== "gateway.read_received") return;

  const readSnapshot = getImReadSnapshot();
  const readActions = getImReadActions();
  const key = conversationKey(event.conversationType, event.conversationId);
  const previousState = readSnapshot.imReadStateByConversation[key];
  const result = reduceImCoreEvent({
    identity,
    stateByConversation: readSnapshot.imReadStateByConversation,
    event,
  });
  const nextState = result.stateByConversation[key];
  const nextView = result.viewByConversation[key];
  if (!nextState) return;

  readActions.upsertImReadState(nextState);

  const readerIds = readReceiptReaderIds(payload);
  const readerIsCurrentUser = readReceiptReaderIsCurrentUser(readerIds, identity);
  const clientObservedAt = new Date().toISOString();
  recordMessageReminderDiagnostic({
    event: "im.read.received",
    source: "gateway-im-side-effects",
    phase: "received",
    route: readerIsCurrentUser ? "current_user" : "peer_or_unknown",
    classification: {
      conversationId: event.conversationId,
      conversationType: event.conversationType,
      myReadSeqAfter: nextState.myReadSeq,
      myReadSeqBefore: previousState?.myReadSeq,
      peerReadSeqAfter: nextState.peerReadSeq,
      peerReadSeqBefore: previousState?.peerReadSeq,
      readSeq: event.readSeq,
      readerIds,
      readerIdentity: event.readerIdentity,
      readerIsCurrentUser,
      currentIdentity: identityDiagnostic(identity),
      unreadAfter: nextView?.unreadCount,
      unreadBefore: previousState?.unreadCount,
    },
    summary: {
      conversationId: event.conversationId,
      conversationType: event.conversationType,
      readSeq: event.readSeq,
      readerIds,
    },
  });
  logImReadDiagnostic({
    event: "im-read.gateway-receipt",
    phase: "received",
    result: "success",
    reason: "msg_read_received",
    context: {
      clientObservedAt,
      conversationId: event.conversationId,
      conversationType: event.conversationType,
      eventTime: readReceiptTime(payload),
      peerReadSeq: nextState.peerReadSeq,
      readSeq: event.readSeq,
      reader: readerIsCurrentUser ? "current_user" : readerIds.some(Boolean) ? "peer" : "unknown",
      route: "push",
      serverTime: readReceiptTime(payload),
    },
  });
  const peerReadSeq = nextState.peerReadSeq;
  const previousPeerReadSeq = previousState?.peerReadSeq ?? 0;
  const hasPeerReadUpdate = peerReadSeq > previousPeerReadSeq;

  if (hasPeerReadUpdate) {
    readActions.markImPeerReadReceipt(event.conversationId, peerReadSeq);
  }
  const workspaceScope = workspaceScopeFromSession(getAuthSessionSnapshot());
  applyImGatewayReadCache(queryClient, {
    conversationId: event.conversationId,
    readerIsCurrentUser,
    myReadSeq: nextState.myReadSeq,
    peerReadSeq,
    previousPeerReadSeq,
    identity,
    view: nextView,
    currentTenantId: workspaceScope.tenantId,
    scopeKey: workspaceScope.key,
  });
}

function readReceiptTime(payload: Record<string, unknown>) {
  return (
    stringDiagnosticField(
      payload,
      "eventTime",
      "event_time",
      "serverTime",
      "server_time",
      "readAt",
      "read_at",
      "timestamp",
      "createdAt",
      "created_at",
    ) || undefined
  );
}

function stringDiagnosticField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function identityDiagnostic(identity: CurrentUserIdentity | null) {
  return {
    displayName: identity?.displayName,
    lppId: identity?.lppId,
    platformUserId: identity?.platformUserId,
    userId: identity?.userId,
  };
}

function messageSenderDiagnostic(message: MessageItemDto) {
  return {
    direction: message.direction,
    fromUserId: message.fromUserId,
    isMine: message.isMine,
    isSelf: message.isSelf,
    lppId: message.lppId,
    platformUserId: message.platformUserId,
    senderDisplayName: message.senderDisplayName,
    senderId: message.senderId,
    senderLppId: message.senderLppId,
    senderPlatformUserId: message.senderPlatformUserId,
    senderUserId: message.senderUserId,
  };
}

function isSelfGatewayImMessage(
  message: MessageItemDto,
  identity: CurrentUserIdentity | null,
) {
  if (message.isSelf || message.isMine) return true;
  const direction = (message.direction ?? "").trim().toLowerCase();
  if (["out", "outgoing", "sent", "self"].includes(direction)) return true;
  return isSelfSenderAny(
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
  );
}

function normalizedGatewaySeq(message: MessageItemDto) {
  const seq = Number(message.conversationSeq ?? 0);
  return Number.isFinite(seq) && seq > 0 ? Math.floor(seq) : 0;
}

function executeImCoreCommands(
  commands: ImCoreCommand[],
  identity: AuthSession | null,
  queryClient: QueryClient,
) {
  const readActions = getImReadActions();
  for (const command of commands) {
    if (command.type === "mark_read" || command.type === "retry_pending_read") {
      recordMessageReminderDiagnostic({
        event: "im.read.command",
        source: "gateway-im-side-effects",
        phase: "execute",
        route: command.type,
        classification: {
          conversationId: command.conversationId,
          conversationType: command.conversationType,
          readSeq: command.readSeq,
        },
        summary: command,
      });
      readActions.markImConversationReadLocally(command.conversationId, command.readSeq);
      if (identity) {
        void requireApiClient(identity)
          .markConversationRead(
            command.conversationType,
            command.conversationId,
            command.readSeq,
          )
          .then(() => {
            readActions.clearPendingImRead(
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
      getReminderActions().dismissRealtimeRemindersForTarget(
        "messages",
        command.conversationId,
      );
    }
  }
}
