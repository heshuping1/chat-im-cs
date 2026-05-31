import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MonitorCog, RefreshCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import type { AccountDeviceDto } from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import { getAppInstanceProfile } from "../../data/app-instance/app-instance";
import { pcQueryKeys } from "../../data/query-keys";
import { requireApiClient } from "../../data/runtime";
import { formatError } from "../../lib/format";
import { InlineSettingsState } from "./SettingsRows";

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
  const accountDevicesKey = pcQueryKeys.accountDevices(
    authSession?.apiBaseUrl,
    authSession?.platformToken,
  );
  const appInstanceQuery = useQuery({
    queryKey: ["pc-app-instance-profile"],
    staleTime: Infinity,
    queryFn: getAppInstanceProfile,
  });
  const accountDevicesQuery = useQuery({
    queryKey: accountDevicesKey,
    enabled: Boolean(authSession?.platformToken),
    staleTime: 30_000,
    queryFn: async () => requireApiClient(authSession).getAccountDevices(),
  });
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
  const revokeDevice = useMutation({
    mutationFn: async (deviceId: string) =>
      requireApiClient(authSession).revokeAccountDevice(deviceId),
    onSuccess: async (result) => {
      setNotice(`已下线设备，结束 ${result.revokedSessionCount ?? 0} 个会话`);
      await queryClient.invalidateQueries({ queryKey: accountDevicesKey });
    },
    onError: (error) => setNotice(`下线设备失败：${formatError(error)}`),
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

  return (
    <>
      <div className="settings-sub-card">
        <header>
          <strong>修改密码</strong>
          <span>账号登录密码</span>
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

      <div className="settings-sub-card">
        <header>
          <strong>登录设备</strong>
          <span>同一设备多客户端按会话数审计</span>
        </header>
        <div className="settings-device-toolbar">
          <span>
            当前客户端：
            {appInstanceQuery.data?.profileName ?? "识别中"}
          </span>
          <button
            type="button"
            disabled={accountDevicesQuery.isFetching}
            onClick={() => accountDevicesQuery.refetch()}
          >
            <RefreshCcw size={14} />
            刷新
          </button>
        </div>
        {!authSession?.platformToken && (
          <InlineSettingsState
            tone="error"
            text="当前会话缺少平台 Token，请重新登录后查看登录设备。"
          />
        )}
        {accountDevicesQuery.isLoading && <InlineSettingsState text="正在读取登录设备..." />}
        {accountDevicesQuery.error && (
          <InlineSettingsState
            tone="error"
            text={`登录设备加载失败：${formatError(accountDevicesQuery.error)}`}
          />
        )}
        <div className="settings-device-list">
          {(accountDevicesQuery.data ?? []).map((device) => (
            <DeviceRow
              key={device.deviceId}
              currentDeviceId={appInstanceQuery.data?.deviceId}
              device={device}
              revoking={revokeDevice.isPending}
              onRevoke={(deviceId) => revokeDevice.mutate(deviceId)}
            />
          ))}
        </div>
      </div>

      <div className="settings-sub-card danger">
        <header>
          <strong>注销账号</strong>
          <span>提交后进入 7 天冷静期</span>
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
            text="当前会话缺少平台 Token，请重新登录后再注销账号。"
          />
        )}
      </div>
    </>
  );
}

function DeviceRow({
  device,
  currentDeviceId,
  revoking,
  onRevoke,
}: {
  device: AccountDeviceDto;
  currentDeviceId?: string;
  revoking: boolean;
  onRevoke: (deviceId: string) => void;
}) {
  const isCurrent = device.isCurrent || device.deviceId === currentDeviceId;
  const sessionCount = Math.max(1, Number(device.activeSessionCount ?? 1));
  const deviceLabel = isCurrent
    ? `本机 · ${sessionCount} 个会话`
    : `${device.deviceType || "PC"} · ${sessionCount} 个会话`;

  return (
    <div className={`settings-device-row ${isCurrent ? "current" : ""}`}>
      <span className="settings-device-icon">
        <MonitorCog size={17} />
      </span>
      <span>
        <strong>{device.deviceName || "LPP PC Client"}</strong>
        <em>{deviceLabel}</em>
        <small>最后活跃：{formatDeviceTime(device.lastActiveAt)}</small>
      </span>
      <button
        type="button"
        disabled={isCurrent || revoking}
        onClick={() => onRevoke(device.deviceId)}
      >
        {isCurrent ? "当前设备" : "远程下线"}
      </button>
    </div>
  );
}

function formatDeviceTime(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
