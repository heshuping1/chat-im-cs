import { _electron as electron } from 'playwright';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const pcRoot = resolve(dirname(__filename), '..');
const lppRoot = resolve(pcRoot, '..');
const repoRoot = resolve(lppRoot, '..');
const defaultApiBaseUrl = 'https://chat.hearteasechat.com';
const viteUrl = 'http://127.0.0.1:5173';
const reportRoot = join(lppRoot, 'reports', 'pc', 'electron-regression');
const localRoot = join(lppRoot, '.local', 'pc-regression');
const poolPath = join(localRoot, 'account-pool.json');
const quickLoginSeedPath = join(
  lppRoot,
  'lpp_mobile',
  'lib',
  'features',
  'auth',
  'presentation',
  'pages',
  'login_page.dart',
);
const runStartedAt = new Date();
const runId = timestamp(runStartedAt);
const reportDir = join(reportRoot, runId);
const defaultEmailDomain = 'example.test';
const defaultTenantCode = 'mouse-corp';
const requiredRoles = [
  { profileId: 'owner-admin', role: 'owner_admin', label: 'Owner/admin', membershipRole: 4, userType: 2 },
  { profileId: 'staff-1', role: 'customer_service', label: 'Customer service 1', membershipRole: 2, userType: 2 },
  { profileId: 'staff-2', role: 'customer_service', label: 'Customer service 2', membershipRole: 2, userType: 2 },
  { profileId: 'customer-1', role: 'customer', label: 'Customer 1', membershipRole: 0, userType: 1 },
  { profileId: 'customer-2', role: 'customer', label: 'Customer 2', membershipRole: 0, userType: 1 },
  { profileId: 'external-1', role: 'external_customer', label: 'External customer', membershipRole: 0, userType: 1 },
];

const results = [];
const tasks = [];
const artifacts = [];
const apps = [];
const extraSensitiveValues = new Set();
let viteProcess = null;

class ApiRequestError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = details.status;
    this.payload = details.payload;
    this.path = details.path;
  }
}

await mkdir(reportDir, { recursive: true });

try {
  const env = readRegressionEnv();
  await step('preflight: environment', async () => validateEnv(env));
  await step('preflight: local dependencies', async () => {
    assertExists(join(pcRoot, 'node_modules'), 'node_modules is missing; run npm ci first.');
    assertExists(join(pcRoot, 'node_modules', 'electron'), 'Electron dependency is missing; run npm ci first.');
  });

  const pool = await step('server-api: prepare dynamic account pool', async () =>
    prepareAccountPool(env),
    { timeoutMs: 90_000 },
  );
  await step('build: electron main/preload', () => runNpmCommand(['run', 'build:electron'], 90_000), {
    timeoutMs: 100_000,
  });
  viteProcess = await step('server: start Vite renderer', () => startViteServer(), { timeoutMs: 90_000 });
  const launched = await step('electron: launch multi-profile clients', () =>
    launchProfileClients(env, pool.accounts),
    { timeoutMs: 120_000 },
  );
  await step('electron: assert profile isolation', () => assertProfileIsolation(launched));
  await step('electron: duplicate profile launch is blocked', () =>
    assertDuplicateProfileBlocked(launched[0]?.account.profileId),
    { timeoutMs: 60_000 },
  );
  await step('auth: login dynamic accounts', () => loginAccounts(env, launched), { timeoutMs: 180_000 });
  await step('auth: assert account isolation after login', () => assertAccountIsolation(launched));
  await step('customer-service: full workflow probe', () =>
    probeCustomerServiceWorkflow(launched, pool),
    { fatal: false, timeoutMs: 120_000 },
  );
  await step('im: full workflow probe', () => probeImWorkflow(launched, pool), { fatal: false, timeoutMs: 120_000 });
  await step('quality: no sensitive data in report model', () => assertNoSensitiveReportData(), {
    fatal: false,
  });
} catch (error) {
  addTask({
    scenario: 'regression-runner',
    severity: 'P0',
    title: 'Electron PC regression run aborted before completing all scenarios',
    error,
    frontend:
      'Make the runner failure actionable by preserving the failing phase, sanitized error, and local artifact paths. Do not log passwords, admin tokens, tenant tokens, or Authorization headers.',
    product:
      'A full PC customer-service regression must fail closed with a trackable task list so release owners can understand whether the blocker is environment setup, account preparation, multi-open behavior, or product functionality.',
  });
  results.push({
    name: 'runner: unhandled abort',
    status: 'failed',
    error: sanitizeError(error),
  });
} finally {
  await cleanup();
  await writeReports();
}

if (results.some((item) => item.status === 'failed')) {
  process.exitCode = 1;
}

function readRegressionEnv() {
  const seed = discoverQuickLoginSeed();
  const password = process.env.PC_REGRESSION_PASSWORD || seed.accountPassword;
  const adminPassword =
    process.env.PC_REGRESSION_ADMIN_PASSWORD ||
    process.env.PC_REGRESSION_ADMIN_PLATFORM_PASSWORD ||
    seed.adminPassword ||
    password;
  markSensitive(password);
  markSensitive(adminPassword);
  markSensitive(process.env.PC_REGRESSION_ADMIN_TOKEN);
  return {
    password,
    apiBaseUrl: (process.env.PC_REGRESSION_API_BASE_URL || defaultApiBaseUrl).replace(/\/$/, ''),
    tenantId: process.env.PC_REGRESSION_TENANT_ID,
    tenantCode: normalizeTenantCode(process.env.PC_REGRESSION_TENANT_CODE || defaultTenantCode),
    accountPrefix: process.env.PC_REGRESSION_ACCOUNT_PREFIX || `pc-regression-${runId}`,
    emailDomain: process.env.PC_REGRESSION_EMAIL_DOMAIN || defaultEmailDomain,
    adminToken: process.env.PC_REGRESSION_ADMIN_TOKEN,
    adminLogin: process.env.PC_REGRESSION_ADMIN_LOGIN,
    adminPassword,
    adminPlatformIdentifier:
      process.env.PC_REGRESSION_ADMIN_PLATFORM_IDENTIFIER || seed.adminPlatformIdentifier,
    adminPlatformPassword: process.env.PC_REGRESSION_ADMIN_PLATFORM_PASSWORD || seed.adminPassword,
    seedSource: seed.source,
  };
}

