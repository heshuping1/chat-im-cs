import { endpointPlan } from "./endpoints";
import { ApiError } from "./base";
import { ProfileApiClient } from "./profile-client";
import type {
  DepartmentDto,
  DepartmentMemberDto,
  FriendProfileExtraDto,
  FriendProfileUpdateDto,
  FriendDto,
  FriendRequestDto,
  ChatFileDto,
  GroupAnnouncementDto,
  GroupDetailDto,
  GroupJoinRequestDto,
  GroupMemberDto,
  GroupSettingsDto,
  SearchUserDto,
  TenantMemberDto,
  UserProfileDto,
} from "./types";

interface RawFriendDto extends Omit<FriendDto, "greenBubbleNo"> {
  avatar?: string | null;
  avatar_url?: string | null;
  greenBubbleId?: string | null;
  green_bubble_id?: string | null;
  greenBubbleNo?: string | null;
  green_bubble_no?: string | null;
  headImageUrl?: string | null;
  head_image_url?: string | null;
  lppId?: string | null;
  lpp_id?: string | null;
  lppNo?: string | null;
  lpp_no?: string | null;
  lppNumber?: string | null;
  lpp_number?: string | null;
  profileImageUrl?: string | null;
  profile_image_url?: string | null;
}

interface RawTenantMemberDto extends Omit<TenantMemberDto, "greenBubbleNo"> {
  avatar?: string | null;
  avatar_url?: string | null;
  greenBubbleId?: string | null;
  green_bubble_id?: string | null;
  greenBubbleNo?: string | null;
  green_bubble_no?: string | null;
  headImageUrl?: string | null;
  head_image_url?: string | null;
  lppId?: string | null;
  lpp_id?: string | null;
  lppNo?: string | null;
  lpp_no?: string | null;
  lppNumber?: string | null;
  lpp_number?: string | null;
  profileImageUrl?: string | null;
  profile_image_url?: string | null;
}

interface RawTenantMemberProfileDto extends UserProfileDto {
  greenBubbleId?: string | null;
  green_bubble_id?: string | null;
  greenBubbleNo?: string | null;
  green_bubble_no?: string | null;
  lpp_id?: string | null;
  lppNo?: string | null;
  lpp_no?: string | null;
  lppNumber?: string | null;
  lpp_number?: string | null;
}

export interface TenantMemberProfileDto {
  userId: string;
  greenBubbleNo: string | null;
}

export class ContactsApiClient extends ProfileApiClient {
  getFriends() {
    return this.request<RawFriendDto[]>(endpointPlan.friends).then((friends) =>
      friends.map(normalizeFriendDto),
    );
  }

  getFriendRequests() {
    return this.request<FriendRequestDto[]>(endpointPlan.friendRequests);
  }

  searchUsers(keyword: string) {
    const trimmedKeyword = keyword.trim();
    if (!trimmedKeyword) return Promise.resolve([] as SearchUserDto[]);
    const params = new URLSearchParams({ keyword: trimmedKeyword });
    return this.request<SearchUserDto[]>(`${endpointPlan.searchUsers}?${params.toString()}`);
  }

  sendFriendRequest(toUserId: string, message?: string) {
    const trimmedMessage = message?.trim();
    return this.request<{ requestId?: string; status?: string }>(
      endpointPlan.friendRequest,
      {
        method: "POST",
        body: JSON.stringify({
          toUserId,
          ...(trimmedMessage ? { message: trimmedMessage } : {}),
        }),
      },
    );
  }

  handleFriendRequest(requestId: string, action: "accept" | "reject") {
    return this.request<{ requestId?: string; status?: string }>(
      endpointPlan.friendRequestHandle.replace("{requestId}", requestId),
      {
        method: "POST",
        body: JSON.stringify({ action }),
      },
    );
  }

  deleteFriend(friendUserId: string) {
    return this.request<{ friendUserId?: string }>(
      endpointPlan.friendItem.replace("{friendUserId}", encodeURIComponent(friendUserId)),
      { method: "DELETE" },
    );
  }

  updateFriendProfile(friendUserId: string, payload: FriendProfileUpdateDto) {
    return this.request<RawFriendDto>(
      endpointPlan.friendItem.replace("{friendUserId}", encodeURIComponent(friendUserId)),
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    ).then(normalizeFriendDto);
  }

  getFriendProfileExtra(friendUserId: string) {
    return this.request<FriendProfileExtraDto>(
      endpointPlan.friendProfileExtra.replace("{friendUserId}", encodeURIComponent(friendUserId)),
    ).catch((error) => {
      if (error instanceof ApiError && error.status === 404) return undefined;
      throw error;
    });
  }

  getTenantMembers() {
    return this.request<RawTenantMemberDto[]>(endpointPlan.tenantMembers).then((members) =>
      members.map(normalizeTenantMemberDto),
    );
  }

