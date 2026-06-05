import { _electron as electron } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const root = process.cwd();
export const electronPath = join(root, 'node_modules', 'electron', 'dist', 'electron.exe');
export const viteUrl = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173';
export const apiBaseUrl = process.env.LPP_PC_API_BASE_URL || 'https://chat.hearteasechat.com';
const electronSandboxRoot = join(root, 'tmp', 'electron-sandbox');
const electronSandboxAppData = join(electronSandboxRoot, 'appdata');
const electronSandboxLocalAppData = join(electronSandboxRoot, 'localappdata');
const electronSandboxUserDataRoot = join(electronSandboxRoot, 'userdata');
export const defaultPassword = process.env.LPP_PC_TEST_PASSWORD || '123123123';
export const defaultAccounts = {
  owner: { label: 'owner', identifier: process.env.LPP_PC_TEST_OWNER || 'lpp_aej69f2o', password: defaultPassword },
  admin: { label: 'admin', identifier: process.env.LPP_PC_TEST_ADMIN || 'lpp_ktldhxlm', password: defaultPassword },
  memberA: { label: 'memberA', identifier: process.env.LPP_PC_TEST_MEMBER_A || 'lpp_member2_1776587541@test.com', password: defaultPassword },
  memberB: { label: 'memberB', identifier: process.env.LPP_PC_TEST_MEMBER_B || 'lpp_cust1_1776587541@test.com', password: defaultPassword },
  mutedMember: { label: 'mutedMember', identifier: process.env.LPP_PC_TEST_MUTED || 'lpp_hlty0ap2', password: defaultPassword },
  customer: { label: 'customer', identifier: process.env.LPP_PC_TEST_CUSTOMER || 'lpp_hlty0ap2', password: defaultPassword },
  externalCustomer: {
    label: 'externalCustomer',
    identifier: process.env.LPP_PC_TEST_EXTERNAL_CUSTOMER || 'lpp_hlty0ap2',
    password: defaultPassword,
  },
};