function validateEnv(env) {
  const missing = [];
  if (!env.password) missing.push('PC_REGRESSION_PASSWORD');
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  if (!/^https?:\/\//.test(env.apiBaseUrl)) {
    throw new Error('PC_REGRESSION_API_BASE_URL must be an http(s) URL when provided.');
  }
  if (!/^[A-Za-z0-9._+-]+$/.test(env.accountPrefix)) {
    throw new Error('PC_REGRESSION_ACCOUNT_PREFIX may only contain letters, numbers, dot, underscore, plus, and hyphen.');
  }
  if (!/^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(env.emailDomain)) {
    throw new Error('PC_REGRESSION_EMAIL_DOMAIN must be a valid email domain.');
  }
  if (env.adminToken && !env.tenantId) {
    throw new Error('PC_REGRESSION_TENANT_ID is required when PC_REGRESSION_ADMIN_TOKEN is provided.');
  }
  if (!env.tenantId && !env.tenantCode) {
    throw new Error('PC_REGRESSION_TENANT_ID or PC_REGRESSION_TENANT_CODE is required.');
  }
}

async function prepareAccountPool(env) {
  const plans = requiredRoles.map((role) => ({
    ...role,
    identifier: accountIdentifierForRole(env, role),
    displayName: `PC Regression ${role.label}`,
  }));
  const adminToken = await resolveAdminToken(env);
  let accounts;
  if (env.tenantId && adminToken) {
    try {
      accounts = await prepareAccountsViaAdminApi(env, plans, adminToken);
    } catch (error) {
      if (!isNotFoundLike(error)) throw error;
      addTask({
        scenario: 'server-api-admin-user-preparation',
        severity: 'P0',
        title: 'Admin tenant user creation API is not available in the connected test environment',
        frontend:
          'The runner fell back from admin tenant-user provisioning to platform registration plus client tenant role assignment. Keep both paths because deployed test environments may lag behind the documented admin API contract.',
        product:
          '测试环境已能用 owner 账号进入 mouse-corp，但管理端租户用户创建接口返回 404。回归系统需要兼容当前服务端能力，同时把接口缺口沉淀为可跟踪任务。',
        context: { tenantId: env.tenantId, tenantCode: env.tenantCode },
      });
      accounts = await prepareAccountsViaPlatformApi(env, plans, { addRoleWarning: false });
      await assignRolesViaClientApi(env, accounts, plans);
    }
  } else {
    accounts = await prepareAccountsViaPlatformApi(env, plans);
  }
  const tenantId = accounts.find((account) => account.tenantId)?.tenantId || env.tenantId || null;
  ensureAccountsReadyForRoleCoverage(accounts);
  const pool = {
    version: 1,
    runId,
    updatedAt: new Date().toISOString(),
    apiBaseUrl: env.apiBaseUrl,
    tenantId,
    accounts: accounts.map((account) => ({
      profileId: account.profileId,
      role: account.role,
      identifier: account.identifier,
      displayName: account.displayName,
      userId: account.userId,
      tenantId: account.tenantId || tenantId,
      membershipRole: account.membershipRole,
    })),
  };
  await mkdir(dirname(poolPath), { recursive: true });
  await writeFile(poolPath, `${JSON.stringify(pool, null, 2)}\n`, 'utf8');
  artifacts.push(relativeToRepo(poolPath));
  return pool;
}

async function resolveAdminToken(env) {
  if (env.adminToken) return env.adminToken;
  if (env.tenantId && env.adminLogin && env.adminPassword) {
    const data = await apiRequest(env, '/api/admin/v1/auth/login', {
      method: 'POST',
      headers: { 'X-Tenant-Id': env.tenantId },
      body: {
        loginName: env.adminLogin,
        password: env.adminPassword,
        deviceId: `pc-electron-regression-${runId}`,
      },
    });
    return requiredString(data.accessToken, 'admin login accessToken');
  }
  if (!env.adminPlatformIdentifier || !env.adminPlatformPassword) return null;
  const auth = await platformLogin(env, env.adminPlatformIdentifier, env.adminPlatformPassword);
  const tenantId = env.tenantId || selectTenantId(auth.tenants, env.tenantCode);
  if (!tenantId) {
    throw new Error(`Admin seed account is not a member of tenant code ${env.tenantCode}.`);
  }
  env.tenantId = tenantId;
  const tenantAuth = await selectTenantForAccount(env, auth, tenantId);
  env.ownerTenantToken = tenantAuth.accessToken;
  const data = await apiRequest(env, '/api/platform/v1/auth/admin-token', {
    method: 'POST',
    token: requiredString(auth.platformToken, 'admin seed platformToken'),
    body: { tenantId },
  });
  return requiredString(data.accessToken, 'admin-token accessToken');
}

