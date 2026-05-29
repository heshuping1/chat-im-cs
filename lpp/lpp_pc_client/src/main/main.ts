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
  getLocalMediaStatus,
  readLocalOrRemoteImageBuffer,
} from './media-storage.js';
import { openVideoPlayerWindow } from './video-player-window.js';

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
  'desktop:get-cached-media-status',
  async (_event, payload: CacheMediaFilePayload) => getLocalMediaStatus(payload),
);

ipcMain.handle(
  'desktop:cache-media-poster',
  async (_event, payload) => cacheMediaPosterFile(payload),
);

ipcMain.handle(
  'desktop:open-video-player',
  async (_event, payload) =>
    openVideoPlayerWindow(payload, {
      appIconPath,
      preloadPath: join(__dirname, '../preload/preload.cjs'),
    }),
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
    if (image.isEmpty()) throw new Error('\u56fe\u7247\u590d\u5236\u5931\u8d25');
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

function selectScreenshotRegion(payload: {
  dataUrl: string;
  displayBounds: Electron.Rectangle;
  displaySize: Electron.Size;
}) {
  return new Promise<{ dataUrl: string; fileName: string }>((resolve, reject) => {
    const channel = `desktop:screenshot-selection:${Date.now()}:${Math.random()
      .toString(16)
      .slice(2)}`;
    const readyChannel = `${channel}:ready`;
    let settled = false;
    const overlay = new BrowserWindow({
      x: payload.displayBounds.x,
      y: payload.displayBounds.y,
      width: payload.displaySize.width,
      height: payload.displaySize.height,
      show: false,
      frame: false,
      transparent: true,
      fullscreenable: false,
      resizable: false,
      movable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      backgroundColor: '#00000000',
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
      ipcMain.removeAllListeners(readyChannel);
      if (!overlay.isDestroyed()) overlay.close();
      callback();
    };
    ipcMain.once(readyChannel, () => {
      if (settled || overlay.isDestroyed()) return;
      overlay.show();
      overlay.focus();
    });
    ipcMain.once(channel, (_event, result: { dataUrl?: string; canceled?: boolean; error?: string }) => {
      if (result?.canceled) {
        finish(() => reject(new Error('\u5df2\u53d6\u6d88\u622a\u56fe')));
        return;
      }
      if (result?.error || !result?.dataUrl) {
        finish(() => reject(new Error(result?.error || '\u622a\u56fe\u5931\u8d25')));
        return;
      }
      finish(() =>
        resolve({
          dataUrl: result.dataUrl!,
          fileName: `\u622a\u56fe-${new Date().toISOString().replace(/[:.]/g, '-')}.png`,
        }),
      );
    });
    overlay.on('closed', () => {
      if (!settled) finish(() => reject(new Error('\u5df2\u53d6\u6d88\u622a\u56fe')));
    });
    void overlay.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(
        screenshotSelectorHtml(channel, readyChannel),
      )}`,
    );
    overlay.webContents.once('did-finish-load', () => {
      overlay.webContents.send('desktop:screenshot-source', payload.dataUrl);
    });
  });
}

function screenshotSelectorHtml(channel: string, readyChannel: string) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    :root { color-scheme: light; --green: #07c160; --panel: rgba(20, 27, 38, .94); }
    html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; cursor: crosshair; user-select: none; }
    body { background: transparent; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif; }
    #shot { position: fixed; inset: 0; width: 100vw; height: 100vh; object-fit: fill; }
    #draw { position: fixed; inset: 0; width: 100vw; height: 100vh; }
    #box { position: fixed; display: none; box-sizing: border-box; border: 1px solid var(--green); outline: 1px solid rgba(255,255,255,.92); background: transparent; cursor: move; box-shadow: 0 0 0 1px rgba(7,193,96,.18); }
    #toolbar { position: fixed; display: none; z-index: 4; align-items: center; gap: 2px; padding: 5px; border: 1px solid rgba(15,23,42,.15); border-radius: 8px; background: var(--panel); box-shadow: 0 10px 30px rgba(15,23,42,.28); }
    #hint { position: fixed; left: 50%; bottom: 18px; z-index: 3; transform: translateX(-50%); padding: 6px 10px; border-radius: 999px; background: rgba(15,23,42,.38); color: rgba(255,255,255,.84); font-size: 12px; pointer-events: none; transition: opacity .16s ease; }
    #textEditor { position: fixed; z-index: 5; min-width: 120px; max-width: 360px; height: 30px; padding: 0 8px; border: 1px solid var(--green); border-radius: 4px; outline: none; background: #fff; color: #111827; font: 14px/30px -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif; box-shadow: 0 8px 24px rgba(15,23,42,.22); }
    .handle { position: absolute; width: 7px; height: 7px; border: 1px solid rgba(255,255,255,.96); border-radius: 999px; background: var(--green); transform: translate(-50%, -50%); box-shadow: 0 1px 4px rgba(0,0,0,.18); }
    .nw { left: 0; top: 0; cursor: nwse-resize; } .n { left: 50%; top: 0; cursor: ns-resize; } .ne { left: 100%; top: 0; cursor: nesw-resize; }
    .e { left: 100%; top: 50%; cursor: ew-resize; } .se { left: 100%; top: 100%; cursor: nwse-resize; } .s { left: 50%; top: 100%; cursor: ns-resize; }
    .sw { left: 0; top: 100%; cursor: nesw-resize; } .w { left: 0; top: 50%; cursor: ew-resize; }
    button { display: grid; width: 32px; height: 30px; place-items: center; border: 0; border-radius: 5px; background: transparent; color: #f8fafc; cursor: pointer; font-size: 15px; font-weight: 600; }
    button:hover { background: rgba(255,255,255,.13); }
    button.active { background: rgba(7,193,96,.24); color: #7dffb8; }
    button.primary { background: var(--green); color: #fff; }
    button.primary:hover { background: #06ad56; }
    .divider { width: 1px; height: 22px; margin: 0 3px; background: rgba(255,255,255,.18); }
  </style>
</head>
<body>
  <img id="shot" />
  <canvas id="draw"></canvas>
  <div id="box">
    <i class="handle nw" data-handle="nw"></i><i class="handle n" data-handle="n"></i><i class="handle ne" data-handle="ne"></i>
    <i class="handle e" data-handle="e"></i><i class="handle se" data-handle="se"></i><i class="handle s" data-handle="s"></i>
    <i class="handle sw" data-handle="sw"></i><i class="handle w" data-handle="w"></i>
  </div>
  <div id="toolbar" aria-label="截图编辑工具">
    <button data-tool="select" title="移动/调整">↕</button>
    <button data-tool="rect" title="矩形">▭</button>
    <button data-tool="ellipse" title="圆形">○</button>
    <button data-tool="arrow" title="箭头">↗</button>
    <button data-tool="pen" title="画笔">✎</button>
    <button data-tool="text" title="文字">T</button>
    <button data-tool="mosaic" title="马赛克">▦</button>
    <span class="divider"></span>
    <button data-action="undo" title="撤销">↶</button>
    <button data-action="cancel" title="取消">×</button>
    <button data-action="ok" class="primary" title="完成">✓</button>
  </div>
  <div id="hint">拖拽框选区域，框选后可标注；Enter 完成，Esc 取消</div>
  <script>
    const { ipcRenderer } = require('electron');
    const shot = document.getElementById('shot');
    const draw = document.getElementById('draw');
    const ctx = draw.getContext('2d');
    const box = document.getElementById('box');
    const toolbar = document.getElementById('toolbar');
    const hint = document.getElementById('hint');
    const channelName = ${JSON.stringify(channel)};
    const readyChannelName = ${JSON.stringify(readyChannel)};
    const color = '#07c160';
    let action = null;
    let tool = 'select';
    let start = null;
    let base = null;
    let selection = null;
    let draft = null;
    let annotations = [];
    let textEditor = null;
    ipcRenderer.once('desktop:screenshot-source', (_event, dataUrl) => {
      shot.onload = () => {
        resizeCanvas();
        ipcRenderer.send(readyChannelName);
      };
      shot.src = dataUrl;
    });
    function send(value) { ipcRenderer.send(channelName, value); }
    function point(event) { return { x: event.clientX, y: event.clientY }; }
    function imageMetrics() {
      const bounds = shot.getBoundingClientRect();
      const width = Math.max(1, bounds.width);
      const height = Math.max(1, bounds.height);
      return {
        x: bounds.left,
        y: bounds.top,
        width,
        height,
        scaleX: shot.naturalWidth / width,
        scaleY: shot.naturalHeight / height,
      };
    }
    function imageCropRect(rect) {
      const metrics = imageMetrics();
      const x = Math.max(metrics.x, Math.min(metrics.x + metrics.width, rect.x));
      const y = Math.max(metrics.y, Math.min(metrics.y + metrics.height, rect.y));
      const right = Math.max(metrics.x, Math.min(metrics.x + metrics.width, rect.x + rect.width));
      const bottom = Math.max(metrics.y, Math.min(metrics.y + metrics.height, rect.y + rect.height));
      return {
        sx: Math.round((x - metrics.x) * metrics.scaleX),
        sy: Math.round((y - metrics.y) * metrics.scaleY),
        sw: Math.max(1, Math.round((right - x) * metrics.scaleX)),
        sh: Math.max(1, Math.round((bottom - y) * metrics.scaleY)),
        scaleX: metrics.scaleX,
        scaleY: metrics.scaleY,
      };
    }
    function normalized(a, b) {
      const x = Math.min(a.x, b.x);
      const y = Math.min(a.y, b.y);
      return { x, y, width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) };
    }
    function clampSelection(next) {
      const x = Math.max(0, Math.min(window.innerWidth - 1, next.x));
      const y = Math.max(0, Math.min(window.innerHeight - 1, next.y));
      const width = Math.max(1, Math.min(window.innerWidth - x, next.width));
      const height = Math.max(1, Math.min(window.innerHeight - y, next.height));
      return { x, y, width, height };
    }
    function resizeRect(handle, origin, delta) {
      let left = origin.x;
      let top = origin.y;
      let right = origin.x + origin.width;
      let bottom = origin.y + origin.height;
      if (handle.indexOf('w') >= 0) left += delta.x;
      if (handle.indexOf('e') >= 0) right += delta.x;
      if (handle.indexOf('n') >= 0) top += delta.y;
      if (handle.indexOf('s') >= 0) bottom += delta.y;
      return normalized({ x: left, y: top }, { x: right, y: bottom });
    }
    function insideSelection(p) {
      return selection && p.x >= selection.x && p.x <= selection.x + selection.width && p.y >= selection.y && p.y <= selection.y + selection.height;
    }
    function setSelection(next) {
      selection = clampSelection(next);
      render();
    }
    function resizeCanvas() {
      const ratio = window.devicePixelRatio || 1;
      draw.width = Math.round(window.innerWidth * ratio);
      draw.height = Math.round(window.innerHeight * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      render();
    }
    function render() {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const item of annotations) drawAnnotation(ctx, item);
      if (draft) drawAnnotation(ctx, draft);
      const hasSelection = selection && selection.width > 3 && selection.height > 3;
      box.style.display = hasSelection ? 'block' : 'none';
      toolbar.style.display = hasSelection ? 'flex' : 'none';
      hint.style.display = hasSelection ? 'none' : 'block';
      if (!hasSelection) return;
      box.style.left = selection.x + 'px';
      box.style.top = selection.y + 'px';
      box.style.width = selection.width + 'px';
      box.style.height = selection.height + 'px';
      const toolbarWidth = Math.ceil(toolbar.getBoundingClientRect().width || 372);
      const topBelow = selection.y + selection.height + 9;
      const top = topBelow + 42 > window.innerHeight ? Math.max(8, selection.y - 42) : topBelow;
      toolbar.style.left = Math.min(window.innerWidth - toolbarWidth - 8, Math.max(8, selection.x + selection.width - toolbarWidth)) + 'px';
      toolbar.style.top = top + 'px';
      updateToolbar();
    }
    function updateToolbar() {
      for (const button of toolbar.querySelectorAll('button[data-tool]')) {
        button.classList.toggle('active', button.dataset.tool === tool);
      }
      document.body.style.cursor = tool === 'select' ? 'crosshair' : 'copy';
      box.style.cursor = tool === 'select' ? 'move' : 'copy';
    }
    function drawAnnotation(context, item) {
      context.save();
      context.strokeStyle = item.color || color;
      context.fillStyle = item.color || color;
      context.lineWidth = item.lineWidth || 3;
      context.lineJoin = 'round';
      context.lineCap = 'round';
      if (item.type === 'rect') {
        context.strokeRect(item.x, item.y, item.width, item.height);
      } else if (item.type === 'ellipse') {
        context.beginPath();
        context.ellipse(item.x + item.width / 2, item.y + item.height / 2, Math.abs(item.width / 2), Math.abs(item.height / 2), 0, 0, Math.PI * 2);
        context.stroke();
      } else if (item.type === 'arrow') {
        drawArrow(context, item.x, item.y, item.x2, item.y2);
      } else if (item.type === 'pen') {
        context.beginPath();
        item.points.forEach((p, index) => {
          if (index === 0) context.moveTo(p.x, p.y);
          else context.lineTo(p.x, p.y);
        });
        context.stroke();
      } else if (item.type === 'text') {
        context.font = '600 18px -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif';
        context.textBaseline = 'top';
        context.fillText(item.text, item.x, item.y);
      } else if (item.type === 'mosaic') {
        drawMosaicPreview(context, item);
      }
      context.restore();
    }
    function drawArrow(context, x1, y1, x2, y2) {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const head = 13;
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.stroke();
      context.beginPath();
      context.moveTo(x2, y2);
      context.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6));
      context.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6));
      context.closePath();
      context.fill();
    }
    function drawMosaicPreview(context, item) {
      if (shot.naturalWidth) {
        const crop = imageCropRect(item);
        const tile = 10;
        const scratch = document.createElement('canvas');
        scratch.width = Math.max(1, Math.round(item.width / tile));
        scratch.height = Math.max(1, Math.round(item.height / tile));
        const scratchContext = scratch.getContext('2d');
        scratchContext.drawImage(
          shot,
          crop.sx,
          crop.sy,
          crop.sw,
          crop.sh,
          0,
          0,
          scratch.width,
          scratch.height,
        );
        const previousSmoothing = context.imageSmoothingEnabled;
        context.imageSmoothingEnabled = false;
        context.drawImage(scratch, item.x, item.y, item.width, item.height);
        context.imageSmoothingEnabled = previousSmoothing;
        context.strokeStyle = 'rgba(7, 193, 96, .7)';
        context.strokeRect(item.x, item.y, item.width, item.height);
        return;
      }
      const step = 8;
      context.save();
      context.fillStyle = 'rgba(7, 193, 96, .18)';
      context.fillRect(item.x, item.y, item.width, item.height);
      context.strokeStyle = 'rgba(7, 193, 96, .45)';
      context.lineWidth = 1;
      for (let x = item.x; x < item.x + item.width; x += step) {
        for (let y = item.y; y < item.y + item.height; y += step) {
          if (((x + y) / step) % 2 < 1) context.strokeRect(x, y, step, step);
        }
      }
      context.restore();
    }
    function makeDraft(startPoint, currentPoint) {
      const shape = normalized(startPoint, currentPoint);
      if (tool === 'rect' || tool === 'ellipse' || tool === 'mosaic') {
        return { type: tool, x: shape.x, y: shape.y, width: shape.width, height: shape.height, color, lineWidth: 3 };
      }
      if (tool === 'arrow') {
        return { type: 'arrow', x: startPoint.x, y: startPoint.y, x2: currentPoint.x, y2: currentPoint.y, color, lineWidth: 3 };
      }
      return null;
    }
    function startTextEdit(p) {
      commitTextEdit(false);
      const input = document.createElement('input');
      input.id = 'textEditor';
      input.type = 'text';
      input.placeholder = '输入文字';
      input.style.left = Math.min(window.innerWidth - 140, Math.max(8, p.x)) + 'px';
      input.style.top = Math.min(window.innerHeight - 38, Math.max(8, p.y)) + 'px';
      textEditor = { node: input, x: p.x, y: p.y };
      document.body.appendChild(input);
      input.focus();
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commitTextEdit(true);
        } else if (event.key === 'Escape') {
          event.preventDefault();
          commitTextEdit(false);
        }
      });
      input.addEventListener('blur', () => commitTextEdit(true));
    }
    function commitTextEdit(keep) {
      if (!textEditor) return;
      const text = textEditor.node.value.trim();
      const x = textEditor.x;
      const y = textEditor.y;
      textEditor.node.remove();
      textEditor = null;
      if (keep && text) {
        annotations.push({ type: 'text', text, x, y, color });
        render();
      }
    }
    window.addEventListener('mousedown', (event) => {
      const target = event.target;
      if ((target && target.closest && target.closest('#toolbar')) || (target && target.id === 'textEditor')) return;
      commitTextEdit(true);
      const p = point(event);
      start = p;
      base = selection ? { ...selection } : null;
      const handle = target && target.dataset && target.dataset.handle;
      if (handle && selection) {
        action = 'resize:' + handle;
        return;
      }
      if (selection && tool === 'select' && insideSelection(p)) {
        action = 'move';
        return;
      }
      if (selection && tool === 'text' && insideSelection(p)) {
        startTextEdit(p);
        return;
      }
      if (selection && tool === 'pen' && insideSelection(p)) {
        action = 'pen';
        draft = { type: 'pen', points: [p], color, lineWidth: 3 };
        render();
        return;
      }
      if (selection && tool !== 'select' && insideSelection(p)) {
        action = 'annotate';
        draft = makeDraft(start, p);
        render();
        return;
      }
      action = 'select';
      setSelection({ x: p.x, y: p.y, width: 1, height: 1 });
    });
    window.addEventListener('mousemove', (event) => {
      if (!action || !start) return;
      const current = point(event);
      const delta = { x: current.x - start.x, y: current.y - start.y };
      if (action === 'select') {
        setSelection(normalized(start, current));
      } else if (action === 'move' && base) {
        setSelection({ ...base, x: base.x + delta.x, y: base.y + delta.y });
      } else if (action.indexOf('resize:') === 0 && base) {
        setSelection(resizeRect(action.slice(7), base, delta));
      } else if (action === 'annotate') {
        draft = makeDraft(start, current);
        render();
      } else if (action === 'pen' && draft) {
        draft.points.push(current);
        render();
      }
    });
    window.addEventListener('mouseup', () => {
      if ((action === 'annotate' || action === 'pen') && draft) {
        const enough =
          draft.type === 'pen' ||
          draft.type === 'arrow' ||
          Math.max(Math.abs(draft.width || 0), Math.abs(draft.height || 0)) > 4;
        if (enough) annotations.push(draft);
        draft = null;
        render();
      }
      action = null;
    });
    window.addEventListener('dblclick', (event) => {
      if (selection && insideSelection(point(event))) finish();
    });
    toolbar.addEventListener('click', (event) => {
      const target = event.target;
      const button = target && target.closest ? target.closest('button') : null;
      if (!button) return;
      const nextTool = button.dataset.tool;
      const nextAction = button.dataset.action;
      if (nextTool) {
        tool = nextTool;
        updateToolbar();
        return;
      }
      if (nextAction === 'undo') {
        commitTextEdit(false);
        annotations.pop();
        render();
      } else if (nextAction === 'cancel') {
        send({ canceled: true });
      } else if (nextAction === 'ok') {
        finish();
      }
    });
    window.addEventListener('keydown', (event) => {
      if (event.target && event.target.id === 'textEditor') return;
      if (event.key === 'Escape') send({ canceled: true });
      if (event.key === 'Enter') finish();
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        annotations.pop();
        render();
      }
    });
    window.addEventListener('resize', resizeCanvas);
    function finish() {
      commitTextEdit(true);
      if (!selection || selection.width < 3 || selection.height < 3 || !shot.naturalWidth) return;
      const crop = imageCropRect(selection);
      const canvas = document.createElement('canvas');
      canvas.width = crop.sw;
      canvas.height = crop.sh;
      const context = canvas.getContext('2d');
      context.drawImage(
        shot,
        crop.sx,
        crop.sy,
        crop.sw,
        crop.sh,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      context.save();
      context.scale(crop.scaleX, crop.scaleY);
      context.translate(-selection.x, -selection.y);
      for (const item of annotations) drawAnnotation(context, item);
      context.restore();
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
  tray?.setToolTip(`LPP \u5ba2\u670d\u5ba2\u6237\u7aef - ${trayStatus}`);
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