export function createElectronTestRunner({ suiteName, catalog = null }) {
  const reportDir = join(root, '..', 'reports', 'pc', suiteName, new Date().toISOString().replace(/[:.]/g, '-'));
  const results = [];
  const fixtures = [];
  const cleanupFailures = [];
  const apps = [];

  function push(name, status, detail = {}) {
    results.push({
      name,
      status,
      at: new Date().toISOString(),
      ...detail,
    });
  }

  async function step(name, fn, options = {}) {
    try {
      const detail = await fn();
      if (detail && detail.skipped) {
        const status = options.hardGate ? 'failed' : 'skipped';
        push(name, status, {
          ...detail,
          hardGate: Boolean(options.hardGate),
          convertedFromSkip: Boolean(options.hardGate),
        });
        return { status, detail };
      } else {
        push(name, 'passed', detail && detail !== true ? detail : {});
        return { status: 'passed', detail };
      }
    } catch (error) {
      const detail = {
        error: shortError(error),
        hardGate: Boolean(options.hardGate),
        category: options.category || 'product-or-test-failure',
      };
      push(name, 'failed', detail);
      return { status: 'failed', detail };
    }
  }

  async function screenshot(page, name) {
    const path = join(reportDir, `${name}.png`);
    await page.screenshot({ path, fullPage: false }).catch(() => undefined);
    return path;
  }

  async function closeAll() {
    for (const app of apps.splice(0).reverse()) {
      await app.close().catch(() => undefined);
    }
  }

  async function finalize(extra = {}) {
    await mkdir(reportDir, { recursive: true });
    const counts = results.reduce(
      (acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      },
      { passed: 0, failed: 0, skipped: 0 },
    );
    const summary = {
      suiteName,
      generatedAt: new Date().toISOString(),
      counts,
      reportDir,
      catalog,
      fixtures,
      cleanupFailures,
      results,
      ...extra,
    };
    await writeFile(join(reportDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
    console.log(JSON.stringify(summary, null, 2));
    if (counts.failed > 0) process.exitCode = 1;
    return summary;
  }

  async function launchClient(profileId) {
    await mkdir(reportDir, { recursive: true });
    const app = await electron.launch({
      executablePath: electronPath,
      args: ['.', `--profile=${profileId}`],
      cwd: root,
      env: electronTestEnv(profileId),
    });
    apps.push(app);
    const page = await appPage(app);
    await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
    const profile = await page.evaluate(() => window.desktopApi.getAppInstanceProfile());
    push(`${profileId}: client launched`, 'passed', {
      profileId,
      clientInstanceId: profile.clientInstanceId,
      deviceId: profile.deviceId,
    });
    return { app, page, profileId, profile };
  }

  return {
    reportDir,
    results,
    fixtures,
    cleanupFailures,
    apps,
    push,
    step,
    screenshot,
    closeAll,
    finalize,
    launchClient,
  };
}

export async function loginClient(runner, client, account) {
  await runner.step(`${account.label}: login`, async () => {
    const { page } = client;
    await page.locator('.login-page, .account-entry').first().waitFor({ state: 'visible', timeout: 12_000 });
    if (await page.locator('.login-page').isVisible({ timeout: 1_000 }).catch(() => false)) {
      await fillAuthLoginForm(page, account);
      await page.locator('.login-submit').click();
      await solveCaptchaIfVisible(page, runner);
      await page.locator('.login-page').waitFor({ state: 'hidden', timeout: 25_000 });
    }
    const session = await waitForAuthSession(page);
    if (!session?.tenantToken) throw new Error('tenant token was not stored after login');
    client.session = session;
    return {
      displayName: session.displayName,
      tenantId: session.tenantId,
      hasTenantToken: Boolean(session.tenantToken),
      hasPlatformToken: Boolean(session.platformToken),
    };
  }, { hardGate: true, category: 'test-data-or-auth' });
}

export function electronTestEnv(profileId) {
  return {
    ...process.env,
    VITE_DEV_SERVER_URL: viteUrl,
    LPP_PC_INSTANCE_PROFILE: profileId,
    APPDATA: electronSandboxAppData,
    LOCALAPPDATA: electronSandboxLocalAppData,
    LPP_PC_USER_DATA_ROOT: electronSandboxUserDataRoot,
    TEMP: join(electronSandboxRoot, 'temp'),
    TMP: join(electronSandboxRoot, 'temp'),
  };
}

export async function fillAuthLoginForm(page, account, options = {}) {
  const loginInputs = page.locator('.login-panel > label input');
  if ((await loginInputs.count()) < 2) {
    throw new Error('login form did not expose identifier/password inputs');
  }
  await loginInputs.nth(0).fill(account.identifier);
  await loginInputs.nth(1).fill(account.password);

  const advanced = page.locator('.auth-advanced');
  if ((await advanced.count()) < 1) return;
  const isOpen = await advanced.evaluate((node) => node.hasAttribute('open')).catch(() => false);
  if (!isOpen) await advanced.locator('summary').click();
  const advancedInputs = advanced.locator('input');
  if ((await advancedInputs.count()) >= 1) await advancedInputs.nth(0).fill(options.apiBaseUrl || apiBaseUrl);
  if (options.tenantId && (await advancedInputs.count()) >= 2) {
    await advancedInputs.nth(1).fill(options.tenantId);
  }
}

export async function createGroupFromUi(runner, page, groupName) {
  await openMessages(page);
  await page.locator('.message-plus-button').click({ timeout: 5_000 });
  await page.locator('.message-plus-menu').waitFor({ state: 'visible', timeout: 5_000 });
  const menuItems = page.locator('.message-plus-menu button, .message-plus-menu [role="menuitem"]');
  if ((await menuItems.count()) < 2) throw new Error('group creation menu item is missing');
  await menuItems.nth(1).click();
  const dialog = page.locator('.message-start-dialog').first();
  await dialog.waitFor({ state: 'visible', timeout: 8_000 });

  const createButton = dialog.locator('.message-start-footer .primary, button').last();
  const contacts = dialog.locator('.message-contact-targets button:not([disabled])');
  const contactCount = await waitForLocatorCountAtLeast(contacts, 2, 10_000);
  if (contactCount < 2) {
    await runner.screenshot(page, 'group-create-no-selectable-contacts');
    throw new Error(`group creation needs at least 2 selectable contacts, got ${contactCount}`);
  }

  const disabledBeforeSelection = await createButton.isDisabled().catch(() => false);
  await contacts.nth(0).click();
  await page.waitForTimeout(200);
  const disabledWithOneMember = await createButton.isDisabled().catch(() => false);
  await contacts.nth(0).click();
  await page.waitForTimeout(200);
  const disabledAfterCancel = await createButton.isDisabled().catch(() => false);

  await contacts.nth(0).click();
  await contacts.nth(1).click();
  const groupNameInput = dialog.locator('.message-group-fields input, input').last();
  await groupNameInput.fill(groupName);
  const disabledWithTwoMembers = await createButton.isDisabled().catch(() => false);
  if (!disabledBeforeSelection || !disabledWithOneMember || !disabledAfterCancel || disabledWithTwoMembers) {
    throw new Error(
      `group creation selection rules invalid: before=${disabledBeforeSelection}, one=${disabledWithOneMember}, cancel=${disabledAfterCancel}, two=${disabledWithTwoMembers}`,
    );
  }

  await runner.screenshot(page, 'group-create-dialog-ready');
  await createButton.click();
  try {
    await dialog.waitFor({ state: 'hidden', timeout: 20_000 });
  } catch (error) {
    await runner.screenshot(page, 'group-create-submit-timeout');
    const dialogText = await dialog.innerText({ timeout: 1_000 }).catch(() => '');
    throw new Error(`group create submit did not complete: ${shortError(error)} dialogText=${dialogText.replace(/\s+/g, ' ').slice(0, 500)}`);
  }
  await waitForTextAnywhere(page, groupName, 15_000);
  return {
    groupName,
    selectedContactCount: 2,
    contactCount,
    selectionRules: {
      disabledBeforeSelection,
      disabledWithOneMember,
      disabledAfterCancel,
      disabledWithTwoMembers,
    },
  };
}

export async function waitForLocatorCountAtLeast(locator, minCount, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let count = 0;
  while (Date.now() < deadline) {
    count = await locator.count().catch(() => 0);
    if (count >= minCount) return count;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return count;
}

export async function openGroupByTitle(page, title) {
  await openMessages(page);
  await selectGroupFilter(page);
  await waitForConversationRows(page, 10_000);
  const row = page.locator('.e-conversation-row').filter({ hasText: title }).first();
  if ((await row.count()) < 1) throw new Error(`created group row was not found: ${title}`);
  await row.click({ timeout: 5_000 });
  await page.locator('.e-chat-panel.group-chat-mode, .composer').first().waitFor({ state: 'visible', timeout: 8_000 });
}

export async function openMessages(page) {
  await closeAccountPopover(page);
  const navItems = page.locator('.nav-item');
  const count = await navItems.count();
  if (count < 1) throw new Error('navigation is not rendered');
  await navItems.nth(0).click();
  await page.locator('.e-conversation-panel, .message-info-standalone, .composer').first()
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => undefined);
  await closeAccountPopover(page);
}

export async function selectGroupFilter(page) {
  const tabs = page.locator('.e-filter-row button');
  const tabCount = await tabs.count();
  if (tabCount < 4) throw new Error(`expected 4 conversation filter tabs, got ${tabCount}`);
  await tabs.nth(3).click();
  await page.waitForTimeout(800);
}

export async function waitForConversationRows(page, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let count = 0;
  while (Date.now() < deadline) {
    count = await page.locator('.e-conversation-row').count();
    if (count > 0) return count;
    await page.waitForTimeout(500);
  }
  return count;
}

export async function ensureGroupConversationOpen(page, fallbackTitle = null) {
  if (await page.locator('.e-chat-panel.group-chat-mode .composer, .e-chat-panel.group-chat-mode').first().isVisible({ timeout: 1_000 }).catch(() => false)) return;
  if (fallbackTitle) {
    await openGroupByTitle(page, fallbackTitle);
    return;
  }
  await openMessages(page);
  await selectGroupFilter(page);
  const rowCount = await waitForConversationRows(page, 10_000);
  if (rowCount < 1) throw new Error('no group conversation row to open');
  await page.locator('.e-conversation-row').first().click({ timeout: 5_000 });
  await page.locator('.e-chat-panel.group-chat-mode, .composer').first().waitFor({ state: 'visible', timeout: 8_000 });
}

export async function focusComposer(page) {
  await page.locator('.composer').waitFor({ state: 'visible', timeout: 8_000 });
  const editor = page.locator('.composer-lexical-editor[contenteditable="true"], .composer textarea').first();
  await editor.waitFor({ state: 'visible', timeout: 5_000 });
  await editor.click();
  return editor;
}

export async function clearComposer(page) {
  await page.keyboard.press('Control+A').catch(() => undefined);
  await page.keyboard.press('Backspace').catch(() => undefined);
}

export async function composerText(editor) {
  const text = await editor.textContent({ timeout: 1_000 }).catch(() => '');
  const value = await editor.inputValue({ timeout: 300 }).catch(() => '');
  return `${text || ''}${value || ''}`;
}

export async function assertMessageSentSuccess(page, text, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  let lastState = null;
  while (Date.now() < deadline) {
    lastState = await sentMessageState(page, text);
    if (lastState.failed) {
      throw new Error(`message send failed: ${JSON.stringify(lastState)}`);
    }
    if (lastState.exists && !lastState.sending) return lastState;
    await page.waitForTimeout(500);
  }
  throw new Error(`message did not reach successful sent state: ${JSON.stringify(lastState)}`);
}

export async function assertMessageSendFailed(page, text, expectedCodeOrText = '') {
  const state = await sentMessageState(page, text);
  if (!state.exists) throw new Error(`failed message bubble was not found: ${text}`);
  if (!state.failed) throw new Error(`message was not marked failed: ${JSON.stringify(state)}`);
  if (expectedCodeOrText && !JSON.stringify(state).includes(expectedCodeOrText)) {
    throw new Error(`failed message did not include expected text/code ${expectedCodeOrText}: ${JSON.stringify(state)}`);
  }
  return state;
}

export async function assertPreviewReflectsDeliveredMessage(page, text, timeoutMs = 8_000) {
  const found = await waitForTextAnywhere(page, text, timeoutMs);
  if (!found) throw new Error(`delivered message did not appear in conversation preview: ${text}`);
  const failedPreview = await page.evaluate((needle) => {
    const rows = Array.from(document.querySelectorAll('.e-conversation-row'));
    const row = rows.find((node) => (node.textContent || '').includes(needle));
    if (!row) return null;
    return /发送失败|重试|failed|retry/i.test(row.textContent || '');
  }, text);
  if (failedPreview) throw new Error(`conversation preview shows delivered text as failed: ${text}`);
  return { text };
}

export async function sentMessageState(page, text) {
  return page.evaluate((needle) => {
    const messages = Array.from(document.querySelectorAll('.pc-chat-message'));
    const matching = messages.filter((node) => (node.textContent || '').includes(needle));
    const target = matching.at(-1);
    if (!target) {
      return { exists: false, failed: false, sending: false, statusText: '', className: '' };
    }
    const statusText = target.querySelector('.pc-chat-time')?.textContent || '';
    const failedMarker = target.querySelector('.pc-chat-failed-marker');
    const sendingMarker = target.querySelector('.pc-chat-sending-marker');
    const className = target.getAttribute('class') || '';
    const failed =
      Boolean(failedMarker) ||
      /发送失败|重试|failed|retry/i.test(statusText) ||
      /failed/i.test(className);
    return {
      exists: true,
      failed,
      sending: Boolean(sendingMarker),
      statusText: statusText.trim(),
      className,
      failedTitle: failedMarker?.getAttribute('title') || failedMarker?.getAttribute('aria-label') || '',
      failedText: failedMarker?.textContent || '',
    };
  }, text);
}

export async function waitForTextAnywhere(page, text, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const found = await page.evaluate((needle) => document.body.innerText.includes(needle), text).catch(() => false);
    if (found) return true;
    await page.waitForTimeout(500);
  }
  return false;
}

export async function waitForAuthSession(page) {
  const deadline = Date.now() + 8_000;
  let lastSession = null;
  while (Date.now() < deadline) {
    lastSession = await page.evaluate(() => window.desktopApi.readAuthSession()).catch(() => null);
    if (lastSession?.tenantToken) return lastSession;
    await page.waitForTimeout(300);
  }
  return lastSession;
}

export async function getAuthSession(page) {
  const session = await waitForAuthSession(page);
  if (!session?.tenantToken) throw new Error('tenant token is missing');
  return session;
}

export async function apiRequest(session, path, { method = 'GET', body = undefined, expectedStatuses = [200] } = {}) {
  const url = path.startsWith('http') ? path : `${apiBaseUrl}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  let response;
  try {
    response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.tenantToken}`,
        ...(session.deviceId ? { 'X-Device-Id': session.deviceId } : {}),
        ...(session.clientInstanceId ? { 'X-Client-Instance-Id': session.clientInstanceId } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } finally {
    clearTimeout(timeout);
  }
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!expectedStatuses.includes(response.status)) {
    const requestId = response.headers.get('x-request-id') || response.headers.get('request-id') || '';
    throw new Error(`API ${method} ${path} returned ${response.status}: ${text.slice(0, 500)} requestId=${requestId}`);
  }
  return {
    status: response.status,
    data,
    requestId: response.headers.get('x-request-id') || response.headers.get('request-id') || '',
  };
}