  getTenantMemberProfile(userId: string) {
    return this.getUserProfile(userId).then((profile) =>
      normalizeTenantMemberProfileDto(profile as RawTenantMemberProfileDto),
    );
  }

  getDepartments() {
    return this.request<DepartmentDto[]>(endpointPlan.departments);
  }

  getDepartmentMembers(departmentId: string) {
    return this.request<DepartmentMemberDto[]>(
      endpointPlan.departmentMembers.replace("{departmentId}", departmentId),
    );
  }

  getGroupMembers(conversationId: string) {
    return this.request<GroupMemberDto[]>(
      endpointPlan.groupMembers.replace("{conversationId}", conversationId),
    );
  }

  getGroupDetail(conversationId: string) {
    return this.request<GroupDetailDto>(
      endpointPlan.groupDetail.replace("{conversationId}", conversationId),
    );
  }

  updateGroupDetail(
    conversationId: string,
    body: {
      avatarUrl?: string | null;
      groupNickname?: string | null;
      myGroupNickname?: string | null;
      nicknameInGroup?: string | null;
      title?: string;
    },
  ) {
    return this.request<{ groupId?: string }>(
      endpointPlan.groupDetail.replace("{conversationId}", conversationId),
      { method: "PUT", body: JSON.stringify(body) },
    );
  }

  disbandGroup(conversationId: string) {
    return this.request<{ groupId?: string }>(
      endpointPlan.groupDetail.replace("{conversationId}", conversationId),
      { method: "DELETE" },
    );
  }

  addGroupMembers(conversationId: string, userIds: string[]) {
    return this.request<{ groupId?: string; addedCount?: number }>(
      endpointPlan.groupMembers.replace("{conversationId}", conversationId),
      { method: "POST", body: JSON.stringify({ userIds }) },
    );
  }

  removeGroupMember(conversationId: string, userId: string) {
    return this.request<{ groupId?: string; removedUserId?: string }>(
      endpointPlan.groupMember
        .replace("{conversationId}", conversationId)
        .replace("{userId}", encodeURIComponent(userId)),
      { method: "DELETE" },
    );
  }

  transferGroupOwner(conversationId: string, newOwnerUserId: string) {
    return this.request<{ groupId?: string; newOwnerUserId?: string }>(
      endpointPlan.groupTransferOwner.replace("{conversationId}", conversationId),
      { method: "POST", body: JSON.stringify({ newOwnerUserId }) },
    );
  }

  setGroupMemberRole(conversationId: string, userId: string, role: "admin" | "member") {
    return this.request<{ groupId?: string; targetUserId?: string }>(
      endpointPlan.groupMemberRole
        .replace("{conversationId}", conversationId)
        .replace("{userId}", encodeURIComponent(userId)),
      { method: "PUT", body: JSON.stringify({ role }) },
    );
  }

  setGroupMemberMute(
    conversationId: string,
    userId: string,
    body: { muteMode: 0 | 1; muteUntil?: string | null; reason?: string | null },
  ) {
    return this.request<{ groupId?: string; targetUserId?: string }>(
      endpointPlan.groupMemberMute
        .replace("{conversationId}", conversationId)
        .replace("{userId}", encodeURIComponent(userId)),
      { method: "PUT", body: JSON.stringify(body) },
    );
  }

  updateGroupMemberAlias(groupId: string, targetUserId: string, alias: string) {
    return this.request<{
      alias?: string | null;
      groupAlias?: string | null;
      groupId?: string;
      targetUserId?: string;
    }>(
      endpointPlan.groupMemberAlias
        .replace("{groupId}", encodeURIComponent(groupId))
        .replace("{targetUserId}", encodeURIComponent(targetUserId)),
      { method: "PUT", body: JSON.stringify({ alias }) },
    );
  }

  getGroupSettings(conversationId: string) {
    return this.request<GroupSettingsDto>(
      endpointPlan.groupSettings.replace("{conversationId}", conversationId),
    );
  }

  updateGroupSettings(conversationId: string, body: Partial<GroupSettingsDto>) {
    return this.request<{ groupId?: string }>(
      endpointPlan.groupSettings.replace("{conversationId}", conversationId),
      { method: "PUT", body: JSON.stringify(body) },
    );
  }

  setGroupMuteMode(conversationId: string, muteMode: 0 | 1) {
    return this.request<{ groupId?: string }>(
      endpointPlan.groupMuteMode.replace("{conversationId}", conversationId),
      { method: "PUT", body: JSON.stringify({ muteMode }) },
    );
  }

  getGroupAnnouncements(conversationId: string) {
    return this.request<GroupAnnouncementDto[]>(
      endpointPlan.groupAnnouncements.replace("{conversationId}", conversationId),
    );
  }

  createGroupAnnouncement(
    conversationId: string,
    body: { title?: string | null; content: string; isPinned?: boolean },
  ) {
    return this.request<GroupAnnouncementDto>(
      endpointPlan.groupAnnouncements.replace("{conversationId}", conversationId),
      { method: "POST", body: JSON.stringify(body) },
    );
  }

