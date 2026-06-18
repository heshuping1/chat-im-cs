import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MonitorSmartphone, RefreshCw, ShieldX, Trash2 } from "lucide-react";
import { useState } from "react";
import type { AuthSession } from "../../data/auth/auth-session";
import { formatAppInstanceLabel, getAppInstanceProfile } from "../../data/app-instance/app-instance";
import { pcQueryKeys } from "../../data/query-keys";
import { requireApiClient } from "../../data/runtime";
import { useI18n } from "../../i18n/useI18n";
import { formatError, formatShortDate } from "../../lib/format";
import { ActionRow, InlineSettingsState } from "./SettingsRows";
import { settingRowProps } from "../models/settingsCatalog";

export function AccountSecuritySection({
  authSession,
  clearAuthSession,
  setNotice,
}: {
  authSession: AuthSession | null;
  clearAuthSession: () => void;
  setNotice: (notice: string) => void;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [deactivateReason, setDeactivateReason] = useState("");
  const changePassword = useMutation({
    mutationFn: async () => {
      if (!oldPassword || !newPassword) throw new Error(t("settings.accountSecurity.error.passwordRequired"));
      return requireApiClient(authSession).changePassword({
        oldPassword,
        newPassword,
      });
    },
    onSuccess: () => {
      setOldPassword("");
      setNewPassword("");
      setNotice(t("settings.accountSecurity.notice.passwordChanged"));
    },
    onError: (error) => setNotice(t("settings.accountSecurity.notice.passwordChangeFailed", { error: formatError(error) })),
  });
  const deactivate = useMutation({
    mutationFn: async () => {
      if (!verificationCode.trim()) throw new Error(t("settings.accountSecurity.error.deactivateCodeRequired"));
      return requireApiClient(authSession).deactivateAccount({
        verificationCode,
        reason: deactivateReason,
      });
    },
    onSuccess: () => {
      setNotice(t("settings.accountSecurity.notice.deactivateSubmitted"));
      clearAuthSession();
    },
    onError: (error) => setNotice(t("settings.accountSecurity.notice.deactivateFailed", { error: formatError(error) })),
  });
  const devicesQuery = useQuery({
    queryKey: pcQueryKeys.accountDevices(
      authSession?.apiBaseUrl,
      authSession?.platformToken,
    ),
    enabled: Boolean(authSession?.platformToken),
    staleTime: 60_000,
    queryFn: async () => requireApiClient(authSession).getAccountDevices(),
  });
  const appInstanceQuery = useQuery({
    queryKey: ["pc-app-instance-profile"],
    enabled: Boolean(authSession?.platformToken),
    staleTime: Infinity,
    queryFn: getAppInstanceProfile,
  });
  const revokeDevice = useMutation({
    mutationFn: async (deviceId: string) =>
      requireApiClient(authSession).revokeAccountDevice(deviceId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: pcQueryKeys.accountDevices(
          authSession?.apiBaseUrl,
          authSession?.platformToken,
        ),
      });
      setNotice(t("settings.accountSecurity.notice.deviceRevoked"));
    },
    onError: (error) => setNotice(t("settings.accountSecurity.notice.deviceRevokeFailed", { error: formatError(error) })),
  });
  return (
    <>
      <div className="settings-sub-card">
        <header>
          <strong>{t("settings.accountSecurity.passwordTitle")}</strong>
          <span className="settings-sub-card-meta">
            <em>{t("settings.accountSecurity.passwordMeta")}</em>
          </span>
        </header>
        <div className="settings-form-grid">
          <input
            type="password"
            value={oldPassword}
            placeholder={t("settings.accountSecurity.oldPassword")}
            onChange={(event) => setOldPassword(event.target.value)}
          />
          <input
            type="password"
            value={newPassword}
            placeholder={t("settings.accountSecurity.newPassword")}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <button
            type="button"
            disabled={changePassword.isPending}
            onClick={() => changePassword.mutate()}
          >
            {changePassword.isPending ? t("settings.accountSecurity.submitting") : t("settings.accountSecurity.changePassword")}
          </button>
        </div>
      </div>
      <ActionRow
        {...settingRowProps("logoutAccount")}
        action={t("settings.accountSecurity.logout")}
        onClick={() => {
          clearAuthSession();
          setNotice(t("settings.accountSecurity.notice.loggedOut"));
        }}
      />
      <div className="settings-sub-card">
        <header>
          <strong>{t("settings.accountSecurity.devicesTitle")}</strong>
          <span className="settings-sub-card-meta">
            <MonitorSmartphone size={14} />
            <em>{t("settings.accountSecurity.devicesMeta")}</em>
          </span>
        </header>
        <ActionRow
          {...settingRowProps("loginDevices")}
          action={devicesQuery.isFetching ? t("settings.accountSecurity.refreshing") : t("settings.accountSecurity.refresh")}
          enabled={Boolean(authSession?.platformToken)}
          icon={<RefreshCw size={14} />}
          onClick={() => void devicesQuery.refetch()}
        />
        {!authSession?.platformToken && (
          <InlineSettingsState
            tone="error"
            text={t("settings.accountSecurity.missingTokenForDevices")}
          />
        )}
        {devicesQuery.error && (
          <InlineSettingsState
            tone="error"
            text={t("settings.accountSecurity.devicesLoadFailed", { error: formatError(devicesQuery.error) })}
          />
        )}
        <div className="settings-device-list">
          {(devicesQuery.data ?? []).map((device) => {
            const isCurrentDevice =
              Boolean(device.isCurrent) ||
              Boolean(appInstanceQuery.data?.deviceId && device.deviceId === appInstanceQuery.data.deviceId);
            const deviceName =
              accountDeviceDisplayName({
                deviceName: device.deviceName,
                deviceType: device.deviceType,
                isCurrentDevice,
                profile: appInstanceQuery.data,
              }) ||
              t("settings.accountSecurity.deviceFallback", { id: device.deviceId.slice(0, 8) });
            return (
              <article
                className={`settings-device-row ${isCurrentDevice ? "current" : ""}`}
                key={device.deviceId}
              >
                <span className="settings-device-icon">
                  <MonitorSmartphone size={17} />
                </span>
                <span>
                  <strong>
                    {deviceName}
                    {isCurrentDevice ? t("settings.accountSecurity.currentDeviceSuffix") : ""}
                  </strong>
                  <em>{device.tenantName || authSession?.tenantName || t("settings.accountSecurity.currentTenant")}</em>
                  <small>
                    {t("settings.accountSecurity.deviceActivity", {
                      time: formatShortDate(device.lastActiveAt),
                      count: device.activeSessionCount ?? 1,
                    })}
                  </small>
                </span>
                <button
                  type="button"
                  disabled={isCurrentDevice || revokeDevice.isPending}
                  onClick={() => revokeDevice.mutate(device.deviceId)}
                >
                  <ShieldX size={14} />
                  {t("settings.accountSecurity.revokeDevice")}
                </button>
              </article>
            );
          })}
        </div>
        {devicesQuery.data?.length === 0 && (
          <InlineSettingsState text={t("settings.accountSecurity.noOtherDevices")} />
        )}
      </div>
      <div className="settings-sub-card danger">
        <header>
          <strong>{t("settings.accountSecurity.deactivateTitle")}</strong>
          <span className="settings-sub-card-meta">
            <em>{t("settings.accountSecurity.deactivateMeta")}</em>
          </span>
        </header>
        <div className="settings-form-grid">
          <input
            value={verificationCode}
            placeholder={t("settings.accountSecurity.deactivateCode")}
            onChange={(event) => setVerificationCode(event.target.value)}
          />
          <input
            value={deactivateReason}
            placeholder={t("settings.accountSecurity.deactivateReason")}
            onChange={(event) => setDeactivateReason(event.target.value)}
          />
          <button
            type="button"
            disabled={deactivate.isPending || !authSession?.platformToken}
            onClick={() => deactivate.mutate()}
          >
            <Trash2 size={14} />
            {deactivate.isPending ? t("settings.accountSecurity.submitting") : t("settings.accountSecurity.deactivate")}
          </button>
        </div>
        {!authSession?.platformToken && (
          <InlineSettingsState
            tone="error"
            text={t("settings.accountSecurity.missingTokenForDeactivate")}
          />
        )}
      </div>
    </>
  );
}

function accountDeviceDisplayName({
  deviceName,
  deviceType,
  isCurrentDevice,
  profile,
}: {
  deviceName?: string | null;
  deviceType?: string | null;
  isCurrentDevice: boolean;
  profile?: { profileName: string } | null;
}) {
  const normalizedName = usableDeviceName(deviceName);
  if (normalizedName) return normalizedName;
  if (isCurrentDevice && profile) {
    return `StartLink PC Client (${formatAppInstanceLabel(profile)})`;
  }
  return usableDeviceName(deviceType);
}

function usableDeviceName(value?: string | null) {
  const normalized = value?.trim();
  if (!normalized) return "";
  if (["unknown", "unknown device", "null", "undefined"].includes(normalized.toLowerCase())) {
    return "";
  }
  return normalized;
}
