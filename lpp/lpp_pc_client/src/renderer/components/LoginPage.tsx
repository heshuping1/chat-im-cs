import { useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  ApiClient,
  type CaptchaChallenge,
  type PlatformInvitationPreviewDto,
  type PlatformLoginResult,
  type PlatformTenant,
  type TenantAuthResult,
} from "../data/api-client";
import {
  AuthAdvancedSettings,
  AuthInvitationField,
  AuthModeSwitch,
  AuthSpacePicker,
  AuthSubmitButton,
  CaptchaField,
  LoginFields,
  RegisterFields,
} from "./auth/AuthPageParts";
import {
  createAuthSpaceChoices,
  createInvitationPreviewErrorView,
  createInvitationPreviewLoadingView,
  createInvitationPreviewView,
  createRegisterContactPayload,
  getAuthTenantRoleLabel,
  inferLoginType,
  isCaptchaRequired,
  mapAuthErrorMessage,
  normalizeInvitationCode,
  registerPhoneCountryOptions,
  selectAutoTenantId,
  shouldContinueAfterInvitationPreviewError,
  validateRegisterForm,
  type InvitationPreviewView,
  type RegisterContactType,
  type AuthMode,
} from "../data/auth/auth-flow-model";
import { registerAvatarOptions } from "../data/auth/register-avatar-options";
import { useSetAuthSession } from "../data/auth/auth-store";
import { writeRendererAppLog } from "../data/logging/app-log";
import { defaultApiBaseUrl, createTraceId } from "../data/runtime";
import { primarySiteBaseUrl, primarySiteLine, siteLineManager } from "../data/network/site-line-manager";
import { localeLabels, supportedLocales } from "../i18n/locales";
import { useI18n } from "../i18n/useI18n";

type PendingLogin = {
  baseUrl: string;
  login: PlatformLoginResult;
  mode: AuthMode;
};

type InvitationFlowContext = {
  code: string;
  preview: PlatformInvitationPreviewDto | null;
};

