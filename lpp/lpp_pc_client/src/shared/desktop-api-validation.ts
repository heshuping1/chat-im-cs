import type {
  CacheMediaFilePayload,
  CacheMediaPosterPayload,
  ChatArchiveFileKind,
  ChatArchiveFilePayload,
  ClientUpdateChannel,
  ClientUpdatePreferences,
  UpdateDownloadMode,
  AppLogLevel,
  AppLogModule,
  AppLogPayload,
  AppLogResult,
  ApiTrafficDiagnosticPayload,
  DesktopNotificationChannel,
  DesktopNotificationTargetModule,
  DesktopApiMethod,
  DesktopAuthSessionPayload,
  CsRoutingDiagnosticPayload,
  DiagnosticsJsonValue,
  DiagnosticsModuleSnapshot,
  DiagnosticsPayload,
  LocalMediaCacheSource,
  MessageReminderDiagnosticPayload,
  NotifyPayload,
  TaskbarBadgePayload,
  TrayStatus,
  VideoPlayerPayload,
} from './desktop-api.js';

const maxShortTextLength = 4_096;
const maxSavedContentLength = 5 * 1024 * 1024;
const maxChatArchiveContentLength = 25 * 1024 * 1024;
const maxNotificationIconDataUrlLength = 512 * 1024;
const maxDiagnosticsItems = 200;
const maxDiagnosticsModules = 30;
const maxDiagnosticsObjectEntries = 80;
const maxDiagnosticsDepth = 8;
const maxDataUrlLength = 25 * 1024 * 1024;
const trayStatuses = new Set<TrayStatus>(['online', 'busy', 'away', 'invisible']);
const clientUpdateChannels = new Set<ClientUpdateChannel>(['stable', 'beta']);
const updateDownloadModes = new Set<UpdateDownloadMode>(['differential-first']);
const mediaKinds = new Set<CacheMediaFilePayload['kind']>(['image', 'video', 'file']);
const notificationChannels = new Set<DesktopNotificationChannel>(['im', 'serviceQueue', 'sla']);
const appLogModules = new Set<AppLogModule>(['main', 'auth', 'api']);
const appLogLevels = new Set<AppLogLevel>(['debug', 'info', 'warn', 'error']);
const appLogResults = new Set<AppLogResult>(['ok', 'degraded', 'ignored', 'invalid', 'failed']);
const notificationTargetModules = new Set<DesktopNotificationTargetModule>([
  'contacts',
  'messages',
  'onlineService',
]);
const sensitiveDiagnosticsKeyPattern = /token|password|authorization|secret|credential/i;
const diagnosticsContentKeyPattern = /^(body|content|messageText|rawText)$/i;
const diagnosticsScopeKeyPattern = /^scopeKey$/i;

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
    case 'getLaunchAtStartup':
    case 'getMinimizeToTray':
    case 'getUpdatePreferences':
    case 'getUpdateState':
    case 'checkForUpdates':
    case 'downloadUpdate':
    case 'installUpdate':
    case 'quitApp':
      return [];
    case 'setLaunchAtStartup':
      return [safeBoolean(args[0], 'launchAtStartup.enabled')];
    case 'setMinimizeToTray':
      return [safeBoolean(args[0], 'minimizeToTray.enabled')];
    case 'setUpdatePreferences':
      return [validateClientUpdatePreferences(args[0])];
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
    case 'saveChatArchiveFile':
      return [validateChatArchiveFilePayload(args[0])];
    case 'openChatArchiveFile':
      return [];
    case 'captureScreenshot':
    case 'getAppVersion':
      return [];
    case 'exportDiagnostics':
      return [validateDiagnosticsPayload(args[0])];
    case 'writeAppLog':
      return [validateAppLogPayload(args[0])];
    case 'recordApiTrafficDiagnostic':
      return [validateApiTrafficDiagnosticPayload(args[0])];
    case 'recordCsRoutingDiagnostic':
      return [validateCsRoutingDiagnosticPayload(args[0])];
    case 'recordMessageReminderDiagnostic':
      return [validateMessageReminderDiagnosticPayload(args[0])];
    case 'setTaskbarBadge':
      return [validateTaskbarBadgePayload(args[0])];
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
    channel: optionalNotificationChannel(record.channel, 'notify.channel'),
    conversationId: optionalString(record.conversationId, 'notify.conversationId'),
    iconDataUrl: optionalNotificationIconDataUrl(record.iconDataUrl, 'notify.iconDataUrl'),
    silent: typeof record.silent === 'boolean' ? record.silent : undefined,
    targetId: optionalString(record.targetId, 'notify.targetId'),
    targetModule: optionalNotificationTargetModule(record.targetModule, 'notify.targetModule'),
    title: safeString(record.title, 'notify.title'),
  };
}

