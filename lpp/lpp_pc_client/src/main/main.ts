import {
  app,
  BrowserWindow,
  clipboard,
  desktopCapturer,
  dialog,
  ipcMain,
  nativeImage,
  Notification,
  screen,
  shell,
  Tray,
} from 'electron';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import type {
  CacheMediaFilePayload,
  DiagnosticsPayload,
  NotifyPayload,
  TrayStatus,
} from '../shared/desktop-api.js';
import {
  cacheMediaPosterFile,
  ensureLocalMediaFile,
  readLocalOrRemoteImageBuffer,
} from './media-storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const allowedExternalProtocols = new Set(['http:', 'https:', 'mailto:', 'tel:']);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let trayStatus: TrayStatus = 'online';
const execFileAsync = promisify(execFile);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1180,
    minHeight: 760,
    title: 'LPP 客服客户端',
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
  const emptyIcon = process.platform === 'win32' ? join(__dirname, '../../build/icon.ico') : undefined;
  if (!emptyIcon) return;
  try {
    tray = new Tray(emptyIcon);
    tray.setToolTip('LPP 客服客户端');
  } catch {
    tray = null;
  }
}

ipcMain.handle('desktop:notify', async (_event, payload: NotifyPayload) => {
  if (!Notification.isSupported()) return;
  const notification = new Notification({
    title: payload.title,
    body: payload.body,
    silent: false,
  });
  notification.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      if (payload.conversationId) {
        mainWindow.webContents.send('desktop:notification-clicked', payload.conversationId);
      }
    }
  });
  notification.show();
});

ipcMain.handle('desktop:open-file', async (_event, path: string) => {
  await shell.openPath(path);
});

ipcMain.handle(
  'desktop:cache-media-file',
  async (_event, payload: CacheMediaFilePayload) => ensureLocalMediaFile(payload),
);

ipcMain.handle(
  'desktop:cache-media-poster',
  async (_event, payload) => cacheMediaPosterFile(payload),
);

ipcMain.handle(
  'desktop:open-downloaded-file',
  async (_event, payload: Omit<CacheMediaFilePayload, 'kind'>) => {
    const { filePath } = await ensureLocalMediaFile({ ...payload, kind: 'file' });
    const error = await shell.openPath(filePath);
    if (error) throw new Error(error);
    return filePath;
  },
);

ipcMain.handle(
  'desktop:open-media-file',
  async (_event, payload: CacheMediaFilePayload) => {
    const { filePath } = await ensureLocalMediaFile(payload);
    const error = await shell.openPath(filePath);
    if (error) throw new Error(error);
    return filePath;
  },
);

ipcMain.handle(
  'desktop:edit-media-file',
  async (_event, payload: CacheMediaFilePayload) => {
    const { filePath } = await ensureLocalMediaFile(payload);
    const error = await shell.openPath(filePath);
    if (error) throw new Error(error);
    return filePath;
  },
);

ipcMain.handle(
  'desktop:copy-media-file',
  async (_event, payload: CacheMediaFilePayload) => {
    const { filePath } = await ensureLocalMediaFile(payload);
    await copyFileToClipboard(filePath);
    return filePath;
  },
);

ipcMain.handle('desktop:copy-file-path', async (_event, path: string) => {
  await copyFileToClipboard(path);
  return path;
});

ipcMain.handle(
  'desktop:save-media-as',
  async (_event, payload: CacheMediaFilePayload) => {
    const { filePath } = await ensureLocalMediaFile(payload);
    const result = await dialog.showSaveDialog({
      defaultPath:
        payload.fileName ||
        (payload.kind === 'image' ? 'image.png' : payload.kind === 'video' ? 'video.mp4' : 'lpp-file'),
    });
    if (result.canceled || !result.filePath) return null;
    await copyFile(filePath, result.filePath);
    return result.filePath;
  },
);

ipcMain.handle(
  'desktop:reveal-media-in-folder',
  async (_event, payload: CacheMediaFilePayload) => {
    const { filePath } = await ensureLocalMediaFile(payload);
    shell.showItemInFolder(filePath);
    return filePath;
  },
);