  updateGroupAnnouncement(
    conversationId: string,
    announcementId: string,
    body: { title?: string | null; content?: string; isPinned?: boolean },
  ) {
    return this.request<GroupAnnouncementDto>(
      endpointPlan.groupAnnouncement
        .replace("{conversationId}", conversationId)
        .replace("{announcementId}", encodeURIComponent(announcementId)),
      { method: "PUT", body: JSON.stringify(body) },
    );
  }

  deleteGroupAnnouncement(conversationId: string, announcementId: string) {
    return this.request<{ announcementId?: string }>(
      endpointPlan.groupAnnouncement
        .replace("{conversationId}", conversationId)
        .replace("{announcementId}", encodeURIComponent(announcementId)),
      { method: "DELETE" },
    );
  }

  getGroupJoinRequests(conversationId: string) {
    return this.request<GroupJoinRequestDto[]>(
      endpointPlan.groupJoinRequests.replace("{conversationId}", conversationId),
    );
  }

  approveGroupJoinRequest(conversationId: string, requestId: string) {
    return this.request<{ requestId?: string }>(
      endpointPlan.groupJoinRequestApprove
        .replace("{conversationId}", conversationId)
        .replace("{requestId}", encodeURIComponent(requestId)),
      { method: "POST" },
    );
  }

  rejectGroupJoinRequest(conversationId: string, requestId: string, rejectReason?: string) {
    return this.request<{ requestId?: string }>(
      endpointPlan.groupJoinRequestReject
        .replace("{conversationId}", conversationId)
        .replace("{requestId}", encodeURIComponent(requestId)),
      { method: "POST", body: JSON.stringify({ rejectReason: rejectReason ?? "" }) },
    );
  }

  getGroupFiles(
    conversationId: string,
    params: { mediaKind?: "all" | "image" | "video" | "voice" | "file"; limit?: number } = {},
  ) {
    const search = new URLSearchParams();
    if (params.mediaKind && params.mediaKind !== "all") search.set("mediaKind", params.mediaKind);
    search.set("limit", String(params.limit ?? 50));
    return this.request<ChatFileDto[]>(
      `${endpointPlan.groupFiles.replace("{conversationId}", conversationId)}?${search.toString()}`,
    );
  }

  leaveGroup(conversationId: string) {
    return this.request<{ groupId?: string }>(
      endpointPlan.groupLeave.replace("{conversationId}", conversationId),
      { method: "POST" },
    );
  }

  setGroupPinned(conversationId: string, pinned: boolean) {
    return this.request<{ groupId?: string }>(
      endpointPlan.groupPin.replace("{conversationId}", conversationId),
      { method: "PUT", body: JSON.stringify({ pinned }) },
    );
  }

  setGroupMuted(conversationId: string, muted: boolean) {
    return this.request<{ groupId?: string }>(
      endpointPlan.groupMute.replace("{conversationId}", conversationId),
      { method: "PUT", body: JSON.stringify({ muted }) },
    );
  }
}

export function normalizeFriendDto(friend: RawFriendDto): FriendDto {
  return {
    avatarUrl: publicAvatarUrl(friend),
    createdAt: friend.createdAt,
    displayName: friend.displayName,
    friendUserId: friend.friendUserId,
    greenBubbleNo: publicGreenBubbleNo(friend),
    groupName: friend.groupName,
    remarkName: friend.remarkName,
    userType: friend.userType,
  };
}

export function normalizeTenantMemberDto(member: RawTenantMemberDto): TenantMemberDto {
  return {
    avatarUrl: publicAvatarUrl(member),
    displayName: member.displayName,
    greenBubbleNo: publicGreenBubbleNo(member),
    joinedAt: member.joinedAt,
    joinMethod: member.joinMethod,
    membershipRole: member.membershipRole,
    platformUserId: member.platformUserId,
    userId: member.userId,
  };
}

export function normalizeTenantMemberProfileDto(
  profile: RawTenantMemberProfileDto,
): TenantMemberProfileDto {
  return {
    userId: profile.userId,
    greenBubbleNo: publicGreenBubbleNo(profile),
  };
}

function publicGreenBubbleNo(source: object) {
  return (
    stringField(
      source,
      "greenBubbleNo",
      "green_bubble_no",
      "greenBubbleId",
      "green_bubble_id",
      "lppId",
      "lpp_id",
      "lppNo",
      "lpp_no",
      "lppNumber",
      "lpp_number",
    ) || null
  );
}

function publicAvatarUrl(source: object) {
  return (
    stringField(
      source,
      "avatarUrl",
      "avatar_url",
      "avatar",
      "headImageUrl",
      "head_image_url",
      "profileImageUrl",
      "profile_image_url",
    ) || null
  );
}

function stringField(value: object, ...keys: string[]) {
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}
