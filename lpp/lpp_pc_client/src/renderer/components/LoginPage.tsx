import { useMemo, useState } from 'react';
import {
  ApiClient,
  ApiError,
  type CaptchaChallenge,
  type PlatformLoginResult,
} from '../data/api-client';
import { useSetAuthSession } from '../data/auth/auth-store';
import { defaultApiBaseUrl, createTraceId } from '../data/runtime';

function roleLabel(role?: number) {
  if (role === 4) return '所有者';
  if (role === 3) return '管理员';
  if (role === 2) return '客服';
  if (role === 1) return '技术支持';
  if (role === 0) return '成员';
  return '成员';
}

export function LoginPage() {
  const setAuthSession = useSetAuthSession();
  const [apiBaseUrl, setApiBaseUrl] = useState(defaultApiBaseUrl);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [tenantId, setTenantId] = useState(
    (import.meta.env.VITE_TENANT_ID as string | undefined) || '',
  );
  const [captcha, setCaptcha] = useState<CaptchaChallenge | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = useMemo(
    () =>
      Boolean(apiBaseUrl.trim() && identifier.trim() && password) &&
      (!captcha || Boolean(captchaAnswer.trim())),
    [apiBaseUrl, captcha, captchaAnswer, identifier, password],
  );

  const submit = async (captchaInput?: {
    captchaToken?: string;
    captchaAnswer?: string;
    allowAutoCaptcha?: boolean;
  }) => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const baseUrl = apiBaseUrl.trim().replace(/\/$/, '');
      const client = new ApiClient({
        baseUrl,
        traceId: createTraceId('pc-login'),
      });
      const login = await client.platformLogin({
        identifier: identifier.trim(),
        password,
        loginType: inferLoginType(identifier.trim()),
        captchaToken: captchaInput?.captchaToken,
        captchaAnswer: captchaInput?.captchaAnswer,
      });

      if (login.accessToken) {
        const profile = await fetchSessionProfile(baseUrl, login.accessToken);
        const tenantInfo = await fetchTenantInfo(baseUrl, login.accessToken);
        setAuthSession({
          apiBaseUrl: baseUrl,
          tenantToken: login.accessToken,
          platformToken: login.platformToken,
          platformRefreshToken: login.platformRefreshToken,
          refreshToken: login.refreshToken,
          tenantId: login.tenantId ?? tenantInfo?.tenantId,
          tenantCode: tenantInfo?.tenantCode,
          tenantName: tenantInfo?.tenantName,
          tenantLogoUrl: tenantInfo?.logoUrl,
          userId: profile?.userId ?? login.userId,
          platformUserId: profile?.platformUserId ?? login.platformUserId,
          lppId: profile?.lppId ?? login.lppId,
          displayName: profile?.displayName ?? login.displayName,
          avatarUrl: profile?.avatarUrl,
          roleLabel: '租户账号',
          tenants: login.tenants,
        });
        return;
      }

      const selectedTenantId = selectTenantId(login, tenantId.trim());
      if (!login.platformToken || !selectedTenantId) {
        setError('登录成功，但没有可进入的企业空间。请确认账号已加入企业。');
        return;
      }

      const tenant = await new ApiClient({
        baseUrl,
        platformToken: login.platformToken,
        traceId: createTraceId('pc-select-tenant'),
      }).selectTenant(selectedTenantId);
      const tenantInfo = login.tenants?.find(
        (item) => item.tenantId === selectedTenantId,
      );
      const profile = await fetchSessionProfile(baseUrl, tenant.accessToken);
      const currentTenant = await fetchTenantInfo(baseUrl, tenant.accessToken);

      setAuthSession({
        apiBaseUrl: baseUrl,
        tenantToken: tenant.accessToken,
        platformToken: login.platformToken,
        platformRefreshToken: login.platformRefreshToken,
        refreshToken: tenant.refreshToken,
        tenantId: tenant.tenantId,
        tenantCode: currentTenant?.tenantCode ?? tenantInfo?.tenantCode,
        tenantName: currentTenant?.tenantName ?? tenantInfo?.tenantName,
        tenantLogoUrl: currentTenant?.logoUrl ?? tenantInfo?.logoUrl,
        userId: profile?.userId ?? tenant.userId,
        platformUserId: profile?.platformUserId ?? tenant.platformUserId,
        lppId: profile?.lppId ?? tenant.lppId,
        displayName: profile?.displayName ?? tenant.displayName,
        avatarUrl: profile?.avatarUrl ?? tenant.avatarUrl,
        roleLabel: roleLabel(tenantInfo?.membershipRole),
        tenants: login.tenants,
      });
    } catch (err) {
      if (isCaptchaRequired(err) && captchaInput?.allowAutoCaptcha !== false) {
        await handleCaptchaChallenge();
        return;
      }
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCaptchaChallenge = async () => {
    try {
      const challenge = await new ApiClient({
        baseUrl: apiBaseUrl.trim().replace(/\/$/, ''),
        traceId: createTraceId('pc-captcha'),
      }).generateCaptcha();
      setCaptcha(challenge);
      setCaptchaAnswer('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取安全验证失败，请重试');
    }
  };

  const submitCaptcha = async () => {
    const answer = captchaAnswer.trim();
    if (!captcha || !answer) {
      setError('请输入安全验证答案');
      return;
    }
    await submit({
      captchaToken: captcha.token,
      captchaAnswer: answer,
      allowAutoCaptcha: false,
    });
  };

  const submitForm = async () => {
    if (captcha) {
      await submitCaptcha();
      return;
    }
    await submit({ allowAutoCaptcha: true });
  };

  return (
    <main className="login-page">
      <section className="login-panel">
        <div>
          <h1>LPP PC 客服客户端</h1>
        </div>

        <label>
          <span>服务地址</span>
          <input
            value={apiBaseUrl}
            onChange={(event) => setApiBaseUrl(event.target.value)}
            placeholder="https://chat.hearteasechat.com"
          />
        </label>
        <label>
          <span>LPP 号 / 邮箱 / 手机号</span>
          <input
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="lpp_gs9fn2c7"
          />
        </label>
        <label>
          <span>密码</span>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="请输入密码"
            type="password"
            onKeyDown={(event) => {
              if (event.key === 'Enter') void submitForm();
            }}
          />
        </label>
        {captcha && (
          <label className="captcha-inline" aria-label="安全验证">
            <span>安全验证</span>
            <div className="captcha-inline-row">
              <span className="captcha-inline-question">
                {captcha.question || '请输入验证码'}
              </span>
              <input
                value={captchaAnswer}
                onChange={(event) => setCaptchaAnswer(event.target.value)}
                placeholder="请输入答案"
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void submitForm();
                }}
              />
              <button
                type="button"
                onClick={() => void handleCaptchaChallenge()}
                disabled={submitting}
              >
                换一题
              </button>
            </div>
          </label>
        )}
        <label>
          <span>企业 tenantId，可选</span>
          <input
            value={tenantId}
            onChange={(event) => setTenantId(event.target.value)}
            placeholder="多企业账号可指定，不填默认进入推荐/第一个企业"
          />
        </label>

        {error && <p className="form-error">{error}</p>}
        <button
          className="login-submit"
          disabled={!canSubmit || submitting}
          onClick={() => void submitForm()}
        >
          {submitting ? '登录中...' : captcha ? '验证并登录' : '登录'}
        </button>
      </section>
    </main>
  );
}

