import { endpointPlan } from "./endpoints";
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
} from "./types";

export class ContactsApiClient extends ProfileApiClient {
  getFriends() {
    return this.request<FriendDto[]>(endpointPlan.friends);
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
    return this.request<FriendDto>(
      endpointPlan.friendItem.replace("{friendUserId}", encodeURIComponent(friendUserId)),
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );
  }

  getFriendProfileExtra(friendUserId: string) {
    return this.request<FriendProfileExtraDto>(
      endpointPlan.friendProfileExtra.replace("{friendUserId}", encodeURIComponent(friendUserId)),
    );
  }

  getTenantMembers() {
    return this.request<TenantMemberDto[]>(endpointPlan.tenantMembers);
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

  updateGroupDetail(conversationId: string, body: { title?: string; avatarUrl?: string | null }) {
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
    body: { muteMode: 0 | 1; muteUntil?: string | null },
  ) {
    return this.request<{ groupId?: string; targetUserId?: string }>(
      endpointPlan.groupMemberMute
        .replace("{conversationId}", conversationId)
        .replace("{userId}", encodeURIComponent(userId)),
      { method: "PUT", body: JSON.stringify(body) },
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
