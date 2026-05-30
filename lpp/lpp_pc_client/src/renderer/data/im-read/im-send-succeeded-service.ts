import type { ConversationListItem, MessageItemDto } from "../api-client";
import type { AuthSession } from "../auth/auth-session";
import {
  conversationKey as imConversationKey,
  reduceImCoreEvent,
} from "../im-read-model";
import {
  getImReadActions,
  getImReadSnapshot,
} from "./im-read-store";
import { requireApiClient } from "../runtime";

export function applySendSucceededToImRead({
  conversation,
  conversationType,
  message,
  session,
}: {
  conversation: ConversationListItem;
  conversationType?: "direct" | "group";
  message: MessageItemDto;
  session: AuthSession | null;
}) {
  if (!conversationType || !message.conversationSeq) return;
  const readSnapshot = getImReadSnapshot();
  const readActions = getImReadActions();
  const result = reduceImCoreEvent({
    identity: session,
    stateByConversation: readSnapshot.imReadStateByConversation,
    event: {
      type: "send.message_succeeded",
      conversationId: conversation.conversationId,
      conversationType,
      message,
    },
  });
  const key = imConversationKey(conversationType, conversation.conversationId);
  const nextState = result.stateByConversation[key];
  if (nextState) {
    readActions.upsertImReadState(nextState);
  }
  for (const command of result.commands) {
    if (command.type !== "mark_read" && command.type !== "retry_pending_read") continue;
    readActions.markImConversationReadLocally(command.conversationId, command.readSeq);
    if (!session) continue;
    void requireApiClient(session)
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
      })
      .catch(() => undefined);
  }
}
