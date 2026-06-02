import {
  app,
  BrowserWindow,
  desktopCapturer,
  dialog,
  ipcMain,
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
import type {
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
  clearSecureAuthSession,
  readSecureAuthSession,
  saveSecureAuthSession,
} from './auth-session-storage.js';
import { registerDesktopFileHandlers } from './desktop-file-handlers.js';
import { DiagnosticsJsonlWriter } from './diagnostics-jsonl-writer.js';
import { showDesktopNotification } from './desktop-notification.js';
import { reminderDiagnosticsTarget } from './message-reminder-diagnostics-routing.js';
import {
  installElectronAppDiagnostics,
  installElectronProcessDiagnostics,
  mergeElectronRuntimeDiagnosticsPayload,
  recordRendererProcessGone,
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
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const allowedExternalProtocols = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const appIconPath = app.isPackaged
  ? join(process.resourcesPath, 'app-icon.ico')
  : join(__dirname, '../../assets/app-icon-green-bubble.ico');
const devDockIconPath = join(__dirname, '../../assets/app-icon-green-bubble.png');
const appDisplayName = 'LPP 客服客户端';
app.setName(appDisplayName);
if (process.platform === 'win32') {
  app.setAppUserModelId(appUserModelIdForProfile(null));
}
const appInstanceProfile = configureAppInstanceProfile(app);
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
let taskbarBadgeCount = 0;
let taskbarBadgeUrgent = false;
const registeredDesktopIpcChannels = new Set<string>();

installElectronProcessDiagnostics();

if (!singleInstanceLock) {
  app.quit();
}

app.once('will-quit', releaseProfileInstanceLock);

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

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  mainWindow.on('focus', () => {
    mainWindow?.flashFrame(false);
  });
}

function ensureTray() {
  if (tray) return;
  const emptyIcon = process.platform === 'win32' ? appIconPath : undefined;
  if (!emptyIcon) return;
  try {
    tray = new Tray(emptyIcon);
    tray.setToolTip(appTitle);
  } catch {
    tray = null;
  }
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

handleDesktopIpc('openExternal', async (_event, url: string) => openExternalUrl(url));

handleDesktopIpc('readAuthSession', async () => readSecureAuthSession());

handleDesktopIpc(
  'saveAuthSession',
  async (_event, payload: DesktopAuthSessionPayload) => saveSecureAuthSession(payload),
);

handleDesktopIpc('clearAuthSession', async () => clearSecureAuthSession());

handleDesktopIpc('getAppInstanceProfile', async () => appInstanceIdentityPromise);

handleDesktopIpc('openAppProfile', async (_event, profileId?: string) => {
  const nextProfileId = profileId?.trim() || await nextAvailableProfileId();
  openProfileInstance(nextProfileId);
});

handleDesktopIpc('captureScreenshot', async () => {
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const width = Math.round(display.size.width * display.scaleFactor);
  const height = Math.round(display.size.height * display.scaleFactor);
  const permissionStatus = process.platform === 'darwin'
    ? systemPreferences.getMediaAccessStatus('screen')
    : undefined;
  try {
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

handleDesktopIpc('recordCsRoutingDiagnostic', async (_event, payload: CsRoutingDiagnosticPayload) => {
  await recordCsRoutingDiagnostic(payload);
});

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

async function recordCsRoutingDiagnostic(payload: CsRoutingDiagnosticPayload) {
  await diagnosticsWriter('cs-routing.jsonl', 500).write(payload);
}

async function recordMessageReminderDiagnostic(payload: MessageReminderDiagnosticPayload) {
  const target = reminderDiagnosticsTarget(payload);
  await diagnosticsWriter(target.fileName, target.maxLines).write(payload);
}

function diagnosticsWriter(fileName: string, maxLines: number) {
  const diagnosticsDir = join(app.getPath('userData'), 'diagnostics');
  const filePath = join(diagnosticsDir, fileName);
  const existing = diagnosticsWriters.get(fileName);
  if (existing) return existing;
  const writer = new DiagnosticsJsonlWriter({ filePath, maxLines });
  diagnosticsWriters.set(fileName, writer);
  return writer;
}

app.whenReady().then(() => {
  if (!singleInstanceLock) return;
  installElectronAppDiagnostics(app);
  if (process.platform === 'darwin' && !app.isPackaged) {
    app.dock?.setIcon(devDockIconPath);
  }
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('second-instance', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

app.on('window-all-closed', () => {
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
