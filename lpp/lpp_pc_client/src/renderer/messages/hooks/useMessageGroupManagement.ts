import { useMutation, useQuery, type QueryClient } from "@tanstack/react-query";

import type {
  ChatFileDto,
  ConversationListItem,
  GroupAnnouncementDto,
  GroupDetailDto,
  GroupJoinRequestDto,
  GroupMemberDto,
  GroupSettingsDto,
} from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import { requireApiClient } from "../../data/runtime";
import { useI18n } from "../../i18n/useI18n";
import {
  groupManagementPermissions,
  resolveMyGroupRole,
  type GroupRole,
} from "../models/groupManagementModel";

export type GroupFileFilter = "all" | "image" | "video" | "voice" | "file";

export type MessageGroupManagement = {
  announcements: GroupAnnouncementDto[];
  detail?: GroupDetailDto;
  fileFilter: GroupFileFilter;
  files: ChatFileDto[];
  joinRequests: GroupJoinRequestDto[];
  loading: boolean;
  permissions: ReturnType<typeof groupManagementPermissions>;
  role: GroupRole;
  settings?: GroupSettingsDto;
  actions: {
    addMembers: (userIds: string[]) => void;
    approveJoinRequest: (requestId: string) => void;
    createAnnouncement: (content: string, title?: string) => void;
    deleteAnnouncement: (announcementId: string) => void;
    disbandGroup: () => void;
    leaveGroup: () => void;
    rejectJoinRequest: (requestId: string) => void;
    removeMember: (userId: string) => void;
    setFileFilter: (filter: GroupFileFilter) => void;
    setMemberMute: (userId: string, muted: boolean) => void;
    setMemberRole: (userId: string, role: "admin" | "member") => void;
    setMuted: (muted: boolean) => void;
    setMuteMode: (enabled: boolean) => void;
    setPinned: (pinned: boolean) => void;
    transferOwner: (userId: string) => void;
    updateAnnouncement: (announcementId: string, content: string, title?: string) => void;
    updateGroupTitle: (title: string) => void;
    updateSettings: (settings: Partial<GroupSettingsDto>) => void;
  };
};