export function validateCacheMediaFilePayload(value: unknown): CacheMediaFilePayload {
  const record = objectValue(value, 'media.payload');
  const kind = safeString(record.kind, 'media.kind') as CacheMediaFilePayload['kind'];
  if (!mediaKinds.has(kind)) throw new Error(`Invalid media.kind: ${kind}`);
  const cacheIdentity = optionalString(record.cacheIdentity, 'media.cacheIdentity');
  return {
    accountId: optionalString(record.accountId, 'media.accountId'),
    authToken: optionalString(record.authToken, 'media.authToken'),
    ...(cacheIdentity ? { cacheIdentity } : {}),
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
    adminBaseUrl: optionalString(record.adminBaseUrl, 'authSession.adminBaseUrl'),
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

export function validateCsRoutingDiagnosticPayload(value: unknown): CsRoutingDiagnosticPayload {
  const record = objectValue(value, 'csRouting.payload');
  return {
    at: safeString(record.at, 'csRouting.at', 64),
    event: safeString(record.event, 'csRouting.event', 128),
    source: safeString(record.source, 'csRouting.source', 128),
    phase: safeString(record.phase, 'csRouting.phase', 128),
    route: optionalString(record.route, 'csRouting.route', 128),
    classification:
      record.classification === undefined
        ? undefined
        : sanitizeDiagnosticsJsonValue(record.classification, 'csRouting.classification'),
    summary:
      record.summary === undefined
        ? undefined
        : sanitizeDiagnosticsJsonValue(record.summary, 'csRouting.summary'),
  };
}

export function validateMessageReminderDiagnosticPayload(
  value: unknown,
): MessageReminderDiagnosticPayload {
  const record = objectValue(value, 'messageReminder.payload');
  return {
    at: safeString(record.at, 'messageReminder.at', 64),
    event: safeString(record.event, 'messageReminder.event', 128),
    source: safeString(record.source, 'messageReminder.source', 128),
    phase: safeString(record.phase, 'messageReminder.phase', 128),
    route: optionalString(record.route, 'messageReminder.route', 128),
    classification:
      record.classification === undefined
        ? undefined
        : sanitizeDiagnosticsJsonValue(record.classification, 'messageReminder.classification'),
    summary:
      record.summary === undefined
        ? undefined
        : sanitizeDiagnosticsJsonValue(record.summary, 'messageReminder.summary'),
  };
}

export function validateApiTrafficDiagnosticPayload(value: unknown): ApiTrafficDiagnosticPayload {
  const record = objectValue(value, 'apiTraffic.payload');
  const phase = safeString(record.phase, 'apiTraffic.phase', 32);
  if (phase !== 'request' && phase !== 'upload') {
    throw new Error(`Invalid apiTraffic.phase: ${phase}`);
  }
  const result = safeString(record.result, 'apiTraffic.result', 32);
  if (result !== 'success' && result !== 'failed') {
    throw new Error(`Invalid apiTraffic.result: ${result}`);
  }
  const level = safeString(record.level, 'apiTraffic.level', 32);
  if (level !== 'debug' && level !== 'info' && level !== 'warn' && level !== 'error') {
    throw new Error(`Invalid apiTraffic.level: ${level}`);
  }
  return {
    at: safeString(record.at, 'apiTraffic.at', 64),
    level,
    event: safeString(record.event, 'apiTraffic.event', 128),
    source: safeString(record.source, 'apiTraffic.source', 128),
    traceId: safeString(record.traceId, 'apiTraffic.traceId', 160),
    module: 'api-traffic',
    phase,
    result,
    route: optionalString(record.route, 'apiTraffic.route', 512),
    timestamp: boundedInteger(record.timestamp, 'apiTraffic.timestamp', 0, Number.MAX_SAFE_INTEGER),
    method: safeString(record.method, 'apiTraffic.method', 16),
    path: safeString(record.path, 'apiTraffic.path', 512),
    status: optionalPositiveNumber(record.status, 'apiTraffic.status'),
    durationMs: optionalPositiveNumber(record.durationMs, 'apiTraffic.durationMs') ?? 0,
    requestId: optionalString(record.requestId, 'apiTraffic.requestId', 160),
    content:
      record.content === undefined
        ? undefined
        : sanitizeApiTrafficJsonValue(record.content, 'apiTraffic.content'),
    request:
      record.request === undefined
        ? undefined
        : sanitizeApiTrafficJsonValue(record.request, 'apiTraffic.request'),
    response:
      record.response === undefined
        ? undefined
        : sanitizeApiTrafficJsonValue(record.response, 'apiTraffic.response'),
    error:
      record.error === undefined
        ? undefined
        : sanitizeApiTrafficJsonValue(record.error, 'apiTraffic.error'),
  };
}

export function validateAppLogPayload(value: unknown): AppLogPayload {
  const record = objectValue(value, 'appLog.payload');
  const module = safeString(record.module, 'appLog.module', 32) as AppLogModule;
  if (!appLogModules.has(module)) throw new Error(`Invalid appLog.module: ${module}`);
  const result = safeString(record.result, 'appLog.result', 32) as AppLogResult;
  if (!appLogResults.has(result)) throw new Error(`Invalid appLog.result: ${result}`);
  const level = optionalAppLogLevel(record.level, 'appLog.level');
  return {
    module,
    event: safeRequiredString(record.event, 'appLog.event', 128),
    phase: safeRequiredString(record.phase, 'appLog.phase', 128),
    result,
    level,
    traceId: optionalString(record.traceId, 'appLog.traceId', 160),
    occurredAt: optionalString(record.occurredAt, 'appLog.occurredAt', 64),
    reason: optionalString(record.reason, 'appLog.reason', 512),
    context:
      record.context === undefined
        ? undefined
        : sanitizeDiagnosticsJsonValue(record.context, 'appLog.context'),
    error:
      record.error === undefined
        ? undefined
        : sanitizeDiagnosticsJsonValue(record.error, 'appLog.error'),
  };
}

function optionalAppLogLevel(value: unknown, label: string): AppLogLevel | undefined {
  if (value === undefined || value === null) return undefined;
  const level = safeString(value, label, 32) as AppLogLevel;
  if (!appLogLevels.has(level)) throw new Error(`Invalid ${label}: ${level}`);
  return level;
}

export function validateTaskbarBadgePayload(value: unknown): TaskbarBadgePayload {
  const record = objectValue(value, 'taskbarBadge.payload');
  return {
    count: boundedInteger(record.count, 'taskbarBadge.count', 0, 9999),
    urgent: typeof record.urgent === 'boolean' ? record.urgent : undefined,
  };
}

export function validateChatArchiveFilePayload(value: unknown): ChatArchiveFilePayload {
  const record = objectValue(value, 'chatArchive.payload');
  const kind = safeString(record.kind, 'chatArchive.kind', 32) as ChatArchiveFileKind;
  if (kind !== 'export' && kind !== 'backup') {
    throw new Error(`Invalid chatArchive.kind: ${kind}`);
  }
  const defaultName = safeString(record.defaultName, 'chatArchive.defaultName', 180).trim();
  if (!defaultName || defaultName.includes('/') || defaultName.includes('\\')) {
    throw new Error('chatArchive.defaultName must be a safe file name');
  }
  const expectedExtension = kind === 'backup' ? '.lpp-chat-backup' : '.json';
  if (!defaultName.toLowerCase().endsWith(expectedExtension)) {
    throw new Error(`chatArchive.defaultName must end with ${expectedExtension}`);
  }
  return {
    content: safeString(record.content, 'chatArchive.content', maxChatArchiveContentLength),
    defaultName,
    kind,
  };
}

export function validateClientUpdatePreferences(value: unknown): ClientUpdatePreferences {
  const record = objectValue(value, 'clientUpdate.preferences');
  const channel = safeString(record.channel, 'clientUpdate.channel', 32) as ClientUpdateChannel;
  const downloadMode = safeString(
    record.downloadMode,
    'clientUpdate.downloadMode',
    64,
  ) as UpdateDownloadMode;
  if (!clientUpdateChannels.has(channel)) throw new Error(`Invalid clientUpdate.channel: ${channel}`);
  if (!updateDownloadModes.has(downloadMode)) {
    throw new Error(`Invalid clientUpdate.downloadMode: ${downloadMode}`);
  }
  return {
    autoCheck: safeBoolean(record.autoCheck, 'clientUpdate.autoCheck'),
    channel,
    downloadMode,
  };
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

function safeBoolean(value: unknown, label: string) {
  if (typeof value !== 'boolean') throw new Error(`${label} must be a boolean`);
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

function optionalNotificationChannel(value: unknown, label: string) {
  if (value === undefined || value === null) return undefined;
  const channel = safeString(value, label, 64) as DesktopNotificationChannel;
  if (!notificationChannels.has(channel)) throw new Error(`Invalid ${label}: ${channel}`);
  return channel;
}

function optionalNotificationTargetModule(value: unknown, label: string) {
  if (value === undefined || value === null) return undefined;
  const module = safeString(value, label, 64) as DesktopNotificationTargetModule;
  if (!notificationTargetModules.has(module)) throw new Error(`Invalid ${label}: ${module}`);
  return module;
}

function optionalNotificationIconDataUrl(value: unknown, label: string) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const dataUrl = safeString(value, label, maxNotificationIconDataUrlLength);
  if (!/^data:image\/[a-z0-9.+-]+;base64,/i.test(dataUrl)) {
    throw new Error(`${label} must be a base64 image data URL`);
  }
  return dataUrl;
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

function boundedInteger(value: unknown, label: string, min: number, max: number) {
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue < min || numberValue > max) {
    throw new Error(`${label} must be an integer between ${min} and ${max}`);
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
  if (diagnosticsContentKeyPattern.test(lastLabelSegment(label))) {
    return summarizeDiagnosticsContent(value);
  }
  if (typeof value === 'string') {
    return redactDiagnosticsString(lastLabelSegment(label), safeString(value, label));
  }
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
              : diagnosticsContentKeyPattern.test(safeKey)
                ? summarizeDiagnosticsContent(entry)
              : sanitizeDiagnosticsJsonValue(entry, `${label}.${safeKey}`, depth + 1),
          ];
        }),
    );
  }
  return String(value);
}

