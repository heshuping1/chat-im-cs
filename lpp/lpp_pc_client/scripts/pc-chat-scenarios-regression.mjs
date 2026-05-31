import { _electron as electron } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const reportDir = join(
  root,
  '..',
  'reports',
  'pc',
  'chat-scenarios-regression',
  new Date().toISOString().replace(/[:.]/g, '-'),
);
const electronPath = join(root, 'node_modules', 'electron', 'dist', 'electron.exe');
const viteUrl = 'http://127.0.0.1:5173';
const apiBaseUrl = 'https://chat.hearteasechat.com';
const password = '123123123';
const accounts = {
  staff: { label: 'staff', identifier: 'lpp_gs9fn2c7', password },
  customer: { label: 'customer', identifier: 'lpp_hlty0ap2', password },
};

const results = [];
const apps = [];

await mkdir(reportDir, { recursive: true });

try {
  const staff = await launchClient(`chat-staff-${Date.now()}`);
  const customer = await launchClient(`chat-customer-${Date.now()}`);

  await login(staff, accounts.staff);
  await login(customer, accounts.customer);

  await exerciseStaffOutboundMessage(staff);
  await exerciseCustomerOutboundMessage(customer);
  await exerciseStaffReceiveMessage(staff);
  await exerciseConversationFilters(customer);
  await exerciseComposerTools(customer);
  await exerciseConversationReadOpen(customer);
  await exerciseServiceShell(staff);
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
    },
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

async function login(client, account) {
  await step(`${account.label}: login`, async () => {
    const { page } = client;
    await page.locator('.login-page, .account-entry').first().waitFor({ state: 'visible', timeout: 12_000 });
    if (await page.locator('.login-page').isVisible({ timeout: 1_000 }).catch(() => false)) {
      const inputs = page.locator('input');
      await inputs.nth(0).fill(apiBaseUrl);
      await inputs.nth(1).fill(account.identifier);
      await inputs.nth(2).fill(account.password);
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
      hasPlatformToken: Boolean(session.platformToken),
    };
  });
}

async function exerciseCustomerOutboundMessage(customer) {
  const { page } = customer;
  const messageText = `PC聊天自动化 ${new Date().toISOString()}`;
  globalThis.lastChatMessageText = messageText;

  await step('chat: customer conversation list has data', async () => {
    await openMessages(page);
    const rowCount = await waitForConversationRows(page, 20_000);
    await page.screenshot({ path: join(reportDir, 'customer-conversation-list.png'), fullPage: false });
    if (rowCount < 1) throw new Error('customer account has no conversation rows');
    return { rowCount };
  });

  await step('chat: customer opens first conversation', async () => {
    await openFirstConversation(page);
    const title = await page.locator('.e-chat-panel header, .e-chat-panel').first().innerText({ timeout: 2_000 }).catch(() => '');
    const composerVisible = await page.locator('.composer').isVisible({ timeout: 3_000 }).catch(() => false);
    if (!composerVisible) throw new Error('composer is not visible after opening conversation');
    await page.screenshot({ path: join(reportDir, 'customer-conversation-open.png'), fullPage: false });
    return { title: title.slice(0, 160), composerVisible };
  });

  await step('chat: Shift+Enter keeps draft instead of sending', async () => {
    const editor = await focusComposer(page);
    await page.keyboard.type('line1');
    await page.keyboard.press('Shift+Enter');
    await page.keyboard.type('line2');
    const text = await composerText(editor);
    if (!text.includes('line1') || !text.includes('line2')) {
      throw new Error(`draft did not keep multiline content: ${text}`);
    }
    await clearComposer(page);
    return { multilineDraftAccepted: true };
  });

  await step('chat: customer sends text message with Enter', async () => {
    const editor = await focusComposer(page);
    await page.keyboard.type(messageText);
    await page.keyboard.press('Enter');
    const state = await waitForSentMessageSuccess(page, messageText, 20_000);
    await page.screenshot({ path: join(reportDir, 'customer-message-sent.png'), fullPage: false });
    return { text: messageText, state };
  });
}

async function exerciseStaffOutboundMessage(staff) {
  const { page } = staff;
  const messageText = `PC客服端发送测试 ${new Date().toISOString()}`;

  await step('chat: staff conversation list has data', async () => {
    await openMessages(page);
    const rowCount = await waitForConversationRows(page, 20_000);
    await page.screenshot({ path: join(reportDir, 'staff-conversation-list.png'), fullPage: false });
    if (rowCount < 1) throw new Error('staff account has no conversation rows');
    return { rowCount };
  });

  await step('chat: staff sends text message with Enter', async () => {
    await openFirstConversation(page);
    const editor = await focusComposer(page);
    await page.keyboard.type(messageText);
    await page.keyboard.press('Enter');
    const state = await waitForSentMessageSuccess(page, messageText, 20_000);
    await page.screenshot({ path: join(reportDir, 'staff-message-sent.png'), fullPage: false });
    return { text: messageText, state };
  });
}

async function exerciseStaffReceiveMessage(staff) {
  const { page } = staff;
  const messageText = globalThis.lastChatMessageText;

  await step('chat: staff receives customer message or preview', async () => {
    await openMessages(page);
    const found = await waitForTextAnywhere(page, messageText, 35_000);
    await page.screenshot({ path: join(reportDir, 'staff-after-customer-message.png'), fullPage: false });
    if (!found) {
      throw new Error('staff client did not show the customer message or conversation preview within 35s');
    }
    return { text: messageText };
  });
}