export function useMessageGroupManagement({
  activeConversation,
  fileFilter,
  groupMembers,
  queryClient,
  session,
  setFileFilter,
  setNotice,
}: {
  activeConversation?: ConversationListItem;
  fileFilter: GroupFileFilter;
  groupMembers: GroupMemberDto[];
  queryClient: QueryClient;
  session: AuthSession | null;
  setFileFilter: (filter: GroupFileFilter) => void;
  setNotice: (notice: string | null) => void;
}): MessageGroupManagement {
  const { t } = useI18n();
  const conversationId = activeConversation?.conversationId;
  const isGroup = activeConversation?.conversationType === "group";
  const enabled = Boolean(session && conversationId && isGroup);

  const detailQuery = useQuery({
    queryKey: groupQueryKey("detail", session, conversationId),
    enabled,
    queryFn: async () => requireApiClient(session).getGroupDetail(conversationId!),
    staleTime: 30_000,
  });

  const role = resolveMyGroupRole({
    conversation: activeConversation,
    currentUserId: session?.userId,
    detail: detailQuery.data,
    members: groupMembers,
  });
  const permissions = groupManagementPermissions(role);

  const settingsQuery = useQuery({
    queryKey: groupQueryKey("settings", session, conversationId),
    enabled: enabled && permissions.canManageSettings,
    queryFn: async () => requireApiClient(session).getGroupSettings(conversationId!),
    staleTime: 30_000,
  });
  const announcementsQuery = useQuery({
    queryKey: groupQueryKey("announcements", session, conversationId),
    enabled,
    queryFn: async () => requireApiClient(session).getGroupAnnouncements(conversationId!),
    staleTime: 30_000,
  });
  const joinRequestsQuery = useQuery({
    queryKey: groupQueryKey("join-requests", session, conversationId),
    enabled: enabled && permissions.canManageJoinRequests,
    queryFn: async () => requireApiClient(session).getGroupJoinRequests(conversationId!),
    staleTime: 15_000,
  });
  const filesQuery = useQuery({
    queryKey: groupQueryKey(`files:${fileFilter}`, session, conversationId),
    enabled,
    queryFn: async () =>
      requireApiClient(session).getGroupFiles(conversationId!, {
        mediaKind: fileFilter,
        limit: 50,
      }),
    staleTime: 30_000,
  });

  const invalidate = () => invalidateGroupManagementQueries(queryClient, session, conversationId);
  const groupManagementErrorText = (error: unknown) => {
    if (error instanceof Error && error.message) return error.message;
    return t("messages.groupManagement.failed");
  };
  const run = <T,>(action: () => Promise<T>, success: string) => {
    void action()
      .then(() => {
        invalidate();
        setNotice(success);
      })
      .catch((error) => {
        setNotice(groupManagementErrorText(error));
      });
  };
  const api = () => requireApiClient(session);
  const id = () => conversationId || "";

  const pendingMutation = useMutation({
    mutationFn: async (action: () => Promise<unknown>) => action(),
    onSuccess: invalidate,
    onError: (error) => setNotice(groupManagementErrorText(error)),
  });
  const mutate = (action: () => Promise<unknown>, success: string) => {
    pendingMutation.mutate(action, { onSuccess: () => setNotice(success) });
  };

  return {
    announcements: announcementsQuery.data ?? [],
    detail: detailQuery.data,
    fileFilter,
    files: filesQuery.data ?? [],
    joinRequests: joinRequestsQuery.data ?? [],
    loading:
      detailQuery.isLoading ||
      settingsQuery.isLoading ||
      announcementsQuery.isLoading ||
      joinRequestsQuery.isLoading ||
      filesQuery.isLoading ||
      pendingMutation.isPending,
    permissions,
    role,
    settings: settingsQuery.data ?? detailQuery.data?.settings ?? undefined,
    actions: {
      addMembers: (userIds) =>
        mutate(() => api().addGroupMembers(id(), userIds), t("messages.groupManagement.addMembers")),
      approveJoinRequest: (requestId) =>
        mutate(() => api().approveGroupJoinRequest(id(), requestId), t("messages.groupManagement.approveJoinRequest")),
      createAnnouncement: (content, title) =>
        mutate(
          () => api().createGroupAnnouncement(id(), { content, title, isPinned: false }),
          t("messages.groupManagement.createAnnouncement"),
        ),
      deleteAnnouncement: (announcementId) =>
        mutate(() => api().deleteGroupAnnouncement(id(), announcementId), t("messages.groupManagement.deleteAnnouncement")),
      disbandGroup: () => run(() => api().disbandGroup(id()), t("messages.groupManagement.disbandGroup")),
      leaveGroup: () => run(() => api().leaveGroup(id()), t("messages.groupManagement.leaveGroup")),
      rejectJoinRequest: (requestId) =>
        mutate(() => api().rejectGroupJoinRequest(id(), requestId), t("messages.groupManagement.rejectJoinRequest")),
      removeMember: (userId) =>
        mutate(() => api().removeGroupMember(id(), userId), t("messages.groupManagement.removeMember")),
      setFileFilter,
      setMemberMute: (userId, muted) =>
        mutate(
          () => api().setGroupMemberMute(id(), userId, { muteMode: muted ? 1 : 0 }),
          muted ? t("messages.groupManagement.memberMuted") : t("messages.groupManagement.memberUnmuted"),
        ),
      setMemberRole: (userId, nextRole) =>
        mutate(
          () => api().setGroupMemberRole(id(), userId, nextRole),
          nextRole === "admin" ? t("messages.groupManagement.setAdmin") : t("messages.groupManagement.unsetAdmin"),
        ),
      setMuted: (muted) =>
        mutate(
          () => api().setGroupMuted(id(), muted),
          muted ? t("messages.groupManagement.muted") : t("messages.groupManagement.unmuted"),
        ),
      setMuteMode: (enabled) =>
        mutate(
          () => api().setGroupMuteMode(id(), enabled ? 1 : 0),
          enabled ? t("messages.groupManagement.allMuted") : t("messages.groupManagement.allUnmuted"),
        ),
      setPinned: (pinned) =>
        mutate(
          () => api().setGroupPinned(id(), pinned),
          pinned ? t("messages.groupManagement.pinned") : t("messages.groupManagement.unpinned"),
        ),
      transferOwner: (userId) =>
        run(() => api().transferGroupOwner(id(), userId), t("messages.groupManagement.transferOwner")),
      updateAnnouncement: (announcementId, content, title) =>
        mutate(
          () => api().updateGroupAnnouncement(id(), announcementId, { content, title }),
          t("messages.groupManagement.updateAnnouncement"),
        ),
      updateGroupTitle: (title) =>
        mutate(() => api().updateGroupDetail(id(), { title }), t("messages.groupManagement.updateGroupTitle")),
      updateSettings: (settings) =>
        mutate(() => api().updateGroupSettings(id(), settings), t("messages.groupManagement.updateSettings")),
    },
  };
}

export function invalidateGroupManagementQueries(
  queryClient: QueryClient,
  session?: AuthSession | null,
  conversationId?: string,
) {
  void queryClient.invalidateQueries({ queryKey: ["pc-im-conversations"] });
  void queryClient.invalidateQueries({ queryKey: ["pc-group-members"] });
  if (!conversationId) return;
  ["detail", "settings", "announcements", "join-requests"].forEach((scope) => {
    void queryClient.invalidateQueries({
      queryKey: groupQueryKey(scope, session ?? null, conversationId),
    });
  });
  void queryClient.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) &&
      query.queryKey[0] === "pc-group-management" &&
      query.queryKey[3] === conversationId &&
      `${query.queryKey[4] ?? ""}`.startsWith("files:"),
  });
}

function groupQueryKey(scope: string, session?: AuthSession | null, conversationId?: string) {
  return [
    "pc-group-management",
    session?.apiBaseUrl ?? "",
    session?.tenantToken ?? "",
    conversationId ?? "",
    scope,
  ] as const;
}
