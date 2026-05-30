import { BrowserWindow, screen } from 'electron';
import type { VideoPlayerPayload } from '../shared/desktop-api.js';
import { ensureLocalMediaFile } from './media-storage.js';
import { videoPlayerHtml } from './video-player-template.js';

export async function openVideoPlayerWindow(
  payload: VideoPlayerPayload,
  options: {
    appIconPath: string;
    preloadPath: string;
  },
) {
  const cached = await ensureLocalMediaFile({ ...payload, kind: 'video' });
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const bounds = display.workArea;
  const sourceWidth = Number(payload.width) > 0 ? Number(payload.width) : 720;
  const sourceHeight = Number(payload.height) > 0 ? Number(payload.height) : 1280;
  const aspect = Math.min(4, Math.max(0.28, sourceWidth / sourceHeight));
  const toolbarHeight = 42;
  const maxWidth = Math.min(bounds.width - 80, 1180);
  const maxHeight = Math.min(bounds.height - 80, 900);
  const availableVideoHeight = Math.max(260, maxHeight - toolbarHeight);
  const horizontalGutter = aspect < 0.85 ? 96 : 56;
  const availableVideoWidth = Math.max(320, maxWidth - horizontalGutter);
  let videoWidth = Math.min(availableVideoWidth, Math.round(availableVideoHeight * aspect));
  let videoHeight = Math.round(videoWidth / aspect);
  if (videoHeight + toolbarHeight > maxHeight) {
    videoHeight = maxHeight - toolbarHeight;
    videoWidth = Math.round(videoHeight * aspect);
  }
  const width = Math.max(420, Math.min(maxWidth, videoWidth + horizontalGutter));
  const height = Math.max(420, Math.min(maxHeight, videoHeight + toolbarHeight));
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
  void player.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(videoPlayerHtml({
      fileName: payload.fileName || 'video.mp4',
      fileUrl: cached.fileUrl,
      posterUrl: isUsableVideoPosterUrl(payload.posterUrl) ? payload.posterUrl : undefined,
      title,
    }))}`,
  );
  return cached.filePath;
}

function isUsableVideoPosterUrl(url?: string) {
  return Boolean(url && !url.startsWith('blob:'));
}