async function fetchSessionProfile(baseUrl: string, tenantToken: string) {
  try {
    return await new ApiClient({
      baseUrl,
      tenantToken,
      traceId: createTraceId('pc-profile'),
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
      traceId: createTraceId('pc-tenant-info'),
    }).getTenantInfo();
  } catch {
    return null;
  }
}

function isCaptchaRequired(error: unknown) {
  if (error instanceof ApiError) {
    return (
      error.code === 'AUTH_CAPTCHA_REQUIRED' ||
      error.message.toLowerCase().includes('captcha')
    );
  }
  const text = String(error).toLowerCase();
  return (
    text.includes('auth_captcha_required') ||
    text.includes('auth_captcha_invalid') ||
    text.includes('captcha')
  );
}

function selectTenantId(login: PlatformLoginResult, preferredTenantId: string) {
  if (
    preferredTenantId &&
    login.tenants?.some((item) => item.tenantId === preferredTenantId)
  ) {
    return preferredTenantId;
  }
  if (login.spaceContext?.spaceType === 2 && login.spaceContext.tenantId) {
    return login.spaceContext.tenantId;
  }
  return login.tenants?.[0]?.tenantId ?? null;
}

function inferLoginType(identifier: string) {
  const value = identifier.trim();
  if (/^lpp_/i.test(value)) return 'lpp_id';
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'email';
  if (/^\+?\d[\d\s-]{5,}$/.test(value)) return 'mobile';
  return 'auto';
}