async function prepareAccountsViaAdminApi(env, plans, adminToken) {
  const accounts = [];
  for (const plan of plans) {
    let userId = null;
    try {
      const created = await adminApiRequestFirst(
        env,
        tenantUserCollectionPaths(env.tenantId),
        {
        method: 'POST',
        token: adminToken,
        body: {
          password: env.password,
          displayName: plan.displayName,
          email: plan.identifier,
          userType: plan.userType,
          membershipRole: plan.membershipRole,
        },
        },
      );
      userId = stringOrNull(created.userId);
    } catch (error) {
      if (!isConflictLike(error)) throw error;
      const existing = await findTenantUserByIdentifier(env, adminToken, env.tenantId, plan.identifier);
      if (!existing?.userId) throw error;
      userId = existing.userId;
      await adminApiRequestFirst(env, tenantUserItemPaths(env.tenantId, userId, '/reset-password'), {
        method: 'POST',
        token: adminToken,
        body: { newPassword: env.password },
      });
      await adminApiRequestFirst(env, tenantUserItemPaths(env.tenantId, userId), {
        method: 'PUT',
        token: adminToken,
        body: {
          displayName: plan.displayName,
          userType: plan.userType,
          membershipRole: plan.membershipRole,
        },
      });
    }
    const auth = await platformLogin(env, plan.identifier);
    const tenantAuth = await selectTenantForAccount(env, auth, env.tenantId);
    accounts.push(normalizePreparedAccount(plan, tenantAuth, userId));
  }
  return accounts;
}

async function prepareAccountsViaPlatformApi(env, plans, options = {}) {
  const accounts = [];
  for (const plan of plans) {
    let auth = await platformLogin(env, plan.identifier).catch(async (error) => {
      if (!isMissingAccountLike(error)) throw error;
      return registerPlatformAccount(env, plan);
    });
    if (!auth.platformToken && !auth.accessToken) {
      auth = await platformLogin(env, plan.identifier);
    }
    const tenantId = env.tenantId
      || stringOrNull(auth.tenantId)
      || stringOrNull(auth.spaceContext?.tenantId)
      || selectTenantId(auth.tenants, env.tenantCode)
      || firstTenantId(auth.tenants);
    if (!tenantId) {
      throw new Error(`Account ${plan.profileId} has no tenant. Set PC_REGRESSION_TENANT_ID or use admin API account preparation.`);
    }
    if (auth.pendingApproval) {
      await approveJoinRequestForAccount(env, auth);
    }
    const tenantAuth = auth.accessToken && stringOrNull(auth.tenantId)
      ? auth
      : await selectTenantForPreparedAccount(env, auth, tenantId);
    accounts.push(normalizePreparedAccount(plan, tenantAuth, tenantAuth.userId));
  }
  if (options.addRoleWarning !== false) {
    addTask({
      scenario: 'server-api-account-preparation',
      severity: 'P1',
      title: 'Regression account preparation used public platform registration without role-control privileges',
      frontend:
        'Provide PC_REGRESSION_ADMIN_TOKEN or PC_REGRESSION_ADMIN_LOGIN so the runner can create tenant users with exact membershipRole values and reset scenario identities deterministically.',
      product:
        'Full customer-service regression needs at least two customer-service staff and customer accounts in the same tenant. Public registration alone may only create member accounts and cannot guarantee客服接待权限.',
      context: { tenantId: accounts.find((account) => account.tenantId)?.tenantId || env.tenantId || null },
    });
  }
  return accounts;
}

async function assignRolesViaClientApi(env, accounts, plans) {
  if (!env.ownerTenantToken) {
    throw new Error('Owner tenant token is required to assign regression account roles via client API.');
  }
  for (const plan of plans) {
    if (plan.profileId === 'owner-admin') continue;
    const account = accounts.find((item) => item.profileId === plan.profileId);
    if (!account?.userId) throw new Error(`Cannot assign role for ${plan.profileId}: missing userId.`);
    await apiRequest(env, `/api/client/v1/tenant/members/${account.userId}/role`, {
      method: 'PUT',
      token: env.ownerTenantToken,
      body: { membershipRole: plan.membershipRole },
    });
    account.membershipRole = plan.membershipRole;
  }
}

async function registerPlatformAccount(env, plan) {
  return apiRequest(env, '/api/platform/v1/auth/register', {
    method: 'POST',
    body: {
      displayName: plan.displayName,
      password: env.password,
      email: plan.identifier,
      captchaToken: null,
      captchaAnswer: null,
      verificationCode: null,
      tenantId: env.tenantId || null,
    },
  });
}

async function platformLogin(env, identifier, password = env.password) {
  const request = {
    identifier,
    password,
    loginType: loginTypeForIdentifier(identifier),
  };
  try {
    return await platformLoginRequest(env, request);
  } catch (error) {
    if (!isCaptchaLike(error)) throw error;
    const captcha = await createCaptchaSolution(env);
    return platformLoginRequest(env, {
      ...request,
      captchaToken: captcha.token,
      captchaAnswer: String(captcha.answer),
    });
  }
}

async function platformLoginRequest(env, body) {
  return apiRequest(env, '/api/platform/v1/auth/login', {
    method: 'POST',
    body,
  });
}

async function createCaptchaSolution(env) {
  const data = await apiRequest(env, '/api/client/v1/auth/captcha/generate', {
    method: 'POST',
  });
  const token = requiredString(data.token, 'captcha token');
  const answer = solveCaptchaQuestion(data.question || data.captchaQuestion);
  if (answer === null) {
    throw new Error('Captcha is required but the regression runner could not solve the generated challenge.');
  }
  return { token, answer };
}

async function selectTenantForAccount(env, auth, tenantId) {
  const platformToken = requiredString(auth.platformToken, 'platformToken');
  return apiRequest(env, '/api/platform/v1/auth/select-tenant', {
    method: 'POST',
    token: platformToken,
    body: { tenantId },
  });
}

