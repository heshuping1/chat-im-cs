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

export interface DesktopApi {
  notify(payload: NotifyPayload): Promise<void>;
  onNotificationClicked(callback: (payload: NotificationClickedPayload) => void): () => void;
  openFile(path: string): Promise<void>;
  cacheMediaFile(payload: CacheMediaFilePayload): Promise<CachedMediaFileResult>;
  cacheLocalMediaFile(payload: CacheMediaFilePayload, file: unknown): Promise<CachedMediaFileResult>;
  getCachedMediaStatus(payload: CacheMediaFilePayload): Promise<CachedMediaStatus>;
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
  captureScreenshot(): Promise<ScreenshotCaptureResult>;
  getAppVersion(): Promise<string>;
  exportDiagnostics(payload: DiagnosticsPayload): Promise<string | null>;
  recordCsRoutingDiagnostic(payload: CsRoutingDiagnosticPayload): Promise<void>;
  recordMessageReminderDiagnostic(payload: MessageReminderDiagnosticPayload): Promise<void>;
  setTaskbarBadge(payload: TaskbarBadgePayload): Promise<void>;
  setTrayStatus(status: TrayStatus): Promise<void>;
}

export type DesktopApiMethod = Exclude<keyof DesktopApi, 'onNotificationClicked'>;

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
  getCachedMediaStatus: 'desktop:get-cached-media-status',
  notify: 'desktop:notify',
  getAppInstanceProfile: 'desktop:get-app-instance-profile',
  openDownloadedFile: 'desktop:open-downloaded-file',
  openChatArchiveFile: 'desktop:open-chat-archive-file',
  openAppProfile: 'desktop:open-app-profile',
  openExternal: 'desktop:open-external',
  openFile: 'desktop:open-file',
  openMediaFile: 'desktop:open-media-file',
  openVideoPlayer: 'desktop:open-video-player',
  readAuthSession: 'desktop:read-auth-session',
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
