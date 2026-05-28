import { endpointPlan } from "./endpoints";
import { ProfileApiClient } from "./profile-client";
import type {
  DepartmentDto,
  DepartmentMemberDto,
  FriendDto,
  FriendRequestDto,
  GroupMemberDto,
  TenantMemberDto,
} from "./types";

export class ContactsApiClient extends ProfileApiClient {
  getFriends() {
    return this.request<FriendDto[]>(endpointPlan.friends);
  }

  getFriendRequests() {
    return this.request<FriendRequestDto[]>(endpointPlan.friendRequests);
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
