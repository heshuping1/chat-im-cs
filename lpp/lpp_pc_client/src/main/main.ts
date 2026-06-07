import {
  app,
  BrowserWindow,
  desktopCapturer,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  screen,
  shell,
  systemPreferences,
  Tray,
} from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import type {
  AppLogPayload,
  ApiTrafficDiagnosticPayload,
  DesktopAuthSessionPayload,
  DesktopApiMethod,
  CsRoutingDiagnosticPayload,
  DiagnosticsPayload,
  MessageReminderDiagnosticPayload,
  NotifyPayload,
  TaskbarBadgePayload,
  TrayStatus,
} from '../shared/desktop-api.js';
import { desktopIpcChannelByMethod } from '../shared/desktop-api.js';
import { validateDesktopIpcCall } from '../shared/desktop-api-validation.js';
import {
  normalizeLocalDataMessage,
  type LocalDataClearScopePayload,
  type LocalDataCleanupPayload,
  type LocalDataDeleteMessagePayload,
  type LocalDataDeleteOutboxPayload,
  type LocalDataGetMediaVariantPayload,
  type LocalDataListCustomerServiceThreadsPayload,
  type LocalDataListMessagesPayload,
  type LocalDataListOutboxPayload,
  type LocalDataRepairPayload,
  type LocalDataSearchMessagesPayload,
  type LocalDataStorageStatsPayload,
  type LocalDataUpsertCustomerServiceThreadPayload,
  type LocalDataUpsertMediaPayload,
  type LocalDataUpsertMessagesPayload,
  type LocalDataUpsertOutboxPayload,
} from '../shared/local-data-contract.js';
import {
  clearSecureAuthSession,
  readSecureAuthSession,
  saveSecureAuthSession,
} from './auth-session-storage.js';
import {
  configureDefaultMainAppLogging,
  mainAppLogBackend,
  recordDefaultMainAppLog,
  writeAppLogToFile,
} from './app-logging.js';
import { registerDesktopFileHandlers } from './desktop-file-handlers.js';
import { DiagnosticsJsonlWriter } from './diagnostics-jsonl-writer.js';
import { showDesktopNotification } from './desktop-notification.js';
import { reminderDiagnosticsTarget } from './message-reminder-diagnostics-routing.js';
import {
  installElectronAppDiagnostics,
  installElectronProcessDiagnostics,
  mergeElectronRuntimeDiagnosticsPayload,
  recordRendererProcessGone,
  setElectronRuntimeDiagnosticLogger,
} from './runtime-diagnostics.js';
import { selectScreenshotRegion } from './screenshot-selection-window.js';
import {
  createScreenshotCapturePayload,
  normalizeScreenshotCaptureError,
  selectScreenshotSource,
} from './screenshot-capture.js';
import {
  buildAppProfileLaunchArgs,
  appUserModelIdForProfile,
  createNextProfileId,
  configureAppInstanceProfile,
  formatProfileWindowTitle,
} from './app-instance-profile.js';
import { readOrCreateAppInstanceIdentity } from './app-instance-identity.js';
import { registerUpdateManager } from './update-manager.js';
import { createLocalDataService } from './local-data/local-data-service.js';
import { SqliteLocalDataDriver } from './local-data/local-data-sqlite-driver.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const allowedExternalProtocols = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const appIconPath = app.isPackaged
  ? join(process.resourcesPath, 'app-icon.ico')
  : join(__dirname, '../../assets/app-icon-green-bubble.ico');