ipcMain.handle(
  'desktop:copy-image-from-url',
  async (
    _event,
    payload: {
      url: string;
      fileName?: string;
      authToken?: string;
      accountId?: string;
      conversationId?: string;
    },
  ) => {
    const { filePath } = await ensureLocalMediaFile({
      url: payload.url,
      fileName: payload.fileName || 'image.png',
      kind: 'image',
      authToken: payload.authToken,
      accountId: payload.accountId,
      conversationId: payload.conversationId,
    });
    const imageBuffer = await readLocalOrRemoteImageBuffer(filePath, payload.authToken);
    const image = nativeImage.createFromBuffer(imageBuffer);
    if (image.isEmpty()) throw new Error('图片复制失败');
    clipboard.writeImage(image);
  },
);

ipcMain.handle('desktop:save-file', async (_event, defaultName: string, content: string) => {
  const result = await dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: [{ name: 'Text', extensions: ['txt', 'json', 'log'] }],
  });
  if (result.canceled || !result.filePath) return null;
  await writeFile(result.filePath, content, 'utf8');
  return result.filePath;
});

ipcMain.handle('desktop:open-external', async (_event, url: string) => openExternalUrl(url));

async function copyFileToClipboard(filePath: string) {
  if (process.platform === 'darwin') {
    await execFileAsync('osascript', [
      '-e',
      `set the clipboard to (POSIX file "${escapeAppleScriptString(filePath)}")`,
    ]);
    return;
  }
  if (process.platform === 'win32') {
    await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-Command',
      'Set-Clipboard -LiteralPath $args[0]',
      filePath,
    ]);
    return;
  }
  clipboard.writeText(filePath);
}

function escapeAppleScriptString(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

ipcMain.handle('desktop:capture-screenshot', async () => {
  const display = screen.getPrimaryDisplay();
  const width = Math.round(display.size.width * display.scaleFactor);
  const height = Math.round(display.size.height * display.scaleFactor);
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width, height },
  });
  const primary =
    sources.find((source) => source.display_id === String(display.id)) ?? sources[0];
  if (!primary || primary.thumbnail.isEmpty()) {
    throw new Error('未能获取屏幕截图，请确认系统已允许屏幕录制权限。');
  }
  return selectScreenshotRegion({
    dataUrl: primary.thumbnail.toDataURL(),
    displayBounds: display.bounds,
    displaySize: display.size,
  });
});

