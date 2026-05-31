import { AuthApiClient } from "./auth-client";
import { endpointPlan } from "./endpoints";
import type {
  AccountDeviceDto,
  EnterpriseAnnouncementDto,
  FavoriteItemDto,
  FavoriteSummaryDto,
  FriendInviteQrDto,
  BlockedUserDto,
  JoinableTenantDto,
  KnowledgeBaseDto,
  KnowledgeDocumentDto,
  KnowledgeSearchResponseDto,
  PlatformJoinResultDto,
  TenantInfoDto,
  PlatformTenant,
  ProfilePrivacySettingsDto,
  RevokeAccountDeviceResultDto,
  UserProfileDto,
} from "./types";
import type { PagedResult } from "./base";

export class ProfileApiClient extends AuthApiClient {
  getMyProfile() {
    return this.request<UserProfileDto>(endpointPlan.profileMe);
  }

  getTenantInfo() {
    return this.request<TenantInfoDto>(endpointPlan.tenantInfo);
  }

  getPlatformTenants() {
    return this.platformRequest<PlatformTenant[]>(endpointPlan.platformTenants);
  }

  getAccountDevices() {
    return this.platformRequest<AccountDeviceDto[]>(endpointPlan.accountDevices);
  }

  revokeAccountDevice(deviceId: string) {
    return this.platformRequest<RevokeAccountDeviceResultDto>(
      endpointPlan.accountDevice.replace("{deviceId}", encodeURIComponent(deviceId)),
      { method: "DELETE" },
    );
  }

  searchTenants(keyword: string) {
    const search = new URLSearchParams();
    search.set("keyword", keyword.trim());
    return this.platformRequest<JoinableTenantDto[]>(
      `${endpointPlan.tenantSearch}?${search.toString()}`,
    );
  }

  joinTenantByCode(body: { tenantCode: string; message?: string }) {
    return this.platformRequest<PlatformJoinResultDto>(
      endpointPlan.tenantJoinByCode,
      {
        method: "POST",
        body: JSON.stringify({
          tenantCode: body.tenantCode.trim(),
          ...(body.message?.trim() ? { message: body.message.trim() } : {}),
        }),
      },
    );
  }

  submitTenantJoinRequest(body: { tenantId: string; message?: string }) {
    return this.platformRequest<PlatformJoinResultDto>(
      endpointPlan.tenantJoinRequest.replace("{tenantId}", body.tenantId),
      {
        method: "POST",
        body: JSON.stringify({ message: body.message?.trim() ?? "" }),
      },
    );
  }

  getFriendInviteQrs() {
    return this.request<FriendInviteQrDto[]>(endpointPlan.friendInviteQr);
  }

  createFriendInviteQr(body: {
    ttlHours?: number;
    maxUses?: number;
    message?: string;
  } = {}) {
    return this.request<FriendInviteQrDto>(endpointPlan.friendInviteQr, {
      method: "POST",
      body: JSON.stringify({
        ttlHours: body.ttlHours ?? 720,
        maxUses: body.maxUses ?? 0,
        ...(body.message ? { message: body.message } : {}),
      }),
    });
  }

  getFavoriteSummary() {
    return this.request<FavoriteSummaryDto>(endpointPlan.favoritesSummary);
  }

  getFavoriteList(params: {
    limit?: number;
    category?: string;
    keyword?: string;
  } = {}) {
    const search = new URLSearchParams();
    search.set("limit", String(params.limit ?? 20));
    if (params.category && params.category !== "all") {
      search.set("category", params.category);
    }
    if (params.keyword?.trim()) {
      search.set("keyword", params.keyword.trim());
    }
    return this.request<PagedResult<FavoriteItemDto> | FavoriteItemDto[]>(
      `${endpointPlan.favoritesList}?${search.toString()}`,
    );
  }

  getPrivacySettings() {
    return this.request<ProfilePrivacySettingsDto>(endpointPlan.profilePrivacy);
  }

  updatePrivacySettings(body: Partial<ProfilePrivacySettingsDto>) {
    return this.request<ProfilePrivacySettingsDto>(endpointPlan.profilePrivacy, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  getBlocklist() {
    return this.request<BlockedUserDto[]>(endpointPlan.blocklist);
  }

  blockUser(blockedUserId: string) {
    return this.request<{ blockedUserId?: string }>(endpointPlan.blocklist, {
      method: "POST",
      body: JSON.stringify({ blockedUserId }),
    });
  }

  unblockUser(blockedUserId: string) {
    return this.request<{ blockedUserId?: string }>(
      endpointPlan.blocklistItem.replace("{blockedUserId}", blockedUserId),
      { method: "DELETE" },
    );
  }

  getUserProfile(userId: string) {
    return this.request<UserProfileDto>(
      endpointPlan.userProfile.replace("{userId}", encodeURIComponent(userId)),
    );
  }

  changePassword(body: { oldPassword: string; newPassword: string }) {
    return this.request<{ updated?: boolean }>(endpointPlan.changePassword, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  deactivateAccount(body: { verificationCode: string; reason?: string }) {
    return this.platformRequest<{ deactivatedAt?: string }>(
      endpointPlan.accountDeactivate,
      {
        method: "POST",
        body: JSON.stringify({
          verificationCode: body.verificationCode.trim(),
          ...(body.reason?.trim() ? { reason: body.reason.trim() } : {}),
        }),
      },
    );
  }

  getEnterpriseAnnouncements() {
    return this.request<EnterpriseAnnouncementDto[]>(
      endpointPlan.enterpriseAnnouncements,
    );
  }

  markEnterpriseAnnouncementRead(announcementId: string) {
    return this.request<{ announcementId?: string; readAt?: string }>(
      endpointPlan.enterpriseAnnouncementRead.replace(
        "{announcementId}",
        announcementId,
      ),
      { method: "POST", body: JSON.stringify({}) },
    );
  }

  getKnowledgeBases() {
    return this.request<KnowledgeBaseDto[]>(endpointPlan.knowledgeBases);
  }

  getKnowledgeDocuments(knowledgeBaseId: string) {
    return this.request<KnowledgeDocumentDto[] | { items?: KnowledgeDocumentDto[] }>(
      endpointPlan.knowledgeDocuments.replace("{knowledgeBaseId}", knowledgeBaseId),
    );
  }

  searchKnowledge(params: {
    query: string;
    topK?: number;
    knowledgeBaseId?: string;
  }) {
    const search = new URLSearchParams();
    search.set("q", params.query);
    search.set("topK", String(params.topK ?? 8));
    if (params.knowledgeBaseId) {
      search.set("knowledgeBaseId", params.knowledgeBaseId);
    }
    return this.request<KnowledgeSearchResponseDto>(
      `${endpointPlan.knowledgeSearch}?${search.toString()}`,
    );
  }
}
