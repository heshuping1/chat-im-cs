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
  contactMatchesDirectoryFilter,
  type ContactDirectoryViewMode,
  filterContacts,
  filterRequests,
  mapContacts,
  resolveContactDirectoryFilter,
} from "../../data/contact-directory";
import { deriveContactDirectoryAccess } from "../../data/contact-directory-permissions";
import { pcQueryKeys } from "../../data/query-keys";
import { requireApiClient } from "../../data/runtime";
import type { ContactFilter, ContactItem } from "../../data/types";
import { useSetActiveImConversation } from "../../data/workspace-ui/workspace-ui-store";
import { useI18n } from "../../i18n/useI18n";
import { formatError } from "../../lib/format";

export function useContactsDirectoryController({
  activeContactId,
  contactFilter,
  keyword,
  selectedRequestId,
  setNotice,
}: {
  activeContactId?: string;
  contactFilter: ContactFilter;
  keyword: string;
  selectedRequestId: string;
  setNotice: (notice: string | null) => void;
}) {
  const session = useAuthSession();
  const { t } = useI18n();
  const setActiveConversation = useSetActiveImConversation();
  const queryClient = useQueryClient();
  const contactAccess = useMemo(
    () => deriveContactDirectoryAccess(session),
    [session],
  );
  const directoryViewMode: ContactDirectoryViewMode =
    contactAccess.isCustomerTenantMember ? "customer" : "staff";
  const effectiveContactFilter = resolveContactDirectoryFilter({
    filter: contactFilter,
    viewMode: directoryViewMode,
    canReadOrganization: contactAccess.canReadOrganization,
  });
  const organizationQueriesEnabled = Boolean(
    session && contactAccess.canReadOrganization,
  );

  const friendsQuery = useQuery({
    queryKey: ["pc-friends", session?.apiBaseUrl, session?.tenantToken],
    enabled: Boolean(session && contactAccess.canReadSocialContacts),
    queryFn: async () => requireApiClient(session).getFriends(),
  });
  const requestsQuery = useQuery({
    queryKey: ["pc-friend-requests", session?.apiBaseUrl, session?.tenantToken],
    enabled: Boolean(session && contactAccess.canReadSocialContacts),
    queryFn: async () => requireApiClient(session).getFriendRequests(),
  });
  const membersQuery = useQuery({
    queryKey: ["pc-tenant-members", session?.apiBaseUrl, session?.tenantToken],
    enabled: organizationQueriesEnabled,
    queryFn: async () => requireApiClient(session).getTenantMembers(),
  });
  const departmentsQuery = useQuery({
    queryKey: ["pc-departments", session?.apiBaseUrl, session?.tenantToken],
    enabled: organizationQueriesEnabled,
    queryFn: async () => requireApiClient(session).getDepartments(),
  });
  const conversationsQuery = useQuery({
    queryKey: pcQueryKeys.imConversations(session?.apiBaseUrl, session?.tenantToken),
    enabled: Boolean(session),
    queryFn: async () => requireApiClient(session).getConversations({ limit: 100 }),
  });
  const inviteQrsQuery = useQuery({
    queryKey: pcQueryKeys.accountInviteQrs(session?.apiBaseUrl, session?.tenantToken),
    enabled: Boolean(session && effectiveContactFilter === "requests"),
    queryFn: async () => requireApiClient(session).getFriendInviteQrs(),
  });
  const departmentMembersQueries = useQuery({
    queryKey: [
      "pc-department-members-bundle",
      session?.apiBaseUrl,
      session?.tenantToken,
      departmentsQuery.data?.map((item) => item.departmentId).join(","),
    ],
    enabled: Boolean(organizationQueriesEnabled && departmentsQuery.data?.length),
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
    onError: (error) =>
      setNotice(t("contacts.notice.openConversationFailedWithError", { error: formatError(error) })),
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
      setNotice(
        variables.action === "accept"
          ? t("contacts.notice.friendRequestAccepted")
          : t("contacts.notice.friendRequestRejected"),
      );
      await queryClient.invalidateQueries({ queryKey: ["pc-friend-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["pc-friends"] });
    },
    onError: (error) =>
      setNotice(t("contacts.notice.handleRequestFailedWithError", { error: formatError(error) })),
  });
  const deleteFriendMutation = useMutation({
    mutationFn: async (friendUserId: string) =>
      requireApiClient(session).deleteFriend(friendUserId),
    onSuccess: async () => {
      setNotice(t("contacts.notice.friendDeleted"));
      await refreshContactRelations(queryClient, session);
    },
    onError: (error) =>
      setNotice(t("contacts.notice.deleteFriendFailedWithError", { error: formatError(error) })),
  });
  const blockUserMutation = useMutation({
    mutationFn: async (userId: string) => requireApiClient(session).blockUser(userId),
    onSuccess: async () => {
      setNotice(t("contacts.notice.blockUserSuccess"));
      await refreshContactRelations(queryClient, session);
    },
    onError: (error) =>
      setNotice(t("contacts.notice.blockUserFailedWithError", { error: formatError(error) })),
  });
  const createInviteQrMutation = useMutation({
    mutationFn: async () => requireApiClient(session).createFriendInviteQr(),
    onSuccess: async () => {
      setNotice(t("contacts.notice.friendQrCreated"));
      await queryClient.invalidateQueries({
        queryKey: pcQueryKeys.accountInviteQrs(session?.apiBaseUrl, session?.tenantToken),
      });
    },
    onError: (error) =>
      setNotice(t("contacts.notice.createFriendQrFailedWithError", { error: formatError(error) })),
  });

  const directoryContacts = useMemo(
    () =>
      mapContacts({
        friends: friendsQuery.data ?? [],
        members: contactAccess.canReadOrganization ? membersQuery.data ?? [] : [],
        conversations: conversationsQuery.data?.items ?? [],
        departments: contactAccess.canReadOrganization
          ? departmentsQuery.data ?? []
          : [],
        departmentMembersById: contactAccess.canReadOrganization
          ? departmentMembersQueries.data ?? {}
          : {},
        currentUserId: session?.userId,
        viewMode: directoryViewMode,
      }),
    [
      contactAccess.canReadOrganization,
      conversationsQuery.data,
      departmentMembersQueries.data,
      directoryViewMode,
      departmentsQuery.data,
      friendsQuery.data,
      membersQuery.data,
      session?.userId,
    ],
  );

  const visibleContacts = useMemo(() => {
    if (effectiveContactFilter === "requests") return [];
    const base =
      effectiveContactFilter === "all"
        ? directoryContacts
        : directoryContacts.filter((item) =>
            contactMatchesDirectoryFilter(item, effectiveContactFilter),
          );
    return filterContacts(base, keyword);
  }, [directoryContacts, effectiveContactFilter, keyword]);

  const visibleRequests = useMemo(
    () => filterRequests(requestsQuery.data ?? [], keyword),
    [keyword, requestsQuery.data],
  );

  const activeContact =
    visibleContacts.find((item) => item.id === activeContactId) ??
    visibleContacts[0];
  const activeTenantMemberUserId =
    activeContact?.kind === "staff" && activeContact.userId ? activeContact.userId : "";
  const tenantMemberProfileQuery = useQuery({
    queryKey: pcQueryKeys.tenantMemberProfile(
      session?.apiBaseUrl,
      session?.tenantToken,
      activeTenantMemberUserId,
    ),
    enabled: Boolean(activeTenantMemberUserId && !activeContact?.greenBubbleNo && session),
    queryFn: async () => requireApiClient(session).getTenantMemberProfile(activeTenantMemberUserId),
  });
  const activeContactDetail = useMemo(() => {
    const greenBubbleNo = tenantMemberProfileQuery.data?.greenBubbleNo;
    if (!activeContact || activeContact.greenBubbleNo || !greenBubbleNo) return activeContact;
    return { ...activeContact, greenBubbleNo };
  }, [activeContact, tenantMemberProfileQuery.data?.greenBubbleNo]);

  const activeRequest =
    visibleRequests.find((item) => item.requestId === selectedRequestId) ??
    visibleRequests[0];
  const organizationError = contactAccess.canReadOrganization
    ? membersQuery.error || departmentsQuery.error
    : null;
  const organizationLoading =
    contactAccess.canReadOrganization &&
    (membersQuery.isLoading || departmentsQuery.isLoading);
  const requestListError = requestsQuery.error;
  const directoryError =
    friendsQuery.error ||
    conversationsQuery.error ||
    organizationError;
  const directoryLoading =
    friendsQuery.isLoading ||
    conversationsQuery.isLoading ||
    organizationLoading ||
    (effectiveContactFilter === "requests" && requestsQuery.isLoading);

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
    activeContact,
    activeContactDetail,
    activeRequest,
    blockContact,
    contactAccess,
    createDirectChatPending: createDirectChatMutation.isPending,
    deleteFriend,
    departments: contactAccess.canReadOrganization ? departmentsQuery.data ?? [] : [],
    directoryContacts,
    directoryError,
    directoryLoading,
    directoryViewMode,
    effectiveContactFilter,
    handleRequest,
    inviteQrError: inviteQrsQuery.error,
    inviteQrLoading: inviteQrsQuery.isLoading,
    inviteQrs: inviteQrsQuery.data ?? [],
    openMessage,
    onCreateInviteQr: () => createInviteQrMutation.mutate(),
    relationshipActionPending:
      deleteFriendMutation.isPending || blockUserMutation.isPending,
    createInviteQrPending: createInviteQrMutation.isPending,
    requestListError,
    requestCount: requestsQuery.data?.length ?? 0,
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
