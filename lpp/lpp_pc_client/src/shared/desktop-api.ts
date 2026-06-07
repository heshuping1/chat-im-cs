import type {
  LocalDataListMessagesPayload,
  LocalDataClearScopePayload,
  LocalDataCustomerServiceThreadSnapshot,
  LocalDataDeleteMessagePayload,
  LocalDataDeleteOutboxPayload,
  LocalDataGetMediaVariantPayload,
  LocalDataListCustomerServiceThreadsPayload,
  LocalDataListOutboxPayload,
  LocalDataMediaVariantProjection,
  LocalDataMessage,
  LocalDataCleanupPayload,
  LocalDataCleanupResult,
  LocalDataOutboxRecord,
  LocalDataRepairPayload,
  LocalDataRepairResult,
  LocalDataSearchMessagesPayload,
  LocalDataStorageStats,
  LocalDataStorageStatsPayload,
  LocalDataUpsertCustomerServiceThreadPayload,
  LocalDataUpsertMediaPayload,
  LocalDataUpsertMessagesPayload,
  LocalDataUpsertOutboxPayload,
} from './local-data-contract.js';

export type TrayStatus = 'online' | 'busy' | 'away' | 'invisible';

export type DesktopNotificationTargetModule =
  | 'messages'
  | 'onlineService'
  | 'contacts';

export type DesktopNotificationChannel = 'im' | 'serviceQueue' | 'sla';

export interface NotifyPayload {
  title: string;
  body: string;
  conversationId?: string;
  channel?: DesktopNotificationChannel;
  iconDataUrl?: string | null;
  silent?: boolean;
  targetId?: string;
  targetModule?: DesktopNotificationTargetModule;
}

export interface NotificationClickedPayload {
  conversationId?: string;
  channel?: DesktopNotificationChannel;
  targetId?: string;
  targetModule?: DesktopNotificationTargetModule;
}

export interface TaskbarBadgePayload {
  count: number;
  urgent?: boolean;
}

export type DiagnosticsJsonValue =
  | string
  | number
  | boolean
  | null
  | DiagnosticsJsonValue[]
  | { [key: string]: DiagnosticsJsonValue };

export interface DiagnosticsModuleSnapshot {
  recordCount: number;
  truncated?: boolean;
  records: DiagnosticsJsonValue[];
}

export interface DiagnosticsPayload {
  sessionId: string;
  traceId: string;
  generatedAt?: string;
  breadcrumbs: string[];
  errors: Array<{
    at: string;
    message: string;
    requestId?: string;
  }>;
  diagnostics?: Record<string, DiagnosticsModuleSnapshot>;
}

export interface CsRoutingDiagnosticPayload {
  at: string;
  event: string;
  source: string;
  phase: string;
  route?: string;
  classification?: DiagnosticsJsonValue;
  summary?: DiagnosticsJsonValue;
}

export interface MessageReminderDiagnosticPayload {
  at: string;
  event: string;
  source: string;
  phase: string;
  route?: string;
  classification?: DiagnosticsJsonValue;
  summary?: DiagnosticsJsonValue;
}

export interface ApiTrafficDiagnosticPayload {
  at: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  event: string;
  source: string;
  traceId: string;
  module: 'api-traffic';
  phase: 'request' | 'upload';
  result: 'success' | 'failed';
  route?: string;
  timestamp: number;
  method: string;
  path: string;
  status?: number;
  durationMs: number;
  requestId?: string;
  content?: DiagnosticsJsonValue;
  request?: DiagnosticsJsonValue;
  response?: DiagnosticsJsonValue;
  error?: DiagnosticsJsonValue;
}

export type AppLogLevel = 'debug' | 'info' | 'warn' | 'error';
export type AppLogModule = 'main' | 'auth' | 'api';
export type AppLogResult = 'ok' | 'degraded' | 'ignored' | 'invalid' | 'failed';

export interface AppLogPayload {
  module: AppLogModule;
  event: string;
  phase: string;
  result: AppLogResult;
  level?: AppLogLevel;
  traceId?: string;
  occurredAt?: string;
  reason?: string;
  context?: DiagnosticsJsonValue;
  error?: DiagnosticsJsonValue;
}

