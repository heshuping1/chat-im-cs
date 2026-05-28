export type TrayStatus = 'online' | 'busy' | 'away' | 'invisible';

export interface NotifyPayload {
  title: string;
  body: string;
  conversationId?: string;
}

export interface DiagnosticsPayload {
  sessionId: string;
  traceId: string;
  breadcrumbs: string[];
  errors: Array<{
    at: string;
    message: string;
    requestId?: string;
  }>;
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

export interface CacheMediaPosterPayload extends CacheMediaFilePayload {
  dataUrl: string;
}

export interface DesktopApi {
  notify(payload: NotifyPayload): Promise<void>;
  openFile(path: string): Promise<void>;
  cacheMediaFile(payload: CacheMediaFilePayload): Promise<CachedMediaFileResult>;
  cacheMediaPoster(payload: CacheMediaPosterPayload): Promise<CachedMediaFileResult>;
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
  openExternal(url: string): Promise<void>;
  captureScreenshot(): Promise<ScreenshotCaptureResult>;
  getAppVersion(): Promise<string>;
  exportDiagnostics(payload: DiagnosticsPayload): Promise<string | null>;
  setTrayStatus(status: TrayStatus): Promise<void>;
}

declare global {
  interface Window {
    desktopApi?: DesktopApi;
  }
}
