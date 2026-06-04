import { useState, type KeyboardEvent } from "react";
import type { CaptchaChallenge } from "../../data/api-client";
import type {
  AuthMode,
  InvitationPreviewView,
  AuthSpaceChoice,
  RegisterContactType,
  RegisterPhoneCountryOption,
} from "../../data/auth/auth-flow-model";
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

type AuthInvitationFieldProps = {
  code: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  preview: InvitationPreviewView | null;
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
  hasInvitation: boolean;
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
  contactType: RegisterContactType;
  countryDialCode: string;
  displayName: string;
  onAvatarChange: (avatarUrl: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onContactChange: (value: string) => void;
  onContactTypeChange: (value: RegisterContactType) => void;
  onCountryDialCodeChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  password: string;
  phoneCountryOptions: RegisterPhoneCountryOption[];
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
  contactType,
  countryDialCode,
  displayName,
  onAvatarChange,
  onConfirmPasswordChange,
  onContactChange,
  onContactTypeChange,
  onCountryDialCodeChange,
  onDisplayNameChange,
  onPasswordChange,
  onSubmit,
  password,
  phoneCountryOptions,
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
      <div className="auth-contact-field">
        <span>账号类型</span>
        <div className="auth-contact-mode" role="tablist" aria-label="注册账号类型">
          <button
            type="button"
            className={contactType === "email" ? "active" : ""}
            onClick={() => onContactTypeChange("email")}
          >
            邮箱
          </button>
          <button
            type="button"
            className={contactType === "mobile" ? "active" : ""}
            onClick={() => onContactTypeChange("mobile")}
          >
            手机号
          </button>
        </div>
        {contactType === "email" ? (
          <label>
            <span>邮箱</span>
            <input
              value={contact}
              onChange={(event) => onContactChange(event.target.value)}
              placeholder="请输入有效邮箱"
              inputMode="email"
            />
          </label>
        ) : (
          <div className="auth-phone-row">
            <label>
              <span>国家/地区</span>
              <select
                value={countryDialCode}
                onChange={(event) => onCountryDialCodeChange(event.target.value)}
              >
                {phoneCountryOptions.map((option) => (
                  <option value={option.dialCode} key={option.country}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>手机号</span>
              <input
                value={contact}
                onChange={(event) => onContactChange(event.target.value)}
                placeholder="请输入手机号"
                inputMode="tel"
              />
            </label>
          </div>
        )}
      </div>
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

export function AuthInvitationField({
  code,
  onChange,
  onSubmit,
  preview,
}: AuthInvitationFieldProps) {
  return (
    <section className="auth-invitation">
      <strong>邀请码（可选）</strong>
      <p>已有账号可登录后加入被邀请的企业，不会修改已加入企业的角色。</p>
      <label className="auth-invitation-field">
        <span>邀请码（可选）</span>
        <input
          value={code}
          onChange={(event) => onChange(event.target.value)}
          placeholder="输入员工邀请码"
          onKeyDown={(event) => submitOnEnter(event, onSubmit)}
        />
      </label>
      {preview && <AuthInvitationPreviewCard preview={preview} />}
    </section>
  );
}

function AuthInvitationPreviewCard({ preview }: { preview: InvitationPreviewView }) {
  if (preview.kind === "loading") {
    return (
      <div className="auth-invitation-preview-card loading">
        <span className="auth-invitation-preview-mark">...</span>
        <span>
          <strong>{preview.title}</strong>
          <em>{preview.message}</em>
        </span>
      </div>
    );
  }
  if (preview.kind === "error") {
    return (
      <div className="auth-invitation-preview-card error">
        <span className="auth-invitation-preview-mark">!</span>
        <span>
          <strong>{preview.title}</strong>
          <em>{preview.message}</em>
        </span>
      </div>
    );
  }
  return (
    <div className="auth-invitation-preview-card ready">
      {preview.logoUrl ? (
        <img className="auth-invitation-preview-logo" src={preview.logoUrl} alt="" />
      ) : (
        <span className="auth-invitation-preview-logo fallback">
          {preview.name.slice(0, 1)}
        </span>
      )}
      <span className="auth-invitation-preview-main">
        <strong>{preview.title}</strong>
        <b>{preview.name}</b>
        <em>{preview.codeText}</em>
        <small>{preview.description}</small>
        {preview.badges.length > 0 && (
          <span className="auth-invitation-preview-badges">
            {preview.badges.map((badge) => (
              <i key={badge}>{badge}</i>
            ))}
          </span>
        )}
      </span>
    </div>
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
  hasInvitation,
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
      : hasInvitation
        ? mode === "register"
          ? "注册并加入企业"
          : "登录并加入企业"
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
