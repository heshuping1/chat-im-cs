import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import type {
  DepartmentMemberDto,
  FriendDto,
  TenantMemberDto,
} from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import { requireApiClient } from "../../data/runtime";
import type { ContactPickerItem } from "../components/MessageStartDialogs";

type ComposerDialogKind = "direct" | "group" | "qr" | "card" | null;

export function useMessageContactPickerData(
  session: AuthSession | null,
  composerDialog: ComposerDialogKind,
) {
  const friendsQuery = useQuery({
    queryKey: ["pc-friends", session?.apiBaseUrl, session?.tenantToken],
    enabled: Boolean(session),
    queryFn: async () => requireApiClient(session).getFriends(),
    staleTime: 60_000,
  });
  const tenantMembersQuery = useQuery({
    queryKey: ["pc-tenant-members", session?.apiBaseUrl, session?.tenantToken],
    enabled: Boolean(session),
    queryFn: async () => requireApiClient(session).getTenantMembers(),
    staleTime: 60_000,
  });
  const departmentsQuery = useQuery({
    queryKey: ["pc-departments", session?.apiBaseUrl, session?.tenantToken],
    enabled: Boolean(session),
    queryFn: async () => requireApiClient(session).getDepartments(),
    staleTime: 60_000,
  });
  const departmentMembersQuery = useQuery({
    queryKey: [
      "pc-message-department-members",
      session?.apiBaseUrl,
      session?.tenantToken,
      departmentsQuery.data?.map((item) => item.departmentId).join(","),
    ],
    enabled: Boolean(session && departmentsQuery.data?.length),
    queryFn: async () => {
      const client = requireApiClient(session);
      const entries = await Promise.all(
        (departmentsQuery.data ?? []).map(async (department) => {
          const members = await client.getDepartmentMembers(department.departmentId).catch(
            () => [] as DepartmentMemberDto[],
          );
          return members.map((member) => ({
            ...member,
            departmentId: department.departmentId,
            departmentName: department.departmentName,
          }));
        }),
      );
      return entries.flat();
    },
    staleTime: 60_000,
  });
  const inviteQrsQuery = useQuery({
    queryKey: ["pc-account-invite-qrs", session?.apiBaseUrl, session?.tenantToken],
    enabled: Boolean(session && composerDialog === "qr"),
    queryFn: async () => requireApiClient(session).getFriendInviteQrs(),
  });
  const contactPickerItems = useMemo(
    () =>
      buildContactPickerItems(
        friendsQuery.data ?? [],
        tenantMembersQuery.data ?? [],
        departmentMembersQuery.data ?? [],
        session,
      ),
    [departmentMembersQuery.data, friendsQuery.data, session, tenantMembersQuery.data],
  );

  return {
    contactPickerItems,
    departmentMembersQuery,
    departmentsQuery,
    friendsQuery,
    inviteQrsQuery,
    tenantMembersQuery,
  };
}

function buildContactPickerItems(
  friends: FriendDto[],
  members: TenantMemberDto[],
  departmentMembers: Array<DepartmentMemberDto & { departmentId?: string; departmentName?: string }>,
  session: AuthSession | null,
) {
  const items = new Map<string, ContactPickerItem>();
  friends.forEach((friend) => {
    if (!friend.friendUserId) return;
    items.set(friend.friendUserId, {
      avatarUrl: friend.avatarUrl,
      id: friend.friendUserId,
      name: friend.remarkName || friend.displayName || "Friend",
      source: "friend",
      subtitle: friend.groupName ? `Friend · ${friend.groupName}` : "Friend",
    });
  });
  members.forEach((member) => {
    if (!member.userId || member.userId === session?.userId) return;
    if (items.has(member.userId)) return;
    items.set(member.userId, {
      avatarUrl: member.avatarUrl,
      id: member.userId,
      name: member.displayName || "Member",
      source: "member",
      subtitle: "Enterprise member",
    });
  });
  departmentMembers.forEach((member) => {
    if (!member.userId || member.userId === session?.userId) return;
    if (items.has(member.userId)) return;
    items.set(member.userId, {
      avatarUrl: member.avatarUrl,
      id: member.userId,
      name: member.displayName || "Member",
      source: "department",
      subtitle: member.departmentName ? `Department member · ${member.departmentName}` : "Department member",
    });
  });
  return Array.from(items.values()).sort((left, right) =>
    left.name.localeCompare(right.name, "zh-Hans-CN"),
  );
}
