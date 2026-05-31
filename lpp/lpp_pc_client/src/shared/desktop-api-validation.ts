import type {
  CacheMediaFilePayload,
  CacheMediaPosterPayload,
  DesktopApiMethod,
  DesktopAuthSessionPayload,
  DiagnosticsJsonValue,
  DiagnosticsModuleSnapshot,
  DiagnosticsPayload,
  LocalMediaCacheSource,
  NotifyPayload,
  TrayStatus,
  VideoPlayerPayload,
} from './desktop-api.js';

const maxShortTextLength = 4_096;
const maxSavedContentLength = 5 * 1024 * 1024;
const maxDiagnosticsItems = 200;
const maxDiagnosticsModules = 30;
const maxDiagnosticsObjectEntries = 80;
const maxDiagnosticsDepth = 8;
const maxDataUrlLength = 25 * 1024 * 1024;
const trayStatuses = new Set<TrayStatus>(['online', 'busy', 'away', 'invisible']);
const mediaKinds = new Set<CacheMediaFilePayload['kind']>(['image', 'video', 'file']);
const sensitiveDiagnosticsKeyPattern = /token|password|authorization|secret|credential/i;

export function validateDesktopApiCall(
  method: DesktopApiMethod,
  args: unknown[],
): unknown[] {
  switch (method) {
    case 'notify':
      return [validateNotifyPayload(args[0])];
    case 'openFile':
    case 'copyFilePath':
      return [safeString(args[0], method)];
    case 'openExternal':
      return [safeExternalUrl(args[0], method)];
    case 'readAuthSession':
    case 'clearAuthSession':
    case 'getAppInstanceProfile':
      return [];
    case 'openAppProfile':
      return args[0] === undefined || args[0] === null
        ? []
        : [optionalProfileId(args[0], 'appProfile.profileId')];
    case 'saveAuthSession':
      return [validateDesktopAuthSessionPayload(args[0])];
    case 'cacheLocalMediaFile':
      return [validateCacheMediaFilePayload(args[0])];
    case 'cacheMediaFile':
    case 'getCachedMediaStatus':
    case 'openMediaFile':
    case 'editMediaFile':
    case 'copyMediaFile':
    case 'saveMediaAs':
    case 'revealMediaInFolder':
      return [validateCacheMediaFilePayload(args[0])];
    case 'cacheMediaPoster':
      return [validateCacheMediaPosterPayload(args[0])];
    case 'openVideoPlayer':
      return [validateVideoPlayerPayload(args[0])];
    case 'openDownloadedFile':
      return [validateOpenDownloadedFilePayload(args[0])];
    case 'copyImageFromUrl':
      return [validateCopyImageFromUrlPayload(args[0])];
    case 'saveFile':
      return [
        safeString(args[0], 'saveFile.defaultName'),
        safeString(args[1], 'saveFile.content', maxSavedContentLength),
      ];
    case 'captureScreenshot':
    case 'getAppVersion':
      return [];
    case 'exportDiagnostics':
      return [validateDiagnosticsPayload(args[0])];
    case 'setTrayStatus':
      return [validateTrayStatus(args[0])];
    default:
      throw new Error(`Unsupported desktopApi method: ${String(method)}`);
  }
}

export function validateDesktopIpcCall(
  method: DesktopApiMethod,
  args: unknown[],
): unknown[] {
  if (method === 'cacheLocalMediaFile') {
    return [
      validateCacheMediaFilePayload(args[0]),
      validateLocalMediaCacheSource(args[1]),
    ];
  }
  return validateDesktopApiCall(method, args);
}

