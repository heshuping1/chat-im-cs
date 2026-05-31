import {
  app,
  BrowserWindow,
  desktopCapturer,
  dialog,
  ipcMain,
  screen,
  shell,
  Tray,
} from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import type {
  DesktopAuthSessionPayload,
  DesktopApiMethod,
  DiagnosticsPayload,
  NotifyPayload,
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
import { showDesktopNotification } from './desktop-notification.js';
import {
  installElectronAppDiagnostics,
  installElectronProcessDiagnostics,
  mergeElectronRuntimeDiagnosticsPayload,
  recordRendererProcessGone,
} from './runtime-diagnostics.js';
import { selectScreenshotRegion } from './screenshot-selection-window.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const allowedExternalProtocols = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const appIconPath = app.isPackaged
  ? join(process.resourcesPath, 'app-icon.ico')
  : join(__dirname, '../../assets/app-icon-green-bubble.ico');
const devDockIconPath = join(__dirname, '../../assets/app-icon-green-bubble.png');
const singleInstanceLock = app.requestSingleInstanceLock();

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let trayStatus: TrayStatus = 'online';
const registeredDesktopIpcChannels = new Set<string>();

installElectronProcessDiagnostics();

if (!singleInstanceLock) {
  app.quit();
}

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
    title: 'LPP \u5ba2\u670d\u5ba2\u6237\u7aef',
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
}

function ensureTray() {
  if (tray) return;
  const emptyIcon = process.platform === 'win32' ? appIconPath : undefined;
  if (!emptyIcon) return;
  try {
    tray = new Tray(emptyIcon);
    tray.setToolTip('LPP \u5ba2\u670d\u5ba2\u6237\u7aef');
  } catch {
    tray = null;
  }
}

handleDesktopIpc('notify', async (_event, payload: NotifyPayload) => {
  showDesktopNotification({ mainWindow, payload });
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

handleDesktopIpc('captureScreenshot', async () => {
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const width = Math.round(display.size.width * display.scaleFactor);
  const height = Math.round(display.size.height * display.scaleFactor);
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width, height },
  });
  const primary =
    sources.find((source) => source.display_id === String(display.id)) ?? sources[0];
  if (!primary || primary.thumbnail.isEmpty()) {
    throw new Error('\u672a\u80fd\u83b7\u53d6\u5c4f\u5e55\u622a\u56fe\uff0c\u8bf7\u786e\u8ba4\u7cfb\u7edf\u5df2\u5141\u8bb8\u5c4f\u5e55\u5f55\u5236\u6743\u9650\u3002');
  }
  return selectScreenshotRegion({
    dataUrl: primary.thumbnail.toDataURL(),
    displayBounds: display.bounds,
    displaySize: display.size,
  });
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

handleDesktopIpc('setTrayStatus', async (_event, status: TrayStatus) => {
  trayStatus = status;
  ensureTray();
  tray?.setToolTip(`LPP \u5ba2\u670d\u5ba2\u6237\u7aef - ${trayStatus}`);
});

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
