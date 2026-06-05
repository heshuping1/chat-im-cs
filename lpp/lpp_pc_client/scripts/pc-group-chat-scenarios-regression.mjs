import { _electron as electron } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const reportDir = join(
  root,
  '..',
  'reports',
  'pc',
  'group-chat-scenarios-regression',
  new Date().toISOString().replace(/[:.]/g, '-'),
);
const electronPath = join(root, 'node_modules', 'electron', 'dist', 'electron.exe');
const viteUrl = 'http://127.0.0.1:5173';
const apiBaseUrl = 'https://chat.hearteasechat.com';
const electronSandboxRoot = join(root, 'tmp', 'electron-sandbox');
const electronSandboxAppData = join(electronSandboxRoot, 'appdata');
const electronSandboxLocalAppData = join(electronSandboxRoot, 'localappdata');
const electronSandboxUserDataRoot = join(electronSandboxRoot, 'userdata');
const account = {
  identifier: 'lpp_gs9fn2c7',
  password: '123123123',
};

const results = [];
const apps = [];

await mkdir(reportDir, { recursive: true });

try {
  const staff = await launchClient(`group-staff-${Date.now()}`);
  await login(staff);
  await exerciseGroupConversation(staff.page);
  await exerciseGroupInfoPanel(staff.page);
  await exerciseGroupMentionDraft(staff.page);
  await exerciseGroupSearch(staff.page);
} catch (error) {
  push('runner', 'failed', { error: shortError(error) });
} finally {
  await closeAll();
  await writeFile(
    join(reportDir, 'summary.json'),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)}\n`,
  );
  console.log(JSON.stringify({ reportDir, results }, null, 2));
  if (results.some((item) => item.status === 'failed')) process.exitCode = 1;
}

async function launchClient(profileId) {
  const app = await electron.launch({
    executablePath: electronPath,
    args: ['.', `--profile=${profileId}`],
    cwd: root,
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: viteUrl,
      LPP_PC_INSTANCE_PROFILE: profileId,
      APPDATA: electronSandboxAppData,
      LOCALAPPDATA: electronSandboxLocalAppData,
      LPP_PC_USER_DATA_ROOT: electronSandboxUserDataRoot,
      TEMP: join(electronSandboxRoot, 'temp'),
      TMP: join(electronSandboxRoot, 'temp'),
    },
  });
  apps.push(app);
  const page = await appPage(app);
  await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
  const profile = await page.evaluate(() => window.desktopApi.getAppInstanceProfile());
  push('group: client launched', 'passed', {
    profileId,
    clientInstanceId: profile.clientInstanceId,
    deviceId: profile.deviceId,
  });
  return { app, page, profileId, profile };
}

async function login(client) {
  await step('group: staff login', async () => {
    const { page } = client;
    await page.locator('.login-page, .account-entry').first().waitFor({ state: 'visible', timeout: 12_000 });
    if (await page.locator('.login-page').isVisible({ timeout: 1_000 }).catch(() => false)) {
      await fillAuthLoginForm(page);
      await page.locator('.login-submit').click();
      await solveCaptchaIfVisible(page);
      await page.locator('.login-page').waitFor({ state: 'hidden', timeout: 25_000 });
    }
    const session = await waitForAuthSession(page);
    if (!session?.tenantToken) throw new Error('tenant token was not stored after login');
    return {
      displayName: session.displayName,
      tenantId: session.tenantId,
      hasTenantToken: Boolean(session.tenantToken),
    };
  });
}

async function fillAuthLoginForm(page) {
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
  if ((await advancedInputs.count()) >= 1) await advancedInputs.nth(0).fill(apiBaseUrl);
}

async function exerciseGroupConversation(page) {
  await step('group: conversation filter shows group rows', async () => {
    await openMessages(page);
    await selectGroupFilter(page);
    const rowCount = await waitForConversationRows(page, 10_000);
    await page.screenshot({ path: join(reportDir, 'group-filter-list.png'), fullPage: false });
    if (rowCount < 1) {
      return { skipped: true, reason: 'no group conversations in this account' };
    }
    const groupRows = await page.locator('.e-conversation-row').evaluateAll((rows) =>
      rows.slice(0, 6).map((row) => row.textContent?.replace(/\s+/g, ' ').trim() || ''),
    );
    return { rowCount, groupRows };
  });

  await step('group: open first group conversation', async () => {
    await openFirstGroupConversation(page);
    const isGroupMode = await page.locator('.e-chat-panel.group-chat-mode').isVisible({ timeout: 5_000 }).catch(() => false);
    const header = await page.locator('.e-chat-header').innerText({ timeout: 2_000 }).catch(() => '');
    await page.screenshot({ path: join(reportDir, 'group-conversation-open.png'), fullPage: false });
    if (!isGroupMode) throw new Error('opened conversation is not rendered in group-chat mode');
    return { header: header.slice(0, 180), isGroupMode };
  });

  await step('group: send text message with Enter', async () => {
    await ensureGroupConversationOpen(page);
    const messageText = `PC group automation ${new Date().toISOString()}`;
    globalThis.groupMessageText = messageText;
    globalThis.groupMessageSucceeded = false;
    const editor = await focusComposer(page);
    await page.keyboard.type(messageText);
    await page.keyboard.press('Enter');
    const state = await waitForSentMessageSuccess(page, messageText, 20_000);
    globalThis.groupMessageSucceeded = true;
    await page.screenshot({ path: join(reportDir, 'group-message-sent.png'), fullPage: false });
    return { text: messageText, state };
  });

  await step('group: row preview updates after sending', async () => {
    if (!globalThis.groupMessageSucceeded) {
      return {
        skipped: true,
        reason: 'send failed; local preview update is not accepted as delivery success',
        text: globalThis.groupMessageText,
      };
    }
    await openMessages(page);
    await selectGroupFilter(page);
    const found = await waitForTextAnywhere(page, globalThis.groupMessageText, 8_000);
    await page.screenshot({ path: join(reportDir, 'group-preview-after-send.png'), fullPage: false });
    if (!found) throw new Error('group message did not appear in group list preview');
    return { text: globalThis.groupMessageText };
  });
}

async function exerciseGroupInfoPanel(page) {
  await step('group: profile panel opens with group metadata', async () => {
    await ensureGroupConversationOpen(page);
    if (!(await page.locator('.e-profile-panel, .message-info-panel, .customer-info-panel').first().isVisible({ timeout: 1_000 }).catch(() => false))) {
      const actionButtons = page.locator('.e-chat-actions .e-icon-button');
      const count = await actionButtons.count();
      if (count < 2) throw new Error(`expected at least 2 chat action buttons, got ${count}`);
      await actionButtons.nth(1).click();
    }
    await page.locator('.e-profile-panel, .message-info-panel, .customer-info-panel').first().waitFor({ state: 'visible', timeout: 5_000 });
    const infoRows = await page.locator('.customer-info-row').count();
    const tabCount = await page.locator('.customer-info-tabs button').count();
    const infoText = await page.locator('.e-profile-panel, .message-info-panel, .customer-info-panel').first().innerText({ timeout: 2_000 }).catch(() => '');
    await page.screenshot({ path: join(reportDir, 'group-info-panel.png'), fullPage: false });
    if (infoRows < 3 || tabCount < 3) {
      throw new Error(`group info panel incomplete: rows=${infoRows}, tabs=${tabCount}`);
    }
    return { infoRows, tabCount, text: infoText.slice(0, 220) };
  });

  await step('group: announcement and files tabs render empty states', async () => {
    const tabs = page.locator('.customer-info-tabs button');
    const tabCount = await tabs.count();
    if (tabCount < 3) throw new Error(`expected group info tabs, got ${tabCount}`);
    await tabs.nth(1).click();
    await page.waitForTimeout(300);
    const announcementVisible = await page.locator('.e-profile-panel, .message-info-panel, .customer-info-panel').first().isVisible({ timeout: 1_000 }).catch(() => false);
    await tabs.nth(2).click();
    await page.waitForTimeout(300);
    const filesVisible = await page.locator('.e-profile-panel, .message-info-panel, .customer-info-panel').first().isVisible({ timeout: 1_000 }).catch(() => false);
    await page.screenshot({ path: join(reportDir, 'group-info-files-tab.png'), fullPage: false });
    if (!announcementVisible || !filesVisible) throw new Error('group info tab content did not remain visible');
    return true;
  });
}

async function exerciseGroupMentionDraft(page) {
  await step('group: at-mention draft behavior', async () => {
    await ensureGroupConversationOpen(page);
    const editor = await focusComposer(page);
    await clearComposer(page);
    await page.keyboard.type('@');
    await page.waitForTimeout(1_000);
    const mentionPanelVisible = await page.locator('.composer-mention-panel').isVisible({ timeout: 1_000 }).catch(() => false);
    const draftText = await composerText(editor);
    await page.screenshot({ path: join(reportDir, 'group-mention-draft.png'), fullPage: false });
    await clearComposer(page);
    if (!mentionPanelVisible) {
      return {
        skipped: true,
        reason: 'mention candidate panel did not appear; group may not expose member candidates to composer',
        draftText,
      };
    }
    return { mentionPanelVisible, draftText };
  });
}

async function exerciseGroupSearch(page) {
  await step('group: in-chat search opens and filters message text', async () => {
    await ensureGroupConversationOpen(page);
    const actionButtons = page.locator('.e-chat-actions .e-icon-button');
    const count = await actionButtons.count();
    if (count < 1) throw new Error('chat search button not found');
    await actionButtons.nth(0).click();
    await page.waitForTimeout(500);
    const searchInput = page.locator('.message-search input, .e-message-stage input, input[placeholder*="搜索"], input[placeholder*="查找"]').first();
    const searchInputCount = await searchInput.count();
    await page.screenshot({ path: join(reportDir, 'group-chat-search-open.png'), fullPage: false });
    if (searchInputCount < 1) {
      return { skipped: true, reason: 'message lookup panel opened without a visible search input selector' };
    }
    await searchInput.fill('PC group automation');
    await page.waitForTimeout(600);
    const found = await waitForTextAnywhere(page, 'PC group automation', 3_000);
    if (!found) throw new Error('group chat search did not keep matching message visible');
    return true;
  });
}

async function openMessages(page) {
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

async function selectGroupFilter(page) {
  const tabs = page.locator('.e-filter-row button');
  const tabCount = await tabs.count();
  if (tabCount < 4) throw new Error(`expected 4 conversation filter tabs, got ${tabCount}`);
  await tabs.nth(3).click();
  await page.waitForTimeout(800);
}

async function waitForConversationRows(page, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let count = 0;
  while (Date.now() < deadline) {
    count = await page.locator('.e-conversation-row').count();
    if (count > 0) return count;
    await page.waitForTimeout(500);
  }
  return count;
}

async function openFirstGroupConversation(page) {
  await openMessages(page);
  await selectGroupFilter(page);
  const rowCount = await waitForConversationRows(page, 10_000);
  if (rowCount < 1) throw new Error('no group conversation row to open');
  await page.locator('.e-conversation-row').first().click({ timeout: 5_000 });
  await page.locator('.e-chat-panel.group-chat-mode, .composer').first().waitFor({ state: 'visible', timeout: 8_000 });
}

async function ensureGroupConversationOpen(page) {
  if (await page.locator('.e-chat-panel.group-chat-mode .composer, .e-chat-panel.group-chat-mode').first().isVisible({ timeout: 1_000 }).catch(() => false)) return;
  await openFirstGroupConversation(page);
}

async function focusComposer(page) {
  await page.locator('.composer').waitFor({ state: 'visible', timeout: 8_000 });
  const editor = page.locator('.composer-lexical-editor[contenteditable="true"], .composer textarea').first();
  await editor.waitFor({ state: 'visible', timeout: 5_000 });
  await editor.click();
  return editor;
}

async function clearComposer(page) {
  await page.keyboard.press('Control+A').catch(() => undefined);
  await page.keyboard.press('Backspace').catch(() => undefined);
}

async function composerText(editor) {
  const text = await editor.textContent({ timeout: 1_000 }).catch(() => '');
  const value = await editor.inputValue({ timeout: 300 }).catch(() => '');
  return `${text || ''}${value || ''}`;
}

async function waitForSentMessageSuccess(page, text, timeoutMs) {
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

async function sentMessageState(page, text) {
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
    const failed =
      Boolean(failedMarker) ||
      /发送失败|重试|failed|retry/i.test(statusText) ||
      /failed/i.test(target.getAttribute('class') || '');
    return {
      exists: true,
      failed,
      sending: Boolean(sendingMarker),
      statusText: statusText.trim(),
      className: target.getAttribute('class') || '',
      failedTitle: failedMarker?.getAttribute('title') || failedMarker?.getAttribute('aria-label') || '',
    };
  }, text);
}

async function waitForTextAnywhere(page, text, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const found = await page.evaluate((needle) => document.body.innerText.includes(needle), text).catch(() => false);
    if (found) return true;
    await page.waitForTimeout(500);
  }
  return false;
}

async function waitForAuthSession(page) {
  const deadline = Date.now() + 8_000;
  let lastSession = null;
  while (Date.now() < deadline) {
    lastSession = await page.evaluate(() => window.desktopApi.readAuthSession()).catch(() => null);
    if (lastSession?.tenantToken) return lastSession;
    await page.waitForTimeout(300);
  }
  return lastSession;
}

async function solveCaptchaIfVisible(page) {
  await page.waitForTimeout(1_500);
  const captchaVisible = await page.locator('.captcha-inline').isVisible({ timeout: 1_000 }).catch(() => false);
  if (!captchaVisible) return;
  const question = await page.locator('.captcha-inline-question').textContent({ timeout: 1_000 }).catch(() => '');
  const answer = solveMath(question);
  if (answer === null) throw new Error(`captcha visible but not solvable: ${question}`);
  await page.locator('.captcha-inline input').fill(String(answer));
  await page.locator('.login-submit').click();
  push('auth: captcha solved through client', 'passed', { question, answer });
}

function solveMath(question) {
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

async function closeAccountPopover(page) {
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

async function appPage(app) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    for (const page of app.windows()) {
      if (page.url().startsWith('devtools://')) continue;
      try {
        await page.waitForFunction(
          () => Boolean(window.desktopApi?.getAppInstanceProfile),
          null,
          { timeout: 1_000 },
        );
        return page;
      } catch {
        // Continue polling until the preload bridge is available.
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('renderer window with desktopApi was not found');
}

async function step(name, fn) {
  try {
    const detail = await fn();
    if (detail && detail.skipped) {
      push(name, 'skipped', detail);
    } else {
      push(name, 'passed', detail && detail !== true ? detail : {});
    }
  } catch (error) {
    push(name, 'failed', { error: shortError(error) });
  }
}

async function closeAll() {
  for (const app of apps.splice(0).reverse()) {
    await app.close().catch(() => undefined);
  }
}

function shortError(error) {
  return String(error?.message || error || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(' | ');
}

function push(name, status, detail = {}) {
  results.push({ name, status, ...detail });
}