export function validateLocalMediaCacheSource(value: unknown): LocalMediaCacheSource {
  if (typeof value === 'string') {
    return { kind: 'path', sourcePath: safeRequiredString(value, 'media.sourcePath') };
  }
  const record = objectValue(value, 'media.source');
  const kind = safeRequiredString(record.kind, 'media.source.kind');
  if (kind === 'path') {
    return {
      kind,
      sourcePath: safeRequiredString(record.sourcePath, 'media.sourcePath'),
    };
  }
  if (kind === 'bytes') {
    const bytes = validateSourceBytes(record.bytes);
    return { kind, bytes };
  }
  throw new Error(`Invalid media.source.kind: ${kind}`);
}

export function validateNotifyPayload(value: unknown): NotifyPayload {
  const record = objectValue(value, 'notify.payload');
  return {
    body: safeString(record.body, 'notify.body'),
    conversationId: optionalString(record.conversationId, 'notify.conversationId'),
    title: safeString(record.title, 'notify.title'),
  };
}

export function validateCacheMediaFilePayload(value: unknown): CacheMediaFilePayload {
  const record = objectValue(value, 'media.payload');
  const kind = safeString(record.kind, 'media.kind') as CacheMediaFilePayload['kind'];
  if (!mediaKinds.has(kind)) throw new Error(`Invalid media.kind: ${kind}`);
  return {
    accountId: optionalString(record.accountId, 'media.accountId'),
    authToken: optionalString(record.authToken, 'media.authToken'),
    conversationId: optionalString(record.conversationId, 'media.conversationId'),
    fileName: safeString(record.fileName, 'media.fileName'),
    kind,
    url: safeString(record.url, 'media.url'),
  };
}

export function validateCacheMediaPosterPayload(value: unknown): CacheMediaPosterPayload {
  const payload = validateCacheMediaFilePayload(value);
  const record = objectValue(value, 'mediaPoster.payload');
  const dataUrl = safeString(record.dataUrl, 'mediaPoster.dataUrl', maxDataUrlLength);
  if (!dataUrl.startsWith('data:')) throw new Error('mediaPoster.dataUrl must be a data URL');
  return {
    ...payload,
    dataUrl,
  };
}

export function validateVideoPlayerPayload(value: unknown): VideoPlayerPayload {
  const payload = validateCacheMediaFilePayload(value);
  const record = objectValue(value, 'videoPlayer.payload');
  return {
    ...payload,
    durationSeconds: optionalPositiveNumber(record.durationSeconds, 'videoPlayer.durationSeconds'),
    height: optionalPositiveNumber(record.height, 'videoPlayer.height'),
    posterUrl: optionalString(record.posterUrl, 'videoPlayer.posterUrl'),
    sizeBytes: optionalPositiveNumber(record.sizeBytes, 'videoPlayer.sizeBytes'),
    title: optionalString(record.title, 'videoPlayer.title'),
    width: optionalPositiveNumber(record.width, 'videoPlayer.width'),
  };
}

export function validateDiagnosticsPayload(value: unknown): DiagnosticsPayload {
  const record = objectValue(value, 'diagnostics.payload');
  return {
    breadcrumbs: stringArray(record.breadcrumbs, 'diagnostics.breadcrumbs'),
    diagnostics: validateDiagnosticsModules(record.diagnostics),
    errors: errorArray(record.errors, 'diagnostics.errors'),
    generatedAt: optionalString(record.generatedAt, 'diagnostics.generatedAt'),
    sessionId: safeString(record.sessionId, 'diagnostics.sessionId'),
    traceId: safeString(record.traceId, 'diagnostics.traceId'),
  };
}

