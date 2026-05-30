import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { DepartmentMemberDto, FriendRequestDto } from "../../data/api-client";
import { useAuthSession } from "../../data/auth/auth-store";
import {
  filterContacts,
  filterRequests,
  mapContacts,
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
    if (contactFilter === "requests") return [];
    const base =
      contactFilter === "all"
        ? directoryContacts
        : contactFilter === "organization"
          ? directoryContacts.filter((item) => item.kind === "staff")
          : directoryContacts.filter((item) => item.kind === contactFilter);
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

  return {
    activeRequest,
    createDirectChatPending: createDirectChatMutation.isPending,
    departments: departmentsQuery.data ?? [],
    directoryContacts,
    directoryError,
    directoryLoading,
    handleRequest,
    openMessage,
    requestPending: requestMutation.isPending,
    visibleContacts,
    visibleRequests,
  };
}