export function LoginPage() {
  const setAuthSession = useSetAuthSession();
  const { locale, setLocale, t } = useI18n();
  const apiBaseUrlTouched = useRef(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const [apiBaseUrl, setApiBaseUrl] = useState(
    () => siteLineManager.getSnapshot().currentSite.apiBaseUrl || defaultApiBaseUrl,
  );
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerContactType, setRegisterContactType] = useState<RegisterContactType>("email");
  const [registerCountryDialCode, setRegisterCountryDialCode] = useState("+86");
  const [registerContact, setRegisterContact] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirm, setRegisterConfirm] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [invitationPreview, setInvitationPreview] = useState<InvitationPreviewView | null>(null);
  const [selectedRegisterAvatarUrl, setSelectedRegisterAvatarUrl] = useState(
    () => registerAvatarOptions[0]?.avatarUrl ?? "",
  );
  const [captcha, setCaptcha] = useState<CaptchaChallenge | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [spaceSubmittingId, setSpaceSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingLogin, setPendingLogin] = useState<PendingLogin | null>(null);

  const registerValidation = useMemo(
    () =>
      validateRegisterForm({
        displayName: registerName,
        contact: registerContact,
        contactType: registerContactType,
        countryDialCode: registerCountryDialCode,
        password: registerPassword,
        confirmPassword: registerConfirm,
      }),
    [registerConfirm, registerContact, registerContactType, registerCountryDialCode, registerName, registerPassword],
  );
  const canSubmit = useMemo(() => {
    if (!apiBaseUrl.trim() || pendingLogin) return false;
    if (captcha && !captchaAnswer.trim()) return false;
    if (mode === "login") return Boolean(identifier.trim() && password);
    return registerValidation === null;
  }, [
    apiBaseUrl,
    captcha,
    captchaAnswer,
    identifier,
    mode,
    password,
    pendingLogin,
    registerValidation,
  ]);
  const spaceChoices = useMemo(
    () => (pendingLogin ? createAuthSpaceChoices(pendingLogin.login) : []),
    [pendingLogin],
  );
  const hasInvitation = Boolean(normalizeInvitationCode(invitationCode));

  useEffect(() => {
    const unsubscribe = siteLineManager.subscribe(() => {
        if (apiBaseUrlTouched.current) return;
        setApiBaseUrl(siteLineManager.getSnapshot().currentSite.apiBaseUrl || defaultApiBaseUrl);
      });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const code = normalizeInvitationCode(invitationCode);
    if (!code) {
      setInvitationPreview(null);
      return;
    }
    if (code.length < 6) {
      setInvitationPreview(null);
      return;
    }
    let active = true;
    setInvitationPreview(createInvitationPreviewLoadingView());
    const timer = window.setTimeout(() => {
      const baseUrl = normalizeBaseUrl(apiBaseUrl);
      new ApiClient({
        baseUrl,
        traceId: createTraceId("pc-invitation-preview"),
      })
        .getPlatformInvitationPreview(code)
        .then((preview) => {
          if (!active) return;
          setInvitationPreview(createInvitationPreviewView(preview));
        })
        .catch((previewError) => {
          if (!active) return;
          setInvitationPreview(createInvitationPreviewErrorView(previewError));
        });
    }, 450);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [apiBaseUrl, invitationCode]);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    setNotice(null);
    setCaptcha(null);
    setCaptchaAnswer("");
    setPendingLogin(null);
  };

  const submitForm = async () => {
    if (captcha && !captchaAnswer.trim()) {
      setError(t("auth.captchaAnswerMissing"));
      return;
    }
    if (mode === "register" && registerValidation) {
      setError(t(registerValidation));
      return;
    }
    const captchaInput = captcha
      ? {
          captchaToken: captcha.token,
          captchaAnswer: captchaAnswer.trim(),
          allowAutoCaptcha: false,
        }
      : { allowAutoCaptcha: true };
    if (mode === "register") {
      await submitRegister(captchaInput);
      return;
    }
    await submitLogin(captchaInput);
  };

  const submitLogin = async (captchaInput: {
    allowAutoCaptcha?: boolean;
    captchaAnswer?: string;
    captchaToken?: string;
  }) => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const baseUrl = normalizeBaseUrl(apiBaseUrl);
      const invitation = await prepareInvitation(baseUrl);
      const login = await new ApiClient({
        baseUrl,
        traceId: createTraceId("pc-login"),
      }).platformLogin({
        identifier: identifier.trim(),
        password,
        loginType: inferLoginType(identifier),
        captchaToken: captchaInput.captchaToken,
        captchaAnswer: captchaInput.captchaAnswer,
      });
      await resolveLoginResult(baseUrl, login, "login", invitation);
    } catch (err) {
      await handleAuthError(err, "login", captchaInput.allowAutoCaptcha);
    } finally {
      setSubmitting(false);
    }
  };

  const submitRegister = async (captchaInput: {
    allowAutoCaptcha?: boolean;
    captchaAnswer?: string;
    captchaToken?: string;
  }) => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const baseUrl = normalizeBaseUrl(apiBaseUrl);
      const invitation = await prepareInvitation(baseUrl);
      const contactPayload = createRegisterContactPayload(registerContact, {
        type: registerContactType,
        countryDialCode: registerCountryDialCode,
      });
      const client = new ApiClient({
        baseUrl,
        traceId: createTraceId("pc-register"),
      });
      await client.platformRegister({
        displayName: registerName.trim(),
        password: registerPassword,
        avatarUrl: selectedRegisterAvatarUrl,
        ...contactPayload,
        captchaToken: captchaInput.captchaToken,
        captchaAnswer: captchaInput.captchaAnswer,
        verificationCode: null,
      });
      setNotice(
        invitation
          ? t("auth.registeredAcceptingInvitation")
          : t("auth.registeredEnteringAccount"),
      );
      const login = await new ApiClient({
        baseUrl,
        traceId: createTraceId("pc-register-login"),
      }).platformLogin({
        identifier: contactPayload.email ?? contactPayload.mobile ?? registerContact.trim(),
        password: registerPassword,
        loginType: inferLoginType(contactPayload.email ?? contactPayload.mobile ?? registerContact),
      });
      await resolveLoginResult(baseUrl, login, "register", invitation);
    } catch (err) {
      await handleAuthError(err, "register", captchaInput.allowAutoCaptcha);
    } finally {
      setSubmitting(false);
    }
  };

  const resolveLoginResult = async (
    baseUrl: string,
    login: PlatformLoginResult,
    sourceMode: AuthMode,
    invitation: InvitationFlowContext | null = null,
  ) => {
    setCaptcha(null);
    setCaptchaAnswer("");
    if (invitation?.code && login.accessToken && !login.platformToken) {
      setError(t("auth.invitationCannotBeAccepted"));
      return;
    }
    if (login.accessToken) {
      await applyDirectSession(baseUrl, login);
      return;
    }
    if (!login.platformToken) {
      setError(
        sourceMode === "register"
          ? t("auth.registeredNoSpace")
          : t("auth.loggedInNoSpace"),
      );
      return;
    }
    if (invitation?.code) {
      await acceptInvitation(baseUrl, login, invitation);
      return;
    }
    const selectedTenantId = selectAutoTenantId(login);
    if (selectedTenantId) {
      await selectTenantSpace({ baseUrl, login, tenantId: selectedTenantId });
      return;
    }
    if ((login.tenants?.length ?? 0) > 1) {
      setPendingLogin({ baseUrl, login, mode: sourceMode });
      setNotice(
        sourceMode === "register"
          ? t("auth.registeredChooseSpace")
          : t("auth.chooseSpaceNotice"),
      );
      return;
    }
    await enterPersonalSpace(baseUrl, login, sourceMode);
  };

  const prepareInvitation = async (baseUrl: string): Promise<InvitationFlowContext | null> => {
    const code = normalizeInvitationCode(invitationCode);
    if (!code) return null;
    try {
      const preview = await new ApiClient({
        baseUrl,
        traceId: createTraceId("pc-invitation-preview"),
      }).getPlatformInvitationPreview(code);
      setInvitationPreview(createInvitationPreviewView(preview));
      if (preview.tenantName) {
        setNotice(t("auth.willJoinTenant", { name: preview.tenantName }));
      }
      return { code, preview };
    } catch (previewError) {
      if (!shouldContinueAfterInvitationPreviewError(previewError)) {
        throw previewError;
      }
      setInvitationPreview(createInvitationPreviewErrorView(previewError));
      setNotice(t("auth.acceptInvitationAfterLogin"));
      return { code, preview: null };
    }
  };

  const acceptInvitation = async (
    baseUrl: string,
    login: PlatformLoginResult,
    invitation: InvitationFlowContext,
  ) => {
    if (!login.platformToken) throw new Error("missing platform token");
    try {
      setNotice(t("auth.acceptingInvitation"));
      const tenant = await new ApiClient({
        baseUrl,
        platformToken: login.platformToken,
        traceId: createTraceId("pc-invitation-accept"),
      }).acceptPlatformInvitation(invitation.code);
      setNotice(t("auth.joinedEnteringWorkbench"));
      await applySelectedTenantSession(baseUrl, login, tenant, null);
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.code === "TENANT_ALREADY_MEMBER" &&
        invitation.preview?.tenantId
      ) {
        setNotice(t("auth.alreadyMemberRoleUnchanged"));
        await selectTenantSpace({
          baseUrl,
          login,
          tenantId: invitation.preview.tenantId,
        });
        return;
      }
      throw err;
    }
  };

  const handleSelectTenant = async (selectedTenantId: string) => {
    if (!pendingLogin) return;
    setSpaceSubmittingId(selectedTenantId);
    setError(null);
    try {
      await selectTenantSpace({
        baseUrl: pendingLogin.baseUrl,
        login: pendingLogin.login,
        tenantId: selectedTenantId,
      });
    } catch (err) {
      setError(t(mapAuthErrorMessage(err, pendingLogin.mode)));
    } finally {
      setSpaceSubmittingId(null);
    }
  };

  const selectTenantSpace = async ({
    baseUrl,
    login,
    tenantId: selectedTenantId,
  }: {
    baseUrl: string;
    login: PlatformLoginResult;
    tenantId: string;
  }) => {
    if (!login.platformToken) throw new Error("missing platform token");
    const tenant = await new ApiClient({
      baseUrl,
      platformToken: login.platformToken,
      traceId: createTraceId("pc-select-tenant"),
    }).selectTenant(selectedTenantId);
    const tenantInfo = login.tenants?.find((item) => item.tenantId === selectedTenantId);
    logAuthRoleEvent("auth.select-tenant.response", {
      tenantId: selectedTenantId,
      loginTenantRole: tenantInfo?.membershipRole ?? null,
      tenantRole: tenant.membershipRole ?? null,
      userType: login.userType ?? null,
    });
    await applySelectedTenantSession(baseUrl, login, tenant, tenantInfo);
  };

  const enterPersonalSpace = async (
    baseUrl: string,
    login: PlatformLoginResult,
    sourceMode: AuthMode,
  ) => {
    try {
      const tenant = await new ApiClient({
        baseUrl,
        platformToken: login.platformToken,
        traceId: createTraceId("pc-select-personal-space"),
      }).selectPersonalSpace();
      await applySelectedTenantSession(baseUrl, login, tenant, null, true);
    } catch {
      setError(
        sourceMode === "register"
          ? t("auth.registeredNoSpace")
          : t("auth.loggedInNoSpace"),
      );
    }
  };

  const handleAuthError = async (
    err: unknown,
    actionMode: AuthMode,
    allowAutoCaptcha = false,
  ) => {
    if (isCaptchaRequired(err) && allowAutoCaptcha) {
      await handleCaptchaChallenge();
      setError(t("auth.captchaRequired"));
      return;
    }
    setError(t(mapAuthErrorMessage(err, actionMode)));
  };

  const handleCaptchaChallenge = async () => {
    try {
      const challenge = await new ApiClient({
        baseUrl: normalizeBaseUrl(apiBaseUrl),
        traceId: createTraceId("pc-captcha"),
      }).generateCaptcha();
      setCaptcha(challenge);
      setCaptchaAnswer("");
    } catch {
      setError(t("auth.captchaLoadFailed"));
    }
  };

  const applyDirectSession = async (baseUrl: string, login: PlatformLoginResult) => {
    const [profile, tenantInfo] = await Promise.all([
      fetchSessionProfile(baseUrl, login.accessToken ?? ""),
      fetchTenantInfo(baseUrl, login.accessToken ?? ""),
    ]);
    const isPersonal = login.spaceContext?.spaceType === 1;
    const loginSite = rememberLoginSite(baseUrl, t("auth.currentLoginLine"));
    const selectedTenant = login.tenants?.find((item) => item.tenantId === login.tenantId);
    logAuthRoleEvent("auth.direct-session.apply", {
      tenantId: isPersonal ? null : login.tenantId ?? tenantInfo?.tenantId ?? null,
      loginTenantRole: selectedTenant?.membershipRole ?? null,
      tenantRole: null,
      sessionRole: null,
      userType: profile?.userType ?? login.userType ?? null,
      roleLabel: isPersonal ? "personal" : "tenant-account",
    });
    setAuthSession({
      apiBaseUrl: baseUrl,
      adminBaseUrl: loginSite.adminBaseUrl,
      tenantToken: login.accessToken ?? "",
      platformToken: login.platformToken,
      platformRefreshToken: login.platformRefreshToken,
      refreshToken: login.refreshToken,
      tenantId: isPersonal ? undefined : login.tenantId ?? tenantInfo?.tenantId,
      tenantCode: isPersonal ? undefined : tenantInfo?.tenantCode,
      tenantName: isPersonal ? t("auth.personalSpace") : tenantInfo?.tenantName,
      tenantLogoUrl: isPersonal ? undefined : tenantInfo?.logoUrl,
      userId: profile?.userId ?? login.userId,
      platformUserId: profile?.platformUserId ?? login.platformUserId,
      lppId: profile?.lppId ?? login.lppId,
      displayName: profile?.displayName ?? login.displayName,
      avatarUrl: profile?.avatarUrl,
      userType: profile?.userType ?? login.userType ?? undefined,
      spaceType: login.spaceContext?.spaceType,
      membershipRole: undefined,
      roleLabel: isPersonal ? t("auth.personalSpace") : t("auth.tenantAccount"),
      tenants: login.tenants,
    });
  };

  const applySelectedTenantSession = async (
    baseUrl: string,
    login: PlatformLoginResult,
    tenant: TenantAuthResult,
    selectedTenant: PlatformTenant | null | undefined,
    isPersonal = false,
  ) => {
    const [profile, currentTenant] = await Promise.all([
      fetchSessionProfile(baseUrl, tenant.accessToken),
      isPersonal ? Promise.resolve(null) : fetchTenantInfo(baseUrl, tenant.accessToken),
    ]);
    const loginSite = rememberLoginSite(baseUrl, t("auth.currentLoginLine"));
    const resolvedRole = isPersonal ? undefined : tenant.membershipRole ?? selectedTenant?.membershipRole;
    logAuthRoleEvent("auth.session.apply-selected-tenant", {
      tenantId: isPersonal ? null : tenant.tenantId ?? currentTenant?.tenantId ?? selectedTenant?.tenantId ?? null,
      loginTenantRole: selectedTenant?.membershipRole ?? null,
      tenantRole: tenant.membershipRole ?? null,
      sessionRole: resolvedRole ?? null,
      userType: profile?.userType ?? login.userType ?? null,
      roleLabel: isPersonal ? "personal" : getAuthTenantRoleLabel(resolvedRole),
    });
    setAuthSession({
      apiBaseUrl: baseUrl,
      adminBaseUrl: loginSite.adminBaseUrl,
      tenantToken: tenant.accessToken,
      platformToken: login.platformToken,
      platformRefreshToken: login.platformRefreshToken,
      refreshToken: tenant.refreshToken,
      tenantId: isPersonal ? undefined : tenant.tenantId ?? currentTenant?.tenantId ?? selectedTenant?.tenantId,
      tenantCode: isPersonal ? undefined : currentTenant?.tenantCode ?? selectedTenant?.tenantCode,
      tenantName: isPersonal
        ? t("auth.personalSpace")
        : currentTenant?.tenantName ?? selectedTenant?.tenantName ?? t("auth.enterpriseSpace"),
      tenantLogoUrl: isPersonal ? undefined : currentTenant?.logoUrl ?? selectedTenant?.logoUrl,
      userId: profile?.userId ?? tenant.userId,
      platformUserId: profile?.platformUserId ?? tenant.platformUserId,
      lppId: profile?.lppId ?? tenant.lppId,
      displayName: profile?.displayName ?? tenant.displayName,
      avatarUrl: profile?.avatarUrl ?? tenant.avatarUrl,
      userType: profile?.userType ?? login.userType ?? undefined,
      spaceType: tenant.spaceContext?.spaceType ?? (isPersonal ? 1 : 2),
      membershipRole: resolvedRole,
      roleLabel: isPersonal
        ? t("auth.personalSpace")
        : getAuthTenantRoleLabel(resolvedRole),
      tenants: login.tenants,
    });
  };

  if (pendingLogin) {
    return (
      <AuthSpacePicker
        choices={spaceChoices}
        error={error}
        notice={notice}
        onBack={() => {
          setPendingLogin(null);
          setNotice(null);
          setError(null);
        }}
        onSelect={(spaceId) => void handleSelectTenant(spaceId)}
        submittingId={spaceSubmittingId}
      />
    );
  }

  return (
    <main className="login-page">
      <section className="login-panel auth-panel">
        <div className="auth-panel-heading">
          <h1>{t("app.title")}</h1>
          <p>{t("auth.subtitle")}</p>
        </div>

        <label className="auth-language-select">
          <span>{t("auth.language")}</span>
          <select
            value={locale}
            onChange={(event) => setLocale(event.target.value as typeof locale)}
          >
            {supportedLocales.map((option) => (
              <option value={option} key={option}>
                {localeLabels[option]}
              </option>
            ))}
          </select>
        </label>

        <AuthModeSwitch mode={mode} onChange={switchMode} />

        {mode === "login" ? (
          <LoginFields
            identifier={identifier}
            onIdentifierChange={setIdentifier}
            onPasswordChange={setPassword}
            onSubmit={() => void submitForm()}
            password={password}
          />
        ) : (
          <RegisterFields
            avatarOptions={registerAvatarOptions}
            confirmPassword={registerConfirm}
            contact={registerContact}
            contactType={registerContactType}
            countryDialCode={registerCountryDialCode}
            displayName={registerName}
            onAvatarChange={setSelectedRegisterAvatarUrl}
            onConfirmPasswordChange={setRegisterConfirm}
            onContactChange={setRegisterContact}
            onContactTypeChange={(value) => {
              setRegisterContactType(value);
              setRegisterContact("");
            }}
            onCountryDialCodeChange={setRegisterCountryDialCode}
            onDisplayNameChange={setRegisterName}
            onPasswordChange={setRegisterPassword}
            onSubmit={() => void submitForm()}
            password={registerPassword}
            phoneCountryOptions={registerPhoneCountryOptions}
            selectedAvatarUrl={selectedRegisterAvatarUrl}
          />
        )}

        <AuthInvitationField
          code={invitationCode}
          onChange={setInvitationCode}
          onSubmit={() => void submitForm()}
          preview={invitationPreview}
        />

        {captcha && (
          <CaptchaField
            captcha={captcha}
            disabled={submitting}
            onChange={setCaptchaAnswer}
            onRefresh={() => void handleCaptchaChallenge()}
            onSubmit={() => void submitForm()}
            value={captchaAnswer}
          />
        )}

        <AuthAdvancedSettings
          apiBaseUrl={apiBaseUrl}
          defaultOpen={false}
          onApiBaseUrlChange={(value) => {
            apiBaseUrlTouched.current = true;
            setApiBaseUrl(value);
          }}
        />

        {notice && <p className="auth-notice">{notice}</p>}
        {error && <p className="form-error">{error}</p>}
        <AuthSubmitButton
          captchaVisible={Boolean(captcha)}
          disabled={!canSubmit || submitting}
          hasInvitation={hasInvitation}
          mode={mode}
          onSubmit={() => void submitForm()}
          submitting={submitting}
        />
      </section>
    </main>
  );
}

function rememberLoginSite(baseUrl: string, currentLoginLine: string) {
  if (baseUrl.replace(/\/$/, "") === primarySiteBaseUrl) {
    return siteLineManager.selectSite(primarySiteLine);
  }
  return siteLineManager.selectSite({
    id: baseUrl,
    name: currentLoginLine,
    apiBaseUrl: baseUrl,
  });
}

async function fetchSessionProfile(baseUrl: string, tenantToken: string) {
  try {
    return await new ApiClient({
      baseUrl,
      tenantToken,
      traceId: createTraceId("pc-profile"),
    }).getMyProfile();
  } catch {
    return null;
  }
}

async function fetchTenantInfo(baseUrl: string, tenantToken: string) {
  try {
    return await new ApiClient({
      baseUrl,
      tenantToken,
      traceId: createTraceId("pc-tenant-info"),
    }).getTenantInfo();
  } catch {
    return null;
  }
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/$/, "");
}

function logAuthRoleEvent(event: string, context: Record<string, unknown>) {
  writeRendererAppLog({
    module: "auth",
    event,
    phase: "role",
    result: "ok",
    context,
  });
}
