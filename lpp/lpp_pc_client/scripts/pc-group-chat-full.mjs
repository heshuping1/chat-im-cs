import { summarizeCatalog } from './pc-group-chat-scenario-catalog.mjs';
import {
  apiRequest,
  createGroupFixtureViaApi,
  createGroupFromUi,
  createElectronTestRunner,
  defaultAccounts,
  getAuthSession,
  loginClient,
  openGroupByTitle,
  uniqueGroupName,
} from './pc-electron-chat-helpers.mjs';

const catalog = summarizeCatalog('full');
const runner = createElectronTestRunner({
  suiteName: 'group-chat-full',
  catalog,
});

const fixture = {
  groupName: uniqueGroupName('pc-auto-group-full'),
  groupId: null,
};

try {
  const owner = await runner.launchClient(`group-full-owner-${Date.now()}`);
  await loginClient(runner, owner, defaultAccounts.owner);
  await prepareGroupFixture(owner.page);
  await probeManagementAndPermissionCapabilities(owner.page);
  await recordUiCapabilityGaps();
} catch (error) {
  runner.push('runner', 'failed', { error: String(error?.message || error), category: 'runner' });
} finally {
  await runner.closeAll();
  await runner.finalize({ primaryFixture: fixture });
  process.exit(process.exitCode || 0);
}

async function prepareGroupFixture(page) {
  const prepared = await runner.step('prepareGroupFixture', async () => {
    const session = await getAuthSession(page);
    let detail;
    try {
      detail = await createGroupFromUi(runner, page, fixture.groupName);
    } catch (error) {
      runner.push('prepareGroupFixture.ui-create', 'failed', {
        error: String(error?.message || error),
        category: 'product-failure',
        hardGate: true,
      });
      await page.keyboard.press('Escape').catch(() => undefined);
      detail = await createGroupFixtureViaApi(session, fixture.groupName);
    }
    await openGroupByTitle(page, fixture.groupName);
    fixture.groupId = detail.groupId;
    if (!fixture.groupId) {
      const conversations = await apiRequest(session, '/api/client/v1/conversations?limit=100');
      const payload = conversations.data?.data || conversations.data;
      const rows = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [];
      const row = rows.find((item) => {
        const kind = String(item.type || item.conversationType || item.targetType || '').toLowerCase();
        const name = item.title || item.name || item.displayName || item.targetName || '';
        return kind.includes('group') && name === fixture.groupName;
      });
      fixture.groupId = row?.targetId || row?.conversationId || row?.id || null;
    }
    if (!fixture.groupId) throw new Error('created group id was not discoverable from conversation list API');
    runner.fixtures.push({
      type: 'group',
      groupName: fixture.groupName,
      groupId: fixture.groupId,
      createdBy: defaultAccounts.owner.identifier,
      cleanup: 'best-effort-delete-at-suite-end-if-supported',
    });
    return { ...detail, groupId: fixture.groupId };
  }, { hardGate: true, category: 'test-data-or-product' });
  if (prepared.status !== 'passed') throw new Error('group full fixture unavailable; stop dependent full scenarios');
}

