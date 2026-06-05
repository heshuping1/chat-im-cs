import type { App, BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import { dirname, join } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import type {
  AppInstanceProfilePayload,
  ClientUpdatePackageInfo,
  ClientUpdatePreferences,
  ClientUpdateProgress,
  ClientUpdateState,
  DesktopAuthSessionPayload,
  DesktopApiMethod,
} from '../shared/desktop-api.js';
import { desktopUpdateStateChangedChannel } from '../shared/desktop-api.js';

type RegisterDesktopIpc = <Args extends unknown[]>(
  method: DesktopApiMethod,
  handler: (event: Electron.IpcMainInvokeEvent, ...args: Args) => unknown,
) => void;

interface UpdateManagerOptions {
  app: App;
  register: RegisterDesktopIpc;
  getMainWindow: () => BrowserWindow | null;
  readAuthSession: () => Promise<DesktopAuthSessionPayload | null>;
  appInstanceIdentity: Promise<AppInstanceProfilePayload>;
}

interface ClientUpdateLatestResponse {
  hasUpdate?: boolean;
  version?: unknown;
  force?: unknown;
  releaseNotes?: unknown;
  updateKind?: unknown;
  packageUrl?: unknown;
  latestYmlUrl?: unknown;
  sha512?: unknown;
  sizeBytes?: unknown;
  fallbackFullPackageUrl?: unknown;
  fallbackSha512?: unknown;
  publishedAt?: unknown;
}

const defaultUpdatePreferences: ClientUpdatePreferences = {
  autoCheck: false,
  channel: 'stable',
  downloadMode: 'differential-first',
};

export function registerUpdateManager({
  app,
  appInstanceIdentity,
  getMainWindow,
  readAuthSession,
  register,
}: UpdateManagerOptions) {
  const preferencesPath = join(app.getPath('userData'), 'updates', 'preferences.json');
  let preferencesPromise: Promise<ClientUpdatePreferences> | null = null;
  let state: ClientUpdateState = {
    currentVersion: app.getVersion(),
    preferences: defaultUpdatePreferences,
    phase: 'idle',
  };

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  (autoUpdater as { disableDifferentialDownload?: boolean }).disableDifferentialDownload = false;

  autoUpdater.on('download-progress', (progress) => {
    updateState({
      phase: 'downloading',
      progress: normalizeProgress(progress),
    });
  });

  autoUpdater.on('update-downloaded', () => {
    updateState({ phase: 'downloaded', progress: undefined });
  });

  autoUpdater.on('error', (error) => {
    updateState({ phase: 'error', error: formatUpdateError(error) });
  });

  register('getUpdatePreferences', async () => loadPreferences());
  register('setUpdatePreferences', async (_event, payload: ClientUpdatePreferences) => {
    const nextPreferences = normalizePreferences(payload);
    await savePreferences(nextPreferences);
    updateState({ preferences: nextPreferences });
    return nextPreferences;
  });
  register('getUpdateState', async () => {
    const preferences = await loadPreferences();
    state = { ...state, currentVersion: app.getVersion(), preferences };
    return state;
  });
  register('checkForUpdates', async () => checkForUpdates());
  register('downloadUpdate', async () => downloadUpdate());
  register('installUpdate', async () => {
    updateState({ phase: 'installing' });
    autoUpdater.quitAndInstall(false, true);
  });

  return {
    scheduleInitialAutoCheck,
  };

  async function scheduleInitialAutoCheck() {
    const loadedPreferences = await loadPreferences();
    updateState({ preferences: loadedPreferences });
    if (!loadedPreferences.autoCheck) return;
    setTimeout(() => {
      void checkForUpdates().catch((error) => {
        updateState({ phase: 'error', error: formatUpdateError(error) });
      });
    }, 12_000);
  }

  async function checkForUpdates() {
    const preferences = await loadPreferences();
    updateState({
      checkedAt: new Date().toISOString(),
      error: undefined,
      phase: 'checking',
      preferences,
      progress: undefined,
    });
    const response = await fetchLatestUpdate(preferences);
    if (!response.hasUpdate) {
      updateState({
        available: undefined,
        checkedAt: new Date().toISOString(),
        error: undefined,
        phase: 'latest',
        progress: undefined,
      });
      return state;
    }
    const available = normalizeLatestResponse(response);
    updateState({
      available,
      checkedAt: new Date().toISOString(),
      error: undefined,
      phase: 'available',
      progress: undefined,
    });
    return state;
  }

  async function downloadUpdate() {
    const currentPackage = state.available ?? (await checkForUpdates()).available;
    if (!currentPackage) return state;
    if (!app.isPackaged) {
      updateState({
        error: '更新下载和安装只能在已打包的桌面客户端中执行',
        phase: 'error',
      });
      return state;
    }
    try {
      await downloadWithPackage(currentPackage);
    } catch (error) {
      if (currentPackage.updateKind === 'delta' && currentPackage.fallbackFullPackageUrl) {
        const fallbackPackage: ClientUpdatePackageInfo = {
          ...currentPackage,
          packageUrl: currentPackage.fallbackFullPackageUrl,
          sha512: currentPackage.fallbackSha512 ?? currentPackage.sha512,
          updateKind: 'full',
        };
        updateState({ available: fallbackPackage, error: undefined, phase: 'downloading' });
        await downloadWithPackage(fallbackPackage);
      } else {
        updateState({ phase: 'error', error: formatUpdateError(error) });
      }
    }
    return state;
  }

  async function downloadWithPackage(updatePackage: ClientUpdatePackageInfo) {
    configureFeed(updatePackage);
    updateState({
      available: updatePackage,
      error: undefined,
      phase: 'downloading',
      progress: { bytesPerSecond: 0, percent: 0, total: updatePackage.sizeBytes ?? 0, transferred: 0 },
    });
    await autoUpdater.checkForUpdates();
    await autoUpdater.downloadUpdate();
    return state;
  }

  function configureFeed(updatePackage: ClientUpdatePackageInfo) {
    const feedUrl = updatePackage.latestYmlUrl
      ? parentUrl(updatePackage.latestYmlUrl)
      : parentUrl(updatePackage.updateKind === 'delta'
        ? updatePackage.fallbackFullPackageUrl ?? updatePackage.packageUrl
        : updatePackage.packageUrl);
    if (!feedUrl) {
      throw new Error('服务端未返回可用于 electron-updater 的 latest.yml 或完整安装包 URL');
    }
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: feedUrl,
    });
  }

  async function fetchLatestUpdate(
    preferences: ClientUpdatePreferences,
  ): Promise<ClientUpdateLatestResponse> {
    const [authSession, identity] = await Promise.all([
      readAuthSession(),
      appInstanceIdentity,
    ]);
    const apiBaseUrl = normalizedBaseUrl(
      process.env.LPP_UPDATE_API_BASE_URL || authSession?.apiBaseUrl,
    );
    if (!apiBaseUrl) throw new Error('缺少更新服务地址，请先登录或配置 LPP_UPDATE_API_BASE_URL');
    const url = new URL('/api/client-updates/latest', apiBaseUrl);
    url.searchParams.set('appId', 'lppchat');
    url.searchParams.set('platform', 'windows');
    url.searchParams.set('arch', process.arch === 'ia32' ? 'ia32' : 'x64');
    url.searchParams.set('currentVersion', app.getVersion());
    url.searchParams.set('channel', preferences.channel);
    if (authSession?.tenantId) url.searchParams.set('tenantId', authSession.tenantId);
    if (identity.deviceId) url.searchParams.set('deviceId', identity.deviceId);
    const response = await fetch(url, {
      headers: authSession?.tenantToken
        ? { Authorization: `Bearer ${authSession.tenantToken}` }
        : undefined,
    });
    if (!response.ok) {
      throw new Error(`更新检查失败：HTTP ${response.status}`);
    }
    return response.json() as Promise<ClientUpdateLatestResponse>;
  }

  async function loadPreferences() {
    if (preferencesPromise) return preferencesPromise;
    preferencesPromise = readFile(preferencesPath, 'utf8')
      .then((content) => normalizePreferences(JSON.parse(content)))
      .catch(() => defaultUpdatePreferences);
    return preferencesPromise;
  }

  async function savePreferences(nextPreferences: ClientUpdatePreferences) {
    await mkdir(dirname(preferencesPath), { recursive: true });
    await writeFile(preferencesPath, JSON.stringify(nextPreferences, null, 2), 'utf8');
    preferencesPromise = Promise.resolve(nextPreferences);
  }

  function updateState(patch: Partial<ClientUpdateState>) {
    state = {
      ...state,
      ...patch,
      currentVersion: app.getVersion(),
    };
    getMainWindow()?.webContents.send(desktopUpdateStateChangedChannel, state);
  }
}

