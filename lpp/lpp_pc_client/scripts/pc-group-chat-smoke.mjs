import { summarizeCatalog } from './pc-group-chat-scenario-catalog.mjs';
import {
  assertMessageSentSuccess,
  assertPreviewReflectsDeliveredMessage,
  clearComposer,
  composerText,
  createElectronTestRunner,
  createGroupFixtureViaApi,
  createGroupFromUi,
  defaultAccounts,
  ensureGroupConversationOpen,
  findGroupConversationByTitle,
  focusComposer,
  getAuthSession,
  loginClient,
  openGroupByTitle,
  openMessages,
  selectGroupFilter,
  sentMessageState,
  uniqueGroupName,
} from './pc-electron-chat-helpers.mjs';

const catalog = summarizeCatalog('smoke');
const runner = createElectronTestRunner({
  suiteName: 'group-chat-smoke',
  catalog,
});

const fixture = {
  groupName: uniqueGroupName(),
  groupId: null,
  deliveredMessageText: null,
};

try {
  const owner = await runner.launchClient(`group-smoke-owner-${Date.now()}`);
  await loginClient(runner, owner, defaultAccounts.owner);
  await exerciseGroupCreation(owner.page);
  await exerciseGroupMessage(owner.page);
  await exerciseGroupProfile(owner.page);
} catch (error) {
  runner.push('runner', 'failed', { error: String(error?.message || error), category: 'runner' });
} finally {
  await runner.closeAll();
  await runner.finalize({ primaryFixture: fixture });
}

async function exerciseGroupCreation(page) {
  const created = await runner.step('group.create.member-selection-rules', async () => {
    const detail = await createGroupFromUi(runner, page, fixture.groupName);
    runner.fixtures.push({
      type: 'group',
      groupName: fixture.groupName,
      createdBy: defaultAccounts.owner.identifier,
      cleanup: 'not-attempted-in-smoke',
    });
    await runner.screenshot(page, 'group-created-visible');
    return detail;
  }, { hardGate: true, category: 'product-failure' });
  if (created.status !== 'passed') {
    const fallback = await runner.step('prepareGroupFixture.api-fallback', async () => {
      await page.keyboard.press('Escape').catch(() => undefined);
      const session = await getAuthSession(page);
      const detail = await createGroupFixtureViaApi(session, fixture.groupName);
      fixture.groupId = detail.groupId;
      runner.fixtures.push({
        type: 'group',
        groupName: fixture.groupName,
        groupId: fixture.groupId,
        createdBy: defaultAccounts.owner.identifier,
        cleanup: 'not-attempted-in-smoke',
        setupMode: 'api-fallback-after-ui-create-failure',
      });
      await openGroupByTitle(page, fixture.groupName);
      return detail;
    }, { hardGate: true, category: 'test-data-or-api' });
    if (fallback.status !== 'passed') throw new Error('group creation fixture unavailable; stop dependent smoke scenarios');
    return;
  }

  const opened = await runner.step('group.create.from-plus', async () => {
    await openGroupByTitle(page, fixture.groupName);
    const isGroupMode = await page.locator('.e-chat-panel.group-chat-mode').isVisible({ timeout: 5_000 }).catch(() => false);
    const header = await page.locator('.e-chat-header').innerText({ timeout: 2_000 }).catch(() => '');
    if (!isGroupMode) throw new Error('created conversation is not rendered as group-chat mode');
    const session = await getAuthSession(page);
    const row = await findGroupConversationByTitle(session, fixture.groupName);
    fixture.groupId = row?.targetId || row?.conversationId || row?.id || null;
    runner.fixtures[runner.fixtures.length - 1].groupId = fixture.groupId;
    return { groupName: fixture.groupName, groupId: fixture.groupId, header: header.slice(0, 180) };
  }, { hardGate: true, category: 'product-failure' });
  if (opened.status !== 'passed') throw new Error('created group cannot be opened; stop dependent smoke scenarios');
}

