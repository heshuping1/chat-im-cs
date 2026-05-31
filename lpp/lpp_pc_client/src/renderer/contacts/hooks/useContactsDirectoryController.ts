import { useMemo } from "react";
import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type { DepartmentMemberDto, FriendRequestDto } from "../../data/api-client";
import { useAuthSession } from "../../data/auth/auth-store";
import {
  filterContacts,
  filterRequests,
  mapContacts,
  normalizeContactDirectoryFilter,
} from "../../data/contact-directory";
import { pcQueryKeys } from "../../data/query-keys";
import { requireApiClient } from "../../data/runtime";
import type { ContactFilter, ContactItem } from "../../data/types";
import { useSetActiveImConversation } from "../../data/workspace-ui/workspace-ui-store";
import { formatError } from "../../lib/format";

export function useContactsDirectoryController({
  contactFilter,
  keyword,
  selectedRequestId,
  setNotice,
}: {
  contactFilter: ContactFilter;
  keyword: string;
  selectedRequestId: string;
  setNotice: (notice: string | null) => void;
}) {
  const session = useAuthSession();
  const setActiveConversation = useSetActiveImConversation();
  const queryClient = useQueryClient();

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
  const membersQuery = useQuery({
    queryKey: ["pc-tenant-members", session?.apiBaseUrl, session?.tenantToken],
    enabled: Boolean(session),
    queryFn: async () => requireApiClient(session).getTenantMembers(),
  });
  const departmentsQuery = useQuery({
    queryKey: ["pc-departments", session?.apiBaseUrl, session?.tenantToken],
    enabled: Boolean(session),
    queryFn: async () => requireApiClient(session).getDepartments(),
  });
  const conversationsQuery = useQuery({
    queryKey: pcQueryKeys.imConversations(session?.apiBaseUrl, session?.tenantToken),
    enabled: Boolean(session),
    queryFn: async () => requireApiClient(session).getConversations({ limit: 100 }),
  });
  const inviteQrsQuery = useQuery({
    queryKey: pcQueryKeys.accountInviteQrs(session?.apiBaseUrl, session?.tenantToken),
    enabled: Boolean(
      session && normalizeContactDirectoryFilter(contactFilter) === "requests",
    ),
    queryFn: async () => requireApiClient(session).getFriendInviteQrs(),
  });
  const departmentMembersQueries = useQuery({
    queryKey: [
      "pc-department-members-bundle",
      session?.apiBaseUrl,
      session?.tenantToken,
      departmentsQuery.data?.map((item) => item.departmentId).join(","),
    ],
    enabled: Boolean(session && departmentsQuery.data?.length),
    queryFn: async () => {
      const client = requireApiClient(session);
      const entries = await Promise.all(
        (departmentsQuery.data ?? []).map(async (department) => [
          department.departmentId,
          await client.getDepartmentMembers(department.departmentId).catch(
            () => [] as DepartmentMemberDto[],
          ),
        ] as const),
      );
      return Object.fromEntries(entries) as Record<string, DepartmentMemberDto[]>;
    },
  });

  const createDirectChatMutation = useMutation({
    mutationFn: async (peerUserId: string) =>
      requireApiClient(session).createDirectChat(peerUserId),
    onSuccess: (chat) => setActiveConversation(chat.chatId),
    onError: (error) => setNotice(`打开会话失败：${formatError(error)}`),
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
    onError: (error) => setNotice(`处理申请失败：${formatError(error)}`),
  });
  const deleteFriendMutation = useMutation({
    mutationFn: async (friendUserId: string) =>
      requireApiClient(session).deleteFriend(friendUserId),
    onSuccess: async () => {
      setNotice("已删除好友");
      await refreshContactRelations(queryClient, session);
    },
    onError: (error) => setNotice(`删除好友失败：${formatError(error)}`),
  });
  const blockUserMutation = useMutation({
    mutationFn: async (userId: string) => requireApiClient(session).blockUser(userId),
    onSuccess: async () => {
      setNotice("已加入黑名单");
      await refreshContactRelations(queryClient, session);
    },
    onError: (error) => setNotice(`加入黑名单失败：${formatError(error)}`),
  });
  const createInviteQrMutation = useMutation({
    mutationFn: async () => requireApiClient(session).createFriendInviteQr(),
    onSuccess: async () => {
      setNotice("好友二维码已生成");
      await queryClient.invalidateQueries({
        queryKey: pcQueryKeys.accountInviteQrs(session?.apiBaseUrl, session?.tenantToken),
      });
    },
    onError: (error) => setNotice(`生成二维码失败：${formatError(error)}`),
  });

  const directoryContacts = useMemo(
    () =>
      mapContacts({
        friends: friendsQuery.data ?? [],
        members: membersQuery.data ?? [],
        conversations: conversationsQuery.data?.items ?? [],
        departments: departmentsQuery.data ?? [],
        departmentMembersById: departmentMembersQueries.data ?? {},
        currentUserId: session?.userId,
      }),
    [
      conversationsQuery.data,
      departmentMembersQueries.data,
      departmentsQuery.data,
      friendsQuery.data,
      membersQuery.data,
      session?.userId,
    ],
  );

  const visibleContacts = useMemo(() => {
    const normalizedFilter = normalizeContactDirectoryFilter(contactFilter);
    if (normalizedFilter === "requests") return [];
    const base =
      normalizedFilter === "all"
        ? directoryContacts
        : normalizedFilter === "organization"
          ? directoryContacts.filter((item) => item.kind === "staff")
          : directoryContacts.filter((item) => item.kind === normalizedFilter);
    return filterContacts(base, keyword);
  }, [contactFilter, directoryContacts, keyword]);

  const visibleRequests = useMemo(
    () => filterRequests(requestsQuery.data ?? [], keyword),
    [keyword, requestsQuery.data],
  );

  const activeRequest =
    visibleRequests.find((item) => item.requestId === selectedRequestId) ??
    visibleRequests[0];
  const directoryError =
    friendsQuery.error ||
    membersQuery.error ||
    conversationsQuery.error ||
    departmentsQuery.error ||
    requestsQuery.error;
  const directoryLoading =
    friendsQuery.isLoading ||
    membersQuery.isLoading ||
    conversationsQuery.isLoading ||
    departmentsQuery.isLoading ||
    requestsQuery.isLoading;

  const openMessage = (activeContact?: ContactItem) => {
    if (!activeContact) return;
    if (activeContact.conversationId) {
      setActiveConversation(activeContact.conversationId);
      return;
    }
    if (activeContact.userId) {
      createDirectChatMutation.mutate(activeContact.userId);
    }
  };

  const handleRequest = (requestId: string, action: "accept" | "reject") => {
    requestMutation.mutate({ requestId, action });
  };

  const deleteFriend = (contact: ContactItem) => {
    if (!contact.userId) return;
    deleteFriendMutation.mutate(contact.userId);
  };

  const blockContact = (contact: ContactItem) => {
    if (!contact.userId) return;
    blockUserMutation.mutate(contact.userId);
  };

  return {
    activeRequest,
    blockContact,
    createDirectChatPending: createDirectChatMutation.isPending,
    deleteFriend,
    departments: departmentsQuery.data ?? [],
    directoryContacts,
    directoryError,
    directoryLoading,
    handleRequest,
    inviteQrError: inviteQrsQuery.error,
    inviteQrLoading: inviteQrsQuery.isLoading,
    inviteQrs: inviteQrsQuery.data ?? [],
    openMessage,
    onCreateInviteQr: () => createInviteQrMutation.mutate(),
    relationshipActionPending:
      deleteFriendMutation.isPending || blockUserMutation.isPending,
    createInviteQrPending: createInviteQrMutation.isPending,
    requestPending: requestMutation.isPending,
    visibleContacts,
    visibleRequests,
  };
}

async function refreshContactRelations(
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
