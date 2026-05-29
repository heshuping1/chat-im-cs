import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ConversationListItem, GroupMemberDto } from "../../data/api-client";
import type { AuthSession } from "../../data/store";
import {
  generateGroupAvatarSnapshot,
  getGroupAvatarSnapshot,
  getGroupAvatarSnapshotDataUrlSync,
  groupAvatarSnapshotKey,
  putGroupAvatarSnapshot,
} from "../../lib/groupAvatarSnapshot";
import type { GroupAvatarCell } from "../components/ConversationListParts";

type ConversationType = "direct" | "group" | undefined;

export function useGroupAvatarSnapshots({
  activeConversation,
  activeConversationType,
  activeGroupMembers,
  getConversationType,
  groupCompositeAvatarAllowed,
  groupCompositeAvatarCells,
  session,
  visibleConversations,
}: {
  activeConversation?: ConversationListItem;
  activeConversationType?: ConversationType;
  activeGroupMembers?: GroupMemberDto[];
  getConversationType: (conversation?: ConversationListItem) => ConversationType;
  groupCompositeAvatarAllowed: (conversation: ConversationListItem) => boolean;
  groupCompositeAvatarCells: (
    conversation: ConversationListItem,
    members?: GroupMemberDto[],
  ) => GroupAvatarCell[];
  session: AuthSession | null;
  visibleConversations: ConversationListItem[];
}) {
  const [snapshots, setSnapshots] = useState<Record<string, string>>({});
  const loadsRef = useRef(new Set<string>());
  const generationsRef = useRef(new Set<string>());
  const identity = useMemo(
    () => ({
      accountId:
        session?.userId ||
        session?.platformUserId ||
        session?.lppId ||
        "anonymous",
      tenantId: session?.tenantId || session?.apiBaseUrl || "default",
    }),
    [session?.apiBaseUrl, session?.lppId, session?.platformUserId, session?.tenantId, session?.userId],
  );

  useEffect(() => {
    setSnapshots({});
    loadsRef.current.clear();
    generationsRef.current.clear();
  }, [identity.accountId, identity.tenantId]);

  useEffect(() => {
    visibleConversations.forEach((conversation) => {
      if (getConversationType(conversation) !== "group") return;
      const key = groupAvatarSnapshotKey({
        ...identity,
        conversationId: conversation.conversationId,
      });
      if (
        snapshots[conversation.conversationId] ||
        getGroupAvatarSnapshotDataUrlSync(key) ||
        loadsRef.current.has(key)
      ) {
        return;
      }
      loadsRef.current.add(key);
      void getGroupAvatarSnapshot(key)
        .then((entry) => {
          if (!entry?.dataUrl) return;
          setSnapshots((current) =>
            current[conversation.conversationId] === entry.dataUrl
              ? current
              : { ...current, [conversation.conversationId]: entry.dataUrl },
          );
        })
        .catch(() => {
          loadsRef.current.delete(key);
        });
    });
  }, [getConversationType, identity, snapshots, visibleConversations]);

  useEffect(() => {
    if (
      !activeConversation?.conversationId ||
      activeConversationType !== "group" ||
      !activeGroupMembers ||
      !groupCompositeAvatarAllowed(activeConversation)
    ) {
      return;
    }
    const cells = groupCompositeAvatarCells(activeConversation, activeGroupMembers);
    if (cells.length === 0) return;
    const key = groupAvatarSnapshotKey({
      ...identity,
      conversationId: activeConversation.conversationId,
    });
    const generationKey = `${key}:${cells
      .map((cell) => `${cell.avatarUrl || ""}|${cell.name}`)
      .join(";")}`;
    if (generationsRef.current.has(generationKey)) return;
    generationsRef.current.add(generationKey);
    void generateGroupAvatarSnapshot({
      assetBaseUrl: session?.apiBaseUrl,
      cells,
      token: session?.tenantToken,
    })
      .then(async (snapshot) => {
        await putGroupAvatarSnapshot({
          dataUrl: snapshot.dataUrl,
          generatedAt: Date.now(),
          key,
          memberCount: snapshot.memberCount,
        });
        setSnapshots((current) =>
          current[activeConversation.conversationId] === snapshot.dataUrl
            ? current
            : { ...current, [activeConversation.conversationId]: snapshot.dataUrl },
        );
      })
      .catch(() => {
        // Keep the previous local snapshot if a member avatar cannot be loaded.
      });
  }, [
    activeConversation,
    activeConversationType,
    activeGroupMembers,
    groupCompositeAvatarAllowed,
    groupCompositeAvatarCells,
    identity,
    session?.apiBaseUrl,
    session?.tenantToken,
  ]);

  const snapshotFor = useCallback(
    (conversation?: ConversationListItem) => {
      if (!conversation || getConversationType(conversation) !== "group") return undefined;
      const key = groupAvatarSnapshotKey({
        ...identity,
        conversationId: conversation.conversationId,
      });
      return snapshots[conversation.conversationId] ?? getGroupAvatarSnapshotDataUrlSync(key) ?? undefined;
    },
    [getConversationType, identity, snapshots],
  );

  return { groupAvatarSnapshotFor: snapshotFor, groupAvatarSnapshots: snapshots };
}
