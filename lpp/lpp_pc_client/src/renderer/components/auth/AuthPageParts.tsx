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
import { useI18n } from "../../i18n/useI18n";

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
  const { t } = useI18n();
  return (
    <div className="auth-mode-switch" role="tablist" aria-label={t("auth.accountEntry")}>
      <button
        type="button"
        className={mode === "login" ? "active" : ""}
        onClick={() => onChange("login")}
      >
        {t("auth.login")}
      </button>
      <button
        type="button"
        className={mode === "register" ? "active" : ""}
        onClick={() => onChange("register")}
      >
        {t("auth.register")}
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
  const { t } = useI18n();
  return (
    <label className="captcha-inline" aria-label={t("auth.captcha")}>
      <span>{t("auth.captcha")}</span>
      <div className="captcha-inline-row">
        <span className="captcha-inline-question">
          {captcha.question || t("auth.captchaQuestionFallback")}
        </span>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={t("auth.captchaAnswerPlaceholder")}
          autoFocus
          onKeyDown={(event) => submitOnEnter(event, onSubmit)}
        />
        <button type="button" onClick={onRefresh} disabled={disabled}>
          {t("auth.captchaRefresh")}
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
  const { t } = useI18n();
  return (
    <>
      <label>
        <span>{t("auth.identifier")}</span>
        <input
          value={identifier}
          onChange={(event) => onIdentifierChange(event.target.value)}
          placeholder={t("auth.identifierPlaceholder")}
          autoComplete="off"
          autoFocus
        />
      </label>
      <label>
        <span>{t("auth.password")}</span>
        <input
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          placeholder={t("auth.passwordPlaceholder")}
          type="password"
          autoComplete="new-password"
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
  const { t } = useI18n();
  const [showAllAvatarOptions, setShowAllAvatarOptions] = useState(false);
  const visibleAvatarOptions = showAllAvatarOptions
    ? avatarOptions
    : avatarOptions.slice(0, 12);
  const hiddenAvatarCount = Math.max(avatarOptions.length - visibleAvatarOptions.length, 0);

  return (
    <>
      <fieldset className="auth-avatar-picker">
        <legend>{t("auth.avatar")}</legend>
        <div className="auth-avatar-grid">
          {visibleAvatarOptions.map((avatar) => {
            const selected = avatar.avatarUrl === selectedAvatarUrl;
            const avatarName = t(avatar.labelKey);
            return (
              <button
                type="button"
                className={`auth-avatar-option ${selected ? "selected" : ""}`}
                aria-label={t("auth.chooseAvatarNamed", { name: avatarName })}
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
            {showAllAvatarOptions
              ? t("auth.collapseAvatars")
              : t("auth.moreAvatars", { count: hiddenAvatarCount })}
          </button>
        )}
      </fieldset>
      <label>
        <span>{t("auth.displayName")}</span>
        <input
          value={displayName}
          onChange={(event) => onDisplayNameChange(event.target.value)}
          placeholder={t("auth.displayNamePlaceholder")}
          autoFocus
        />
      </label>
      <div className="auth-contact-field">
        <span>{t("auth.accountType")}</span>
        <div className="auth-contact-mode" role="tablist" aria-label={t("auth.registerAccountType")}>
          <button
            type="button"
            className={contactType === "email" ? "active" : ""}
            onClick={() => onContactTypeChange("email")}
          >
            {t("auth.email")}
          </button>
          <button
            type="button"
            className={contactType === "mobile" ? "active" : ""}
            onClick={() => onContactTypeChange("mobile")}
          >
            {t("auth.mobile")}
          </button>
        </div>
        {contactType === "email" ? (
          <label>
            <span>{t("auth.email")}</span>
            <input
              value={contact}
              onChange={(event) => onContactChange(event.target.value)}
              placeholder={t("auth.emailPlaceholder")}
              inputMode="email"
            />
          </label>
        ) : (
          <div className="auth-phone-row">
            <label>
              <span>{t("auth.countryRegion")}</span>
              <select
                value={countryDialCode}
                onChange={(event) => onCountryDialCodeChange(event.target.value)}
              >
                {phoneCountryOptions.map((option) => (
                  <option value={option.dialCode} key={option.country}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("auth.mobile")}</span>
              <input
                value={contact}
                onChange={(event) => onContactChange(event.target.value)}
                placeholder={t("auth.mobilePlaceholder")}
                inputMode="tel"
              />
            </label>
          </div>
        )}
      </div>
      <label>
        <span>{t("auth.password")}</span>
        <input
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          placeholder={t("auth.registerPasswordPlaceholder")}
          type="password"
        />
      </label>
      <label>
        <span>{t("auth.confirmPassword")}</span>
        <input
          value={confirmPassword}
          onChange={(event) => onConfirmPasswordChange(event.target.value)}
          placeholder={t("auth.confirmPasswordPlaceholder")}
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
  const { t } = useI18n();
  return (
    <details className="auth-advanced" open={defaultOpen}>
      <summary>{t("auth.advancedSettings")}</summary>
      <label>
        <span>{t("auth.serviceUrlAdvanced")}</span>
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
  const { t } = useI18n();
  return (
    <section className="auth-invitation">
      <strong>{t("auth.invitationOptional")}</strong>
      <p>{t("auth.invitationHelp")}</p>
      <label className="auth-invitation-field">
        <span>{t("auth.invitationOptional")}</span>
        <input
          value={code}
          onChange={(event) => onChange(event.target.value)}
          placeholder={t("auth.invitationPlaceholder")}
          onKeyDown={(event) => submitOnEnter(event, onSubmit)}
        />
      </label>
      {preview && <AuthInvitationPreviewCard preview={preview} />}
    </section>
  );
}

function AuthInvitationPreviewCard({ preview }: { preview: InvitationPreviewView }) {
  const { t } = useI18n();
  const authText = (value: string) => (value.startsWith("auth.") ? t(value) : value);
  if (preview.kind === "loading") {
    return (
      <div className="auth-invitation-preview-card loading">
        <span className="auth-invitation-preview-mark">...</span>
        <span>
          <strong>{authText(preview.title)}</strong>
          <em>{authText(preview.message)}</em>
        </span>
      </div>
    );
  }
  if (preview.kind === "error") {
    return (
      <div className="auth-invitation-preview-card error">
        <span className="auth-invitation-preview-mark">!</span>
        <span>
          <strong>{authText(preview.title)}</strong>
          <em>{authText(preview.message)}</em>
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
          {authText(preview.name).slice(0, 1)}
        </span>
      )}
      <span className="auth-invitation-preview-main">
        <strong>{authText(preview.title)}</strong>
        <b>{authText(preview.name)}</b>
        <em>{preview.codeText}</em>
        <small>{authText(preview.description)}</small>
        {preview.badges.length > 0 && (
          <span className="auth-invitation-preview-badges">
            {preview.badges.map((badge) => (
              <i key={badge}>{authText(badge)}</i>
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
  const { t } = useI18n();
  const authText = (value: string) => (value.startsWith("auth.") ? t(value) : value);
  return (
    <main className="login-page">
      <section className="login-panel auth-panel">
        <button type="button" className="auth-back-button" onClick={onBack}>
          {t("auth.back")}
        </button>
        <div className="auth-panel-heading">
          <h1>{t("auth.chooseSpaceTitle")}</h1>
          <p>{t("auth.chooseSpaceSubtitle")}</p>
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
              <span className="auth-space-avatar">{authText(space.name).slice(0, 1)}</span>
              <span className="auth-space-main">
                <strong>{authText(space.name)}</strong>
                <em>{space.code}</em>
              </span>
              <span className="auth-space-role">{authText(space.roleLabel)}</span>
              <span className="auth-space-action">
                {submittingId === space.id ? t("auth.entering") : t("auth.enter")}
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
  const { t } = useI18n();
  const text = submitting
    ? mode === "register"
      ? t("auth.registering")
      : t("auth.loggingIn")
    : captchaVisible
      ? t("auth.verifyAndContinue")
      : hasInvitation
        ? mode === "register"
          ? t("auth.registerAndJoin")
          : t("auth.loginAndJoin")
      : mode === "register"
        ? t("auth.registerAndEnter")
        : t("auth.login");
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