export async function createGroupFixtureViaApi(session, groupName) {
  const membersResp = await apiRequest(session, '/api/client/v1/tenant/members');
  const membersPayload = membersResp.data?.data || membersResp.data;
  const members = Array.isArray(membersPayload?.items)
    ? membersPayload.items
    : Array.isArray(membersPayload)
      ? membersPayload
      : [];
  const memberUserIds = members
    .map((item) => item.userId || item.memberUserId || item.id)
    .filter((userId) => userId && userId !== session.userId)
    .slice(0, 2);
  if (memberUserIds.length < 2) {
    throw new Error(`tenant member API returned fewer than 2 usable members: ${memberUserIds.length}`);
  }
  const created = await apiRequest(session, '/api/client/v1/groups', {
    method: 'POST',
    body: { name: groupName, title: groupName, memberUserIds },
    expectedStatuses: [200, 201],
  });
  const payload = created.data?.data || created.data || {};
  return {
    groupName,
    memberUserIds,
    groupId: payload.groupId || payload.conversationId || payload.id || payload.targetId || null,
    createStatus: created.status,
    rawKeys: Object.keys(payload).slice(0, 12),
  };
}

export async function findGroupConversationByTitle(session, title) {
  const resp = await apiRequest(session, '/api/client/v1/conversations?limit=100', { expectedStatuses: [200] });
  const payload = resp.data?.data || resp.data;
  const rows = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [];
  const row = rows.find((item) => {
    const kind = String(item.type || item.conversationType || item.targetType || '').toLowerCase();
    const name = item.title || item.name || item.displayName || item.targetName || '';
    return kind.includes('group') && name === title;
  });
  return row || null;
}

