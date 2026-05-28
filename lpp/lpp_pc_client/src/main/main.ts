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
const appIconPath = app.isPackaged
  ? join(process.resourcesPath, 'app-icon.ico')
  : join(__dirname, '../../assets/app-icon-green-bubble.ico');

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
      '-STA',
      '-NoProfile',
      '-Command',
      '& { param($path) Add-Type -AssemblyName System.Windows.Forms; $files = New-Object System.Collections.Specialized.StringCollection; [void] $files.Add($path); [System.Windows.Forms.Clipboard]::SetFileDropList($files) }',
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
    :root { color-scheme: dark; }
    html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; cursor: crosshair; user-select: none; }
    body { background: #000; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    #shot { position: fixed; inset: 0; width: 100vw; height: 100vh; object-fit: fill; }
    #shade { position: fixed; inset: 0; background: rgba(0, 0, 0, .42); }
    #box { position: fixed; display: none; box-sizing: border-box; border: 1px solid #07c160; box-shadow: 0 0 0 9999px rgba(0,0,0,.42), 0 0 0 1px rgba(255,255,255,.78) inset; background: transparent; cursor: move; }
    #size { position: fixed; display: none; z-index: 2; padding: 4px 7px; border-radius: 4px; background: rgba(15,23,42,.9); color: #fff; font-size: 12px; line-height: 1; }
    #bar { position: fixed; display: none; z-index: 2; align-items: center; gap: 4px; padding: 6px; border: 1px solid rgba(255,255,255,.12); border-radius: 7px; background: rgba(31,41,55,.96); box-shadow: 0 12px 36px rgba(0,0,0,.35); }
    #hint { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); padding: 7px 10px; border-radius: 999px; background: rgba(15,23,42,.72); color: rgba(255,255,255,.78); font-size: 12px; pointer-events: none; }
    .handle { position: absolute; width: 9px; height: 9px; border: 1px solid rgba(255,255,255,.95); border-radius: 999px; background: #07c160; transform: translate(-50%, -50%); }
    .nw { left: 0; top: 0; cursor: nwse-resize; } .n { left: 50%; top: 0; cursor: ns-resize; } .ne { left: 100%; top: 0; cursor: nesw-resize; }
    .e { left: 100%; top: 50%; cursor: ew-resize; } .se { left: 100%; top: 100%; cursor: nwse-resize; } .s { left: 50%; top: 100%; cursor: ns-resize; }
    .sw { left: 0; top: 100%; cursor: nesw-resize; } .w { left: 0; top: 50%; cursor: ew-resize; }
    button { display: grid; width: 32px; height: 30px; place-items: center; border: 0; border-radius: 5px; background: transparent; color: #f8fafc; cursor: pointer; font-size: 17px; }
    button:hover { background: rgba(255,255,255,.13); }
    button.primary { background: #07c160; color: #fff; }
    button.primary:hover { background: #06ad56; }
    .divider { width: 1px; height: 22px; margin: 0 3px; background: rgba(255,255,255,.18); }
  </style>
</head>
<body>
  <img id="shot" />
  <div id="shade"></div>
  <div id="box">
    <i class="handle nw" data-handle="nw"></i><i class="handle n" data-handle="n"></i><i class="handle ne" data-handle="ne"></i>
    <i class="handle e" data-handle="e"></i><i class="handle se" data-handle="se"></i><i class="handle s" data-handle="s"></i>
    <i class="handle sw" data-handle="sw"></i><i class="handle w" data-handle="w"></i>
  </div>
  <div id="size"></div>
  <div id="bar"><button id="cancel">取消</button><button id="ok" class="primary">完成</button></div>
  <div id="hint">拖动鼠标选择截图区域，Enter 完成，Esc 取消</div>
  <script>
    const { ipcRenderer } = require('electron');
    const shot = document.getElementById('shot');
    const box = document.getElementById('box');
    const size = document.getElementById('size');
    const bar = document.getElementById('bar');
    const hint = document.getElementById('hint');
    let mode = null;
    let start = null;
    let base = null;
    let rect = null;
    ipcRenderer.once('desktop:screenshot-source', (_event, dataUrl) => { shot.src = dataUrl; });
    function send(value) { ipcRenderer.send(${JSON.stringify(channel)}, value); }
    function normalized(a, b) {
      const left = Math.min(a.x, b.x);
      const top = Math.min(a.y, b.y);
      return { left, top, width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) };
    }
    function clampRect(next) {
      const left = Math.max(0, Math.min(window.innerWidth - 1, next.left));
      const top = Math.max(0, Math.min(window.innerHeight - 1, next.top));
      const width = Math.max(1, Math.min(window.innerWidth - left, next.width));
      const height = Math.max(1, Math.min(window.innerHeight - top, next.height));
      return { left, top, width, height };
    }
    function resizeRect(handle, origin, delta) {
      let left = origin.left;
      let top = origin.top;
      let right = origin.left + origin.width;
      let bottom = origin.top + origin.height;
      if (handle.includes('w')) left += delta.x;
      if (handle.includes('e')) right += delta.x;
      if (handle.includes('n')) top += delta.y;
      if (handle.includes('s')) bottom += delta.y;
      return normalized({ x: left, y: top }, { x: right, y: bottom });
    }
    function showRect(next) {
      rect = clampRect(next);
      box.style.display = rect.width > 2 && rect.height > 2 ? 'block' : 'none';
      hint.style.display = box.style.display === 'block' ? 'none' : 'block';
      box.style.left = rect.left + 'px';
      box.style.top = rect.top + 'px';
      box.style.width = rect.width + 'px';
      box.style.height = rect.height + 'px';
      size.style.display = box.style.display;
      size.textContent = Math.round(rect.width) + ' × ' + Math.round(rect.height);
      size.style.left = rect.left + 'px';
      size.style.top = Math.max(6, rect.top - 24) + 'px';
      bar.style.display = box.style.display;
      const barWidth = 118;
      const barTop = rect.top + rect.height + 10;
      bar.style.left = Math.min(window.innerWidth - barWidth - 8, Math.max(8, rect.left + rect.width - barWidth)) + 'px';
      bar.style.top = (barTop + 44 > window.innerHeight ? rect.top - 44 : barTop) + 'px';
    }
    window.addEventListener('mousedown', (event) => {
      if (event.target.closest('#bar')) return;
      start = { x: event.clientX, y: event.clientY };
      base = rect ? { ...rect } : null;
      const handle = event.target.dataset && event.target.dataset.handle;
      if (handle && rect) {
        mode = 'resize:' + handle;
        return;
      }
      if (event.target === box && rect) {
        mode = 'move';
        return;
      }
      mode = 'draw';
      showRect({ left: start.x, top: start.y, width: 0, height: 0 });
    });
    window.addEventListener('mousemove', (event) => {
      if (!mode || !start) return;
      const current = { x: event.clientX, y: event.clientY };
      const delta = { x: current.x - start.x, y: current.y - start.y };
      if (mode === 'draw') {
        showRect(normalized(start, current));
      } else if (mode === 'move' && base) {
        showRect({ ...base, left: base.left + delta.x, top: base.top + delta.y });
      } else if (mode.startsWith('resize:') && base) {
        showRect(resizeRect(mode.slice(7), base, delta));
      }
    });
    window.addEventListener('mouseup', () => { mode = null; });
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
