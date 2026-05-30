import { clipboard, dialog, nativeImage, shell } from 'electron';
import { execFile } from 'node:child_process';
import { copyFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import type {
  CacheMediaFilePayload,
  CacheMediaPosterPayload,
  DesktopApiMethod,
  VideoPlayerPayload,
} from '../shared/desktop-api.js';
import {
  assertAllowedLocalMediaFilePath,
  cacheMediaPosterFile,
  ensureLocalMediaFile,
  getLocalMediaStatus,
  readLocalOrRemoteImageBuffer,
} from './media-storage.js';
import { openVideoPlayerWindow } from './video-player-window.js';

type DesktopIpcRegister = <Args extends unknown[]>(
  method: DesktopApiMethod,
  handler: (event: Electron.IpcMainInvokeEvent, ...args: Args) => unknown,
) => void;

const execFileAsync = promisify(execFile);

export function registerDesktopFileHandlers({
  appIconPath,
  preloadPath,
  register,
}: {
  appIconPath: string;
  preloadPath: string;
  register: DesktopIpcRegister;
}) {
  register('openFile', async (_event, path: string) => {
    await shell.openPath(assertAllowedLocalMediaFilePath(path));
  });

  register(
    'cacheMediaFile',
    async (_event, payload: CacheMediaFilePayload) => ensureLocalMediaFile(payload),
  );

  register(
    'getCachedMediaStatus',
    async (_event, payload: CacheMediaFilePayload) => getLocalMediaStatus(payload),
  );

  register(
    'cacheMediaPoster',
    async (_event, payload: CacheMediaPosterPayload) => cacheMediaPosterFile(payload),
  );

  register(
    'openVideoPlayer',
    async (_event, payload: VideoPlayerPayload) =>
      openVideoPlayerWindow(payload, {
        appIconPath,
        preloadPath,
      }),
  );

  register(
    'openDownloadedFile',
    async (_event, payload: Omit<CacheMediaFilePayload, 'kind'>) => {
      const { filePath } = await ensureLocalMediaFile({ ...payload, kind: 'file' });
      const error = await shell.openPath(filePath);
      if (error) throw new Error(error);
      return filePath;
    },
  );

  register(
    'openMediaFile',
    async (_event, payload: CacheMediaFilePayload) => {
      const { filePath } = await ensureLocalMediaFile(payload);
      const error = await shell.openPath(filePath);
      if (error) throw new Error(error);
      return filePath;
    },
  );

  register(
    'editMediaFile',
    async (_event, payload: CacheMediaFilePayload) => {
      const { filePath } = await ensureLocalMediaFile(payload);
      const error = await shell.openPath(filePath);
      if (error) throw new Error(error);
      return filePath;
    },
  );

  register(
    'copyMediaFile',
    async (_event, payload: CacheMediaFilePayload) => {
      const { filePath } = await ensureLocalMediaFile(payload);
      await copyFileToClipboard(filePath);
      return filePath;
    },
  );

  register('copyFilePath', async (_event, path: string) => {
    const safePath = assertAllowedLocalMediaFilePath(path);
    await copyFileToClipboard(safePath);
    return safePath;
  });

  register(
    'saveMediaAs',
    async (_event, payload: CacheMediaFilePayload) => {
      const { filePath } = await ensureLocalMediaFile(payload);
      const result = await dialog.showSaveDialog({
        defaultPath:
          payload.fileName ||
          (payload.kind === 'image'
            ? 'image.png'
            : payload.kind === 'video'
              ? 'video.mp4'
              : 'lpp-file'),
      });
      if (result.canceled || !result.filePath) return null;
      await copyFile(filePath, result.filePath);
      return result.filePath;
    },
  );

  register(
    'revealMediaInFolder',
    async (_event, payload: CacheMediaFilePayload) => {
      const { filePath } = await ensureLocalMediaFile(payload);
      shell.showItemInFolder(filePath);
      return filePath;
    },
  );

  register(
    'copyImageFromUrl',
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

  register('saveFile', async (_event, defaultName: string, content: string) => {
    const result = await dialog.showSaveDialog({
      defaultPath: defaultName,
      filters: [{ name: 'Text', extensions: ['txt', 'json', 'log'] }],
    });
    if (result.canceled || !result.filePath) return null;
    await writeFile(result.filePath, content, 'utf8');
    return result.filePath;
  });
}

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