export function validateDesktopAuthSessionPayload(value: unknown): DesktopAuthSessionPayload {
  const record = objectValue(value, 'authSession.payload');
  return {
    apiBaseUrl: safeString(record.apiBaseUrl, 'authSession.apiBaseUrl'),
    avatarUrl: optionalNullableString(record.avatarUrl, 'authSession.avatarUrl'),
    displayName: safeString(record.displayName, 'authSession.displayName'),
    lppId: optionalString(record.lppId, 'authSession.lppId'),
    membershipRole: optionalPositiveNumber(record.membershipRole, 'authSession.membershipRole'),
    platformRefreshToken: optionalString(
      record.platformRefreshToken,
      'authSession.platformRefreshToken',
    ),
    platformToken: optionalString(record.platformToken, 'authSession.platformToken'),
    platformUserId: optionalString(record.platformUserId, 'authSession.platformUserId'),
    refreshToken: optionalString(record.refreshToken, 'authSession.refreshToken'),
    roleLabel: optionalString(record.roleLabel, 'authSession.roleLabel'),
    tenantCode: optionalString(record.tenantCode, 'authSession.tenantCode'),
    tenantId: optionalString(record.tenantId, 'authSession.tenantId'),
    tenantLogoUrl: optionalNullableString(record.tenantLogoUrl, 'authSession.tenantLogoUrl'),
    tenantName: optionalString(record.tenantName, 'authSession.tenantName'),
    tenantToken: safeString(record.tenantToken, 'authSession.tenantToken'),
    tenants: Array.isArray(record.tenants) ? record.tenants.slice(0, 200) : undefined,
    userId: optionalString(record.userId, 'authSession.userId'),
    userType: optionalPositiveNumber(record.userType, 'authSession.userType'),
    spaceType: optionalPositiveNumber(record.spaceType, 'authSession.spaceType'),
  };
}

export function validateTrayStatus(value: unknown): TrayStatus {
  const status = safeString(value, 'tray.status') as TrayStatus;
  if (!trayStatuses.has(status)) throw new Error(`Invalid tray status: ${status}`);
  return status;
}

function validateOpenDownloadedFilePayload(value: unknown): Omit<CacheMediaFilePayload, 'kind'> {
  const record = objectValue(value, 'downloadedFile.payload');
  return {
    accountId: optionalString(record.accountId, 'downloadedFile.accountId'),
    authToken: optionalString(record.authToken, 'downloadedFile.authToken'),
    conversationId: optionalString(record.conversationId, 'downloadedFile.conversationId'),
    fileName: safeString(record.fileName, 'downloadedFile.fileName'),
    url: safeString(record.url, 'downloadedFile.url'),
  };
}

function validateCopyImageFromUrlPayload(value: unknown) {
  const record = objectValue(value, 'copyImage.payload');
  return {
    accountId: optionalString(record.accountId, 'copyImage.accountId'),
    authToken: optionalString(record.authToken, 'copyImage.authToken'),
    conversationId: optionalString(record.conversationId, 'copyImage.conversationId'),
    fileName: optionalString(record.fileName, 'copyImage.fileName'),
    url: safeString(record.url, 'copyImage.url'),
  };
}

function objectValue(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function safeString(value: unknown, label: string, maxLength = maxShortTextLength) {
  if (typeof value !== 'string') throw new Error(`${label} must be a string`);
  if (value.length > maxLength) throw new Error(`${label} is too long`);
  if (value.includes('\0')) throw new Error(`${label} contains invalid characters`);
  return value;
}

function safeRequiredString(value: unknown, label: string, maxLength = maxShortTextLength) {
  const text = safeString(value, label, maxLength);
  if (!text.trim()) throw new Error(`${label} must be a non-empty string`);
  return text;
}

function validateSourceBytes(value: unknown) {
  if (value instanceof Uint8Array) {
    if (value.byteLength <= 0) throw new Error('media.sourceBytes must be non-empty');
    return value;
  }
  if (value instanceof ArrayBuffer) {
    if (value.byteLength <= 0) throw new Error('media.sourceBytes must be non-empty');
    return value;
  }
  if (ArrayBuffer.isView(value)) {
    const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    if (bytes.byteLength <= 0) throw new Error('media.sourceBytes must be non-empty');
    return bytes;
  }
  throw new Error('media.sourceBytes must be bytes');
}

function optionalString(value: unknown, label: string, maxLength = maxShortTextLength) {
  if (value === undefined || value === null) return undefined;
  return safeString(value, label, maxLength);
}

function optionalProfileId(value: unknown, label: string) {
  const text = safeString(value, label, 64).trim();
  if (!text) return undefined;
  if (!/^[A-Za-z0-9._-]+$/.test(text)) {
    throw new Error(`${label} must use letters, numbers, dot, underscore or dash`);
  }
  return text;
}

function optionalNullableString(value: unknown, label: string, maxLength = maxShortTextLength) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return safeString(value, label, maxLength);
}

