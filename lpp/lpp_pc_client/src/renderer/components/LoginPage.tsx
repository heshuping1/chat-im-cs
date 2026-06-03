import { useEffect, useMemo, useRef, useState } from "react";
import {
  ApiClient,
  type CaptchaChallenge,
  type PlatformLoginResult,
  type PlatformTenant,
  type TenantAuthResult,
} from "../data/api-client";
import {
  AuthAdvancedSettings,
  AuthModeSwitch,
  AuthSpacePicker,
  AuthSubmitButton,
  CaptchaField,
  LoginFields,
  RegisterFields,
} from "./auth/AuthPageParts";
import {
  createAuthSpaceChoices,
  createRegisterContactPayload,
  getAuthTenantRoleLabel,
  inferLoginType,
  isCaptchaRequired,
  mapAuthErrorMessage,
  selectAutoTenantId,
  validateRegisterForm,
  type AuthMode,
} from "../data/auth/auth-flow-model";
import { useSetAuthSession } from "../data/auth/auth-store";
import { defaultApiBaseUrl, createTraceId } from "../data/runtime";
import { primarySiteBaseUrl, primarySiteLine, siteLineManager } from "../data/network/site-line-manager";

type PendingLogin = {
  baseUrl: string;
  login: PlatformLoginResult;
  mode: AuthMode;
};

