import { app, nativeImage } from 'electron';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, open, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, isAbsolute, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type {
  CacheMediaFilePayload,
  CacheMediaPosterPayload,
  CachedMediaFileResult,
  CachedMediaStatus,
  LocalMediaCacheSource,
} from '../shared/desktop-api.js';
import { recordElectronRuntimeDiagnostic } from './runtime-diagnostics.js';

const pendingMediaCacheKeys = new Set<string>();
const failedMediaCacheKeys = new Set<string>();

export async function ensureLocalMediaFile(
  payload: CacheMediaFilePayload,
): Promise<CachedMediaFileResult> {
  const url = payload.url;
  if (url.startsWith('file:')) {
    const filePath = fileURLToPath(url);
    assertAllowedLocalMediaFilePath(filePath);
    return { filePath, fileUrl: pathToFileURL(filePath).toString() };
  }
  if (isLocalFilePath(url)) {
    assertAllowedLocalMediaFilePath(url);
    return { filePath: url, fileUrl: pathToFileURL(url).toString() };
  }
  if (!isDownloadableMediaUrl(url) && !url.startsWith('data:')) {
    throw new Error('不支持的媒体地址');
  }

  const { filePath, cacheKey } = mediaCacheTarget(payload);

  if (await isReusableCachedMediaFile(filePath, payload.kind)) {
    return { filePath, fileUrl: pathToFileURL(filePath).toString() };
  }

  pendingMediaCacheKeys.add(cacheKey);
  failedMediaCacheKeys.delete(cacheKey);
  try {
    const bytes = url.startsWith('data:')
      ? dataUrlBytes(url)
      : await fetchMediaBytes(payload);
    if (bytes.byteLength <= 0) throw new Error('媒体文件为空');
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, bytes);
    return { filePath, fileUrl: pathToFileURL(filePath).toString() };
  } catch (error) {
    failedMediaCacheKeys.add(cacheKey);
    recordMediaCacheFailure(payload, error);
    throw error;
  } finally {
    pendingMediaCacheKeys.delete(cacheKey);
  }
}

export async function cacheLocalMediaFile(
  payload: CacheMediaFilePayload,
  source: LocalMediaCacheSource | string,
): Promise<CachedMediaFileResult> {
  const localSource = normalizeLocalMediaCacheSource(source);
  if (localSource.kind === 'bytes') {
    return writeLocalMediaBytes(payload, localSource.bytes);
  }

  const sourcePath = localSource.sourcePath;
  if (!sourcePath?.trim()) {
    const error = new Error('本地媒体文件不可用：source_path_missing');
    recordLocalMediaCacheFailure(payload, 'source_path_missing', error);
    throw error;
  }
  const sourceStats = await stat(sourcePath).catch(() => null);
  if (!sourceStats?.isFile() || sourceStats.size <= 0) {
    const error = new Error('本地媒体文件不可用：source_file_unavailable');
    recordLocalMediaCacheFailure(payload, 'source_file_unavailable', error);
    throw error;
  }
  const sourceFileUrl = pathToFileURL(sourcePath).toString();
  const { filePath } = mediaCacheTarget({ ...payload, url: sourceFileUrl });
  if (await isReusableCachedMediaFile(filePath, payload.kind)) {
    return { filePath, fileUrl: pathToFileURL(filePath).toString() };
  }
  await mkdir(dirname(filePath), { recursive: true });
  await copyFile(sourcePath, filePath);
  return { filePath, fileUrl: pathToFileURL(filePath).toString() };
}

function normalizeLocalMediaCacheSource(
  source: LocalMediaCacheSource | string,
): LocalMediaCacheSource {
  if (typeof source === 'string') return { kind: 'path', sourcePath: source };
  return source;
}

async function writeLocalMediaBytes(
  payload: CacheMediaFilePayload,
  sourceBytes: ArrayBuffer | Uint8Array,
) {
  const bytes = sourceBytes instanceof Uint8Array
    ? sourceBytes
    : new Uint8Array(sourceBytes);
  if (bytes.byteLength <= 0) {
    const error = new Error('本地媒体文件不可用：blob_materialize_failed');
    recordLocalMediaCacheFailure(payload, 'blob_materialize_failed', error);
    throw error;
  }
  const { filePath } = mediaCacheTarget(payload);
  if (await isReusableCachedMediaFile(filePath, payload.kind)) {
    return { filePath, fileUrl: pathToFileURL(filePath).toString() };
  }
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, bytes);
  return { filePath, fileUrl: pathToFileURL(filePath).toString() };
}

export async function getLocalMediaStatus(
  payload: CacheMediaFilePayload,
): Promise<CachedMediaStatus> {
  const { filePath, cacheKey } = mediaCacheTarget(payload);
  if (await isReusableCachedMediaFile(filePath, payload.kind)) return 'cached';
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
    'lppchat-files',
    safePathSegment(payload.accountId || 'default-account'),
    safePathSegment(payload.conversationId || 'default-conversation'),
    mediaKindDirectory,
    month,
  );
}

export function assertAllowedLocalMediaFilePath(filePath: string) {
  const normalizedPath = resolve(filePath);
  const userDataRoot = resolve(app.getPath('userData'));
  if (normalizedPath === userDataRoot || normalizedPath.startsWith(`${userDataRoot}${sep}`)) {
    return normalizedPath;
  }
  throw new Error('不允许访问应用缓存目录之外的本地文件');
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

async function readFilePrefix(path: string, length: number) {
  const handle = await open(path, 'r');
  try {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, 0);
    return new Uint8Array(buffer.subarray(0, bytesRead));
  } finally {
    await handle.close();
  }
}

