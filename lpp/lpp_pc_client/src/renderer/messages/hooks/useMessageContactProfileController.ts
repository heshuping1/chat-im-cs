import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, type QueryClient } from "@tanstack/react-query";

import type {
  ConversationListItem,
  FriendDto,
  FriendProfileUpdateDto,
} from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import { pcQueryKeys } from "../../data/query-keys";
import { requireApiClient } from "../../data/runtime";
import {
  resolveContactCardRelation,
  contactCardActionErrorText,
  type AnchoredContactCardProfile,
} from "../models/contactCardModel";

export function useMessageContactProfileController({
  activeConversation,
  activeConversationType,
  contactCardProfile,
  friends,
  queryClient,
  session,
  setContactCardProfile,
  setNotice,
}: {
  activeConversation?: ConversationListItem;
  activeConversationType?: "direct" | "group";
  contactCardProfile: AnchoredContactCardProfile | null;
  friends: FriendDto[];
  queryClient: QueryClient;
  session: AuthSession | null;
  setContactCardProfile: (profile: AnchoredContactCardProfile | null) => void;
  setNotice: (notice: string | null) => void;
}) {
  const [localOutgoingContactRequestIds, setLocalOutgoingContactRequestIds] =
    useState<Set<string>>(() => new Set());

  const contactCardProfileQuery = useQuery({
    queryKey: [
      "pc-user-profile",
      session?.apiBaseUrl,
      session?.tenantToken,
      contactCardProfile?.userId ?? "",
    ],
    enabled: Boolean(session && contactCardProfile?.userId),
    queryFn: async () => requireApiClient(session).getUserProfile(contactCardProfile!.userId),
    retry: false,
    staleTime: 60_000,
  });

  const friendRequestsQuery = useQuery({
    queryKey: ["pc-friend-requests", session?.apiBaseUrl, session?.tenantToken],
    enabled: Boolean(session),
    queryFn: async () => requireApiClient(session).getFriendRequests(),
    staleTime: 30_000,
  });

  const contactCardRelation = useMemo(() => {
    if (!contactCardProfile) return undefined;
    const relation = resolveContactCardRelation({
      card: contactCardProfile,
      friends,
      requests: friendRequestsQuery.data ?? [],
      session,
    });
    if (
      relation.status === "none" &&
      localOutgoingContactRequestIds.has(contactCardProfile.userId)
    ) {
      return { status: "outgoingPending" as const, requestId: "local" };
    }
    return relation;
  }, [
    contactCardProfile,
    friendRequestsQuery.data,
    friends,
    localOutgoingContactRequestIds,
    session,
  ]);

  const profileQuery = useQuery({
    queryKey: pcQueryKeys.customerServiceThreadProfile(
      session?.apiBaseUrl,
      session?.tenantToken,
      activeConversationType,
      activeConversation?.conversationId,
    ),
    enabled: Boolean(session && activeConversation && activeConversationType === "direct"),
    queryFn: async () =>
      requireApiClient(session).getThreadProfileCard(
        "im_direct",
        activeConversation!.conversationId,
      ),
    retry: false,
    staleTime: 60_000,
  });

  const activeFriendUserId = activeConversation?.peerUserId || "";
  const profileExtraQuery = useQuery({
    queryKey: pcQueryKeys.friendProfileExtra(
      session?.apiBaseUrl,
      session?.tenantToken,
      activeFriendUserId,
    ),
    enabled: Boolean(session && activeConversationType === "direct" && activeFriendUserId),
    queryFn: async () => requireApiClient(session).getFriendProfileExtra(activeFriendUserId),
    retry: false,
    staleTime: 60_000,
  });

  const refreshContactRelation = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["pc-friends"] }),
      queryClient.invalidateQueries({ queryKey: ["pc-friend-requests"] }),
      queryClient.invalidateQueries({
        queryKey: pcQueryKeys.accountBlocklist(session?.apiBaseUrl, session?.tenantToken),
      }),
      queryClient.invalidateQueries({
        queryKey: pcQueryKeys.imConversations(session?.apiBaseUrl, session?.tenantToken),
      }),
      queryClient.invalidateQueries({ queryKey: ["pc-user-profile"] }),
    ]);
  }, [queryClient, session?.apiBaseUrl, session?.tenantToken]);

  const deleteFriendMutation = useMutation({
    mutationFn: async (friendUserId: string) =>
      requireApiClient(session).deleteFriend(friendUserId),
    onSuccess: async () => {
      setNotice("已删除好友");
      await refreshContactRelation();
    },
    onError: (error) => setNotice(contactCardActionErrorText(error, "删除好友失败")),
  });

  const sendFriendRequestMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!contactCardProfile?.userId) throw new Error("名片缺少用户 ID");
      return requireApiClient(session).sendFriendRequest(contactCardProfile.userId, message);
    },
    onSuccess: async () => {
      const targetUserId = contactCardProfile?.userId;
      if (targetUserId) {
        setLocalOutgoingContactRequestIds((current) => new Set(current).add(targetUserId));
      }
      setNotice("好友申请已发送");
      await refreshContactRelation();
    },
    onError: (error) => setNotice(contactCardActionErrorText(error, "发送好友申请失败")),
  });

  const handleFriendRequestMutation = useMutation({
    mutationFn: async (payload: { action: "accept" | "reject"; requestId: string }) =>
      requireApiClient(session).handleFriendRequest(payload.requestId, payload.action),
    onSuccess: async (_result, payload) => {
      setNotice(payload.action === "accept" ? "已通过好友申请" : "已拒绝好友申请");
      await refreshContactRelation();
    },
    onError: (error) => setNotice(contactCardActionErrorText(error, "处理好友申请失败")),
  });

  const blockUserMutation = useMutation({
    mutationFn: async (userId: string) => requireApiClient(session).blockUser(userId),
    onSuccess: async () => {
      setNotice("已加入黑名单");
      setContactCardProfile(null);
      await refreshContactRelation();
    },
    onError: (error) => setNotice(contactCardActionErrorText(error, "加入黑名单失败")),
  });

  const updateFriendProfileMutation = useMutation({
    mutationFn: async ({
      friendUserId,
      payload,
    }: {
      friendUserId: string;
      payload: FriendProfileUpdateDto;
    }) => requireApiClient(session).updateFriendProfile(friendUserId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pc-friends"] }),
        queryClient.invalidateQueries({
          queryKey: pcQueryKeys.friendProfileExtra(
            session?.apiBaseUrl,
            session?.tenantToken,
            activeFriendUserId,
          ),
        }),
        queryClient.invalidateQueries({
          queryKey: pcQueryKeys.imConversations(session?.apiBaseUrl, session?.tenantToken),
        }),
      ]);
    },
    onError: (error) => setNotice(contactCardActionErrorText(error, "客户资料更新失败")),
  });

  const updateCustomerRemark = useCallback(
    async (note: string) => {
      if (!activeFriendUserId) throw new Error("当前客户缺少好友 ID，无法编辑备注");
      await updateFriendProfileMutation.mutateAsync({
        friendUserId: activeFriendUserId,
        payload: { note },
      });
    },
    [activeFriendUserId, updateFriendProfileMutation],
  );

  const updateCustomerTags = useCallback(
    async (tags: string[]) => {
      if (!activeFriendUserId) throw new Error("当前客户缺少好友 ID，无法编辑标签");
      await updateFriendProfileMutation.mutateAsync({
        friendUserId: activeFriendUserId,
        payload: { tags },
      });
    },
    [activeFriendUserId, updateFriendProfileMutation],
  );

  return {
    activeFriendUserId,
    blockUser: (userId: string) => blockUserMutation.mutate(userId),
    blockUserPending: blockUserMutation.isPending,
    acceptContactRequest: (requestId: string) =>
      handleFriendRequestMutation.mutate({ action: "accept", requestId }),
    contactCardActionPending:
      sendFriendRequestMutation.isPending ||
      handleFriendRequestMutation.isPending ||
      deleteFriendMutation.isPending ||
      blockUserMutation.isPending,
    contactCardRelation,
    contactCardProfileQuery,
    deleteFriend: (friendUserId: string) => deleteFriendMutation.mutate(friendUserId),
    deleteFriendPending: deleteFriendMutation.isPending,
    friendRequestsQuery,
    profileActionPending: updateFriendProfileMutation.isPending,
    profileExtraQuery,
    profileQuery,
    rejectContactRequest: (requestId: string) =>
      handleFriendRequestMutation.mutate({ action: "reject", requestId }),
    sendContactRequest: (message: string) => sendFriendRequestMutation.mutate(message),
    sendContactRequestPending: sendFriendRequestMutation.isPending,
    updateCustomerRemark,
    updateCustomerTags,
  };
}
