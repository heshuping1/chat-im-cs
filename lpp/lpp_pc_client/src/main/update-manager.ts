import type { App, BrowserWindow } from 'electron';
import { shell } from 'electron';
import electronUpdater from 'electron-updater';
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { dirname, basename, join } from 'node:path';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
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
import {
  normalizeAppReleaseUpdateResponse,
  resolveDesktopVersionCode,
} from './app-release-update-contract.js';

const { autoUpdater } = electronUpdater;

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

const defaultUpdateApiBaseUrl = 'https://chat.hearteasechat.com';
const desktopAppUpdateKey = 'staff';

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
  let downloadedInstallerPath: string | null = null;
  let buildVersionCodePromise: Promise<number> | null = null;
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
    if (downloadedInstallerPath) {
      const result = await shell.openPath(downloadedInstallerPath);
      if (result) throw new Error(result);
      app.quit();
      return;
    }
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
    const available = await fetchLatestUpdate(preferences);
    downloadedInstallerPath = null;
    if (!available) {
      updateState({
        available: undefined,
        checkedAt: new Date().toISOString(),
        error: undefined,
        phase: 'latest',
        progress: undefined,
      });
      return state;
    }
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
    if (!updatePackage.latestYmlUrl) {
      await downloadDirectPackage(updatePackage);
      return state;
    }
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
  ): Promise<ClientUpdatePackageInfo | undefined> {
    const [authSession, identity] = await Promise.all([
      readAuthSession(),
      appInstanceIdentity,
    ]);
    const apiBaseUrl = normalizedBaseUrl(
      process.env.LPP_UPDATE_API_BASE_URL || authSession?.apiBaseUrl || defaultUpdateApiBaseUrl,
    );
    if (!apiBaseUrl) throw new Error('缺少更新服务地址，请先登录或配置 LPP_UPDATE_API_BASE_URL');
    const versionCode = await readDesktopBuildVersionCode();
    const url = new URL('/api/client/v1/app-releases/latest', apiBaseUrl);
    url.searchParams.set('appKey', process.env.LPP_UPDATE_APP_KEY || desktopAppUpdateKey);
    url.searchParams.set('platform', 'windows');
    url.searchParams.set('versionCode', String(versionCode));
    url.searchParams.set('channel', preferences.channel);
    url.searchParams.set('arch', process.arch === 'ia32' ? 'ia32' : 'x64');
    if (authSession?.tenantId) url.searchParams.set('tenantId', authSession.tenantId);
    if (identity.deviceId) url.searchParams.set('deviceId', identity.deviceId);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`更新检查失败：HTTP ${response.status}`);
    }
    return normalizeAppReleaseUpdateResponse(
      await response.json() as Record<string, unknown>,
      apiBaseUrl,
    );
  }

  async function readDesktopBuildVersionCode() {
    if (buildVersionCodePromise) return buildVersionCodePromise;
    buildVersionCodePromise = readFile(join(app.getAppPath(), 'package.json'), 'utf8')
      .then((content) => {
        const parsed = JSON.parse(content) as { buildVersionCode?: unknown };
        return resolveDesktopVersionCode(app.getVersion(), parsed.buildVersionCode);
      })
      .catch(() => resolveDesktopVersionCode(app.getVersion(), undefined));
    return buildVersionCodePromise;
  }

  async function downloadDirectPackage(updatePackage: ClientUpdatePackageInfo) {
    const packageUrl = updatePackage.packageUrl;
    if (!packageUrl) throw new Error('服务端未返回安装包下载地址');
    const response = await fetch(packageUrl);
    if (!response.ok || !response.body) {
      throw new Error(`更新包下载失败：HTTP ${response.status}`);
    }

    const downloadsDir = join(app.getPath('userData'), 'updates', 'downloads');
    await mkdir(downloadsDir, { recursive: true });
    const installerPath = join(downloadsDir, updateInstallerFileName(packageUrl, updatePackage.version));
    const hash = createHash('sha256');
    const startedAt = Date.now();
    const responseSize = Number.parseInt(response.headers.get('content-length') ?? '', 10);
    const total = Number.isFinite(responseSize) && responseSize > 0
      ? responseSize
      : updatePackage.sizeBytes ?? 0;
    let transferred = 0;
    const stream = Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]);
    stream.on('data', (chunk: Buffer) => {
      transferred += chunk.byteLength;
      hash.update(chunk);
      const elapsedSeconds = Math.max(1, (Date.now() - startedAt) / 1000);
      updateState({
        phase: 'downloading',
        progress: {
          bytesPerSecond: transferred / elapsedSeconds,
          percent: total > 0 ? (transferred / total) * 100 : 0,
          total,
          transferred,
        },
      });
    });
    await pipeline(stream, createWriteStream(installerPath));
    const expectedHash = updatePackage.fileHashSha256?.trim().toLowerCase();
    if (expectedHash) {
      const actualHash = hash.digest('hex');
      if (actualHash !== expectedHash) {
        await rm(installerPath, { force: true });
        throw new Error('更新包 SHA-256 校验失败');
      }
    }
    downloadedInstallerPath = installerPath;
    updateState({ phase: 'downloaded', progress: undefined });
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

function updateInstallerFileName(packageUrl: string, version: string) {
  try {
    const urlName = basename(new URL(packageUrl).pathname);
    if (/\.(exe|msi|dmg|pkg|zip)$/i.test(urlName)) return urlName;
  } catch {
    // Fall through to deterministic fallback.
  }
  return `startlink-${version}-setup.exe`;
}

function formatUpdateError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
