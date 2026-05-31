import { useMutation } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import type { AuthSession } from "../../data/auth/auth-session";
import { requireApiClient } from "../../data/runtime";
import { formatError } from "../../lib/format";
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
        {...settingRowProps("loginDevices")}
        action="查看"
        onClick={() => setNotice("登录设备列表待接入")}
      />
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