const devDockIconPath = join(__dirname, '../../assets/app-icon-green-bubble.png');
const appDisplayName = 'lppchat';
const isSandboxedElectronAutomation = Boolean(process.env.LPP_PC_USER_DATA_ROOT);
const screenshotRequestWindowHideDelayMs = 140;
app.setName(appDisplayName);
if (isSandboxedElectronAutomation) {
  app.disableHardwareAcceleration();
}
if (process.platform === 'win32') {
  app.setAppUserModelId(appUserModelIdForProfile(null));
}
const appInstanceProfile = configureAppInstanceProfile(app);
const logsDir = join(app.getPath('userData'), 'logs');
app.setAppLogsPath(logsDir);
const diagnosticsDir = join(app.getPath('userData'), 'diagnostics');
configureDefaultMainAppLogging({ logsDir, isDev });
setElectronRuntimeDiagnosticLogger(mainAppLogBackend);
const localDataService = createLocalDataService({
  driver: new SqliteLocalDataDriver({
    dbPath: join(
      app.getPath('userData'),
      'LPP Local Data',
      'profiles',
      appInstanceProfile.profileId ?? 'default',
      'lpp-local-v1.sqlite',
    ),
    recordDiagnostic: (record) => {
      recordDefaultMainAppLog({
        module: 'local-data',
        event: `local_data.${record.event}`,
        phase: record.phase,
        result: record.result === 'ok' ? 'ok' : record.result === 'ignored' ? 'ignored' : 'failed',
        level: record.result === 'failed' ? 'error' : 'debug',
        reason: record.reason,
        context: record.context,
      });
    },
  }),
});
const appTitle = formatProfileWindowTitle(
  appDisplayName,
  appInstanceProfile.profileId,
);
let profileLockPath: string | null = null;
const diagnosticsWriters = new Map<string, DiagnosticsJsonlWriter>();
const singleInstanceLock = appInstanceProfile.profileId
  ? acquireProfileInstanceLock()
  : app.requestSingleInstanceLock({
      profileId: 'default',
    });
const appInstanceIdentityPromise = readOrCreateAppInstanceIdentity(appInstanceProfile);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let trayStatus: TrayStatus = 'online';
let minimizeToTray = true;
let isQuitting = false;
let taskbarBadgeCount = 0;
let taskbarBadgeUrgent = false;
const registeredDesktopIpcChannels = new Set<string>();

installElectronProcessDiagnostics();

if (!singleInstanceLock) {
  app.quit();
}

app.once('will-quit', () => {
  isQuitting = true;
  releaseProfileInstanceLock();
});

function handleDesktopIpc<Args extends unknown[]>(
  method: DesktopApiMethod,
  handler: (event: Electron.IpcMainInvokeEvent, ...args: Args) => unknown,
) {
  const channel = desktopIpcChannelByMethod[method];
  if (registeredDesktopIpcChannels.has(channel)) {
    throw new Error(`Duplicate desktop IPC channel registration: ${channel}`);
  }
  registeredDesktopIpcChannels.add(channel);
  ipcMain.handle(channel, (event, ...args) => {
    const validatedArgs = validateDesktopIpcCall(method, args) as Args;
    return handler(event, ...validatedArgs);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 520,
    minHeight: 760,
    title: appTitle,
    icon: appIconPath,
    backgroundColor: '#f5f7fb',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void openExternalUrl(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const currentUrl = mainWindow?.webContents.getURL();
    if (!currentUrl || url === currentUrl || isAllowedAppNavigation(url)) return;
    event.preventDefault();
    void openExternalUrl(url);
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) =>
    recordRendererProcessGone(details, mainWindow?.id),
  );

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('close', (event) => {
    if (!minimizeToTray || isQuitting) return;
    if (!ensureTray()) return;
    event.preventDefault();
    mainWindow?.hide();
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  mainWindow.on('focus', () => {
    mainWindow?.flashFrame(false);
  });
}

function ensureTray() {
  if (tray) return true;
  const emptyIcon = process.platform === 'win32' ? appIconPath : undefined;
  if (!emptyIcon) return false;
  try {
    tray = new Tray(emptyIcon);
    tray.setToolTip(appTitle);
    tray.on('click', showMainWindow);
    updateTrayContextMenu();
    updateTrayTooltip();
  } catch {
    tray = null;
  }
  return Boolean(tray);
}

function showMainWindow() {
  if (!mainWindow) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  if (!mainWindow.isVisible()) mainWindow.show();
  mainWindow.focus();
}

function updateTrayContextMenu() {
  if (!tray) return;
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '显示主窗口', click: showMainWindow },
      { type: 'separator' },
      {
        label: 'Quit lppchat',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]),
  );
}

function updateTrayTooltip() {
  if (!tray) return;
  const badgeText = taskbarBadgeCount > 0 ? ` - ${taskbarBadgeCount} 条待处理` : '';
  tray.setToolTip(`${appTitle} - ${trayStatus}${badgeText}`);
}

function taskbarBadgeLabel(count: number) {
  if (count <= 0) return '';
  return count > 99 ? '99+' : String(count);
}