function safeExternalUrl(value: unknown, label: string) {
  const url = safeString(value, label);
  try {
    const protocol = new URL(url).protocol;
    if (protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:' || protocol === 'tel:') {
      return url;
    }
  } catch {
    // handled below
  }
  throw new Error(`${label} protocol is not allowed`);
}

function optionalPositiveNumber(value: unknown, label: string) {
  if (value === undefined || value === null) return undefined;
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw new Error(`${label} must be a positive number`);
  }
  return numberValue;
}

function stringArray(value: unknown, label: string) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value.slice(0, maxDiagnosticsItems).map((item, index) =>
    safeString(item, `${label}.${index}`),
  );
}

function errorArray(value: unknown, label: string): DiagnosticsPayload['errors'] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value.slice(0, maxDiagnosticsItems).map((item, index) => {
    const record = objectValue(item, `${label}.${index}`);
    return {
      at: safeString(record.at, `${label}.${index}.at`),
      message: safeString(record.message, `${label}.${index}.message`),
      requestId: optionalString(record.requestId, `${label}.${index}.requestId`),
    };
  });
}

function validateDiagnosticsModules(
  value: unknown,
): Record<string, DiagnosticsModuleSnapshot> | undefined {
  if (value === undefined || value === null) return undefined;
  const record = objectValue(value, 'diagnostics.modules');
  return Object.fromEntries(
    Object.entries(record).slice(0, maxDiagnosticsModules).map(([moduleName, moduleValue]) => [
      safeString(moduleName, 'diagnostics.moduleName', 128),
      validateDiagnosticsModuleSnapshot(moduleValue, `diagnostics.${moduleName}`),
    ]),
  );
}

function validateDiagnosticsModuleSnapshot(
  value: unknown,
  label: string,
): DiagnosticsModuleSnapshot {
  const record = objectValue(value, label);
  const records = Array.isArray(record.records) ? record.records : [];
  return {
    recordCount: optionalPositiveNumber(record.recordCount, `${label}.recordCount`) ?? records.length,
    truncated: typeof record.truncated === 'boolean' ? record.truncated : undefined,
    records: records.slice(0, maxDiagnosticsItems).map((entry, index) =>
      sanitizeDiagnosticsJsonValue(entry, `${label}.records.${index}`),
    ),
  };
}

function sanitizeDiagnosticsJsonValue(
  value: unknown,
  label: string,
  depth = 0,
): DiagnosticsJsonValue {
  if (depth > maxDiagnosticsDepth) return '[truncated-depth]';
  if (value === null) return null;
  if (typeof value === 'string') return redactDiagnosticsString('', safeString(value, label));
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
    return value;
  }
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    return value
      .slice(0, maxDiagnosticsItems)
      .map((item, index) => sanitizeDiagnosticsJsonValue(item, `${label}.${index}`, depth + 1));
  }
  if (typeof value === 'object' && value) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, maxDiagnosticsObjectEntries)
        .map(([key, entry]) => {
          const safeKey = safeString(key, `${label}.key`, 128);
          return [
            safeKey,
            sensitiveDiagnosticsKeyPattern.test(safeKey)
              ? '[redacted]'
              : sanitizeDiagnosticsJsonValue(entry, `${label}.${safeKey}`, depth + 1),
          ];
        }),
    );
  }
  return String(value);
}

function redactDiagnosticsString(key: string, value: string) {
  if (sensitiveDiagnosticsKeyPattern.test(key)) return '[redacted]';
  return value.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer ***');
}
