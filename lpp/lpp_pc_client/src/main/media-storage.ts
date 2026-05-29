import { app } from 'electron';
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, isAbsolute, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type {
  CacheMediaFilePayload,
  CacheMediaPosterPayload,
  CachedMediaFileResult,
  CachedMediaStatus,
} from '../shared/desktop-api.js';

const pendingMediaCacheKeys = new Set<string>();
const failedMediaCacheKeys = new Set<string>();

export async function ensureLocalMediaFile(
  payload: CacheMediaFilePayload,
): Promise<CachedMediaFileResult> {
  const url = payload.url;
  if (url.startsWith('file:')) {
    const filePath = fileURLToPath(url);
    return { filePath, fileUrl: pathToFileURL(filePath).toString() };
  }
  if (isLocalFilePath(url)) {
    return { filePath: url, fileUrl: pathToFileURL(url).toString() };
  }
  if (!isDownloadableMediaUrl(url) && !url.startsWith('data:')) {
    throw new Error('不支持的媒体地址');
  }

  const { filePath, cacheKey } = mediaCacheTarget(payload);

  if (await fileExists(filePath)) {
    return { filePath, fileUrl: pathToFileURL(filePath).toString() };
  }

  pendingMediaCacheKeys.add(cacheKey);
  failedMediaCacheKeys.delete(cacheKey);
  try {
    const bytes = url.startsWith('data:')
      ? dataUrlBytes(url)
      : await fetchMediaBytes(url, payload.authToken);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, bytes);
    return { filePath, fileUrl: pathToFileURL(filePath).toString() };
  } catch (error) {
    failedMediaCacheKeys.add(cacheKey);
    throw error;
  } finally {
    pendingMediaCacheKeys.delete(cacheKey);
  }
}

export async function getLocalMediaStatus(
  payload: CacheMediaFilePayload,
): Promise<CachedMediaStatus> {
  const { filePath, cacheKey } = mediaCacheTarget(payload);
  if (await fileExists(filePath)) return 'cached';
  if (pendingMediaCacheKeys.has(cacheKey)) return 'caching';
  if (failedMediaCacheKeys.has(cacheKey)) return 'failed';
  return 'not_cached';
}

export async function readLocalOrRemoteImageBuffer(url: string, authToken?: string) {
  if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) {
    return Buffer.from(await readFile(url));
  }
  if (url.startsWith('file:')) {
    return Buffer.from(await readFile(fileURLToPath(url)));
  }
  if (url.startsWith('data:')) {
    const base64 = url.split(',', 2)[1];
    if (!base64) throw new Error('图片地址无效');
    return Buffer.from(base64, 'base64');
  }
  if (!isDownloadableMediaUrl(url)) throw new Error('不支持的图片地址');
  const response = await fetch(url, {
    headers: mediaRequestHeaders(authToken),
  });
  const bytes = new Uint8Array(await response.arrayBuffer());
  const errorMessage = mediaErrorMessage(bytes, response.headers.get('content-type') || '');
  if (!response.ok || errorMessage) {
    throw new Error(errorMessage || `图片下载失败：HTTP ${response.status}`);
  }
  return Buffer.from(bytes);
}

export async function cacheMediaPosterFile(
  payload: CacheMediaPosterPayload,
): Promise<CachedMediaFileResult> {
  const directory = join(mediaDirectory(payload), 'Posters');
  const fileName = safeMediaFileName(payload.fileName.replace(/\.[^.]+$/, '') || 'video-poster', 'image');
  const hash = createHash('sha1').update(`${payload.url}:${payload.fileName}`).digest('hex').slice(0, 16);
  const filePath = join(directory, `${hash}-${fileName}`);
  if (await fileExists(filePath)) {
    return { filePath, fileUrl: pathToFileURL(filePath).toString() };
  }
  await mkdir(directory, { recursive: true });
  await writeFile(filePath, dataUrlBytes(payload.dataUrl));
  return { filePath, fileUrl: pathToFileURL(filePath).toString() };
}

function mediaDirectory(payload: CacheMediaFilePayload) {
  const month = new Date().toISOString().slice(0, 7);
  const mediaKindDirectory =
    payload.kind === 'image' ? 'Images' : payload.kind === 'video' ? 'Videos' : 'Files';
  return join(
    app.getPath('userData'),
    'LPP Files',
    safePathSegment(payload.accountId || 'default-account'),
    safePathSegment(payload.conversationId || 'default-conversation'),
    mediaKindDirectory,
    month,
  );
}

function mediaCacheTarget(payload: CacheMediaFilePayload) {
  const url = payload.url;
  const fileName = safeMediaFileName(
    payload.fileName || (isDownloadableMediaUrl(url) ? basename(new URL(url).pathname) : ''),
    payload.kind,
  );
  const directory = mediaDirectory(payload);
  const hash = createHash('sha1').update(url).digest('hex').slice(0, 16);
  const filePath = join(directory, `${hash}-${fileName}`);
  return { cacheKey: filePath, directory, fileName, filePath };
}

function isDownloadableMediaUrl(url: string) {
  try {
    return ['http:', 'https:'].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

function isLocalFilePath(value: string) {
  if (!value || /^[a-z][a-z0-9+.-]*:/i.test(value)) return false;
  return isAbsolute(value) || /^[a-zA-Z]:[\\/]/.test(value);
}

async function fileExists(path: string) {
  try {
    const stats = await stat(path);
    return stats.isFile() && stats.size > 0;
  } catch {
    return false;
  }
}

function dataUrlBytes(url: string) {
  const [header, body] = url.split(',', 2);
  if (!body) throw new Error('媒体地址无效');
  if (header.includes(';base64')) return new Uint8Array(Buffer.from(body, 'base64'));
  return new TextEncoder().encode(decodeURIComponent(body));
}

async function fetchMediaBytes(url: string, authToken?: string) {
  const response = await fetch(url, {
    headers: mediaRequestHeaders(authToken),
  });
  const bytes = new Uint8Array(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') || '';
  const errorMessage = mediaErrorMessage(bytes, contentType);
  if (!response.ok || errorMessage) {
    throw new Error(errorMessage || `文件下载失败：HTTP ${response.status}`);
  }
  return bytes;
}

function mediaRequestHeaders(authToken?: string) {
  if (!authToken) return undefined;
  return {
    Accept: 'application/octet-stream,*/*',
    Authorization: `Bearer ${authToken}`,
    'X-Access-Token': authToken,
    'X-Tenant-Token': authToken,
  };
}

function mediaErrorMessage(bytes: Uint8Array, contentType: string) {
  if (!contentType.toLowerCase().includes('json')) return undefined;
  try {
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as {
      code?: string;
      message?: string;
    } | null;
    if (!payload || typeof payload !== 'object') return undefined;
    if (payload.code === 'AUTH_REQUIRED') return '文件下载需要登录认证，请重新登录后再试';
    if (payload.code && payload.code !== 'OK' && payload.code !== 'SUCCESS') {
      return payload.message || payload.code;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function safeMediaFileName(value: string, kind: 'image' | 'video' | 'file') {
  const sanitized = value.trim().replace(/[\\/:*?"<>|]/g, '_');
  const fallback = kind === 'image' ? 'image.png' : kind === 'video' ? 'video.mp4' : 'lpp-file';
  const withFallback = sanitized || fallback;
  if (kind === 'image' && !extname(withFallback)) return `${withFallback}.png`;
  if (kind === 'video' && !extname(withFallback)) return `${withFallback}.mp4`;
  return withFallback;
}

function safePathSegment(value: string) {
  return value.trim().replace(/[\\/:*?"<>|]/g, '_') || 'unknown';
}
