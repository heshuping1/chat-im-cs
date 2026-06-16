import { clipboard, dialog, nativeImage, safeStorage, shell } from 'electron';
import { execFile } from 'node:child_process';
import { basename } from 'node:path';
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import type {
  CacheMediaFilePayload,
  CacheMediaPosterPayload,
  ChatArchiveFilePayload,
  ChatArchiveFileResult,
  DesktopApiMethod,
  LocalMediaCacheSource,
  SaveAndRevealFilePayload,
  VideoPlayerPayload,
} from '../shared/desktop-api.js';
import {
  assertAllowedLocalMediaFilePath,
  cacheLocalMediaFile,
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
const encryptedChatBackupPrefix = 'LPP_CHAT_BACKUP_SAFE_STORAGE_V1:';

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
    'cacheLocalMediaFile',
    async (_event, payload: CacheMediaFilePayload, source: LocalMediaCacheSource) =>
      cacheLocalMediaFile(payload, source),
  );

  register(
    'getCachedMediaStatus',
    async (_event, payload: CacheMediaFilePayload) => getLocalMediaStatus(payload),
  );

  register(
    'readMediaFileAsDataUrl',
    async (_event, payload: CacheMediaFilePayload) => {
      const { filePath } = await ensureLocalMediaFile(payload);
      const bytes = await readFile(filePath);
      return `data:${mediaMimeType(filePath, payload.kind)};base64,${bytes.toString('base64')}`;
    },
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

  register('saveAndRevealFile', async (_event, payload: SaveAndRevealFilePayload) => {
    const result = await dialog.showSaveDialog({
      defaultPath: payload.defaultName,
      filters: payload.filters,
    });
    if (result.canceled || !result.filePath) return null;
    await writeFile(result.filePath, bufferFromSavedBytes(payload.bytes));
    shell.showItemInFolder(result.filePath);
    return result.filePath;
  });

  register('saveChatArchiveFile', async (_event, payload: ChatArchiveFilePayload) => {
    const result = await dialog.showSaveDialog({
      defaultPath: payload.defaultName,
      filters: [
        payload.kind === 'backup'
          ? { name: 'StartLink Chat Backup', extensions: ['lpp-chat-backup'] }
          : { name: 'JSON', extensions: ['json'] },
      ],
    });
    if (result.canceled || !result.filePath) return null;
    const content =
      payload.kind === 'backup'
        ? encryptChatBackupPayload(payload.content)
        : payload.content;
    await writeFile(result.filePath, content, 'utf8');
    return result.filePath;
  });

  register('openChatArchiveFile', async (): Promise<ChatArchiveFileResult | null> => {
    const result = await dialog.showOpenDialog({
      filters: [{ name: 'StartLink Chat Backup', extensions: ['lpp-chat-backup'] }],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    const filePath = result.filePaths[0];
    if (!filePath.toLowerCase().endsWith('.lpp-chat-backup')) {
      throw new Error('只能打开 StartLink 聊天备份文件');
    }
    const encrypted = await readFile(filePath, 'utf8');
    return {
      content: decryptChatBackupPayload(encrypted),
      fileName: basename(filePath),
      filePath,
      kind: 'backup',
    };
  });
}

function mediaMimeType(filePath: string, kind: CacheMediaFilePayload['kind']) {
  const lower = filePath.toLowerCase();
  if (kind === 'image') {
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.gif')) return 'image/gif';
    if (lower.endsWith('.bmp')) return 'image/bmp';
    return 'image/png';
  }
  if (kind === 'video') {
    if (lower.endsWith('.webm')) return 'video/webm';
    if (lower.endsWith('.mov')) return 'video/quicktime';
    return 'video/mp4';
  }
  return 'application/octet-stream';
}

function encryptChatBackupPayload(content: string) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('当前系统不支持安全备份加密');
  }
  return `${encryptedChatBackupPrefix}${safeStorage.encryptString(content).toString('base64')}`;
}

function decryptChatBackupPayload(content: string) {
  if (!content.startsWith(encryptedChatBackupPrefix)) {
    throw new Error('备份文件缺少安全封装');
  }
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('当前系统不支持安全备份解密');
  }
  const encoded = content.slice(encryptedChatBackupPrefix.length);
  return safeStorage.decryptString(Buffer.from(encoded, 'base64'));
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

function bufferFromSavedBytes(bytes: SaveAndRevealFilePayload['bytes']) {
  return bytes instanceof ArrayBuffer
    ? Buffer.from(bytes)
    : Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function escapeAppleScriptString(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