export async function solveCaptchaIfVisible(page, runner = null) {
  await page.waitForTimeout(1_500);
  const captchaVisible = await page.locator('.captcha-inline').isVisible({ timeout: 1_000 }).catch(() => false);
  if (!captchaVisible) return;
  const question = await page.locator('.captcha-inline-question').textContent({ timeout: 1_000 }).catch(() => '');
  const answer = solveMath(question);
  if (answer === null) throw new Error(`captcha visible but not solvable: ${question}`);
  await page.locator('.captcha-inline input').fill(String(answer));
  await page.locator('.login-submit').click();
  runner?.push('auth: captcha solved through client', 'passed', { question, answer });
}

export function solveMath(question) {
  const match = String(question || '').match(/(-?\d+)\s*([+\-*/])\s*(-?\d+)/);
  if (!match) return null;
  const left = Number(match[1]);
  const right = Number(match[3]);
  switch (match[2]) {
    case '+':
      return left + right;
    case '-':
      return left - right;
    case '*':
      return left * right;
    case '/':
      return right ? Math.trunc(left / right) : null;
    default:
      return null;
  }
}

export async function closeAccountPopover(page) {
  const popover = page.locator('.account-popover');
  if (!(await popover.isVisible({ timeout: 300 }).catch(() => false))) return;
  await page.keyboard.press('Escape').catch(() => undefined);
  if (await popover.isVisible({ timeout: 500 }).catch(() => false)) {
    await page.locator('[data-testid="account-entry-button"]').click({ force: true }).catch(() => undefined);
  }
  if (await popover.isVisible({ timeout: 500 }).catch(() => false)) {
    await page.mouse.click(1030, 38).catch(() => undefined);
  }
}

export async function appPage(app) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    for (const page of app.windows()) {
      if (page.url().startsWith('devtools://')) continue;
      try {
        await page.waitForFunction(() => Boolean(window.desktopApi?.getAppInstanceProfile), null, { timeout: 1_000 });
        return page;
      } catch {
        // Wait until the preload bridge is ready.
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('renderer window with desktopApi was not found');
}

export function uniqueGroupName(prefix = 'pc-auto-group') {
  return `${prefix}-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function shortError(error) {
  return String(error?.message || error || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(' | ');
}
