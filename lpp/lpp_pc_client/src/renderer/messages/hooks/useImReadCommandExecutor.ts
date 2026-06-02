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
import { recordMessageReminderDiagnostic } from "../../data/diagnostics/message-reminder-diagnostics";
import { useActiveModule } from "../../data/workspace-ui/workspace-ui-store";
import type { MessageLayoutMode } from "../../data/workspace-ui/workspace-ui-store";
import { requireApiClient } from "../../data/runtime";
import { formatError } from "../../lib/format";
import { applyConversationReadToCache } from "../models/messageCacheMutationModel";
import type { UnreadJumpState } from "../models/messageDisplayModel";
import { getImConversationType } from "./useMessageCenterViewModel";
import type { ActiveImConversationSource } from "./useMessageUnreadJumpController";

export type ActiveImConversationVisibility = "hidden" | "listOnly" | "paneVisible";

export function useImReadCommandExecutor({
  activeConversation,
  activeConversationId,
  activeConversationSource,
  activeConversationVisibility,
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
  activeConversationSource: ActiveImConversationSource;
  activeConversationVisibility: ActiveImConversationVisibility;
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
  const activeModule = useActiveModule();
  const executeImCoreCommands = useCallback(
    (commands: ImCoreCommand[], reason: string) => {
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
        recordMessageReminderDiagnostic({
          event: "im.ui.read.command",
          source: "use-im-read-command-executor",
          phase: "execute",
          route: command.type,
          classification: {
            activeConversationId,
            activeConversationSource,
            activeConversationVisibility,
            activeModule,
            commandReason: reason,
            conversationId: command.conversationId,
            conversationType: command.conversationType,
            readSeq: nextReadSeq,
          },
          summary: command,
        });
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
      activeConversationId,
      activeConversationSource,
      activeConversationVisibility,
      activeModule,
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
    const canAutoRead = canAutoReadImConversation({
      activeConversationId,
      activeConversationSource,
      activeConversationVisibility,
      conversationId: activeConversation?.conversationId,
      messagesLength: messages.length,
    });
    recordMessageReminderDiagnostic({
      event: "im.ui.visibility.resolve",
      source: "use-im-read-command-executor",
      phase: "resolve",
      route: activeConversationVisibility,
      classification: {
        activeConversationId,
        activeConversationSource,
        activeConversationVisibility,
        activeModule,
        conversationId: activeConversation?.conversationId,
        markReadAllowed: canAutoRead,
        messagesLoaded: messages.length > 0,
      },
      summary: {
        activeConversation,
      },
    });
    recordMessageReminderDiagnostic({
      event: "im.ui.read.evaluate",
      source: "use-im-read-command-executor",
      phase: "evaluate",
      route: canAutoRead ? "allow" : "skip",
      classification: {
      activeConversationId,
      activeConversationSource,
      activeConversationVisibility,
      activeModule,
        conversationId: activeConversation?.conversationId,
        conversationType: activeConversationType,
        lastMessageSeq: activeConversation?.lastMessageSeq,
        lastReadSeq: activeConversation?.lastReadSeq,
        messagesLength: messages.length,
        visibility: activeConversationVisibility,
        reason: canAutoRead ? "user-visible-conversation" : "not-user-visible-conversation",
      },
      summary: {
        activeConversation,
      },
    });
    if (!activeConversation || !session || !activeConversationType) return;
    if (!canAutoRead) return;
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
      executeImCoreCommands(result.commands, "ui.conversation_opened");
    }
  }, [
    activeConversation,
    activeConversationId,
    activeConversationSource,
    activeConversationVisibility,
    activeModule,
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
      recordMessageReminderDiagnostic({
        event: "im.api.snapshot.reduce",
        source: "use-im-read-command-executor",
        phase: "reduce",
        route: "conversation-list",
        classification: {
          activeConversationId,
          activeConversationSource,
          activeConversationVisibility,
          activeModule,
          commands: result.commands.map((command) => command.type),
          conversationId: conversation.conversationId,
          conversationType,
          lastMessageSeq: conversation.lastMessageSeq,
          lastReadSeq: conversation.lastReadSeq,
          myReadSeqAfter: nextState?.myReadSeq,
          myReadSeqBefore: stateByConversation[key]?.myReadSeq,
          unreadAfter: result.viewByConversation[key]?.unreadCount,
          unreadBefore: stateByConversation[key]?.unreadCount,
          serverUnread: conversation.unreadCount ?? 0,
        },
        summary: {
          conversation,
        },
      });
      if (nextState && readStateMeaningfullyChanged(stateByConversation[key], nextState)) {
        upsertImReadState(nextState);
      }
      if (result.commands.length > 0) {
        executeImCoreCommands(result.commands, "api.conversation_snapshot");
      }
      stateByConversation = result.stateByConversation;
    }
  }, [
    conversationItems,
    executeImCoreCommands,
    activeConversationId,
    activeConversationSource,
    activeConversationVisibility,
    activeModule,
    session,
    unreadIdentity,
    upsertImReadState,
  ]);

  return executeImCoreCommands;
}

export function canAutoReadImConversation(input: {
  activeConversationId: string | null | undefined;
  activeConversationSource: ActiveImConversationSource;
  activeConversationVisibility: ActiveImConversationVisibility;
  conversationId?: string | null;
  messagesLength: number;
}) {
  return Boolean(
    input.activeConversationVisibility === "paneVisible" &&
      input.activeConversationId &&
      input.conversationId &&
      input.activeConversationId === input.conversationId &&
      input.messagesLength > 0,
  );
}

export function resolveActiveImConversationVisibility(input: {
  activeConversationId?: string | null;
  activeModule?: string | null;
  conversationDrawerOpen: boolean;
  conversationId?: string | null;
  messageLayoutMode: MessageLayoutMode;
}): ActiveImConversationVisibility {
  if (
    input.activeModule !== "messages" ||
    !input.activeConversationId ||
    !input.conversationId ||
    input.activeConversationId !== input.conversationId
  ) {
    return "hidden";
  }
  if (input.messageLayoutMode === "chat-focus" && input.conversationDrawerOpen) {
    return "listOnly";
  }
  return "paneVisible";
}
