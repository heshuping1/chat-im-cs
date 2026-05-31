import { endpointPlan } from "./endpoints";
import { ProfileApiClient } from "./profile-client";
import type {
  DepartmentDto,
  DepartmentMemberDto,
  FriendProfileExtraDto,
  FriendProfileUpdateDto,
  FriendDto,
  FriendRequestDto,
  GroupMemberDto,
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
}