export interface DesktopAuthSessionPayload {
  apiBaseUrl: string;
  adminBaseUrl?: string;
  tenantToken: string;
  platformToken?: string;
  platformRefreshToken?: string;
  refreshToken?: string;
  tenantId?: string;
  tenantCode?: string;
  tenantName?: string;
  tenantLogoUrl?: string | null;
  userId?: string;
  platformUserId?: string;
  lppId?: string;
  displayName: string;
  avatarUrl?: string | null;
  userType?: number;
  membershipRole?: number;
  spaceType?: number;
  roleLabel?: string;
  tenants?: unknown[];
}

export interface AppInstanceProfilePayload {
  profileId: string | null;
  profileName: string;
  clientInstanceId: string;
  deviceId: string;
}

export interface ScreenshotCaptureResult {
  dataUrl: string;
  fileName: string;
}

export interface CachedMediaFileResult {
  filePath: string;
  fileUrl: string;
}

export interface CacheMediaFilePayload {
  url: string;
  fileName: string;
  kind: 'image' | 'video' | 'file';
  authToken?: string;
  cacheIdentity?: string;
  accountId?: string;
  conversationId?: string;
}

export type LocalMediaCacheSource =
  | { kind: 'path'; sourcePath: string }
  | { kind: 'bytes'; bytes: ArrayBuffer | Uint8Array };

export interface CacheMediaPosterPayload extends CacheMediaFilePayload {
  dataUrl: string;
}

export type CachedMediaStatus = 'not_cached' | 'caching' | 'cached' | 'failed';

export interface VideoPlayerPayload extends CacheMediaFilePayload {
  title?: string;
  posterUrl?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  sizeBytes?: number;
}

export type ChatArchiveFileKind = 'export' | 'backup';

export interface ChatArchiveFilePayload {
  kind: ChatArchiveFileKind;
  defaultName: string;
  content: string;
}

export interface ChatArchiveFileResult {
  kind: ChatArchiveFileKind;
  fileName: string;
  filePath: string;
  content: string;
}

export type ClientUpdateChannel = 'stable' | 'beta';
export type UpdateDownloadMode = 'differential-first';
export type ClientUpdateKind = 'delta' | 'full';
export type ClientUpdatePhase =
  | 'idle'
  | 'checking'
  | 'latest'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'installing'
  | 'error';

export interface ClientUpdatePreferences {
  autoCheck: boolean;
  channel: ClientUpdateChannel;
  downloadMode: UpdateDownloadMode;
}

export interface ClientUpdatePackageInfo {
  updateKind: ClientUpdateKind;
  version: string;
  force: boolean;
  releaseNotes?: string;
  packageUrl?: string;
  latestYmlUrl?: string;
  sha512?: string;
  sizeBytes?: number;
  fallbackFullPackageUrl?: string;
  fallbackSha512?: string;
  publishedAt?: string;
}