async function exerciseGroupMessage(page) {
  await runner.step('group.message.text-success', async () => {
    await ensureGroupConversationOpen(page, fixture.groupName);
    const messageText = `PC group smoke ${new Date().toISOString()}`;
    fixture.deliveredMessageText = messageText;
    await focusComposer(page);
    await page.keyboard.type(messageText);
    await page.keyboard.press('Enter');
    const state = await assertMessageSentSuccess(page, messageText, 20_000);
    await runner.screenshot(page, 'group-message-sent-success');
    return { text: messageText, state };
  }, { hardGate: true, category: 'product-failure' });

  await runner.step('group.message.failed-state', async () => {
    if (!fixture.deliveredMessageText) throw new Error('no message text was generated for failed-state inspection');
    const state = await sentMessageState(page, fixture.deliveredMessageText);
    if (!state.exists) throw new Error('sent message node was not found for state inspection');
    if (state.failed) {
      throw new Error(`core send produced a failed marker: ${JSON.stringify(state)}`);
    }
    return { inspectedText: fixture.deliveredMessageText, state };
  }, { hardGate: true, category: 'product-failure' });

  await runner.step('group.message.preview-delivered-only', async () => {
    await openMessages(page);
    await selectGroupFilter(page);
    const detail = await assertPreviewReflectsDeliveredMessage(page, fixture.deliveredMessageText, 8_000);
    await runner.screenshot(page, 'group-preview-after-delivered-send');
    return detail;
  }, { hardGate: true, category: 'product-failure' });
}

async function exerciseGroupProfile(page) {
  await runner.step('group.profile.metadata', async () => {
    await ensureGroupConversationOpen(page, fixture.groupName);
    if (!(await page.locator('.e-profile-panel, .message-info-panel, .customer-info-panel').first().isVisible({ timeout: 1_000 }).catch(() => false))) {
      const actionButtons = page.locator('.e-chat-actions .e-icon-button');
      if ((await actionButtons.count()) < 2) throw new Error('group profile action button is missing');
      await actionButtons.nth(1).click();
    }
    const panel = page.locator('.e-profile-panel, .message-info-panel, .customer-info-panel').first();
    await panel.waitFor({ state: 'visible', timeout: 5_000 });
    const infoRows = await page.locator('.customer-info-row').count();
    const tabCount = await page.locator('.customer-info-tabs button').count();
    const infoText = await panel.innerText({ timeout: 2_000 }).catch(() => '');
    await runner.screenshot(page, 'group-profile-metadata');
    if (infoRows < 3 || tabCount < 3) throw new Error(`group profile panel incomplete: rows=${infoRows}, tabs=${tabCount}`);
    if (!infoText.includes(fixture.groupName)) throw new Error('group profile panel does not show the created group name');
    return { infoRows, tabCount, text: infoText.slice(0, 240) };
  }, { hardGate: true, category: 'product-failure' });

  await runner.step('group.profile.tabs', async () => {
    const tabs = page.locator('.customer-info-tabs button');
    if ((await tabs.count()) < 3) throw new Error('group profile tabs are missing');
    await tabs.nth(1).click();
    await page.waitForTimeout(300);
    const announcementVisible = await page.locator('.e-profile-panel, .message-info-panel, .customer-info-panel').first().isVisible({ timeout: 1_000 }).catch(() => false);
    await tabs.nth(2).click();
    await page.waitForTimeout(300);
    const filesVisible = await page.locator('.e-profile-panel, .message-info-panel, .customer-info-panel').first().isVisible({ timeout: 1_000 }).catch(() => false);
    await runner.screenshot(page, 'group-profile-files-tab');
    if (!announcementVisible || !filesVisible) throw new Error('announcement/files tabs did not keep profile panel visible');
    return { announcementVisible, filesVisible };
  }, { hardGate: true, category: 'product-failure' });
}
