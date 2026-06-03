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
import { settingRowProps, type SettingsSectionId } from "../models/settingsCatalog";
import { InfoRow, InlineSettingsState, SwitchRow } from "./SettingsRows";

type SettingKey = keyof PcSettings;
type NotificationSettingsSectionId = Extract<
  SettingsSectionId,
  "messages" | "customerService" | "common"
>;

const remoteNotificationRows = [
  {
    id: "imNotifications",
    key: "imNotifications",
    dtoKey: "imEnabled",
    sectionId: "messages",
  },
  {
    id: "serviceQueueNotifications",
    key: "serviceQueueNotifications",
    dtoKey: "serviceQueueEnabled",
    sectionId: "customerService",
  },
  {
    id: "slaTimeoutNotifications",
    key: "slaTimeoutNotifications",
    dtoKey: "slaEnabled",
    sectionId: "customerService",
  },
  {
    id: "desktopNotifications",
    key: "desktopNotifications",
    dtoKey: "desktopEnabled",
    sectionId: "common",
  },
  {
    id: "notificationPreview",
    key: "notificationPreview",
    dtoKey: "previewEnabled",
    sectionId: "common",
  },
  {
    id: "notificationSound",
    key: "notificationSound",
    dtoKey: "soundEnabled",
    sectionId: "common",
  },
  {
    id: "doNotDisturb",
    key: "doNotDisturb",
    dtoKey: "globalMute",
    sectionId: "messages",
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
  sectionId: NotificationSettingsSectionId;
}>;

const notificationSectionRows: Record<NotificationSettingsSectionId, string[]> = {
  messages: ["imNotifications", "friendRequestNotifications", "doNotDisturb"],
  customerService: [
    "serviceQueueNotifications",
    "customerServiceMessageNotifications",
    "foregroundInAppCustomerServiceReminders",
    "slaTimeoutNotifications",
  ],
  common: [
    "desktopNotifications",
    "notificationPreview",
    "notificationSound",
  ],
};

export function NotificationSettingsSection({
  authSession,
  pcSettings,
  sectionId,
  setNotice,
  setSetting,
}: {
  authSession: AuthSession | null;
  pcSettings: PcSettings;
  sectionId: NotificationSettingsSectionId;
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
    for (const row of remoteNotificationRows) {
      const value = dto[row.dtoKey];
      if (typeof value === "boolean" && pcSettings[row.key] !== value) {
        setSetting(row.key, value);
      }
    }
  }, [notificationQuery.data, pcSettings, setSetting]);

  const setRemoteBoolean = (row: (typeof remoteNotificationRows)[number], value: boolean) => {
    setSetting(row.key, value);
    updateNotification.mutate({ [row.dtoKey]: value });
  };
  const remoteRowById = new Map(remoteNotificationRows.map((row) => [row.id, row]));

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
      {notificationSectionRows[sectionId].map((rowId) => {
        if (rowId === "friendRequestNotifications") {
          return (
            <InfoRow
              key={rowId}
              {...settingRowProps(rowId)}
              desc={`新的好友申请跟随 IM 消息提醒策略。当前：${pcSettings.imNotifications ? "开启" : "关闭"}`}
            />
          );
        }
        if (rowId === "customerServiceMessageNotifications") {
          return (
            <SwitchRow
              key={rowId}
              {...settingRowProps(rowId)}
              checked={pcSettings.customerServiceMessageNotifications}
              onChange={(value) => setSetting("customerServiceMessageNotifications", value)}
            />
          );
        }
        if (rowId === "foregroundInAppCustomerServiceReminders") {
          return (
            <SwitchRow
              key={rowId}
              {...settingRowProps(rowId)}
              checked={pcSettings.foregroundInAppCustomerServiceReminders}
              onChange={(value) => setSetting("foregroundInAppCustomerServiceReminders", value)}
            />
          );
        }
        const remoteRow = remoteRowById.get(rowId);
        if (!remoteRow) return null;
        return (
          <SwitchRow
            key={remoteRow.id}
            {...settingRowProps(remoteRow.id)}
            checked={Boolean(pcSettings[remoteRow.key])}
            enabled={!updateNotification.isPending}
            onChange={(value) => setRemoteBoolean(remoteRow, value)}
          />
        );
      })}
    </>
  );
}