export interface ClientUpdateProgress {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

export interface ClientUpdateState {
  phase: ClientUpdatePhase;
  currentVersion: string;
  preferences: ClientUpdatePreferences;
  available?: ClientUpdatePackageInfo;
  progress?: ClientUpdateProgress;
  error?: string;
  checkedAt?: string;
}

export const desktopUpdateStateChangedChannel = 'desktop:update-state-changed';

export interface DesktopApi {
  notify(payload: NotifyPayload): Promise<void>;
  onNotificationClicked(callback: (payload: NotificationClickedPayload) => void): () => void;
  openFile(path: string): Promise<void>;
  cacheMediaFile(payload: CacheMediaFilePayload): Promise<CachedMediaFileResult>;
  cacheLocalMediaFile(payload: CacheMediaFilePayload, file: unknown): Promise<CachedMediaFileResult>;
  getCachedMediaStatus(payload: CacheMediaFilePayload): Promise<CachedMediaStatus>;
  readMediaFileAsDataUrl(payload: CacheMediaFilePayload): Promise<string>;
  cacheMediaPoster(payload: CacheMediaPosterPayload): Promise<CachedMediaFileResult>;
  openVideoPlayer(payload: VideoPlayerPayload): Promise<string>;
  openDownloadedFile(payload: Omit<CacheMediaFilePayload, 'kind'>): Promise<string>;
  openMediaFile(payload: CacheMediaFilePayload): Promise<string>;
  editMediaFile(payload: CacheMediaFilePayload): Promise<string>;
  copyMediaFile(payload: CacheMediaFilePayload): Promise<string>;
  copyFilePath(path: string): Promise<string>;
  saveMediaAs(payload: CacheMediaFilePayload): Promise<string | null>;
  revealMediaInFolder(payload: CacheMediaFilePayload): Promise<string>;
  copyImageFromUrl(payload: {
    url: string;
    fileName?: string;
    authToken?: string;
    accountId?: string;
    conversationId?: string;
  }): Promise<void>;
  saveFile(defaultName: string, content: string): Promise<string | null>;
  saveChatArchiveFile(payload: ChatArchiveFilePayload): Promise<string | null>;
  openChatArchiveFile(): Promise<ChatArchiveFileResult | null>;
  openExternal(url: string): Promise<void>;
  readAuthSession(): Promise<DesktopAuthSessionPayload | null>;
  saveAuthSession(payload: DesktopAuthSessionPayload): Promise<void>;
  clearAuthSession(): Promise<void>;
  openAppProfile(profileId?: string): Promise<void>;
  getAppInstanceProfile(): Promise<AppInstanceProfilePayload>;
  getLaunchAtStartup(): Promise<boolean>;
  setLaunchAtStartup(enabled: boolean): Promise<boolean>;
  getMinimizeToTray(): Promise<boolean>;
  setMinimizeToTray(enabled: boolean): Promise<boolean>;
  getUpdatePreferences(): Promise<ClientUpdatePreferences>;
  setUpdatePreferences(payload: ClientUpdatePreferences): Promise<ClientUpdatePreferences>;
  getUpdateState(): Promise<ClientUpdateState>;
  checkForUpdates(): Promise<ClientUpdateState>;
  downloadUpdate(): Promise<ClientUpdateState>;
  installUpdate(): Promise<void>;
  onUpdateStateChanged(callback: (payload: ClientUpdateState) => void): () => void;
  quitApp(): Promise<void>;
  captureScreenshot(): Promise<ScreenshotCaptureResult>;
  getAppVersion(): Promise<string>;
  exportDiagnostics(payload: DiagnosticsPayload): Promise<string | null>;
  writeAppLog(payload: AppLogPayload): Promise<void>;
  recordApiTrafficDiagnostic(payload: ApiTrafficDiagnosticPayload): Promise<void>;
  recordCsRoutingDiagnostic(payload: CsRoutingDiagnosticPayload): Promise<void>;
  recordMessageReminderDiagnostic(payload: MessageReminderDiagnosticPayload): Promise<void>;
  setTaskbarBadge(payload: TaskbarBadgePayload): Promise<void>;
  setTrayStatus(status: TrayStatus): Promise<void>;
  localDataListMessages(payload: LocalDataListMessagesPayload): Promise<LocalDataMessage[]>;
  localDataSearchMessages(payload: LocalDataSearchMessagesPayload): Promise<LocalDataMessage[]>;
  localDataUpsertMessages(payload: LocalDataUpsertMessagesPayload): Promise<void>;
  localDataDeleteMessage(payload: LocalDataDeleteMessagePayload): Promise<void>;
  localDataClearScope(payload: LocalDataClearScopePayload): Promise<void>;
  localDataGetStorageStats(payload: LocalDataStorageStatsPayload): Promise<LocalDataStorageStats>;
  localDataCleanup(payload: LocalDataCleanupPayload): Promise<LocalDataCleanupResult>;
  localDataUpsertMedia(payload: LocalDataUpsertMediaPayload): Promise<void>;
  localDataGetMediaVariant(payload: LocalDataGetMediaVariantPayload): Promise<LocalDataMediaVariantProjection | null>;
  localDataUpsertOutbox(payload: LocalDataUpsertOutboxPayload): Promise<void>;
  localDataListOutbox(payload: LocalDataListOutboxPayload): Promise<LocalDataOutboxRecord[]>;
  localDataDeleteOutbox(payload: LocalDataDeleteOutboxPayload): Promise<void>;
  localDataUpsertCustomerServiceThread(payload: LocalDataUpsertCustomerServiceThreadPayload): Promise<void>;
  localDataListCustomerServiceThreads(payload: LocalDataListCustomerServiceThreadsPayload): Promise<LocalDataCustomerServiceThreadSnapshot[]>;
  localDataRepair(payload: LocalDataRepairPayload): Promise<LocalDataRepairResult>;
}

export type DesktopApiMethod = Exclude<
  keyof DesktopApi,
  'onNotificationClicked' | 'onUpdateStateChanged'
>;

export const desktopIpcChannelByMethod = {
  cacheLocalMediaFile: 'desktop:cache-local-media-file',
  cacheMediaFile: 'desktop:cache-media-file',
  cacheMediaPoster: 'desktop:cache-media-poster',
  captureScreenshot: 'desktop:capture-screenshot',
  clearAuthSession: 'desktop:clear-auth-session',
  copyFilePath: 'desktop:copy-file-path',
  copyImageFromUrl: 'desktop:copy-image-from-url',
  copyMediaFile: 'desktop:copy-media-file',
  editMediaFile: 'desktop:edit-media-file',
  exportDiagnostics: 'desktop:export-diagnostics',
  getAppVersion: 'desktop:get-app-version',
  getLaunchAtStartup: 'desktop:get-launch-at-startup',
  getMinimizeToTray: 'desktop:get-minimize-to-tray',
  getUpdatePreferences: 'desktop:get-update-preferences',
  setUpdatePreferences: 'desktop:set-update-preferences',
  getUpdateState: 'desktop:get-update-state',
  checkForUpdates: 'desktop:check-for-updates',
  downloadUpdate: 'desktop:download-update',
  installUpdate: 'desktop:install-update',
  getCachedMediaStatus: 'desktop:get-cached-media-status',
  localDataClearScope: 'desktop:local-data-clear-scope',
  localDataCleanup: 'desktop:local-data-cleanup',
  localDataDeleteMessage: 'desktop:local-data-delete-message',
  localDataDeleteOutbox: 'desktop:local-data-delete-outbox',
  localDataGetMediaVariant: 'desktop:local-data-get-media-variant',
  localDataGetStorageStats: 'desktop:local-data-get-storage-stats',
  localDataListCustomerServiceThreads: 'desktop:local-data-list-customer-service-threads',
  localDataListMessages: 'desktop:local-data-list-messages',
  localDataListOutbox: 'desktop:local-data-list-outbox',
  localDataRepair: 'desktop:local-data-repair',
  localDataSearchMessages: 'desktop:local-data-search-messages',
  localDataUpsertCustomerServiceThread: 'desktop:local-data-upsert-customer-service-thread',
  localDataUpsertMedia: 'desktop:local-data-upsert-media',
  localDataUpsertMessages: 'desktop:local-data-upsert-messages',
  localDataUpsertOutbox: 'desktop:local-data-upsert-outbox',
  readMediaFileAsDataUrl: 'desktop:read-media-file-as-data-url',
  notify: 'desktop:notify',
  quitApp: 'desktop:quit-app',
  getAppInstanceProfile: 'desktop:get-app-instance-profile',
  openDownloadedFile: 'desktop:open-downloaded-file',
  openChatArchiveFile: 'desktop:open-chat-archive-file',
  openAppProfile: 'desktop:open-app-profile',
  openExternal: 'desktop:open-external',
  openFile: 'desktop:open-file',
  openMediaFile: 'desktop:open-media-file',
  openVideoPlayer: 'desktop:open-video-player',
  readAuthSession: 'desktop:read-auth-session',
  writeAppLog: 'desktop:write-app-log',
  recordApiTrafficDiagnostic: 'desktop:record-api-traffic-diagnostic',
  recordCsRoutingDiagnostic: 'desktop:record-cs-routing-diagnostic',
  recordMessageReminderDiagnostic: 'desktop:record-message-reminder-diagnostic',
  revealMediaInFolder: 'desktop:reveal-media-in-folder',
  saveAuthSession: 'desktop:save-auth-session',
  saveChatArchiveFile: 'desktop:save-chat-archive-file',
  saveFile: 'desktop:save-file',
  saveMediaAs: 'desktop:save-media-as',
  setTaskbarBadge: 'desktop:set-taskbar-badge',
  setLaunchAtStartup: 'desktop:set-launch-at-startup',
  setMinimizeToTray: 'desktop:set-minimize-to-tray',
  setTrayStatus: 'desktop:set-tray-status',
} as const satisfies Record<DesktopApiMethod, `desktop:${string}`>;

export type DesktopIpcChannel = (typeof desktopIpcChannelByMethod)[DesktopApiMethod];

declare global {
  interface Window {
    desktopApi?: DesktopApi;
  }
}
