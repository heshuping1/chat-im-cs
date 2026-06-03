import { useState, type KeyboardEvent } from "react";
import type { CaptchaChallenge } from "../../data/api-client";
import type { AuthMode, AuthSpaceChoice } from "../../data/auth/auth-flow-model";
import type { RegisterAvatarOption } from "../../data/auth/register-avatar-options";

type AuthModeSwitchProps = {
  mode: AuthMode;
  onChange: (mode: AuthMode) => void;
};

type CaptchaFieldProps = {
  captcha: CaptchaChallenge;
  disabled: boolean;
  onChange: (value: string) => void;
  onRefresh: () => void;
  onSubmit: () => void;
  value: string;
};

type AuthAdvancedSettingsProps = {
  apiBaseUrl: string;
  defaultOpen: boolean;
  onApiBaseUrlChange: (value: string) => void;
};

type AuthSpacePickerProps = {
  choices: AuthSpaceChoice[];
  error: string | null;
  notice: string | null;
  onBack: () => void;
  onSelect: (spaceId: string) => void;
  submittingId: string | null;
};

type AuthSubmitButtonProps = {
  captchaVisible: boolean;
  disabled: boolean;
  mode: AuthMode;
  onSubmit: () => void;
  submitting: boolean;
};

type LoginFieldsProps = {
  identifier: string;
  onIdentifierChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  password: string;
};

