import { useMutation, useQuery, type QueryClient } from "@tanstack/react-query";
import type { ProfilePrivacySettingsDto } from "../data/api-client";
import type { AuthSession } from "../data/auth/auth-session";
import { pcQueryKeys } from "../data/query-keys";
import { requireApiClient } from "../data/runtime";
import type { PcSettings } from "../data/settings/pc-settings";
import { useI18n } from "../i18n/useI18n";
import { formatError, formatShortDate } from "../lib/format";
import {
  InlineSettingsState,
  SelectRow,
  SwitchRow,
} from "../settings/components/SettingsRows";
import { settingRowProps } from "../settings/models/settingsCatalog";

type SettingKey = keyof PcSettings;
type FriendRequestOption = "everyone" | "friends_of_friends" | "nobody";
type ProfileVisibilityOption = "everyone" | "friends" | "nobody";

const profileVisibilitySettingValues: Record<ProfileVisibilityOption, PcSettings["profileVisibility"]> = {
  everyone: "\u6240\u6709\u4eba",
  friends: "\u4ec5\u597d\u53cb",
  nobody: "\u4e0d\u5141\u8bb8",
};

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
  const { t } = useI18n();
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
      actions.setNotice(t("privacySettings.friendSaved"));
    },
    onError: (error) =>
      actions.setNotice(t("privacySettings.friendSaveFailed", { error: formatError(error) })),
  });
  const data = privacyQuery.data;
  return (
    <>
      {privacyQuery.error && (
        <InlineSettingsState
          tone="error"
          text={t("privacySettings.friendLoadFailed", { error: formatError(privacyQuery.error) })}
        />
      )}
      <SwitchRow
        {...settingRowProps("allowMobileSearch")}
        desc={t("privacySettings.allowMobileSearch.desc")}
        label={t("privacySettings.allowMobileSearch.label")}
        checked={data?.searchableByMobile ?? pcSettings.allowMobileSearch}
        onChange={(value) => {
          setSetting("allowMobileSearch", value);
          updatePrivacy.mutate({ searchableByMobile: value });
        }}
      />
      <SwitchRow
        {...settingRowProps("allowLppSearch")}
        desc={t("privacySettings.allowLppSearch.desc")}
        label={t("privacySettings.allowLppSearch.label")}
        checked={data?.searchableByLppId ?? pcSettings.allowLppSearch}
        onChange={(value) => {
          setSetting("allowLppSearch", value);
          updatePrivacy.mutate({ searchableByLppId: value });
        }}
      />
      <SelectRow
        {...settingRowProps("friendRequestVerification")}
        desc={t("privacySettings.friendRequestVerification.desc")}
        label={t("privacySettings.friendRequestVerification.label")}
        value={friendRequestLabel(data?.allowFriendRequest, pcSettings.friendRequestVerification)}
        options={["everyone", "friends_of_friends", "nobody"]}
        optionLabels={{
          everyone: t("privacySettings.option.everyone"),
          friends_of_friends: t("privacySettings.option.friendsOfFriends"),
          nobody: t("privacySettings.option.nobody"),
        }}
        onChange={(value) => {
          setSetting("friendRequestVerification", value !== "nobody");
          updatePrivacy.mutate({ allowFriendRequest: friendRequestValue(value) });
        }}
      />
      <SelectRow
        {...settingRowProps("profileVisibility")}
        desc={t("privacySettings.profileVisibility.desc")}
        label={t("privacySettings.profileVisibility.label")}
        value={profileVisibilityLabel(data?.profileVisibility, pcSettings.profileVisibility)}
        options={["everyone", "friends", "nobody"]}
        optionLabels={{
          everyone: t("privacySettings.option.everyone"),
          friends: t("privacySettings.option.friends"),
          nobody: t("privacySettings.option.nobody"),
        }}
        onChange={(value) => {
          setSetting("profileVisibility", profileVisibilitySettingValues[value]);
          updatePrivacy.mutate({ profileVisibility: profileVisibilityValue(value) });
        }}
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
  const { t } = useI18n();
  const blocklistRow = settingRowProps("blocklist");
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
      actions.setNotice(t("privacySettings.blocklist.removed"));
    },
    onError: (error) =>
      actions.setNotice(t("privacySettings.blocklist.removeFailed", { error: formatError(error) })),
  });
  const list = blocklistQuery.data ?? [];
  return (
    <div className="settings-sub-card">
      <header>
        <strong>{t("privacySettings.blocklist.label")}</strong>
        <span>{t("privacySettings.blocklist.count", { count: list.length })}</span>
      </header>
      {blocklistQuery.isLoading && <InlineSettingsState text={t("privacySettings.blocklist.loading")} />}
      {blocklistQuery.error && (
        <InlineSettingsState
          tone="error"
          text={t("privacySettings.blocklist.loadFailed", { error: formatError(blocklistQuery.error) })}
        />
      )}
      {!blocklistQuery.isLoading && list.length === 0 && (
        <InlineSettingsState text={t("privacySettings.blocklist.empty")} />
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
            {t("privacySettings.blocklist.remove")}
          </button>
        </div>
      ))}
    </div>
  );
}

function friendRequestLabel(
  value: ProfilePrivacySettingsDto["allowFriendRequest"],
  fallback: boolean,
): FriendRequestOption {
  if (value === "nobody") return "nobody";
  if (value === "friends_of_friends") return "friends_of_friends";
  if (value === "everyone") return "everyone";
  return fallback ? "everyone" : "nobody";
}

function friendRequestValue(value: FriendRequestOption) {
  return value;
}

function profileVisibilityLabel(
  value: ProfilePrivacySettingsDto["profileVisibility"],
  fallback: PcSettings["profileVisibility"],
): ProfileVisibilityOption {
  if (value === "everyone") return "everyone";
  if (value === "nobody") return "nobody";
  if (value === "friends") return "friends";
  if (fallback === "\u6240\u6709\u4eba") return "everyone";
  if (fallback === "\u4e0d\u5141\u8bb8") return "nobody";
  return "friends";
}

function profileVisibilityValue(value: ProfileVisibilityOption) {
  return value;
}