async function selectTenantForPreparedAccount(env, auth, tenantId) {
  try {
    return await selectTenantForAccount(env, auth, tenantId);
  } catch (error) {
    if (!isTenantNotMemberLike(error)) throw error;
    const joined = await joinTenantByCode(env, auth);
    if (joined?.accessToken) return joined;
    await approveJoinRequestForAccount(env, auth);
    return selectTenantForAccount(env, auth, tenantId);
  }
}

async function joinTenantByCode(env, auth) {
  if (!env.tenantCode) throw new Error('tenantCode is required for join-by-code account preparation.');
  return apiRequest(env, '/api/platform/v1/tenants/join-by-code', {
    method: 'POST',
    token: requiredString(auth.platformToken, 'platformToken'),
    body: {
      tenantCode: env.tenantCode,
      message: `PC Electron regression ${runId}`,
    },
  });
}

async function approveJoinRequestForAccount(env, auth) {
  if (!env.ownerTenantToken) {
    throw new Error('Owner tenant token is required to approve regression account join requests.');
  }
  const requests = await apiRequest(env, '/api/client/v1/tenant/join-requests', {
    method: 'GET',
    token: env.ownerTenantToken,
  });
  const pending = (Array.isArray(requests) ? requests : []).find((request) => {
    const status = String(request.status ?? '').toLowerCase();
    const sameUser = stringOrNull(request.platformUserId) === stringOrNull(auth.platformUserId);
    return sameUser && (status === '0' || status === 'pending' || status === '');
  });
  const requestId = stringOrNull(pending?.requestId);
  if (!requestId) {
    throw new Error('Tenant join request was not found after join-by-code returned a pending state.');
  }
  await apiRequest(env, `/api/client/v1/tenant/join-requests/${requestId}/approve`, {
    method: 'POST',
    token: env.ownerTenantToken,
  });
}

async function findTenantUserByIdentifier(env, adminToken, tenantId, identifier) {
  const data = await adminApiRequestFirst(
    env,
    tenantUserCollectionPaths(tenantId, `?keyword=${encodeURIComponent(identifier)}`),
    { method: 'GET', token: adminToken },
  );
  const users = Array.isArray(data) ? data : [];
  return users.find((user) =>
    [user.email, user.loginName, user.lppId, user.displayName]
      .map((value) => String(value || '').toLowerCase())
      .includes(identifier.toLowerCase()),
  ) || users[0] || null;
}

function normalizePreparedAccount(plan, tenantAuth, fallbackUserId) {
  return {
    profileId: plan.profileId,
    role: plan.role,
    identifier: plan.identifier,
    displayName: tenantAuth.displayName || plan.displayName,
    userId: stringOrNull(tenantAuth.userId) || stringOrNull(fallbackUserId),
    tenantId: stringOrNull(tenantAuth.tenantId),
    membershipRole: tenantAuth.spaceContext?.membershipRole ?? plan.membershipRole,
  };
}

function ensureAccountsReadyForRoleCoverage(accounts) {
  for (const role of requiredRoles) {
    const account = accounts.find((item) => item.profileId === role.profileId);
    if (!account) throw new Error(`Account preparation is missing required profile ${role.profileId}.`);
    if (!account.tenantId || !account.userId) {
      throw new Error(`Prepared account ${role.profileId} is missing tenant membership identity.`);
    }
    if (role.membershipRole >= 2 && Number(account.membershipRole) < role.membershipRole) {
      addTask({
        scenario: 'server-api-role-preparation',
        severity: 'P0',
        title: `Prepared profile ${role.profileId} does not have the required customer-service/admin role`,
        frontend:
          'Use admin API account preparation or an owner token to set membershipRole before Electron login. The PC UI should not be asked to compensate for incorrect tenant role state.',
        product:
          '客服回归需要真实客服角色才能覆盖接待、转接、结束会话和多客服在线状态。普通成员账号登录成功不等于客服主链路可验收。',
        context: {
          profileId: role.profileId,
          expectedMembershipRole: role.membershipRole,
          actualMembershipRole: account.membershipRole,
          tenantId: account.tenantId,
        },
      });
    }
  }
}