function sanitizeApiTrafficJsonValue(
  value: unknown,
  label: string,
  depth = 0,
): DiagnosticsJsonValue {
  if (depth > maxDiagnosticsDepth) return '[truncated-depth]';
  if (value === null) return null;
  if (typeof value === 'string') {
    return redactDiagnosticsString(lastLabelSegment(label), safeString(value, label));
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
    return value;
  }
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    return value
      .slice(0, maxDiagnosticsItems)
      .map((item, index) => sanitizeApiTrafficJsonValue(item, `${label}.${index}`, depth + 1));
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
              : sanitizeApiTrafficJsonValue(entry, `${label}.${safeKey}`, depth + 1),
          ];
        }),
    );
  }
  return String(value);
}

function redactDiagnosticsString(key: string, value: string) {
  if (sensitiveDiagnosticsKeyPattern.test(key)) return '[redacted]';
  if (diagnosticsScopeKeyPattern.test(key)) return summarizeDiagnosticsScopeKey(value);
  if (looksLikeDiagnosticsSensitiveString(value)) return '[redacted]';
  return value.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer ***');
}

function summarizeDiagnosticsContent(value: unknown) {
  if (typeof value === 'string') return `[redacted-content len=${value.length}]`;
  if (value && typeof value === 'object') {
    try {
      return `[redacted-content len=${JSON.stringify(value).length}]`;
    } catch {
      return '[redacted-content]';
    }
  }
  return '[redacted-content]';
}

function summarizeDiagnosticsScopeKey(value: string) {
  return `[scope-key len=${value.length} hash=${hashString(value)}]`;
}

function looksLikeDiagnosticsSensitiveString(value: string) {
  return /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/.test(value);
}

function lastLabelSegment(label: string) {
  const dot = label.lastIndexOf('.');
  return dot >= 0 ? label.slice(dot + 1) : label;
}

function hashString(value: string) {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * prime);
  }
  return hash.toString(16).padStart(16, '0').slice(0, 12);
}
