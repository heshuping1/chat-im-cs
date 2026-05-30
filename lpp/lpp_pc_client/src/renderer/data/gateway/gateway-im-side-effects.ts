import type { QueryClient } from "@tanstack/react-query";
import type { AuthSession } from "../auth/auth-session";
import type { CurrentUserIdentity } from "../message-display";
import { readReceiptReaderIsCurrentUser } from "../read-receipts";
import { getAuthSessionSnapshot } from "../auth/auth-store";
import {
  getImReadActions,
  getImReadSnapshot,
} from "../im-read/im-read-store";
import {
  applyImGatewayMessageCache,
  applyImGatewayReadCache,
  isImEventMessage,
} from "./im-gateway-cache";
import { hasGatewayMessageQuery } from "./gateway-query-invalidation";
import {
  fallbackConversationIdFromPeer,
  gatewayMessage,
  imConversationId,
  imCoreEventFromGatewayMessageForTest,
  imCoreEventFromGatewayReadForTest,
  inferImConversationType,
  isCustomerServiceGatewayPayload,
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

export function mergeImGatewayMessage(
  queryClient: QueryClient,
  payload: Record<string, unknown>,
  fallbackConversationId: string,
  fallbackConversationType: string,
) {
  if (isCustomerServiceGatewayPayload(payload)) return;
  const fallbackId =
    fallbackConversationId || imConversationId(payload) || fallbackConversationIdFromPeer(payload);
  const message = gatewayMessage(payload, fallbackId);
  const identity = getAuthSessionSnapshot();
  const readSnapshot = getImReadSnapshot();
  const readActions = getImReadActions();
  const eventMessage = isImEventMessage(message);
  if (!message.conversationId) {
    return;
  }
  const imConversationType =
    inferImConversationType(payload, fallbackConversationType) || "direct";
  const uiState = getWorkspaceUiSnapshot();
  const active =
    uiState.activeModule === "messages" &&
    (uiState.activeImConversationId
      ? uiState.activeImConversationId === message.conversationId
      : hasGatewayMessageQuery(queryClient, message.conversationId));
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

  if (modelState) {
    readActions.upsertImReadState(modelState);
  }
  if (modelResult) {
    executeImCoreCommands(modelResult.commands, identity, queryClient);
  }

  applyImGatewayMessageCache(queryClient, {
    conversationId: message.conversationId,
    conversationType: imConversationType,
    message,
    unreadCount: modelView?.unreadCount,
    readSeq: modelState ? modelState.myReadSeq : undefined,
    payload,
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
  const peerReadSeq = nextState.peerReadSeq;
  const previousPeerReadSeq = previousState?.peerReadSeq ?? 0;
  const hasPeerReadUpdate = peerReadSeq > previousPeerReadSeq;

  if (hasPeerReadUpdate) {
    readActions.markImPeerReadReceipt(event.conversationId, peerReadSeq);
  }
  applyImGatewayReadCache(queryClient, {
    conversationId: event.conversationId,
    readerIsCurrentUser,
    myReadSeq: nextState.myReadSeq,
    peerReadSeq,
    previousPeerReadSeq,
    identity,
    view: nextView,
  });
}

function executeImCoreCommands(
  commands: ImCoreCommand[],
  identity: AuthSession | null,
  queryClient: QueryClient,
) {
  const readActions = getImReadActions();
  for (const command of commands) {
    if (command.type === "mark_read" || command.type === "retry_pending_read") {
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