type RegisterFieldsProps = {
  avatarOptions: RegisterAvatarOption[];
  confirmPassword: string;
  contact: string;
  displayName: string;
  onAvatarChange: (avatarUrl: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onContactChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  password: string;
  selectedAvatarUrl: string;
};

export function AuthModeSwitch({ mode, onChange }: AuthModeSwitchProps) {
  return (
    <div className="auth-mode-switch" role="tablist" aria-label="账号入口">
      <button
        type="button"
        className={mode === "login" ? "active" : ""}
        onClick={() => onChange("login")}
      >
        登录
      </button>
      <button
        type="button"
        className={mode === "register" ? "active" : ""}
        onClick={() => onChange("register")}
      >
        注册
      </button>
    </div>
  );
}

export function CaptchaField({
  captcha,
  disabled,
  onChange,
  onRefresh,
  onSubmit,
  value,
}: CaptchaFieldProps) {
  return (
    <label className="captcha-inline" aria-label="安全验证">
      <span>安全验证</span>
      <div className="captcha-inline-row">
        <span className="captcha-inline-question">
          {captcha.question || "请输入验证码"}
        </span>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="请输入答案"
          autoFocus
          onKeyDown={(event) => submitOnEnter(event, onSubmit)}
        />
        <button type="button" onClick={onRefresh} disabled={disabled}>
          换一题
        </button>
      </div>
    </label>
  );
}

export function LoginFields({
  identifier,
  onIdentifierChange,
  onPasswordChange,
  onSubmit,
  password,
}: LoginFieldsProps) {
  return (
    <>
      <label>
        <span>LPP 号 / 邮箱 / 手机号</span>
        <input
          value={identifier}
          onChange={(event) => onIdentifierChange(event.target.value)}
          placeholder="请输入 LPP 号 / 邮箱 / 手机号"
          autoFocus
        />
      </label>
      <label>
        <span>密码</span>
        <input
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          placeholder="请输入密码"
          type="password"
          onKeyDown={(event) => submitOnEnter(event, onSubmit)}
        />
      </label>
    </>
  );
}

export function RegisterFields({
  avatarOptions,
  confirmPassword,
  contact,
  displayName,
  onAvatarChange,
  onConfirmPasswordChange,
  onContactChange,
  onDisplayNameChange,
  onPasswordChange,
  onSubmit,
  password,
  selectedAvatarUrl,
}: RegisterFieldsProps) {
  const [showAllAvatarOptions, setShowAllAvatarOptions] = useState(false);
  const visibleAvatarOptions = showAllAvatarOptions
    ? avatarOptions
    : avatarOptions.slice(0, 12);
  const hiddenAvatarCount = Math.max(avatarOptions.length - visibleAvatarOptions.length, 0);

  return (
    <>
      <fieldset className="auth-avatar-picker">
        <legend>选择头像</legend>
        <div className="auth-avatar-grid">
          {visibleAvatarOptions.map((avatar) => {
            const selected = avatar.avatarUrl === selectedAvatarUrl;
            return (
              <button
                type="button"
                className={`auth-avatar-option ${selected ? "selected" : ""}`}
                aria-label={`选择${avatar.label}`}
                aria-pressed={selected}
                key={avatar.id}
                onClick={() => onAvatarChange(avatar.avatarUrl)}
              >
                <img src={avatar.avatarUrl} alt="" />
              </button>
            );
          })}
        </div>
        {avatarOptions.length > 12 && (
          <button
            type="button"
            className="auth-avatar-toggle"
            onClick={() => setShowAllAvatarOptions((value) => !value)}
          >
            {showAllAvatarOptions ? "收起头像" : `更多头像 ${hiddenAvatarCount}`}
          </button>
        )}
      </fieldset>
      <label>
        <span>昵称</span>
        <input
          value={displayName}
          onChange={(event) => onDisplayNameChange(event.target.value)}
          placeholder="请输入你的昵称"
          autoFocus
        />
      </label>
      <label>
        <span>邮箱 / 手机号</span>
        <input
          value={contact}
          onChange={(event) => onContactChange(event.target.value)}
          placeholder="用于登录和找回账号"
        />
      </label>
      <label>
        <span>密码</span>
        <input
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          placeholder="至少 8 位"
          type="password"
        />
      </label>
      <label>
        <span>确认密码</span>
        <input
          value={confirmPassword}
          onChange={(event) => onConfirmPasswordChange(event.target.value)}
          placeholder="再次输入密码"
          type="password"
          onKeyDown={(event) => submitOnEnter(event, onSubmit)}
        />
      </label>
    </>
  );
}

export function AuthAdvancedSettings({
  apiBaseUrl,
  defaultOpen,
  onApiBaseUrlChange,
}: AuthAdvancedSettingsProps) {
  return (
    <details className="auth-advanced" open={defaultOpen}>
      <summary>高级设置</summary>
      <label>
        <span>服务地址（高级）</span>
        <input
          value={apiBaseUrl}
          onChange={(event) => onApiBaseUrlChange(event.target.value)}
          placeholder="https://chat.hearteasechat.com"
        />
      </label>
    </details>
  );
}

export function AuthSpacePicker({
  choices,
  error,
  notice,
  onBack,
  onSelect,
  submittingId,
}: AuthSpacePickerProps) {
  return (
    <main className="login-page">
      <section className="login-panel auth-panel">
        <button type="button" className="auth-back-button" onClick={onBack}>
          返回
        </button>
        <div className="auth-panel-heading">
          <h1>选择进入空间</h1>
          <p>这个账号属于多个企业，请选择本次要进入的空间。</p>
        </div>
        {notice && <p className="auth-notice">{notice}</p>}
        <div className="auth-space-list">
          {choices.map((space) => (
            <button
              key={space.id}
              type="button"
              className="auth-space-option"
              disabled={Boolean(submittingId)}
              onClick={() => onSelect(space.id)}
            >
              <span className="auth-space-avatar">{space.name.slice(0, 1)}</span>
              <span className="auth-space-main">
                <strong>{space.name}</strong>
                <em>{space.code}</em>
              </span>
              <span className="auth-space-role">{space.roleLabel}</span>
              <span className="auth-space-action">
                {submittingId === space.id ? "进入中..." : "进入"}
              </span>
            </button>
          ))}
        </div>
        {error && <p className="form-error">{error}</p>}
      </section>
    </main>
  );
}

export function AuthSubmitButton({
  captchaVisible,
  disabled,
  mode,
  onSubmit,
  submitting,
}: AuthSubmitButtonProps) {
  const text = submitting
    ? mode === "register"
      ? "注册中..."
      : "登录中..."
    : captchaVisible
      ? "验证并继续"
      : mode === "register"
        ? "注册并进入"
        : "登录";
  return (
    <button className="login-submit" disabled={disabled} onClick={onSubmit}>
      {text}
    </button>
  );
}

export function submitOnEnter(
  event: KeyboardEvent<HTMLInputElement>,
  onSubmit: () => void,
) {
  if (event.key === "Enter") onSubmit();
}