async function isReusableCachedMediaFile(
  path: string,
  kind: CacheMediaFilePayload['kind'],
) {
  try {
    const stats = await stat(path);
    if (!stats.isFile() || stats.size <= 0) return false;
    if (kind === 'image') return isReusableCachedImageFile(path);
    if (kind !== 'video') return true;
    const bytes = await readFilePrefix(path, 2048);
    const errorMessage = mediaErrorMessage(bytes, '');
    if (!errorMessage) return true;
    recordElectronRuntimeDiagnostic({
      event: 'media.cache_failed',
      error: new Error(`视频缓存不可用，准备重新下载：${errorMessage}`),
      reason: `kind=video urlType=file fileName=${safeDiagnosticText(basename(path))}`,
    });
    return false;
  } catch {
    return false;
  }
}

async function isReusableCachedImageFile(path: string) {
  const bytes = await readFile(path);
  const errorMessage = mediaErrorMessage(bytes, '');
  const image = errorMessage ? null : nativeImage.createFromBuffer(bytes);
  if (!errorMessage && image && !image.isEmpty()) return true;
  recordElectronRuntimeDiagnostic({
    event: 'media.cache_failed',
    error: new Error(`Cached image is not reusable: ${errorMessage || 'invalid_image'}`),
    reason: `kind=image urlType=file fileName=${safeDiagnosticText(basename(path))}`,
  });
  return false;
}

function dataUrlBytes(url: string) {
  const [header, body] = url.split(',', 2);
  if (!body) throw new Error('媒体地址无效');
  if (header.includes(';base64')) return new Uint8Array(Buffer.from(body, 'base64'));
  return new TextEncoder().encode(decodeURIComponent(body));
}

async function fetchMediaBytes(payload: CacheMediaFilePayload) {
  const url = payload.url;
  const response = await fetch(url, {
    headers: mediaRequestHeaders(payload.authToken),
  });
  const bytes = new Uint8Array(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') || '';
  const errorMessage = mediaErrorMessage(bytes, contentType);
  if (!response.ok || errorMessage) {
    throw new Error(
      errorMessage ||
        `文件下载失败：HTTP ${response.status}; content-type=${contentType || 'unknown'}`,
    );
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

function recordMediaCacheFailure(payload: CacheMediaFilePayload, error: unknown) {
  recordElectronRuntimeDiagnostic({
    event: 'media.cache_failed',
    error,
    reason: [
      `kind=${payload.kind}`,
      `urlType=${mediaUrlType(payload.url)}`,
      `fileName=${safeDiagnosticText(payload.fileName || '') || 'unknown'}`,
      payload.accountId ? `accountId=${safeDiagnosticText(payload.accountId)}` : undefined,
      payload.conversationId
        ? `conversationId=${safeDiagnosticText(payload.conversationId)}`
        : undefined,
    ]
      .filter(Boolean)
      .join(' '),
  });
}

function recordLocalMediaCacheFailure(
  payload: CacheMediaFilePayload,
  sourceReason: 'source_path_missing' | 'source_file_unavailable' | 'blob_materialize_failed',
  error: unknown,
) {
  recordElectronRuntimeDiagnostic({
    event: 'media.local_cache_failed',
    error,
    reason: [
      `kind=${payload.kind}`,
      `urlType=${mediaUrlType(payload.url)}`,
      `fileName=${safeDiagnosticText(payload.fileName || '') || 'unknown'}`,
      `source=${sourceReason}`,
      payload.accountId ? `accountId=${safeDiagnosticText(payload.accountId)}` : undefined,
      payload.conversationId
        ? `conversationId=${safeDiagnosticText(payload.conversationId)}`
        : undefined,
    ]
      .filter(Boolean)
      .join(' '),
  });
}

function mediaUrlType(url: string) {
  if (url.startsWith('data:')) return 'data';
  if (url.startsWith('file:')) return 'file';
  if (/^blob:/i.test(url)) return 'blob';
  try {
    return new URL(url).protocol.replace(/:$/, '') || 'unknown';
  } catch {
    return isLocalFilePath(url) ? 'local-file' : 'unknown';
  }
}

function safeDiagnosticText(value: string) {
  return value.trim().replace(/[^\w.@-]+/g, '_').slice(0, 120);
}

function mediaErrorMessage(bytes: Uint8Array, contentType: string) {
  const preview = new TextDecoder().decode(bytes.slice(0, Math.min(bytes.byteLength, 2048))).trim();
  const lowerContentType = contentType.toLowerCase();
  const looksJson = lowerContentType.includes('json') || preview.startsWith('{') || preview.startsWith('[');
  const looksHtml =
    lowerContentType.includes('text/html') ||
    /^<!doctype\s+html/i.test(preview) ||
    /^<html[\s>]/i.test(preview);
  if (looksHtml) return '下载到的媒体文件是 HTML 错误页，请重新登录或稍后重试';
  if (!looksJson) return undefined;
  try {
    const payload = JSON.parse(preview) as {
      code?: string;
      message?: string;
    } | null;
    if (!payload || typeof payload !== 'object') return undefined;
    if (payload.code === 'AUTH_REQUIRED') return '文件下载需要登录认证，请重新登录后再试';
    if (payload.code && payload.code !== 'OK' && payload.code !== 'SUCCESS') {
      return payload.message || payload.code;
    }
  } catch {
    return looksJson ? '下载到的媒体文件是 JSON 错误内容，请重新登录或稍后重试' : undefined;
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
