import { useCallback, useMemo, useState } from "react";
import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuthSession } from "../../data/auth/auth-store";
import { pcQueryKeys } from "../../data/query-keys";
import { requireApiClient } from "../../data/runtime";
import { useSetActiveImConversation } from "../../data/workspace-ui/workspace-ui-store";
import {
  contactCardActionErrorText,
  resolveUserRelation,
} from "../../messages/models/contactCardModel";
import { pendingIncomingFriendRequests } from "../models/friendRequestReminderModel";

export function useContactAddFriendController({
  onDirectChatCreated,
  setNotice,
}: {
  onDirectChatCreated?: (conversationId: string) => void;
  setNotice: (notice: string | null) => void;
}) {
  const session = useAuthSession();
  const queryClient = useQueryClient();
  const setActiveConversation = useSetActiveImConversation();
  const [localOutgoingUserIds, setLocalOutgoingUserIds] = useState<string[]>([]);
  const [pendingFriendRequestUserId, setPendingFriendRequestUserId] = useState("");

  const friendsQuery = useQuery({
    queryKey: ["pc-friends", session?.apiBaseUrl, session?.tenantToken],
    enabled: Boolean(session),
    queryFn: async () => requireApiClient(session).getFriends(),
  });

  const requestsQuery = useQuery({
    queryKey: ["pc-friend-requests", session?.apiBaseUrl, session?.tenantToken],
    enabled: Boolean(session),
    queryFn: async () => requireApiClient(session).getFriendRequests(),
  });

  const inviteQrsQuery = useQuery({
    queryKey: pcQueryKeys.accountInviteQrs(session?.apiBaseUrl, session?.tenantToken),
    enabled: Boolean(session),
    queryFn: async () => requireApiClient(session).getFriendInviteQrs(),
  });

  const searchUsersMutation = useMutation({
    mutationFn: async (searchKeyword: string) =>
      requireApiClient(session).searchUsers(searchKeyword),
    onError: (error) => setNotice(contactCardActionErrorText(error, "搜索用户失败")),
  });

  const createDirectChatMutation = useMutation({
    mutationFn: async (peerUserId: string) =>
      requireApiClient(session).createDirectChat(peerUserId),
    onSuccess: (chat) => {
      const conversationId = createdConversationId(chat);
      if (!conversationId) {
        setNotice("打开会话失败：服务端未返回会话 ID");
        return;
      }
      setActiveConversation(conversationId);
      onDirectChatCreated?.(conversationId);
    },
    onError: (error) => setNotice(contactCardActionErrorText(error, "打开会话失败")),
  });

  const sendFriendRequestMutation = useMutation({
    mutationFn: async ({
      message,
      userId,
    }: {
      message: string;
      userId: string;
    }) => requireApiClient(session).sendFriendRequest(userId, message),
    onMutate: (variables) => {
      setPendingFriendRequestUserId(variables.userId);
    },
    onSuccess: async (_result, variables) => {
      setLocalOutgoingUserIds((current) =>
        current.some((item) => sameId(item, variables.userId))
          ? current
          : [...current, variables.userId],
      );
      setNotice("好友申请已发送");
      await refreshContactRelations(queryClient, session);
    },
    onError: (error) => setNotice(contactCardActionErrorText(error, "发送好友申请失败")),
    onSettled: () => {
      setPendingFriendRequestUserId("");
    },
  });

  const requestMutation = useMutation({
    mutationFn: async ({
      requestId,
      action,
    }: {
      requestId: string;
      action: "accept" | "reject";
    }) => requireApiClient(session).handleFriendRequest(requestId, action),
    onSuccess: async (_result, variables) => {
      setNotice(variables.action === "accept" ? "已通过好友申请" : "已拒绝好友申请");
      await queryClient.invalidateQueries({ queryKey: ["pc-friend-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["pc-friends"] });
    },
    onError: (error) => setNotice(contactCardActionErrorText(error, "处理好友申请失败")),
  });

  const createInviteQrMutation = useMutation({
    mutationFn: async () => requireApiClient(session).createFriendInviteQr(),
    onSuccess: async () => {
      setNotice("好友二维码已生成");
      await queryClient.invalidateQueries({
        queryKey: pcQueryKeys.accountInviteQrs(session?.apiBaseUrl, session?.tenantToken),
      });
    },
    onError: (error) => setNotice(contactCardActionErrorText(error, "生成二维码失败")),
  });

  const pendingIncomingRequestCount = useMemo(
    () => pendingIncomingFriendRequests(requestsQuery.data ?? [], session?.userId).length,
    [requestsQuery.data, session?.userId],
  );

  const friends = friendsQuery.data ?? [];
  const friendRequests = requestsQuery.data ?? [];

  const contactRelation = useCallback(
    (targetUserId?: string | null) =>
      resolveUserRelation({
        friends,
        localOutgoingUserIds,
        requests: friendRequests,
        session,
        targetUserId,
      }),
    [friendRequests, friends, localOutgoingUserIds, session],
  );

  const searchUsers = (searchKeyword: string) => {
    const trimmedKeyword = searchKeyword.trim();
    if (!trimmedKeyword) {
      searchUsersMutation.reset();
      setNotice("请输入绿泡泡号、手机号或邮箱。");
      return;
    }
    searchUsersMutation.mutate(trimmedKeyword);
  };

  const sendFriendRequest = (userId: string, message: string) => {
    if (!userId) {
      setNotice("当前联系人缺少用户 ID，无法发送好友申请。");
      return;
    }
    sendFriendRequestMutation.mutate({ userId, message });
  };

  const handleRequest = (requestId: string, action: "accept" | "reject") => {
    if (!requestId) return;
    requestMutation.mutate({ requestId, action });
  };

  const openDirectMessage = (peerUserId: string) => {
    if (!peerUserId) return;
    createDirectChatMutation.mutate(peerUserId);
  };

  return {
    contactRelation,
    createDirectChatPending: createDirectChatMutation.isPending,
    createInviteQrPending: createInviteQrMutation.isPending,
    friendRequests,
    friends,
    friendsQuery,
    friendSearchError: searchUsersMutation.error,
    friendSearchLoading: searchUsersMutation.isPending,
    friendSearchResults: searchUsersMutation.data ?? [],
    handleRequest,
    inviteQrError: inviteQrsQuery.error,
    inviteQrLoading: inviteQrsQuery.isLoading,
    inviteQrs: inviteQrsQuery.data ?? [],
    onCreateInviteQr: () => createInviteQrMutation.mutate(),
    openDirectMessage,
    pendingFriendRequestUserId,
    pendingIncomingRequestCount,
    requestPending: requestMutation.isPending,
    requestsQuery,
    resetFriendSearch: () => searchUsersMutation.reset(),
    searchUsers,
    sendFriendRequest,
    sendFriendRequestPending: sendFriendRequestMutation.isPending,
  };
}

function createdConversationId(result: unknown) {
  if (!result || typeof result !== "object") return "";
  const record = result as Record<string, unknown>;
  for (const key of ["conversationId", "chatId", "groupId", "id"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function sameId(left?: string | null, right?: string | null) {
  return Boolean(left && right && left.trim().toLowerCase() === right.trim().toLowerCase());
}

export async function refreshContactRelations(
  queryClient: QueryClient,
  session: ReturnType<typeof useAuthSession>,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["pc-friends"] }),
    queryClient.invalidateQueries({ queryKey: ["pc-friend-requests"] }),
    queryClient.invalidateQueries({
      queryKey: pcQueryKeys.accountBlocklist(session?.apiBaseUrl, session?.tenantToken),
    }),
    queryClient.invalidateQueries({
      queryKey: pcQueryKeys.imConversations(session?.apiBaseUrl, session?.tenantToken),
    }),
  ]);
}