export function LoginPage() {
  const setAuthSession = useSetAuthSession();
  const defaultTenantId = (import.meta.env.VITE_TENANT_ID as string | undefined) || "";
  const apiBaseUrlTouched = useRef(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const [apiBaseUrl, setApiBaseUrl] = useState(
    () => siteLineManager.getSnapshot().currentSite.apiBaseUrl || defaultApiBaseUrl,
  );
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerContact, setRegisterContact] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirm, setRegisterConfirm] = useState("");
  const [tenantId, setTenantId] = useState(defaultTenantId);
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
        password: registerPassword,
        confirmPassword: registerConfirm,
      }),
    [registerConfirm, registerContact, registerName, registerPassword],
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

  useEffect(() => {
    const unsubscribe = siteLineManager.subscribe(() => {
        if (apiBaseUrlTouched.current) return;
        setApiBaseUrl(siteLineManager.getSnapshot().currentSite.apiBaseUrl || defaultApiBaseUrl);
      });
    return () => {
      unsubscribe();
    };
  }, []);

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
      setError("请输入安全验证答案");
      return;
    }
    if (mode === "register" && registerValidation) {
      setError(registerValidation);
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
      await resolveLoginResult(baseUrl, login, "login");
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
      const contactPayload = createRegisterContactPayload(registerContact);
      const client = new ApiClient({
        baseUrl,
        traceId: createTraceId("pc-register"),
      });
      await client.platformRegister({
        displayName: registerName.trim(),
        password: registerPassword,
        ...contactPayload,
        captchaToken: captchaInput.captchaToken,
        captchaAnswer: captchaInput.captchaAnswer,
        verificationCode: null,
        tenantId: tenantId.trim() || null,
      });
      setNotice("注册成功，正在进入账号");
      const login = await new ApiClient({
        baseUrl,
        traceId: createTraceId("pc-register-login"),
      }).platformLogin({
        identifier: registerContact.trim(),
        password: registerPassword,
        loginType: inferLoginType(registerContact),
      });
      await resolveLoginResult(baseUrl, login, "register");
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
  ) => {
    setCaptcha(null);
    setCaptchaAnswer("");
    if (login.accessToken) {
      await applyDirectSession(baseUrl, login);
      return;
    }
    if (!login.platformToken) {
      setError(
        sourceMode === "register"
          ? "注册成功，但当前账号还没有可进入空间，请联系管理员加入企业后再登录"
          : "登录成功，但没有可进入空间，请确认账号已加入企业",
      );
      return;
    }
    const selectedTenantId = selectAutoTenantId(login, tenantId);
    if (selectedTenantId) {
      await selectTenantSpace({ baseUrl, login, tenantId: selectedTenantId });
      return;
    }
    if ((login.tenants?.length ?? 0) > 1) {
      setPendingLogin({ baseUrl, login, mode: sourceMode });
      setNotice(sourceMode === "register" ? "注册成功，请选择进入空间" : "请选择进入空间");
      return;
    }
    await enterPersonalSpace(baseUrl, login, sourceMode);
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
      setError(mapAuthErrorMessage(err, pendingLogin.mode));
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
          ? "注册成功，但当前账号还没有可进入空间，请联系管理员加入企业后再登录"
          : "登录成功，但没有可进入空间，请确认账号已加入企业",
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
      setError("需要完成安全验证");
      return;
    }
    setError(mapAuthErrorMessage(err, actionMode));
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
      setError("获取安全验证失败，请重试");
    }
  };

  const applyDirectSession = async (baseUrl: string, login: PlatformLoginResult) => {
    const [profile, tenantInfo] = await Promise.all([
      fetchSessionProfile(baseUrl, login.accessToken ?? ""),
      fetchTenantInfo(baseUrl, login.accessToken ?? ""),
    ]);
    const isPersonal = login.spaceContext?.spaceType === 1;
    const loginSite = rememberLoginSite(baseUrl);
    setAuthSession({
      apiBaseUrl: baseUrl,
      adminBaseUrl: loginSite.adminBaseUrl,
      tenantToken: login.accessToken ?? "",
      platformToken: login.platformToken,
      platformRefreshToken: login.platformRefreshToken,
      refreshToken: login.refreshToken,
      tenantId: login.tenantId ?? tenantInfo?.tenantId,
      tenantCode: isPersonal ? undefined : tenantInfo?.tenantCode,
      tenantName: isPersonal ? "个人空间" : tenantInfo?.tenantName,
      tenantLogoUrl: isPersonal ? undefined : tenantInfo?.logoUrl,
      userId: profile?.userId ?? login.userId,
      platformUserId: profile?.platformUserId ?? login.platformUserId,
      lppId: profile?.lppId ?? login.lppId,
      displayName: profile?.displayName ?? login.displayName,
      avatarUrl: profile?.avatarUrl,
      userType: profile?.userType ?? login.userType ?? undefined,
      spaceType: login.spaceContext?.spaceType,
      membershipRole: undefined,
      roleLabel: isPersonal ? "个人空间" : "租户账号",
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
    const loginSite = rememberLoginSite(baseUrl);
    setAuthSession({
      apiBaseUrl: baseUrl,
      adminBaseUrl: loginSite.adminBaseUrl,
      tenantToken: tenant.accessToken,
      platformToken: login.platformToken,
      platformRefreshToken: login.platformRefreshToken,
      refreshToken: tenant.refreshToken,
      tenantId: tenant.tenantId ?? currentTenant?.tenantId ?? selectedTenant?.tenantId,
      tenantCode: isPersonal ? undefined : currentTenant?.tenantCode ?? selectedTenant?.tenantCode,
      tenantName: isPersonal
        ? "个人空间"
        : currentTenant?.tenantName ?? selectedTenant?.tenantName ?? "企业空间",
      tenantLogoUrl: isPersonal ? undefined : currentTenant?.logoUrl ?? selectedTenant?.logoUrl,
      userId: profile?.userId ?? tenant.userId,
      platformUserId: profile?.platformUserId ?? tenant.platformUserId,
      lppId: profile?.lppId ?? tenant.lppId,
      displayName: profile?.displayName ?? tenant.displayName,
      avatarUrl: profile?.avatarUrl ?? tenant.avatarUrl,
      userType: profile?.userType ?? login.userType ?? undefined,
      spaceType: tenant.spaceContext?.spaceType ?? (isPersonal ? 1 : 2),
      membershipRole: isPersonal ? undefined : selectedTenant?.membershipRole,
      roleLabel: isPersonal ? "个人空间" : getAuthTenantRoleLabel(selectedTenant?.membershipRole),
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
          <h1>LPP PC 客服客户端</h1>
          <p>进入消息、在线客服和客户工作台。</p>
        </div>

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
            confirmPassword={registerConfirm}
            contact={registerContact}
            displayName={registerName}
            onConfirmPasswordChange={setRegisterConfirm}
            onContactChange={setRegisterContact}
            onDisplayNameChange={setRegisterName}
            onPasswordChange={setRegisterPassword}
            onSubmit={() => void submitForm()}
            password={registerPassword}
          />
        )}

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
          defaultOpen={Boolean(defaultTenantId)}
          onApiBaseUrlChange={(value) => {
            apiBaseUrlTouched.current = true;
            setApiBaseUrl(value);
          }}
          onTenantIdChange={setTenantId}
          tenantId={tenantId}
        />

        {notice && <p className="auth-notice">{notice}</p>}
        {error && <p className="form-error">{error}</p>}
        <AuthSubmitButton
          captchaVisible={Boolean(captcha)}
          disabled={!canSubmit || submitting}
          mode={mode}
          onSubmit={() => void submitForm()}
          submitting={submitting}
        />
      </section>
    </main>
  );
}

function rememberLoginSite(baseUrl: string) {
  if (baseUrl.replace(/\/$/, "") === primarySiteBaseUrl) {
    return siteLineManager.selectSite(primarySiteLine);
  }
  return siteLineManager.selectSite({
    id: baseUrl,
    name: "当前登录线路",
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
