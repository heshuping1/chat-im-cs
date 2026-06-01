import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MonitorSmartphone, RefreshCw, ShieldX, Trash2 } from "lucide-react";
import { useState } from "react";
import type { AuthSession } from "../../data/auth/auth-session";
import { pcQueryKeys } from "../../data/query-keys";
import { requireApiClient } from "../../data/runtime";
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
  const queryClient = useQueryClient();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [deactivateReason, setDeactivateReason] = useState("");
  const changePassword = useMutation({
    mutationFn: async () => {
      if (!oldPassword || !newPassword) throw new Error("请输入旧密码和新密码");
      return requireApiClient(authSession).changePassword({
        oldPassword,
        newPassword,
      });
    },
    onSuccess: () => {
      setOldPassword("");
      setNewPassword("");
      setNotice("密码已修改");
    },
    onError: (error) => setNotice(`修改密码失败：${formatError(error)}`),
  });
  const deactivate = useMutation({
    mutationFn: async () => {
      if (!verificationCode.trim()) throw new Error("请输入注销验证码");
      return requireApiClient(authSession).deactivateAccount({
        verificationCode,
        reason: deactivateReason,
      });
    },
    onSuccess: () => {
      setNotice("注销申请已提交，账号进入冷静期");
      clearAuthSession();
    },
    onError: (error) => setNotice(`注销失败：${formatError(error)}`),
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
      setNotice("已下线该设备");
    },
    onError: (error) => setNotice(`下线设备失败：${formatError(error)}`),
  });
  return (
    <>
      <div className="settings-sub-card">
        <header>
          <strong>修改密码</strong>
          <span className="settings-sub-card-meta">
            <em>账号登录密码</em>
          </span>
        </header>
        <div className="settings-form-grid">
          <input
            type="password"
            value={oldPassword}
            placeholder="旧密码"
            onChange={(event) => setOldPassword(event.target.value)}
          />
          <input
            type="password"
            value={newPassword}
            placeholder="新密码"
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <button
            type="button"
            disabled={changePassword.isPending}
            onClick={() => changePassword.mutate()}
          >
            {changePassword.isPending ? "提交中" : "修改密码"}
          </button>
        </div>
      </div>
      <ActionRow
        {...settingRowProps("logoutAccount")}
        action="退出"
        onClick={() => {
          clearAuthSession();
          setNotice("已退出登录");
        }}
      />
      <div className="settings-sub-card">
        <header>
          <strong>登录设备</strong>
          <span className="settings-sub-card-meta">
            <MonitorSmartphone size={14} />
            <em>账号安全</em>
          </span>
        </header>
        <ActionRow
          {...settingRowProps("loginDevices")}
          action={devicesQuery.isFetching ? "刷新中" : "刷新"}
          enabled={Boolean(authSession?.platformToken)}
          icon={<RefreshCw size={14} />}
          onClick={() => void devicesQuery.refetch()}
        />
        {!authSession?.platformToken && (
          <InlineSettingsState
            tone="error"
            text="当前会话缺少平台 Token，请重新登录后查看登录设备。"
          />
        )}
        {devicesQuery.error && (
          <InlineSettingsState
            tone="error"
            text={`登录设备加载失败：${formatError(devicesQuery.error)}`}
          />
        )}
        <div className="settings-device-list">
          {(devicesQuery.data ?? []).map((device) => {
            const deviceName =
              device.deviceName ||
              device.deviceType ||
              `设备 ${device.deviceId.slice(0, 8)}`;
            return (
              <article
                className={`settings-device-row ${device.isCurrent ? "current" : ""}`}
                key={device.deviceId}
              >
                <span className="settings-device-icon">
                  <MonitorSmartphone size={17} />
                </span>
                <span>
                  <strong>
                    {deviceName}
                    {device.isCurrent ? "（当前设备）" : ""}
                  </strong>
                  <em>{device.tenantName || authSession?.tenantName || "当前企业"}</em>
                  <small>
                    最后活跃 {formatShortDate(device.lastActiveAt)} · 会话{" "}
                    {device.activeSessionCount ?? 1}
                  </small>
                </span>
                <button
                  type="button"
                  disabled={device.isCurrent || revokeDevice.isPending}
                  onClick={() => revokeDevice.mutate(device.deviceId)}
                >
                  <ShieldX size={14} />
                  下线
                </button>
              </article>
            );
          })}
        </div>
        {devicesQuery.data?.length === 0 && (
          <InlineSettingsState text="暂无其他登录设备。" />
        )}
      </div>
      <div className="settings-sub-card danger">
        <header>
          <strong>注销账户</strong>
          <span className="settings-sub-card-meta">
            <em>提交后进入 7 天冷静期</em>
          </span>
        </header>
        <div className="settings-form-grid">
          <input
            value={verificationCode}
            placeholder="注销验证码"
            onChange={(event) => setVerificationCode(event.target.value)}
          />
          <input
            value={deactivateReason}
            placeholder="注销原因，可选"
            onChange={(event) => setDeactivateReason(event.target.value)}
          />
          <button
            type="button"
            disabled={deactivate.isPending || !authSession?.platformToken}
            onClick={() => deactivate.mutate()}
          >
            <Trash2 size={14} />
            {deactivate.isPending ? "提交中" : "申请注销"}
          </button>
        </div>
        {!authSession?.platformToken && (
          <InlineSettingsState
            tone="error"
            text="当前会话缺少平台 Token，请重新登录后再注销账户。"
          />
        )}
      </div>
    </>
  );
}
