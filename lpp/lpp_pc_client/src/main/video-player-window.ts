import { app, BrowserWindow, screen } from 'electron';
import type { VideoPlayerPayload } from '../shared/desktop-api.js';
import { ensureLocalMediaFile } from './media-storage.js';
import {
  createVideoPlayerDocument,
  removeVideoPlayerDocument,
} from './video-player-document.js';
import { videoPlayerHtml } from './video-player-template.js';
import { createVideoPlayerWindowLayout } from './video-player-window-layout.js';

export async function openVideoPlayerWindow(
  payload: VideoPlayerPayload,
  options: {
    appIconPath: string;
    preloadPath: string;
  },
) {
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const bounds = display.workArea;
  const { width, height } = createVideoPlayerWindowLayout(bounds, payload);
  const title = '\u539f\u89c6\u9891';
  const player = new BrowserWindow({
    width,
    height,
    minWidth: 360,
    minHeight: 420,
    title,
    icon: options.appIconPath,
    backgroundColor: '#f2f2f2',
    autoHideMenuBar: true,
    webPreferences: {
      preload: options.preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  player.setMenuBarVisibility(false);
  const initialFileUrl = initialVideoFileUrl(payload.url);
  const playerDocument = await createVideoPlayerDocument({
    userDataPath: app.getPath('userData'),
    html: videoPlayerHtml({
      fileName: payload.fileName || 'video.mp4',
      fileUrl: initialFileUrl,
      posterUrl: isUsableVideoPosterUrl(payload.posterUrl) ? payload.posterUrl : undefined,
      title,
    }),
  });
  player.once('closed', () => removeVideoPlayerDocument(playerDocument.filePath));
  void player.loadURL(playerDocument.fileUrl);
  void ensureLocalMediaFile({ ...payload, kind: 'video' })
    .then((cached) => {
      if (player.isDestroyed()) return;
      if (initialFileUrl === cached.fileUrl) return;
      executePlayerScript(
        player,
        `window.__lppSetVideoSource?.(${JSON.stringify(cached.fileUrl)})`,
      );
    })
    .catch((error) => {
      if (player.isDestroyed()) return;
      const message = error instanceof Error ? error.message : '视频准备失败';
      executePlayerScript(
        player,
        `window.__lppSetVideoFailure?.(${JSON.stringify(message)})`,
      );
    });
  return payload.url;
}

function isUsableVideoPosterUrl(url?: string) {
  return Boolean(url && !url.startsWith('blob:'));
}

function initialVideoFileUrl(url: string) {
  return url.startsWith('file:') || url.startsWith('data:') ? url : undefined;
}

function executePlayerScript(player: BrowserWindow, script: string) {
  const run = () => {
    if (!player.isDestroyed()) void player.webContents.executeJavaScript(script);
  };
  if (player.webContents.isLoading()) {
    player.webContents.once('did-finish-load', run);
    return;
  }
  run();
}