function normalizeLatestResponse(response: ClientUpdateLatestResponse): ClientUpdatePackageInfo {
  const version = stringValue(response.version, 'version');
  const updateKind = stringValue(response.updateKind, 'updateKind');
  if (updateKind !== 'delta' && updateKind !== 'full') {
    throw new Error(`Invalid updateKind: ${updateKind}`);
  }
  return {
    fallbackFullPackageUrl: optionalStringValue(response.fallbackFullPackageUrl),
    fallbackSha512: optionalStringValue(response.fallbackSha512),
    force: Boolean(response.force),
    latestYmlUrl: optionalStringValue(response.latestYmlUrl),
    packageUrl: optionalStringValue(response.packageUrl),
    publishedAt: optionalStringValue(response.publishedAt),
    releaseNotes: optionalStringValue(response.releaseNotes),
    sha512: optionalStringValue(response.sha512),
    sizeBytes: optionalNumberValue(response.sizeBytes),
    updateKind,
    version,
  };
}

function normalizePreferences(value: unknown): ClientUpdatePreferences {
  const record = value && typeof value === 'object' ? value as Partial<ClientUpdatePreferences> : {};
  return {
    autoCheck: record.autoCheck === true,
    channel: record.channel === 'beta' ? 'beta' : 'stable',
    downloadMode: 'differential-first',
  };
}

function normalizeProgress(progress: {
  bytesPerSecond?: number;
  percent?: number;
  transferred?: number;
  total?: number;
}): ClientUpdateProgress {
  return {
    bytesPerSecond: finiteNumber(progress.bytesPerSecond),
    percent: finiteNumber(progress.percent),
    total: finiteNumber(progress.total),
    transferred: finiteNumber(progress.transferred),
  };
}

function finiteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function optionalStringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function stringValue(value: unknown, label: string) {
  const text = optionalStringValue(value);
  if (!text) throw new Error(`更新服务返回缺少 ${label}`);
  return text;
}

function optionalNumberValue(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : undefined;
}

function normalizedBaseUrl(value: string | undefined) {
  if (!value?.trim()) return undefined;
  try {
    return new URL(value).toString();
  } catch {
    return undefined;
  }
}

function parentUrl(value: string | undefined) {
  if (!value) return undefined;
  try {
    return new URL('.', value).toString();
  } catch {
    return undefined;
  }
}

function formatUpdateError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