async function probeManagementAndPermissionCapabilities(page) {
  const session = await getAuthSession(page);
  const groupId = fixture.groupId;

  await runner.step('group.profile.member-list-permission', async () => {
    const detail = await apiRequest(session, `/api/client/v1/groups/${groupId}`);
    const members = await apiRequest(session, `/api/client/v1/groups/${groupId}/members`);
    return {
      groupStatus: detail.status,
      membersStatus: members.status,
      memberPayloadShape: Object.keys(members.data?.data || members.data || {}).slice(0, 12),
    };
  }, { hardGate: true, category: 'api-contract' });

  await runner.step('group.permission.settings', async () => {
    const body = {
      allowMemberInvite: false,
      allowMemberModifyTitle: false,
      allowMemberAtAll: false,
      allowMemberAddFriend: false,
      allowMemberViewMemberList: false,
    };
    const update = await apiRequest(session, `/api/client/v1/groups/${groupId}/settings`, {
      method: 'PUT',
      body,
    });
    const restore = await apiRequest(session, `/api/client/v1/groups/${groupId}/settings`, {
      method: 'PUT',
      body: {
        allowMemberInvite: true,
        allowMemberModifyTitle: false,
        allowMemberAtAll: false,
        allowMemberAddFriend: true,
        allowMemberViewMemberList: true,
      },
      expectedStatuses: [200, 204],
    });
    return { updateStatus: update.status, restoreStatus: restore.status };
  }, { hardGate: true, category: 'api-contract' });

  await runner.step('group.permission.all-mute', async () => {
    const mute = await apiRequest(session, `/api/client/v1/groups/${groupId}/mute-mode`, {
      method: 'PUT',
      body: { muteMode: 1 },
    });
    const unmute = await apiRequest(session, `/api/client/v1/groups/${groupId}/mute-mode`, {
      method: 'PUT',
      body: { muteMode: 0 },
      expectedStatuses: [200, 204],
    });
    return { muteStatus: mute.status, unmuteStatus: unmute.status };
  }, { hardGate: true, category: 'api-contract' });

  await runner.step('group.announcement.crud', async () => {
    const title = `PC automation announcement ${Date.now()}`;
    const created = await apiRequest(session, `/api/client/v1/groups/${groupId}/announcements`, {
      method: 'POST',
      body: { title, content: title },
      expectedStatuses: [200, 201],
    });
    const payload = created.data?.data || created.data || {};
    const announcementId = payload.announcementId || payload.id;
    if (!announcementId) throw new Error(`announcement id missing from create response: ${JSON.stringify(payload).slice(0, 300)}`);
    const updated = await apiRequest(session, `/api/client/v1/groups/${groupId}/announcements/${announcementId}`, {
      method: 'PUT',
      body: { title: `${title} updated`, content: `${title} updated` },
      expectedStatuses: [200, 204],
    });
    const deleted = await apiRequest(session, `/api/client/v1/groups/${groupId}/announcements/${announcementId}`, {
      method: 'DELETE',
      expectedStatuses: [200, 204],
    });
    return { announcementId, createdStatus: created.status, updatedStatus: updated.status, deletedStatus: deleted.status };
  }, { hardGate: true, category: 'api-contract' });

  await runner.step('group.lifecycle.leave-kick-dismiss.cleanup', async () => {
    try {
      const deleted = await apiRequest(session, `/api/client/v1/groups/${groupId}`, {
        method: 'DELETE',
        expectedStatuses: [200, 204],
      });
      runner.fixtures[runner.fixtures.length - 1].cleanup = 'deleted';
      return { deletedStatus: deleted.status };
    } catch (error) {
      const detail = { groupId, groupName: fixture.groupName, error: String(error?.message || error) };
      runner.cleanupFailures.push(detail);
      return {
        skipped: true,
        reason: 'cleanup failed and was recorded as residual test data',
        ...detail,
      };
    }
  }, { hardGate: false, category: 'cleanup' });
}

async function recordUiCapabilityGaps() {
  const currentUiGaps = [
    'group.create.named-and-default-title',
    'group.create.error-states',
    'group.message.member-receive-sync',
    'group.message.mentions',
    'group.message.media',
    'group.role.admin-management',
    'group.role.transfer-owner',
    'group.role.member-denied',
    'group.permission.member-mute',
    'group.lifecycle.invite-join',
    'group.file.lifecycle',
  ];
  for (const scenarioId of currentUiGaps) {
    await runner.step(scenarioId, async () => ({
      skipped: true,
      reason: 'PC UI automation is not implemented or the PC client lacks the required UI; kept as hard-gate capability gap for full regression.',
      category: 'capability_missing',
    }), { hardGate: true, category: 'capability_missing' });
  }
}
