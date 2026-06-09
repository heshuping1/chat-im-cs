import type { QueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";

import type { ConversationListItem, MessageItemDto } from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import {
  conversationKey as imConversationKey,
  type ConversationReadState,
} from "../../data/im-read-model";
import { logImReadDiagnostic } from "../../data/im-read/im-read-diagnostics";
import { getImReadSnapshot } from "../../data/im-read/im-read-store";
import { reduceMessageCoreEvent } from "../../data/message-core/message-core";
import {
  getImMessageStore,
  imMessageScopeKey,
} from "../../data/message-store/im-message-store";
import type { CurrentUserIdentity } from "../../data/message-display";
import { latestPendingDirectReadReceiptSeq } from "../../data/read-receipts";
import {
  activeDirectReadStatusFastTrackIntervalMs,
  activeDirectReadStatusFastTrackWindowMs,
} from "../models/imReadReceiptPolicy";
import { getImConversationType } from "./useMessageCenterViewModel";

export function useDirectReadReceiptSync({
  activeConversation,
  activeConversationType,
  directReadStatus,
  directReadStatusRefetch,
  markImPeerReadReceipt,
  messages,
  peerReadSeq,
  queryClient,
  session,
  unreadIdentity,
  upsertImReadState,
}: {
  activeConversation?: ConversationListItem;
  activeConversationType: ReturnType<typeof getImConversationType>;
  directReadStatus?: { peerLastReadSeq?: number | string | null };
  directReadStatusRefetch?: () => Promise<unknown> | unknown;
  markImPeerReadReceipt: (conversationId: string, readSeq: number) => void;
  messages: MessageItemDto[];
  peerReadSeq?: number;
  queryClient: QueryClient;
  session: AuthSession | null;
  unreadIdentity: CurrentUserIdentity | null;
  upsertImReadState: (state: ConversationReadState) => void;
}) {
  const latestMessagesRef = useRef(messages);
  useEffect(() => {
    latestMessagesRef.current = messages;
  }, [messages]);
  const pendingDirectReadSeq = useMemo(
    () =>
      activeConversationType === "direct"
        ? latestPendingDirectReadReceiptSeq({
            identity: unreadIdentity,
            messages,
            peerReadSeq,
          })
        : 0,
    [activeConversationType, messages, peerReadSeq, unreadIdentity],
  );

  useEffect(() => {
    if (
      !activeConversation ||
      activeConversationType !== "direct" ||
      pendingDirectReadSeq <= 0 ||
      !directReadStatusRefetch
    ) {
      return undefined;
    }
    const key = imConversationKey("direct", activeConversation.conversationId);
    const startedAt = Date.now();
    let stopped = false;
    const interval = window.setInterval(() => {
      if (stopped) return;
      if (!shouldContinue()) {
        stop();
        return;
      }
      refetch();
    }, activeDirectReadStatusFastTrackIntervalMs());
    const stop = () => {
      stopped = true;
      window.clearInterval(interval);
    };
    const refetch = () => {
      void directReadStatusRefetch();
    };
    const shouldContinue = () => {
      const currentPeerReadSeq =
        getImReadSnapshot().imReadStateByConversation[key]?.peerReadSeq ?? peerReadSeq ?? 0;
      return (
        Date.now() - startedAt < activeDirectReadStatusFastTrackWindowMs() &&
        latestPendingDirectReadReceiptSeq({
          identity: unreadIdentity,
          messages: latestMessagesRef.current,
          peerReadSeq: currentPeerReadSeq,
        }) > 0
      );
    };

    refetch();
    return stop;
  }, [
    activeConversation,
    activeConversationType,
    directReadStatusRefetch,
    peerReadSeq,
    pendingDirectReadSeq,
    unreadIdentity,
  ]);

  useEffect(() => {
    if (
      !activeConversation ||
      activeConversationType !== "direct" ||
      !directReadStatus
    ) {
      return;
    }
    const peerReadSeq = Math.max(
      0,
      Math.floor(Number(directReadStatus.peerLastReadSeq ?? 0)),
    );
    if (peerReadSeq <= 0) return;

    const key = imConversationKey("direct", activeConversation.conversationId);
    const currentReadState = getImReadSnapshot().imReadStateByConversation[key];
    const previousPeerReadSeq = currentReadState?.peerReadSeq ?? 0;
    if (previousPeerReadSeq >= peerReadSeq) {
      markImPeerReadReceipt(activeConversation.conversationId, peerReadSeq);
      logImReadDiagnostic({
        event: "im-read.read-status-merge",
        phase: "merge",
        result: "skipped",
        reason: "peer_read_not_advanced",
        context: {
          cacheUpdated: false,
          conversationId: activeConversation.conversationId,
          conversationType: "direct",
          peerReadSeq,
          previousPeerReadSeq,
          route: "query",
        },
      });
      return;
    }

    markImPeerReadReceipt(activeConversation.conversationId, peerReadSeq);
    upsertImReadState({
      conversationKey: key,
      conversationId: activeConversation.conversationId,
      conversationType: "direct",
      myReadSeq: currentReadState?.myReadSeq ?? activeConversation.lastReadSeq ?? 0,
      peerReadSeq,
      lastMessageSeq: Math.max(
        currentReadState?.lastMessageSeq ?? 0,
        activeConversation.lastMessageSeq ?? 0,
      ),
      unreadCount: currentReadState?.unreadCount ?? activeConversation.unreadCount ?? 0,
      pendingReadSeq: currentReadState?.pendingReadSeq,
      updatedAt: Date.now(),
    });
    queryClient.setQueriesData<MessageItemDto[]>(
      {
        predicate: (query) =>
          query.queryKey[0] === "pc-im-messages" &&
          query.queryKey.includes(activeConversation.conversationId),
      },
      (old) =>
        old
          ? reduceMessageCoreEvent(
              { messages: old },
              {
                type: "read.updated",
                conversationId: activeConversation.conversationId,
                conversationType: "direct",
                readSeq: currentReadState?.myReadSeq ?? activeConversation.lastReadSeq ?? 0,
                peerReadSeq,
                identity: unreadIdentity,
              },
            ).state.messages
          : old,
    );
    if (session) {
      void getImMessageStore().applyReadMetadata(
        imMessageScopeKey(session),
        "direct",
        activeConversation.conversationId,
        {
          identity: unreadIdentity,
          peerReadSeq,
          readSeq: currentReadState?.myReadSeq ?? activeConversation.lastReadSeq ?? 0,
        },
      );
    }
    logImReadDiagnostic({
      event: "im-read.read-status-merge",
      phase: "merge",
      result: "success",
      reason: "peer_read_advanced",
      context: {
        cacheUpdated: true,
        conversationId: activeConversation.conversationId,
        conversationType: "direct",
        peerReadSeq,
        previousPeerReadSeq,
        route: "query",
      },
    });
  }, [
    activeConversation,
    activeConversationType,
    directReadStatus,
    markImPeerReadReceipt,
    queryClient,
    session,
    unreadIdentity,
    upsertImReadState,
  ]);
}
