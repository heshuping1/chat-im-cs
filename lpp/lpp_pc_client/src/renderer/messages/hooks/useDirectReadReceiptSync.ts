import type { QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import type { ConversationListItem, MessageItemDto } from "../../data/api-client";
import {
  conversationKey as imConversationKey,
  type ConversationReadState,
} from "../../data/im-read-model";
import { getImReadSnapshot } from "../../data/im-read/im-read-store";
import type { CurrentUserIdentity } from "../../data/message-display";
import { applyDirectReadReceiptToMessages } from "../../data/read-receipts";
import { getImConversationType } from "./useMessageCenterViewModel";

export function useDirectReadReceiptSync({
  activeConversation,
  activeConversationType,
  directReadStatus,
  markImPeerReadReceipt,
  queryClient,
  unreadIdentity,
  upsertImReadState,
}: {
  activeConversation?: ConversationListItem;
  activeConversationType: ReturnType<typeof getImConversationType>;
  directReadStatus?: { peerLastReadSeq?: number | string | null };
  markImPeerReadReceipt: (conversationId: string, readSeq: number) => void;
  queryClient: QueryClient;
  unreadIdentity: CurrentUserIdentity | null;
  upsertImReadState: (state: ConversationReadState) => void;
}) {
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
    if ((currentReadState?.peerReadSeq ?? 0) >= peerReadSeq) return;

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
          ? applyDirectReadReceiptToMessages(old, peerReadSeq, unreadIdentity)
          : old,
    );
  }, [
    activeConversation,
    activeConversationType,
    directReadStatus,
    markImPeerReadReceipt,
    queryClient,
    unreadIdentity,
    upsertImReadState,
  ]);
}
