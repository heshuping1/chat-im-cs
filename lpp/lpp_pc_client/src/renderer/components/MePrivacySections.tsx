import { useMutation, useQuery, type QueryClient } from "@tanstack/react-query";
import type { ProfilePrivacySettingsDto } from "../data/api-client";
import type { AuthSession } from "../data/auth/auth-session";
import { pcQueryKeys } from "../data/query-keys";
import { requireApiClient } from "../data/runtime";
import type { PcSettings } from "../data/settings/pc-settings";
import { formatError, formatShortDate } from "../lib/format";
import {
  InlineSettingsState,
  SelectRow,
  SwitchRow,
} from "../settings/components/SettingsRows";

type SettingKey = keyof PcSettings;

export function PrivacySettingsSection({
  actions,
  pcSettings,
  setSetting,
}: {
  actions: {
    authSession: AuthSession | null;
    setNotice: (notice: string) => void;
    queryClient: QueryClient;
  };
  pcSettings: PcSettings;
  setSetting: <K extends SettingKey>(key: K, value: PcSettings[K]) => void;
}) {
  const privacyQuery = useQuery({
    queryKey: pcQueryKeys.accountPrivacy(
      actions.authSession?.apiBaseUrl,
      actions.authSession?.tenantToken,
    ),
    enabled: Boolean(actions.authSession),
    staleTime: 60_000,
    queryFn: async () => requireApiClient(actions.authSession).getPrivacySettings(),
  });
  const updatePrivacy = useMutation({
    mutationFn: async (body: Partial<ProfilePrivacySettingsDto>) =>
      requireApiClient(actions.authSession).updatePrivacySettings(body),
    onSuccess: async () => {
      await actions.queryClient.invalidateQueries({
        queryKey: pcQueryKeys.accountPrivacy(
          actions.authSession?.apiBaseUrl,
          actions.authSession?.tenantToken,
        ),
      });
      actions.setNotice("朋友权限已保存");
    },
    onError: (error) => actions.setNotice(`朋友权限保存失败：${formatError(error)}`),
  });
  const data = privacyQuery.data;
  return (
    <>
      {privacyQuery.error && (
        <InlineSettingsState
          tone="error"
          text={`朋友权限加载失败：${formatError(privacyQuery.error)}`}
        />
      )}
      <SwitchRow
        label="允许通过手机号搜索"
        desc="其他用户可通过手机号找到你。"
        checked={data?.searchableByMobile ?? pcSettings.allowMobileSearch}
        onChange={(value) => {
          setSetting("allowMobileSearch", value);
          updatePrivacy.mutate({ searchableByMobile: value });
        }}
      />
      <SwitchRow
        label="允许通过 LPP 号搜索"
        desc="其他用户可通过 LPP 号找到你。"
        checked={data?.searchableByLppId ?? pcSettings.allowLppSearch}
        onChange={(value) => {
          setSetting("allowLppSearch", value);
          updatePrivacy.mutate({ searchableByLppId: value });
        }}
      />
      <SelectRow
        label="加我为好友"
        desc="控制陌生人向你发起好友申请的范围。"
        value={friendRequestLabel(data?.allowFriendRequest, pcSettings.friendRequestVerification)}
        options={["所有人", "有共同好友的人", "不允许"]}
        onChange={(value) => {
          setSetting("friendRequestVerification", value !== "不允许");
          updatePrivacy.mutate({ allowFriendRequest: friendRequestValue(value) });
        }}
      />
      <SelectRow
        label="个人资料可见性"
        desc="控制资料页对外展示范围。"
        value={profileVisibilityLabel(data?.profileVisibility, pcSettings.profileVisibility)}
        options={["所有人", "仅好友", "不允许"]}
        onChange={(value) => {
          setSetting("profileVisibility", value);
          updatePrivacy.mutate({ profileVisibility: profileVisibilityValue(value) });
        }}
      />
      <SwitchRow
        label="敏感信息脱敏"
        desc="手机号、邮箱、证件、资金等敏感字段默认脱敏显示。"
        checked={pcSettings.sensitiveMasking}
        onChange={(value) => setSetting("sensitiveMasking", value)}
      />
      <BlacklistBlock actions={actions} />
    </>
  );
}

function BlacklistBlock({
  actions,
}: {
  actions: {
    authSession: AuthSession | null;
    setNotice: (notice: string) => void;
    queryClient: QueryClient;
  };
}) {
  const blocklistQuery = useQuery({
    queryKey: pcQueryKeys.accountBlocklist(
      actions.authSession?.apiBaseUrl,
      actions.authSession?.tenantToken,
    ),
    enabled: Boolean(actions.authSession),
    staleTime: 60_000,
    queryFn: async () => requireApiClient(actions.authSession).getBlocklist(),
  });
  const unblock = useMutation({
    mutationFn: async (blockedUserId: string) =>
      requireApiClient(actions.authSession).unblockUser(blockedUserId),
    onSuccess: async () => {
      await actions.queryClient.invalidateQueries({
        queryKey: pcQueryKeys.accountBlocklist(
          actions.authSession?.apiBaseUrl,
          actions.authSession?.tenantToken,
        ),
      });
      actions.setNotice("已移出黑名单");
    },
    onError: (error) => actions.setNotice(`移出黑名单失败：${formatError(error)}`),
  });
  const list = blocklistQuery.data ?? [];
  return (
    <div className="settings-sub-card">
      <header>
        <strong>黑名单</strong>
        <span>{list.length} 人</span>
      </header>
      {blocklistQuery.isLoading && <InlineSettingsState text="正在读取黑名单..." />}
      {blocklistQuery.error && (
        <InlineSettingsState
          tone="error"
          text={`黑名单加载失败：${formatError(blocklistQuery.error)}`}
        />
      )}
      {!blocklistQuery.isLoading && list.length === 0 && (
        <InlineSettingsState text="暂无黑名单用户" />
      )}
      {list.map((item) => (
        <div className="settings-list-row" key={item.blockedUserId}>
          <span>
            <strong>{item.displayName || item.blockedUserId}</strong>
            <em>{formatShortDate(item.createdAt)}</em>
          </span>
          <button
            type="button"
            disabled={unblock.isPending}
            onClick={() => unblock.mutate(item.blockedUserId)}
          >
            移出
          </button>
        </div>
      ))}
    </div>
  );
}

function friendRequestLabel(
  value: ProfilePrivacySettingsDto["allowFriendRequest"],
  fallback: boolean,
) {
  if (value === "nobody") return "不允许";
  if (value === "friends_of_friends") return "有共同好友的人";
  if (value === "everyone") return "所有人";
  return fallback ? "所有人" : "不允许";
}

function friendRequestValue(value: string) {
  if (value === "不允许") return "nobody";
  if (value === "有共同好友的人") return "friends_of_friends";
  return "everyone";
}

function profileVisibilityLabel(
  value: ProfilePrivacySettingsDto["profileVisibility"],
  fallback: PcSettings["profileVisibility"],
) {
  if (value === "everyone") return "所有人";
  if (value === "nobody") return "不允许";
  if (value === "friends") return "仅好友";
  return fallback;
}

function profileVisibilityValue(value: string) {
  if (value === "所有人") return "everyone";
  if (value === "不允许") return "nobody";
  return "friends";
}
