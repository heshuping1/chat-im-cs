import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type {
  NotificationSettingsDto,
} from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import { pcQueryKeys } from "../../data/query-keys";
import { requireApiClient } from "../../data/runtime";
import type { PcSettings } from "../../data/settings/pc-settings";
import { formatError } from "../../lib/format";
import { settingRowProps } from "../models/settingsCatalog";
import { InfoRow, InlineSettingsState, SwitchRow } from "./SettingsRows";

type SettingKey = keyof PcSettings;

const notificationRows = [
  {
    id: "imNotifications",
    key: "imNotifications",
    dtoKey: "imEnabled",
  },
  {
    id: "serviceQueueNotifications",
    key: "serviceQueueNotifications",
    dtoKey: "serviceQueueEnabled",
  },
  {
    id: "slaTimeoutNotifications",
    key: "slaTimeoutNotifications",
    dtoKey: "slaEnabled",
  },
  {
    id: "desktopNotifications",
    key: "desktopNotifications",
    dtoKey: "desktopEnabled",
  },
  {
    id: "notificationPreview",
    key: "notificationPreview",
    dtoKey: "previewEnabled",
  },
  {
    id: "notificationSound",
    key: "notificationSound",
    dtoKey: "soundEnabled",
  },
  {
    id: "doNotDisturb",
    key: "doNotDisturb",
    dtoKey: "globalMute",
  },
] satisfies Array<{
  id: string;
  key: Extract<
    SettingKey,
    | "desktopNotifications"
    | "doNotDisturb"
    | "imNotifications"
    | "notificationPreview"
    | "notificationSound"
    | "serviceQueueNotifications"
    | "slaTimeoutNotifications"
  >;
  dtoKey: keyof NotificationSettingsDto;
}>;

export function NotificationSettingsSection({
  authSession,
  pcSettings,
  setNotice,
  setSetting,
}: {
  authSession: AuthSession | null;
  pcSettings: PcSettings;
  setNotice: (notice: string) => void;
  setSetting: <K extends SettingKey>(key: K, value: PcSettings[K]) => void;
}) {
  const queryClient = useQueryClient();
  const notificationQuery = useQuery({
    queryKey: pcQueryKeys.accountNotificationSettings(
      authSession?.apiBaseUrl,
      authSession?.tenantToken,
    ),
    enabled: Boolean(authSession?.tenantToken),
    staleTime: 60_000,
    queryFn: async () => requireApiClient(authSession).getNotificationSettings(),
  });
  const updateNotification = useMutation({
    mutationFn: async (body: Partial<NotificationSettingsDto>) =>
      requireApiClient(authSession).updateNotificationSettings(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: pcQueryKeys.accountNotificationSettings(
          authSession?.apiBaseUrl,
          authSession?.tenantToken,
        ),
      });
      setNotice("提醒设置已保存");
    },
    onError: (error) => setNotice(`提醒设置保存失败：${formatError(error)}`),
  });

  useEffect(() => {
    const dto = notificationQuery.data;
    if (!dto) return;
    for (const row of notificationRows) {
      const value = dto[row.dtoKey];
      if (typeof value === "boolean" && pcSettings[row.key] !== value) {
        setSetting(row.key, value);
      }
    }
  }, [notificationQuery.data, pcSettings, setSetting]);

  const setRemoteBoolean = (row: (typeof notificationRows)[number], value: boolean) => {
    setSetting(row.key, value);
    updateNotification.mutate({ [row.dtoKey]: value });
  };

  return (
    <>
      {notificationQuery.isLoading && (
        <InlineSettingsState text="正在读取账号提醒设置..." />
      )}
      {notificationQuery.error && (
        <InlineSettingsState
          tone="error"
          text={`提醒设置加载失败：${formatError(notificationQuery.error)}。当前控件会先保存在本机，接口恢复后可再次同步。`}
        />
      )}
      <SwitchRow
        {...settingRowProps("imNotifications")}
        checked={pcSettings.imNotifications}
        enabled={!updateNotification.isPending}
        onChange={(value) => setRemoteBoolean(notificationRows[0], value)}
      />
      <InfoRow
        {...settingRowProps("friendRequestNotifications")}
        desc={`新的好友申请跟随 IM 消息提醒策略。当前：${pcSettings.imNotifications ? "开启" : "关闭"}`}
      />
      {notificationRows.slice(1).map((row) => (
        <SwitchRow
          key={row.id}
          {...settingRowProps(row.id)}
          checked={Boolean(pcSettings[row.key])}
          enabled={!updateNotification.isPending}
          onChange={(value) => setRemoteBoolean(row, value)}
        />
      ))}
    </>
  );
}