function selectScreenshotRegion(payload: {
  dataUrl: string;
  displayBounds: Electron.Rectangle;
  displaySize: Electron.Size;
}) {
  return new Promise<{ dataUrl: string; fileName: string }>((resolve, reject) => {
    const channel = `desktop:screenshot-selection:${Date.now()}:${Math.random()
      .toString(16)
      .slice(2)}`;
    let settled = false;
    const overlay = new BrowserWindow({
      x: payload.displayBounds.x,
      y: payload.displayBounds.y,
      width: payload.displaySize.width,
      height: payload.displaySize.height,
      frame: false,
      fullscreenable: false,
      resizable: false,
      movable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      backgroundColor: '#000000',
      webPreferences: {
        contextIsolation: false,
        nodeIntegration: true,
      },
    });
    overlay.setAlwaysOnTop(true, 'screen-saver');
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      ipcMain.removeAllListeners(channel);
      if (!overlay.isDestroyed()) overlay.close();
      callback();
    };
    ipcMain.once(channel, (_event, result: { dataUrl?: string; canceled?: boolean; error?: string }) => {
      if (result?.canceled) {
        finish(() => reject(new Error('已取消截图')));
        return;
      }
      if (result?.error || !result?.dataUrl) {
        finish(() => reject(new Error(result?.error || '截图失败')));
        return;
      }
      finish(() =>
        resolve({
          dataUrl: result.dataUrl!,
          fileName: `截图-${new Date().toISOString().replace(/[:.]/g, '-')}.png`,
        }),
      );
    });
    overlay.on('closed', () => {
      if (!settled) finish(() => reject(new Error('已取消截图')));
    });
    void overlay.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(screenshotSelectorHtml(channel))}`);
    overlay.webContents.once('did-finish-load', () => {
      overlay.webContents.send('desktop:screenshot-source', payload.dataUrl);
      overlay.focus();
    });
  });
}

function screenshotSelectorHtml(channel: string) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; cursor: crosshair; user-select: none; }
    body { background: #000; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    #shot { position: fixed; inset: 0; width: 100vw; height: 100vh; object-fit: fill; }
    #shade { position: fixed; inset: 0; background: rgba(0, 0, 0, .36); }
    #box { position: fixed; display: none; border: 1px solid #07c160; box-shadow: 0 0 0 9999px rgba(0,0,0,.36); background: transparent; }
    #size { position: fixed; display: none; padding: 3px 6px; border-radius: 4px; background: rgba(15,23,42,.82); color: #fff; font-size: 12px; }
    #bar { position: fixed; display: none; gap: 8px; padding: 7px; border-radius: 8px; background: rgba(31,41,55,.92); box-shadow: 0 12px 36px rgba(0,0,0,.26); }
    button { height: 28px; padding: 0 12px; border: 0; border-radius: 5px; background: rgba(255,255,255,.14); color: #fff; font-size: 13px; cursor: pointer; }
    button.primary { background: #07c160; color: #fff; }
  </style>
</head>
<body>
  <img id="shot" />
  <div id="shade"></div>
  <div id="box"></div>
  <div id="size"></div>
  <div id="bar"><button id="cancel">取消</button><button id="ok" class="primary">完成</button></div>
  <script>
    const { ipcRenderer } = require('electron');
    const shot = document.getElementById('shot');
    const box = document.getElementById('box');
    const size = document.getElementById('size');
    const bar = document.getElementById('bar');
    let dragging = false;
    let start = null;
    let rect = null;
    ipcRenderer.once('desktop:screenshot-source', (_event, dataUrl) => { shot.src = dataUrl; });
    function send(value) { ipcRenderer.send(${JSON.stringify(channel)}, value); }
    function normalized(a, b) {
      const left = Math.min(a.x, b.x);
      const top = Math.min(a.y, b.y);
      return { left, top, width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) };
    }
    function showRect(next) {
      rect = next;
      box.style.display = next.width > 2 && next.height > 2 ? 'block' : 'none';
      box.style.left = next.left + 'px';
      box.style.top = next.top + 'px';
      box.style.width = next.width + 'px';
      box.style.height = next.height + 'px';
      size.style.display = box.style.display;
      size.textContent = Math.round(next.width) + ' x ' + Math.round(next.height);
      size.style.left = next.left + 'px';
      size.style.top = Math.max(4, next.top - 26) + 'px';
      bar.style.display = box.style.display;
      const barTop = next.top + next.height + 10;
      bar.style.left = Math.min(window.innerWidth - 132, Math.max(8, next.left + next.width - 132)) + 'px';
      bar.style.top = (barTop + 46 > window.innerHeight ? next.top - 46 : barTop) + 'px';
    }
    window.addEventListener('mousedown', (event) => {
      if (event.target.closest('#bar')) return;
      dragging = true;
      start = { x: event.clientX, y: event.clientY };
      showRect({ left: start.x, top: start.y, width: 0, height: 0 });
    });
    window.addEventListener('mousemove', (event) => {
      if (!dragging || !start) return;
      showRect(normalized(start, { x: event.clientX, y: event.clientY }));
    });
    window.addEventListener('mouseup', () => { dragging = false; });
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') send({ canceled: true });
      if (event.key === 'Enter') finish();
    });
    document.getElementById('cancel').onclick = () => send({ canceled: true });
    document.getElementById('ok').onclick = finish;
    function finish() {
      if (!rect || rect.width < 3 || rect.height < 3) return;
      const scaleX = shot.naturalWidth / window.innerWidth;
      const scaleY = shot.naturalHeight / window.innerHeight;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(rect.width * scaleX));
      canvas.height = Math.max(1, Math.round(rect.height * scaleY));
      const context = canvas.getContext('2d');
      context.drawImage(
        shot,
        Math.round(rect.left * scaleX),
        Math.round(rect.top * scaleY),
        canvas.width,
        canvas.height,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      send({ dataUrl: canvas.toDataURL('image/png') });
    }
  </script>
</body>
</html>`;
}

ipcMain.handle('desktop:get-app-version', async () => app.getVersion());

ipcMain.handle('desktop:export-diagnostics', async (_event, payload: DiagnosticsPayload) => {
  const result = await dialog.showSaveDialog({
    defaultPath: `lpp-diagnostics-${payload.sessionId}.json`,
    filters: [{ name: 'Diagnostics', extensions: ['json'] }],
  });
  if (result.canceled || !result.filePath) return null;
  await mkdir(dirname(result.filePath), { recursive: true });
  await writeFile(result.filePath, JSON.stringify(payload, null, 2), 'utf8');
  return result.filePath;
});

ipcMain.handle('desktop:set-tray-status', async (_event, status: TrayStatus) => {
  trayStatus = status;
  ensureTray();
  tray?.setToolTip(`LPP 客服客户端 - ${trayStatus}`);
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
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
