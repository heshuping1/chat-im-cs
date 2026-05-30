import type { QueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { ConversationListItem, MessageItemDto } from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import { isImConversation, type CurrentUserIdentity } from "../../data/message-display";
import {
  conversationKey as imConversationKey,
  reduceImCoreEvent,
  type ConversationReadState,
  type ImCoreCommand,
  type ImConversationType,
} from "../../data/im-read-model";
import {
  getImReadSnapshot,
} from "../../data/im-read/im-read-store";
import { readStateMeaningfullyChanged } from "../../data/im-read/im-read-view-model";
import { requireApiClient } from "../../data/runtime";
import { formatError } from "../../lib/format";
import { applyConversationReadToCache } from "../models/messageCacheMutationModel";
import type { UnreadJumpState } from "../models/messageDisplayModel";
import { getImConversationType } from "./useMessageCenterViewModel";

export function useImReadCommandExecutor({
  activeConversation,
  activeConversationId,
  activeConversationType,
  clearPendingImRead,
  conversationItems,
  dismissRealtimeRemindersForTarget,
  markConversationReadLocally,
  messages,
  queryClient,
  session,
  setNotice,
  setUnreadJump,
  unreadIdentity,
  upsertImReadState,
}: {
  activeConversation: ConversationListItem | undefined;
  activeConversationId: string | null;
  activeConversationType: ReturnType<typeof getImConversationType>;
  clearPendingImRead: (
    conversationType: ImConversationType,
    conversationId: string,
    readSeq: number,
  ) => void;
  conversationItems: ConversationListItem[];
  dismissRealtimeRemindersForTarget: (targetModule: "messages", targetId?: string) => void;
  markConversationReadLocally: (conversationId: string, readSeq: number) => void;
  messages: MessageItemDto[];
  queryClient: QueryClient;
  session: AuthSession | null;
  setNotice: (notice: string | null) => void;
  setUnreadJump: Dispatch<SetStateAction<UnreadJumpState | null>>;
  unreadIdentity: CurrentUserIdentity | null;
  upsertImReadState: (state: ConversationReadState) => void;
}) {
  const executeImCoreCommands = useCallback(
    (commands: ImCoreCommand[]) => {
      commands.forEach((command) => {
        if (command.type === "log_diagnostic") return;
        if (command.type === "clear_new_message_jump") {
          setUnreadJump((current) =>
            current?.conversationId === command.conversationId ? null : current,
          );
          dismissRealtimeRemindersForTarget("messages", command.conversationId);
          return;
        }

        const nextReadSeq = Math.max(0, Math.floor(command.readSeq));
        if (nextReadSeq <= 0) return;
        const key = imConversationKey(command.conversationType, command.conversationId);
        const currentReadState = getImReadSnapshot().imReadStateByConversation[key];
        upsertImReadState({
          conversationKey: key,
          conversationId: command.conversationId,
          conversationType: command.conversationType,
          myReadSeq: Math.max(currentReadState?.myReadSeq ?? 0, nextReadSeq),
          peerReadSeq: currentReadState?.peerReadSeq ?? 0,
          lastMessageSeq: Math.max(currentReadState?.lastMessageSeq ?? 0, nextReadSeq),
          unreadCount: 0,
          pendingReadSeq: nextReadSeq,
          updatedAt: Date.now(),
        });
        if (command.conversationType === "direct") {
          markConversationReadLocally(command.conversationId, nextReadSeq);
        }
        applyConversationReadToCache(
          queryClient,
          command.conversationId,
          nextReadSeq,
        );
        setUnreadJump((current) =>
          current?.conversationId === command.conversationId ? null : current,
        );
        dismissRealtimeRemindersForTarget("messages", command.conversationId);
        if (!session) return;
        void requireApiClient(session)
          .markConversationRead(
            command.conversationType,
            command.conversationId,
            nextReadSeq,
          )
          .then(() => {
            clearPendingImRead(
              command.conversationType,
              command.conversationId,
              nextReadSeq,
            );
            return queryClient.invalidateQueries({ queryKey: ["pc-im-conversations"] });
          })
          .catch((error) => {
            setNotice(`已在本机标记已读；服务端同步失败：${formatError(error)}`);
          });
      });
    },
    [
      clearPendingImRead,
      dismissRealtimeRemindersForTarget,
      markConversationReadLocally,
      queryClient,
      session,
      setNotice,
      setUnreadJump,
      upsertImReadState,
    ],
  );

  useEffect(() => {
    if (!activeConversation || !session || !activeConversationType) return;
    if (activeConversationId !== activeConversation.conversationId) return;
    if (messages.length === 0) return;
    const key = imConversationKey(
      activeConversationType,
      activeConversation.conversationId,
    );
    const stateByConversation = getImReadSnapshot().imReadStateByConversation;
    const result = reduceImCoreEvent({
      identity: unreadIdentity,
      stateByConversation,
      event: {
        type: "ui.conversation_opened",
        conversationId: activeConversation.conversationId,
        conversationType: activeConversationType,
        loadedMessages: messages,
        conversation: {
          lastMessageSeq: activeConversation.lastMessageSeq ?? 0,
          myReadSeq: activeConversation.lastReadSeq ?? 0,
        },
      },
    });
    const nextState = result.stateByConversation[key];
    if (nextState && readStateMeaningfullyChanged(stateByConversation[key], nextState)) {
      upsertImReadState(nextState);
    }
    if (result.commands.length > 0) {
      executeImCoreCommands(result.commands);
    }
  }, [
    activeConversation,
    activeConversationId,
    activeConversationType,
    executeImCoreCommands,
    messages,
    session,
    unreadIdentity,
    upsertImReadState,
  ]);

  useEffect(() => {
    if (!session || !unreadIdentity) return;
    if (conversationItems.length === 0) return;
    let stateByConversation = getImReadSnapshot().imReadStateByConversation;
    for (const conversation of conversationItems) {
      if (!isImConversation(conversation)) continue;
      const conversationType = getImConversationType(conversation);
      if (!conversationType) continue;
      const key = imConversationKey(conversationType, conversation.conversationId);
      const result = reduceImCoreEvent({
        identity: unreadIdentity,
        stateByConversation,
        event: {
          type: "api.conversation_snapshot",
          conversationId: conversation.conversationId,
          conversationType,
          conversation: {
            myReadSeq: conversation.lastReadSeq ?? 0,
            peerReadSeq: conversation.peerReadSeq ?? 0,
            lastMessageSeq: conversation.lastMessageSeq ?? 0,
            unreadCount: conversation.unreadCount ?? 0,
          },
        },
      });
      const nextState = result.stateByConversation[key];
      if (nextState && readStateMeaningfullyChanged(stateByConversation[key], nextState)) {
        upsertImReadState(nextState);
      }
      if (result.commands.length > 0) {
        executeImCoreCommands(result.commands);
      }
      stateByConversation = result.stateByConversation;
    }
  }, [
    conversationItems,
    executeImCoreCommands,
    session,
    unreadIdentity,
    upsertImReadState,
  ]);

  return executeImCoreCommands;
}