async function exerciseConversationFilters(customer) {
  const { page } = customer;
  await step('chat: conversation tabs switch without losing list shell', async () => {
    await openMessages(page);
    const tabButtons = page.locator('.e-message-list-top button, .e-conversation-panel button').filter({ hasText: '未读' });
    const unreadCount = await tabButtons.count();
    if (unreadCount < 1) throw new Error('unread tab button not found');
    await tabButtons.first().click();
    await page.waitForTimeout(600);
    const panelVisible = await page.locator('.e-conversation-panel').isVisible({ timeout: 1_000 }).catch(() => false);
    if (!panelVisible) throw new Error('conversation panel disappeared after switching unread tab');
    const allButtons = page.locator('.e-message-list-top button, .e-conversation-panel button').filter({ hasText: '全部' });
    if ((await allButtons.count()) > 0) await allButtons.first().click();
    await page.screenshot({ path: join(reportDir, 'customer-conversation-tabs.png'), fullPage: false });
    return true;
  });

  await step('chat: conversation search filters visible rows', async () => {
    await openMessages(page);
    const searchInput = page.locator('.e-message-list-top input, .e-conversation-panel input[placeholder*="搜索"]').first();
    if ((await searchInput.count()) < 1) throw new Error('conversation search input not found');
    await searchInput.fill('Mouse');
    await page.waitForTimeout(800);
    const rowCount = await page.locator('.e-conversation-row').count();
    await page.screenshot({ path: join(reportDir, 'customer-conversation-search.png'), fullPage: false });
    await searchInput.fill('');
    if (rowCount < 1) throw new Error('search removed all expected Mouse conversations');
    return { rowCount };
  });
}

async function exerciseComposerTools(customer) {
  const { page } = customer;
  await step('chat: emoji panel opens', async () => {
    await openMessages(page);
    await ensureConversationOpen(page);
    const emojiButton = page.locator('.composer button[aria-label="表情"], .composer button[title="表情"]');
    if ((await emojiButton.count()) < 1) throw new Error('emoji button not found');
    await emojiButton.first().click();
    const visible = await page.locator('.composer-emoji-panel, [role="listbox"], .emoji-panel').first()
      .isVisible({ timeout: 2_000 })
      .catch(() => false);
    await page.screenshot({ path: join(reportDir, 'customer-emoji-panel.png'), fullPage: false });
    if (!visible) throw new Error('emoji panel did not open');
    await page.keyboard.press('Escape').catch(() => undefined);
    return true;
  });

  await step('chat: more tools panel opens', async () => {
    const moreButton = page.locator('.composer button[aria-label="更多功能"], .composer button[title="更多功能"]');
    if ((await moreButton.count()) < 1) throw new Error('more tools button not found');
    await moreButton.first().click();
    const visible = await page.locator('.composer-plus-panel').isVisible({ timeout: 2_000 }).catch(() => false);
    await page.screenshot({ path: join(reportDir, 'customer-more-tools-panel.png'), fullPage: false });
    if (!visible) throw new Error('more tools panel did not open');
    return true;
  });

  await step('chat: file inputs are wired', async () => {
    const fileInputs = await page.locator('[data-testid="composer-attachment-input"], [data-testid="composer-image-input"], [data-testid="composer-file-input"]').count();
    if (fileInputs < 1) throw new Error('composer file inputs were not mounted');
    return { fileInputs };
  });
}

async function exerciseConversationReadOpen(customer) {
  const { page } = customer;
  await step('chat: opening conversation marks row active', async () => {
    await openMessages(page);
    const rowCount = await waitForConversationRows(page, 10_000);
    if (rowCount < 1) return { skipped: true, reason: 'no conversation rows' };
    await openFirstConversation(page);
    const activeCount = await page.locator('.e-conversation-row.active').count();
    if (activeCount < 1) throw new Error('no active conversation row after opening');
    return { activeCount };
  });
}

async function exerciseServiceShell(staff) {
  const { page } = staff;
  await step('service chat: staff workbench shell renders', async () => {
    const navItems = page.locator('.nav-item');
    const count = await navItems.count();
    if (count < 2) throw new Error(`nav items insufficient: ${count}`);
    await navItems.nth(1).click();
    await page.locator('.h-thread-list, .h-reception-mode, .h-message-stage').first()
      .waitFor({ state: 'visible', timeout: 10_000 })
      .catch(() => undefined);
    const threadCards = await page.locator('.h-thread-card').count();
    const receptionModeVisible = await page.locator('.h-reception-mode').isVisible({ timeout: 1_000 }).catch(() => false);
    await page.screenshot({ path: join(reportDir, 'staff-service-chat-shell.png'), fullPage: false });
    if (!receptionModeVisible) throw new Error('reception mode controls were not visible');
    return { threadCards, receptionModeVisible };
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

async function openFirstConversation(page) {
  await closeAccountPopover(page);
  const rows = page.locator('.e-conversation-row');
  const count = await rows.count();
  if (count < 1) throw new Error('no conversation row to open');
  await rows.first().click({ timeout: 5_000 });
  await page.locator('.composer').waitFor({ state: 'visible', timeout: 8_000 });
}

async function ensureConversationOpen(page) {
  if (await page.locator('.composer').isVisible({ timeout: 1_000 }).catch(() => false)) return;
  await openFirstConversation(page);
}

async function focusComposer(page) {
  await ensureConversationOpen(page);
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
    await page.waitForTimeout(1_000);
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