async function apiRequest(env, path, options = {}) {
  const maxAttempts = options.retryRateLimit === false ? 1 : 4;
  let response;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    response = await fetch(`${env.apiBaseUrl}${path}`, {
      method: options.method || 'GET',
      headers: {
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    if (response.status !== 429 || attempt === maxAttempts) break;
    const retryAfter = Number.parseInt(response.headers.get('retry-after') || '', 10);
    const waitMs = Number.isFinite(retryAfter)
      ? Math.max(1_000, retryAfter * 1_000)
      : 10_000 * attempt;
    await delay(waitMs);
  }
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { message: text };
  }
  if (!response.ok) {
    const code = payload?.code || payload?.errorCode || payload?.error_code;
    const message = [code, payload?.message || payload?.error || response.statusText]
      .filter(Boolean)
      .join(': ');
    throw new ApiRequestError(`API request failed (${response.status}) ${path}: ${message}`, {
      status: response.status,
      payload,
      path,
    });
  }
  return unwrapApiResponse(payload);
}

function unwrapApiResponse(payload) {
  if (payload && typeof payload === 'object' && 'data' in payload) return payload.data;
  return payload;
}

async function adminApiRequestFirst(env, paths, options) {
  let lastError;
  for (const path of paths) {
    try {
      return await apiRequest(env, path, options);
    } catch (error) {
      lastError = error;
      if (error?.status !== 404) throw error;
    }
  }
  throw lastError;
}

function tenantUserCollectionPaths(tenantId, suffix = '') {
  return [
    `/api/admin/v1/platform/tenants/${tenantId}/users${suffix}`,
    `/api/admin/v1/tenants/${tenantId}/users${suffix}`,
  ];
}

function tenantUserItemPaths(tenantId, userId, suffix = '') {
  return [
    `/api/admin/v1/platform/tenants/${tenantId}/users/${userId}${suffix}`,
    `/api/admin/v1/tenants/${tenantId}/users/${userId}${suffix}`,
  ];
}

function isConflictLike(error) {
  return error?.status === 409 || /already|exists|duplicate|conflict|已存在|重复/i.test(error?.message || '');
}

function isMissingAccountLike(error) {
  return [400, 401, 404].includes(error?.status) || /not.?found|invalid|不存在|未找到/i.test(error?.message || '');
}

function isNotFoundLike(error) {
  return error?.status === 404 || /not.?found|不存在|未找到/i.test(error?.message || '');
}

function isCaptchaLike(error) {
  const code = String(error?.payload?.code || error?.payload?.errorCode || '').toUpperCase();
  const message = String(error?.message || '');
  return (
    code === 'AUTH_CAPTCHA_REQUIRED' ||
    code === 'AUTH_CAPTCHA_INVALID' ||
    /captcha|图形验证码|安全验证|AUTH_CAPTCHA/i.test(message)
  );
}

function isTenantNotMemberLike(error) {
  const code = String(error?.payload?.code || error?.payload?.errorCode || '').toUpperCase();
  const message = String(error?.message || '');
  return code === 'TENANT_NOT_MEMBER' || /TENANT_NOT_MEMBER|not a member|不是.*成员/i.test(message);
}

function firstTenantId(tenants) {
  if (!Array.isArray(tenants)) return null;
  return tenants.map((tenant) => stringOrNull(tenant.tenantId)).find(Boolean) || null;
}

function selectTenantId(tenants, tenantCode) {
  if (!Array.isArray(tenants)) return null;
  const normalized = normalizeTenantCode(tenantCode);
  const match = tenants.find((tenant) => normalizeTenantCode(tenant.tenantCode) === normalized);
  return stringOrNull(match?.tenantId);
}

async function startViteServer() {
  const child = spawnNpm(['run', 'dev:browser'], {
    cwd: pcRoot,
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  captureProcessOutput('vite', child);
  try {
    await waitForUrl(viteUrl, 60_000);
  } catch (error) {
    await killProcessTree(child);
    throw error;
  }
  return child;
}

async function launchProfileClients(env, accounts) {
  const selected = requiredRoles.map((role) => {
    const account = accounts.find((item) => item.profileId === role.profileId);
    if (!account) throw new Error(`Missing account for profile ${role.profileId}`);
    return account;
  });
  const launched = [];
  for (const account of selected) {
    const app = await electron.launch({
      cwd: pcRoot,
      args: ['.', `--profile=${account.profileId}`],
      env: {
        ...process.env,
        VITE_DEV_SERVER_URL: viteUrl,
        LPP_PC_INSTANCE_PROFILE: account.profileId,
      },
    });
    apps.push(app);
    const page = await app.firstWindow();
    await page.setViewportSize({ width: 1440, height: 920 });
    await page.waitForLoadState('domcontentloaded');
    launched.push({ account, app, page });
  }
  return launched;
}

async function assertProfileIsolation(launched) {
  if (launched.length < 3) {
    throw new Error(`Expected at least 3 Electron clients, got ${launched.length}.`);
  }
  const profiles = [];
  for (const item of launched) {
    const profile = await item.page.evaluate(() => window.desktopApi?.getAppInstanceProfile());
    if (!profile) throw new Error(`Profile ${item.account.profileId} did not expose desktopApi.`);
    profiles.push(profile);
    if (profile.profileId !== item.account.profileId) {
      throw new Error(`Profile mismatch: expected ${item.account.profileId}, got ${profile.profileId}`);
    }
  }
  assertUnique(profiles.map((profile) => profile.clientInstanceId), 'clientInstanceId');
  const deviceIds = new Set(profiles.map((profile) => profile.deviceId));
  if (deviceIds.size !== 1) {
    throw new Error('All profiles on the same Windows PC should share one deviceId.');
  }
}

async function assertDuplicateProfileBlocked(profileId) {
  if (!profileId) throw new Error('Cannot test duplicate profile launch without a profile id.');
  const electronPath = electronExecutablePath();
  const child = spawn(electronPath, ['.', `--profile=${profileId}`], {
    cwd: pcRoot,
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: viteUrl,
      LPP_PC_INSTANCE_PROFILE: profileId,
    },
    stdio: 'ignore',
  });
  const exit = await waitForExit(child, 7_000);
  if (exit === null) {
    child.kill('SIGTERM');
    throw new Error(`Duplicate profile ${profileId} stayed alive; expected existing instance focus/lock.`);
  }
}

async function loginAccounts(env, launched) {
  for (const item of launched) {
    await loginAccount(env, item);
  }
}

async function loginAccount(env, item) {
  const { page, account } = item;
  const loginVisible = await page.locator('.login-page').isVisible({ timeout: 5_000 }).catch(() => false);
  if (!loginVisible) return;

  const inputs = page.locator('input');
  await inputs.nth(0).fill(env.apiBaseUrl);
  await inputs.nth(1).fill(account.identifier);
  await inputs.nth(2).fill(env.password);
  const tenantInputCount = await inputs.count();
  if (tenantInputCount >= 4 && (account.tenantId || env.tenantId)) {
    await inputs.nth(3).fill(account.tenantId || env.tenantId);
  }
  await page.locator('.login-submit').click();

  const captchaVisible = await page.locator('.captcha-inline').isVisible({ timeout: 2_000 }).catch(() => false);
  if (captchaVisible) {
    throw new Error(`Captcha blocked automated login for profile ${account.profileId}.`);
  }

  await page.locator('.login-page').waitFor({ state: 'hidden', timeout: 20_000 }).catch(async () => {
    const errorText = await page.locator('.form-error').textContent().catch(() => '');
    throw new Error(`Login did not complete for ${account.profileId}${errorText ? `: ${errorText}` : ''}`);
  });
}

async function assertAccountIsolation(launched) {
  const sessions = [];
  for (const item of launched) {
    const session = await item.page.evaluate(() => window.desktopApi?.readAuthSession());
    if (!session?.tenantToken) {
      throw new Error(`Profile ${item.account.profileId} has no secure auth session after login.`);
    }
    sessions.push({
      profileId: item.account.profileId,
      displayName: session.displayName,
      tenantId: session.tenantId,
      userId: session.userId || session.platformUserId || session.lppId,
    });
  }
  assertUnique(
    sessions.map((session) => session.userId).filter(Boolean),
    'logged-in account identity',
  );
}

async function probeCustomerServiceWorkflow(launched, pool) {
  const staff = launched.find((item) => item.account.role === 'customer_service');
  const customer = launched.find((item) => item.account.role === 'customer');
  if (!staff || !customer) {
    throw new Error('Customer-service workflow requires at least one staff and one customer profile.');
  }
  const staffNavigation = await clickLikelyNavigation(
    staff.page,
    [/客服/, /接待/, /工作台/, /service/i, /workbench/i],
  );
  const customerNavigation = await clickLikelyNavigation(
    customer.page,
    [/客服/, /在线/, /咨询/, /service/i],
  );
  if (!staffNavigation || !customerNavigation) {
    throw new Error('Customer-service navigation entry was not found for all required profiles.');
  }
  addTask({
    scenario: 'customer-service-full-workflow',
    severity: 'P1',
    title: 'Complete customer-service conversation assertions after server scenario ids are available',
    frontend:
      'Bind server-created thread ids or stable data-testid selectors for reception status, accept/transfer/end actions, composer, and message list. Then assert bidirectional text/image/file/video messages and refresh persistence in Electron profiles.',
    product:
      'The regression must prove that a real customer can initiate service, one of multiple staff can accept it, the service state remains understandable, and media messages match top-tier online customer-service UX expectations.',
    context: {
      tenantId: pool.tenantId,
      staffProfile: staff.account.profileId,
      customerProfile: customer.account.profileId,
    },
  });
}

async function probeImWorkflow(launched, pool) {
  const owner = launched.find((item) => item.account.profileId === 'owner-admin') ?? launched[0];
  const peer = launched.find((item) => item.account.role === 'customer') ?? launched[1];
  if (!owner || !peer) throw new Error('IM workflow requires two logged-in profiles.');
  const ownerNavigation = await clickLikelyNavigation(
    owner.page,
    [/消息/, /会话/, /^IM$/i, /message/i, /chat/i],
  );
  const peerNavigation = await clickLikelyNavigation(
    peer.page,
    [/消息/, /会话/, /^IM$/i, /message/i, /chat/i],
  );
  if (!ownerNavigation || !peerNavigation) {
    throw new Error('IM navigation entry was not found for all required profiles.');
  }
  addTask({
    scenario: 'im-full-workflow',
    severity: 'P1',
    title: 'Complete IM send/read/recall/forward assertions after server conversation ids are available',
    frontend:
      'Use server-created friend/group conversation ids or stable data-testid selectors to drive direct chat, group chat, media send, read receipt, retry, recall, delete, and forward assertions across Electron profiles.',
    product:
      'The regression must catch IM regressions at WeChat-level expectations: no unread drift, no sender status rollback, clear failure recovery, and consistent message state across refresh and multiple PC clients.',
    context: {
      tenantId: pool.tenantId,
      ownerProfile: owner.account.profileId,
      peerProfile: peer.account.profileId,
    },
  });
}

async function clickLikelyNavigation(page, patterns) {
  for (const pattern of patterns) {
    const locator = page.getByRole('button', { name: pattern }).first();
    if (await locator.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await locator.click();
      return true;
    }
  }
  return false;
}

async function assertNoSensitiveReportData() {
  const payload = JSON.stringify({ results, tasks, artifacts });
  const forbidden = [
    process.env.PC_REGRESSION_PASSWORD,
    process.env.PC_REGRESSION_ADMIN_PASSWORD,
    process.env.PC_REGRESSION_ADMIN_TOKEN,
    ...extraSensitiveValues,
  ].filter(Boolean);
  for (const secret of forbidden) {
    if (payload.includes(secret)) throw new Error('Sensitive regression secret leaked into report model.');
  }
  if (/Bearer\s+[A-Za-z0-9._~+/=-]+/.test(payload)) {
    throw new Error('Report model contains a raw Bearer credential.');
  }
}

async function step(name, fn, options = {}) {
  const fatal = options.fatal !== false;
  const startedAt = Date.now();
  try {
    const value = await withTimeout(fn(), options.timeoutMs ?? 180_000, name);
    results.push({ name, status: 'passed', durationMs: Date.now() - startedAt });
    return value;
  } catch (error) {
    results.push({
      name,
      status: 'failed',
      durationMs: Date.now() - startedAt,
      error: sanitizeError(error),
    });
    addTask({
      scenario: name,
      severity: name.startsWith('preflight') || name.startsWith('server-api') ? 'P0' : 'P1',
      title: `${name} failed during Electron PC regression`,
      error,
      frontend:
        'Inspect the failing phase, Playwright artifacts, Electron profile id, and sanitized error. Keep secrets out of logs and prefer stable server ids or data-testid selectors over text-only selectors.',
      product:
        'This blocks trustworthy Windows PC customer-service regression because the scenario cannot prove real multi-account behavior in a production-like Electron client.',
    });
    if (fatal) throw error;
    return undefined;
  }
}

function withTimeout(promise, timeoutMs, name) {
  return new Promise((resolvePromise, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${name} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolvePromise(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function addTask(task) {
  tasks.push({
    id: `PC-ELECTRON-${String(tasks.length + 1).padStart(3, '0')}`,
    scenario: task.scenario,
    severity: task.severity || 'P1',
    title: task.title,
    frontend: task.frontend,
    product: task.product,
    error: task.error ? sanitizeError(task.error) : undefined,
    context: sanitizeValue(task.context ?? {}),
  });
}

async function writeReports() {
  await mkdir(reportDir, { recursive: true });
  const jsonPath = join(reportDir, 'summary.json');
  const mdPath = join(reportDir, 'summary.md');
  const model = sanitizeValue({
    runId,
    generatedAt: new Date().toISOString(),
    reportDir,
    results,
    tasks,
    artifacts,
  });
  await writeFile(jsonPath, `${JSON.stringify(model, null, 2)}\n`, 'utf8');
  await writeFile(mdPath, renderMarkdownSummary(model), 'utf8');
  console.log(`Electron regression summary: ${mdPath}`);
}

function renderMarkdownSummary(model) {
  const passed = model.results.filter((item) => item.status === 'passed').length;
  const failed = model.results.filter((item) => item.status === 'failed').length;
  const lines = [
    '# PC Electron Multi-Profile Regression Summary',
    '',
    `- Run ID: ${model.runId}`,
    `- Generated at: ${model.generatedAt}`,
    `- Result: ${failed ? 'FAILED' : 'PASSED'}`,
    `- Steps: ${passed} passed, ${failed} failed`,
    `- Report directory: ${model.reportDir}`,
    '',
    '## Step Results',
    '',
    '| Status | Step | Duration | Error |',
    '| --- | --- | ---: | --- |',
    ...model.results.map((item) =>
      `| ${item.status} | ${item.name} | ${item.durationMs ?? 0}ms | ${item.error?.message ?? ''} |`,
    ),
    '',
    '## Artifacts',
    '',
    ...(model.artifacts.length ? model.artifacts.map((item) => `- ${item}`) : ['- None']),
    '',
    '## Trackable Task List',
    '',
  ];
  if (!model.tasks.length) {
    lines.push('- None');
  } else {
    for (const task of model.tasks) {
      lines.push(
        `### ${task.id} [${task.severity}] ${task.title}`,
        '',
        `- Scenario: ${task.scenario}`,
        `- Frontend engineering: ${task.frontend}`,
        `- IM/customer-service product: ${task.product}`,
        `- Error: ${task.error?.message ?? 'N/A'}`,
        `- Context: \`${JSON.stringify(task.context ?? {})}\``,
        '',
      );
    }
  }
  return `${lines.join('\n')}\n`;
}

async function cleanup() {
  for (const app of apps.reverse()) {
    await app.close().catch(() => {});
  }
  if (viteProcess) {
    await killProcessTree(viteProcess);
    await waitForExit(viteProcess, 5_000).catch(() => {});
  }
}

function runNpmCommand(args, timeoutMs = 120_000) {
  return new Promise((resolvePromise, reject) => {
    const child = spawnNpm(args, {
      cwd: pcRoot,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const timer = setTimeout(async () => {
      await killProcessTree(child);
      reject(new Error(`npm ${args.join(' ')} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    captureProcessOutput(args.join(' '), child);
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      if (code === 0) resolvePromise();
      else reject(new Error(`npm ${args.join(' ')} exited with code ${code}`));
    });
  });
}

function spawnNpm(args, options) {
  if (process.platform === 'win32') {
    return spawn('cmd.exe', ['/c', 'npm.cmd', ...args], { ...options, shell: false });
  }
  return spawn('npm', args, { ...options, shell: false });
}

async function killProcessTree(child) {
  if (!child?.pid) return;
  if (process.platform === 'win32') {
    await new Promise((resolvePromise) => {
      const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      killer.on('error', () => resolvePromise());
      killer.on('close', () => resolvePromise());
    });
    return;
  }
  child.kill('SIGTERM');
  await delay(2_000);
  if (child.exitCode === null) child.kill('SIGKILL');
}

function captureProcessOutput(name, child) {
  const logPath = join(reportDir, `${safeFileName(name)}.log`);
  artifacts.push(relativeToRepo(logPath));
  const chunks = [];
  const collect = (chunk) => chunks.push(redactText(String(chunk)));
  child.stdout?.on('data', collect);
  child.stderr?.on('data', collect);
  child.on('exit', () => {
    void writeFile(logPath, chunks.join(''), 'utf8').catch(() => {});
  });
}

async function waitForUrl(url, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // retry
    }
    await delay(500);
  }
  throw new Error(`Timed out waiting for ${url}.`);
}

function waitForExit(child, timeoutMs) {
  return new Promise((resolvePromise) => {
    if (child.exitCode !== null) {
      resolvePromise(child.exitCode);
      return;
    }
    const timer = setTimeout(() => {
      cleanupListeners();
      resolvePromise(null);
    }, timeoutMs);
    const onExit = (code) => {
      cleanupListeners();
      resolvePromise(code);
    };
    const cleanupListeners = () => {
      clearTimeout(timer);
      child.off('exit', onExit);
    };
    child.on('exit', onExit);
  });
}

function electronExecutablePath() {
  const exe = process.platform === 'win32'
    ? join(pcRoot, 'node_modules', 'electron', 'dist', 'electron.exe')
    : join(pcRoot, 'node_modules', '.bin', 'electron');
  assertExists(exe, `Electron executable not found at ${exe}`);
  return exe;
}

function assertExists(path, message) {
  if (!existsSync(path)) throw new Error(message);
}

function assertUnique(values, label) {
  const filtered = values.filter(Boolean);
  if (new Set(filtered).size !== filtered.length) {
    throw new Error(`${label} values must be unique.`);
  }
}

function requiredString(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  return value.trim();
}

function stringOrNull(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function discoverQuickLoginSeed() {
  if (!existsSync(quickLoginSeedPath)) return {};
  const source = readFileSync(quickLoginSeedPath, 'utf8');
  const accounts = [];
  const accountPattern = /_QuickLoginAccount\(([\s\S]*?)\),/g;
  for (const match of source.matchAll(accountPattern)) {
    const block = match[1];
    accounts.push({
      label: dartStringField(block, 'label'),
      name: dartStringField(block, 'name'),
      identifier: dartStringField(block, 'identifier'),
      password: dartStringField(block, 'password'),
      email: dartStringField(block, 'email'),
      loginName: dartStringField(block, 'loginName'),
      enterprise: dartStringField(block, 'enterprise'),
    });
  }
  const tenantAccounts = accounts.filter((account) =>
    /mouse/i.test(account.enterprise || '') || /所有者|管理员/.test(account.label || ''),
  );
  const ownerOrAdmin =
    tenantAccounts.find((account) => /所有者/.test(account.label || '')) ||
    tenantAccounts.find((account) => /管理员/.test(account.label || '')) ||
    accounts.find((account) => /管理后台|admin/i.test(`${account.label} ${account.identifier}`));
  const accountPassword =
    accounts.find((account) => /客户|客服|所有者|管理员/.test(account.label || ''))?.password ||
    ownerOrAdmin?.password;
  return {
    source: relativeToRepo(quickLoginSeedPath),
    accountPassword: stringOrNull(accountPassword),
    adminPassword: stringOrNull(ownerOrAdmin?.password),
    adminPlatformIdentifier: stringOrNull(ownerOrAdmin?.identifier),
  };
}

function dartStringField(block, fieldName) {
  const match = block.match(new RegExp(`${fieldName}:\\s*'([^']*)'`));
  return match ? match[1] : null;
}

function normalizeTenantCode(value) {
  return stringOrNull(value)?.toLowerCase().replace(/_/g, '-') || null;
}

function markSensitive(value) {
  if (typeof value === 'string' && value) extraSensitiveValues.add(value);
}

function accountIdentifierForRole(env, role) {
  if (role.profileId === 'owner-admin' && env.adminPlatformIdentifier) {
    return env.adminPlatformIdentifier;
  }
  if (role.profileId === 'customer-1' && process.env.PC_REGRESSION_EMAIL) {
    return process.env.PC_REGRESSION_EMAIL;
  }
  return `${env.accountPrefix}+${role.profileId}@${env.emailDomain}`;
}

function loginTypeForIdentifier(identifier) {
  return String(identifier).includes('@') ? 'email' : 'lpp_id';
}

function solveCaptchaQuestion(question) {
  if (!question) return null;
  const normalized = String(question)
    .replace(/加|plus/gi, '+')
    .replace(/减|minus/gi, '-')
    .replace(/乘|x|×|X/gi, '*')
    .replace(/除以|除|÷/gi, '/');
  const match = /(-?\d+)\s*([+\-*/])\s*(-?\d+)/.exec(normalized);
  if (!match) return null;
  const left = Number.parseInt(match[1], 10);
  const right = Number.parseInt(match[3], 10);
  switch (match[2]) {
    case '+':
      return left + right;
    case '-':
      return left - right;
    case '*':
      return left * right;
    case '/':
      return right !== 0 && left % right === 0 ? left / right : null;
    default:
      return null;
  }
}

function sanitizeError(error) {
  return {
    name: error?.name || 'Error',
    message: redactText(error?.message || String(error)),
  };
}

function sanitizeValue(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return redactText(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        /token|password|authorization|secret|credential/i.test(key)
          ? '[redacted]'
          : sanitizeValue(entry),
      ]),
    );
  }
  return String(value);
}

function redactText(value) {
  let text = String(value);
  for (const secret of [
    process.env.PC_REGRESSION_PASSWORD,
    process.env.PC_REGRESSION_ADMIN_PASSWORD,
    process.env.PC_REGRESSION_ADMIN_TOKEN,
    ...extraSensitiveValues,
  ].filter(Boolean)) {
    text = text.split(secret).join('[redacted]');
  }
  return text
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer ***')
    .replace(/("?(?:token|password|authorization|secret|credential)"?\s*[:=]\s*)("[^"]+"|[^\s,}]+)/gi, '$1[redacted]');
}

function redactUrl(value) {
  try {
    const url = new URL(value);
    url.username = '';
    url.password = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return '[invalid-url]';
  }
}

function relativeToRepo(path) {
  return path.startsWith(repoRoot) ? path.slice(repoRoot.length + 1) : path;
}

function safeFileName(value) {
  return value.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80) || randomUUID();
}

function timestamp(date) {
  const pad = (number) => String(number).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '_',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
}

function delay(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}