function createTaskbarBadgeIcon(count: number, urgent: boolean) {
  const label = taskbarBadgeLabel(count);
  if (!label) return null;
  const fontSize = label.length >= 3 ? 24 : label.length === 2 ? 28 : 32;
  const fill = urgent ? '#ef4444' : '#f97316';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="30" fill="${fill}"/>
  <circle cx="32" cy="32" r="29" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="3"/>
  <text x="32" y="41" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700" fill="#fff">${label}</text>
</svg>`;
  return nativeImage.createFromDataURL(
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
  );
}

function applyTaskbarBadge(payload: TaskbarBadgePayload) {
  taskbarBadgeCount = payload.count;
  taskbarBadgeUrgent = Boolean(payload.urgent);
  ensureTray();
  updateTrayTooltip();
  if (!mainWindow || process.platform !== 'win32') return;
  if (payload.count <= 0) {
    mainWindow.setOverlayIcon(null, '');
    mainWindow.flashFrame(false);
    return;
  }
  const icon = createTaskbarBadgeIcon(payload.count, taskbarBadgeUrgent);
  mainWindow.setOverlayIcon(icon, `${payload.count} 条待处理`);
  if (taskbarBadgeUrgent && (!mainWindow.isFocused() || mainWindow.isMinimized())) {
    mainWindow.flashFrame(true);
  }
}

handleDesktopIpc('notify', async (_event, payload: NotifyPayload) => {
  showDesktopNotification({ appIconPath, mainWindow, payload });
});

registerDesktopFileHandlers({
  appIconPath,
  preloadPath: join(__dirname, '../preload/preload.cjs'),
  register: handleDesktopIpc,
});

const updateManager = registerUpdateManager({
  app,
  appInstanceIdentity: appInstanceIdentityPromise,
  getMainWindow: () => mainWindow,
  readAuthSession: readSecureAuthSession,
  register: handleDesktopIpc,
});

handleDesktopIpc('openExternal', async (_event, url: string) => openExternalUrl(url));

handleDesktopIpc('quitApp', async () => {
  isQuitting = true;
  app.quit();
});

handleDesktopIpc('readAuthSession', async () => readSecureAuthSession());

handleDesktopIpc(
  'saveAuthSession',
  async (_event, payload: DesktopAuthSessionPayload) => saveSecureAuthSession(payload),
);

handleDesktopIpc('clearAuthSession', async () => clearSecureAuthSession());

handleDesktopIpc('getAppInstanceProfile', async () => appInstanceIdentityPromise);

handleDesktopIpc('getLaunchAtStartup', async () => getLaunchAtStartup());

handleDesktopIpc('setLaunchAtStartup', async (_event, enabled: boolean) => {
  setLaunchAtStartup(enabled);
  return getLaunchAtStartup();
});

handleDesktopIpc('getMinimizeToTray', async () => minimizeToTray);

handleDesktopIpc('setMinimizeToTray', async (_event, enabled: boolean) => {
  minimizeToTray = enabled && ensureTray();
  return minimizeToTray;
});

handleDesktopIpc('openAppProfile', async (_event, profileId?: string) => {
  const nextProfileId = profileId?.trim() || await nextAvailableProfileId();
  openProfileInstance(nextProfileId);
});

handleDesktopIpc('captureScreenshot', async (event) => {
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const width = Math.round(display.size.width * display.scaleFactor);
  const height = Math.round(display.size.height * display.scaleFactor);
  const permissionStatus = process.platform === 'darwin'
    ? systemPreferences.getMediaAccessStatus('screen')
    : undefined;
  const requestWindow = BrowserWindow.fromWebContents(event.sender) ?? mainWindow;
  const shouldRestoreRequestWindow =
    Boolean(requestWindow && !requestWindow.isDestroyed() && requestWindow.isVisible());
  const shouldRefocusRequestWindow =
    Boolean(shouldRestoreRequestWindow && requestWindow?.isFocused());
  try {
    if (shouldRestoreRequestWindow && requestWindow && !requestWindow.isDestroyed()) {
      requestWindow.hide();
      await delay(screenshotRequestWindowHideDelayMs);
    }
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width, height },
    });
    return selectScreenshotRegion(
      createScreenshotCapturePayload(
        selectScreenshotSource(sources, display),
        display,
      ),
    );
  } catch (error) {
    throw normalizeScreenshotCaptureError(error, permissionStatus);
  } finally {
    if (shouldRestoreRequestWindow && requestWindow && !requestWindow.isDestroyed()) {
      if (shouldRefocusRequestWindow) {
        requestWindow.show();
        requestWindow.focus();
      } else {
        requestWindow.showInactive();
      }
    }
  }
});

handleDesktopIpc('getAppVersion', async () => app.getVersion());

handleDesktopIpc('exportDiagnostics', async (_event, payload: DiagnosticsPayload) => {
  const exportPayload = mergeElectronRuntimeDiagnosticsPayload(payload);
  const result = await dialog.showSaveDialog({
    defaultPath: `lpp-diagnostics-${payload.sessionId}.json`,
    filters: [{ name: 'Diagnostics', extensions: ['json'] }],
  });
  if (result.canceled || !result.filePath) return null;
  await mkdir(dirname(result.filePath), { recursive: true });
  await writeFile(result.filePath, JSON.stringify(exportPayload, null, 2), 'utf8');
  return result.filePath;
});

handleDesktopIpc('writeAppLog', async (_event, payload: AppLogPayload) => {
  await writeAppLogToFile(payload);
});

handleDesktopIpc('recordCsRoutingDiagnostic', async (_event, payload: CsRoutingDiagnosticPayload) => {
  await recordCsRoutingDiagnostic(payload);
});

handleDesktopIpc(
  'recordApiTrafficDiagnostic',
  async (_event, payload: ApiTrafficDiagnosticPayload) => {
    await recordApiTrafficDiagnostic(payload);
  },
);

handleDesktopIpc(
  'recordMessageReminderDiagnostic',
  async (_event, payload: MessageReminderDiagnosticPayload) => {
    await recordMessageReminderDiagnostic(payload);
  },
);

handleDesktopIpc('setTaskbarBadge', async (_event, payload: TaskbarBadgePayload) => {
  applyTaskbarBadge(payload);
});

handleDesktopIpc('setTrayStatus', async (_event, status: TrayStatus) => {
  trayStatus = status;
  ensureTray();
  updateTrayTooltip();
});

handleDesktopIpc('localDataClearScope', async (_event, payload: LocalDataClearScopePayload) =>
  localDataService.clearScope(payload),
);

handleDesktopIpc('localDataCleanup', async (_event, payload: LocalDataCleanupPayload) =>
  localDataService.cleanup(payload),
);

handleDesktopIpc('localDataDeleteMessage', async (_event, payload: LocalDataDeleteMessagePayload) =>
  localDataService.deleteMessage(payload),
);

handleDesktopIpc('localDataDeleteOutbox', async (_event, payload: LocalDataDeleteOutboxPayload) =>
  localDataService.deleteOutbox(payload),
);

handleDesktopIpc('localDataGetMediaVariant', async (_event, payload: LocalDataGetMediaVariantPayload) =>
  localDataService.getMediaVariant(payload),
);

handleDesktopIpc('localDataGetStorageStats', async (_event, payload: LocalDataStorageStatsPayload) =>
  localDataService.getStorageStats(payload),
);

handleDesktopIpc(
  'localDataListCustomerServiceThreads',
  async (_event, payload: LocalDataListCustomerServiceThreadsPayload) =>
    localDataService.listCustomerServiceThreads(payload),
);

handleDesktopIpc('localDataListMessages', async (_event, payload: LocalDataListMessagesPayload) =>
  localDataService.listMessages(payload),
);

handleDesktopIpc('localDataListOutbox', async (_event, payload: LocalDataListOutboxPayload) =>
  localDataService.listOutbox(payload),
);

handleDesktopIpc('localDataRepair', async (_event, payload: LocalDataRepairPayload) =>
  localDataService.repair(payload),
);

handleDesktopIpc('localDataSearchMessages', async (_event, payload: LocalDataSearchMessagesPayload) =>
  localDataService.searchMessages(payload),
);

handleDesktopIpc(
  'localDataUpsertCustomerServiceThread',
  async (_event, payload: LocalDataUpsertCustomerServiceThreadPayload) =>
    localDataService.upsertCustomerServiceThread(payload),
);

handleDesktopIpc('localDataUpsertMedia', async (_event, payload: LocalDataUpsertMediaPayload) =>
  localDataService.upsertMedia(payload),
);

handleDesktopIpc('localDataUpsertMessages', async (_event, payload: LocalDataUpsertMessagesPayload) =>
  localDataService.upsertMessages({
    messages: payload.messages.map((message) => normalizeLocalDataMessage(message)),
    scopeKey: payload.scopeKey,
  }),
);

handleDesktopIpc('localDataUpsertOutbox', async (_event, payload: LocalDataUpsertOutboxPayload) =>
  localDataService.upsertOutbox(payload),
);

function getLaunchAtStartup() {
  return app.getLoginItemSettings().openAtLogin;
}

function setLaunchAtStartup(enabled: boolean) {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: false,
  });
}

async function recordCsRoutingDiagnostic(payload: CsRoutingDiagnosticPayload) {
  await diagnosticsWriter('cs-routing.jsonl', 500).write(payload);
}

async function recordApiTrafficDiagnostic(payload: ApiTrafficDiagnosticPayload) {
  await diagnosticsWriter('api-traffic.jsonl', 1000).write(payload);
}

async function recordMessageReminderDiagnostic(payload: MessageReminderDiagnosticPayload) {
  const target = reminderDiagnosticsTarget(payload);
  await diagnosticsWriter(target.fileName, target.maxLines).write(payload);
}

function diagnosticsWriter(fileName: string, maxLines: number) {
  const filePath = join(diagnosticsDir, fileName);
  const existing = diagnosticsWriters.get(fileName);
  if (existing) return existing;
  const writer = new DiagnosticsJsonlWriter({ filePath, maxLines });
  diagnosticsWriters.set(fileName, writer);
  return writer;
}

function ensureDiagnosticsLogFiles() {
  mkdirSync(diagnosticsDir, { recursive: true });
  writeFileSync(join(diagnosticsDir, 'api-traffic.jsonl'), '', { flag: 'a' });
}

app.whenReady().then(() => {
  if (!singleInstanceLock) return;
  ensureDiagnosticsLogFiles();
  installElectronAppDiagnostics(app);
  recordDefaultMainAppLog({
    context: {
      appVersion: app.getVersion(),
      isPackaged: app.isPackaged,
      platform: process.platform,
      profileId: appInstanceProfile.profileId ?? 'default',
    },
    event: 'app.ready',
    module: 'electron-main',
    phase: 'startup',
    result: 'ok',
  });
  if (process.platform === 'darwin' && !app.isPackaged) {
    app.dock?.setIcon(devDockIconPath);
  }
  createWindow();
  void updateManager.scheduleInitialAutoCheck();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('second-instance', () => {
  showMainWindow();
});

app.on('window-all-closed', () => {
  if (minimizeToTray && !isQuitting) return;
  if (process.platform !== 'darwin') app.quit();
});

async function openExternalUrl(url: string) {
  if (!isAllowedExternalUrl(url)) return;
  await shell.openExternal(url);
}

async function nextAvailableProfileId() {
  try {
    const profileRoot = join(appInstanceProfile.defaultUserDataPath, 'profiles');
    const entries = await readdir(profileRoot, { withFileTypes: true });
    return createNextProfileId(
      entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name),
    );
  } catch {
    return createNextProfileId([]);
  }
}

function openProfileInstance(profileId: string) {
  const args = buildAppProfileLaunchArgs(process.argv, profileId);
  const child = spawn(process.execPath, args, {
    detached: true,
    env: {
      ...process.env,
      LPP_PC_INSTANCE_PROFILE: profileId,
    },
    stdio: 'ignore',
  });
  child.unref();
}

function acquireProfileInstanceLock() {
  const lockPath = join(appInstanceProfile.userDataPath, 'profile.lock');
  try {
    mkdirSync(appInstanceProfile.userDataPath, { recursive: true });
    const existing = readProfileLock(lockPath);
    if (
      existing?.pid &&
      existing.pid !== process.pid &&
      isProcessAlive(existing.pid)
    ) {
      return false;
    }
    writeFileSync(
      lockPath,
      JSON.stringify(
        {
          pid: process.pid,
          profileId: appInstanceProfile.profileId,
          startedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
      'utf8',
    );
    profileLockPath = lockPath;
    return true;
  } catch {
    return false;
  }
}

function releaseProfileInstanceLock() {
  if (!profileLockPath) return;
  const existing = readProfileLock(profileLockPath);
  if (existing?.pid === process.pid) {
    rmSync(profileLockPath, { force: true });
  }
  profileLockPath = null;
}

function readProfileLock(lockPath: string) {
  try {
    const parsed = JSON.parse(readFileSync(lockPath, 'utf8')) as { pid?: unknown };
    return typeof parsed.pid === 'number' ? { pid: parsed.pid } : null;
  } catch {
    return null;
  }
}

function isProcessAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function isAllowedExternalUrl(url: string) {
  try {
    return allowedExternalProtocols.has(new URL(url).protocol);
  } catch {
    return false;
  }
}

function isAllowedAppNavigation(url: string) {
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    return url.startsWith(process.env.VITE_DEV_SERVER_URL);
  }
  return url.startsWith('file://');
}
