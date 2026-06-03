import type {
  DesktopApi,
  DesktopApiMethod,
  CsRoutingDiagnosticPayload,
  DiagnosticsPayload,
  MessageReminderDiagnosticPayload,
  NotificationClickedPayload,
  TaskbarBadgePayload,
  NotifyPayload,
  TrayStatus,
} from '../shared/desktop-api.js';

const { contextBridge, ipcRenderer, webUtils } = require('electron') as typeof import('electron');

type DesktopApiValidationModule = typeof import('../shared/desktop-api-validation.js');

let validationModulePromise: Promise<DesktopApiValidationModule> | null = null;

async function validatedInvoke(
  method: DesktopApiMethod,
  channel: string,
  ...args: unknown[]
) {
  const validatedArgs = await validateDesktopApiCall(method, args);
  return ipcRenderer.invoke(channel, ...validatedArgs);
}

async function validateDesktopApiCall(method: DesktopApiMethod, args: unknown[]) {
  validationModulePromise ??= import('../shared/desktop-api-validation.js');
  const validationModule = await validationModulePromise;
  return validationModule.validateDesktopApiCall(method, args);
}

const desktopApi: DesktopApi = {
  notify: (payload: NotifyPayload) => validatedInvoke('notify', 'desktop:notify', payload),
  onNotificationClicked: (callback: (payload: NotificationClickedPayload) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: NotificationClickedPayload) => {
      callback(payload);
    };
    ipcRenderer.on('desktop:notification-clicked', handler);
    return () => {
      ipcRenderer.removeListener('desktop:notification-clicked', handler);
    };
  },
  openFile: (path: string) => validatedInvoke('openFile', 'desktop:open-file', path),
  cacheMediaFile: (payload) => validatedInvoke('cacheMediaFile', 'desktop:cache-media-file', payload),
  cacheLocalMediaFile: async (payload, file) => {
    const validatedArgs = await validateDesktopApiCall('cacheLocalMediaFile', [payload]);
    const sourcePath = webUtils.getPathForFile(
      file as Parameters<typeof webUtils.getPathForFile>[0],
    );
    if (sourcePath) {
      return ipcRenderer.invoke(
        'desktop:cache-local-media-file',
        ...validatedArgs,
        { kind: 'path', sourcePath },
      );
    }
    const blob = file as Blob | undefined;
    if (!blob?.arrayBuffer) throw new Error('无法读取本地媒体文件内容');
    const bytes = await blob.arrayBuffer();
    if (bytes.byteLength <= 0) throw new Error('本地媒体文件为空');
    return ipcRenderer.invoke(
      'desktop:cache-local-media-file',
      ...validatedArgs,
      { kind: 'bytes', bytes },
    );
  },
  getCachedMediaStatus: (payload) =>
    validatedInvoke('getCachedMediaStatus', 'desktop:get-cached-media-status', payload),
  cacheMediaPoster: (payload) =>
    validatedInvoke('cacheMediaPoster', 'desktop:cache-media-poster', payload),
  openVideoPlayer: (payload) =>
    validatedInvoke('openVideoPlayer', 'desktop:open-video-player', payload),
  openDownloadedFile: (payload) =>
    validatedInvoke('openDownloadedFile', 'desktop:open-downloaded-file', payload),
  openMediaFile: (payload) => validatedInvoke('openMediaFile', 'desktop:open-media-file', payload),
  editMediaFile: (payload) => validatedInvoke('editMediaFile', 'desktop:edit-media-file', payload),
  copyMediaFile: (payload) => validatedInvoke('copyMediaFile', 'desktop:copy-media-file', payload),
  copyFilePath: (path: string) => validatedInvoke('copyFilePath', 'desktop:copy-file-path', path),
  saveMediaAs: (payload) => validatedInvoke('saveMediaAs', 'desktop:save-media-as', payload),
  revealMediaInFolder: (payload) =>
    validatedInvoke('revealMediaInFolder', 'desktop:reveal-media-in-folder', payload),
  copyImageFromUrl: (payload) =>
    validatedInvoke('copyImageFromUrl', 'desktop:copy-image-from-url', payload),
  saveFile: (defaultName: string, content: string) =>
    validatedInvoke('saveFile', 'desktop:save-file', defaultName, content),
  saveChatArchiveFile: (payload) =>
    validatedInvoke('saveChatArchiveFile', 'desktop:save-chat-archive-file', payload),
  openChatArchiveFile: () =>
    validatedInvoke('openChatArchiveFile', 'desktop:open-chat-archive-file'),
  openExternal: (url: string) => validatedInvoke('openExternal', 'desktop:open-external', url),
  readAuthSession: () => validatedInvoke('readAuthSession', 'desktop:read-auth-session'),
  saveAuthSession: (payload) =>
    validatedInvoke('saveAuthSession', 'desktop:save-auth-session', payload),
  clearAuthSession: () => validatedInvoke('clearAuthSession', 'desktop:clear-auth-session'),
  openAppProfile: (profileId?: string) =>
    validatedInvoke('openAppProfile', 'desktop:open-app-profile', profileId),
  getAppInstanceProfile: () =>
    validatedInvoke('getAppInstanceProfile', 'desktop:get-app-instance-profile'),
  getLaunchAtStartup: () =>
    validatedInvoke('getLaunchAtStartup', 'desktop:get-launch-at-startup'),
  setLaunchAtStartup: (enabled: boolean) =>
    validatedInvoke('setLaunchAtStartup', 'desktop:set-launch-at-startup', enabled),
  getMinimizeToTray: () =>
    validatedInvoke('getMinimizeToTray', 'desktop:get-minimize-to-tray'),
  setMinimizeToTray: (enabled: boolean) =>
    validatedInvoke('setMinimizeToTray', 'desktop:set-minimize-to-tray', enabled),
  captureScreenshot: () => validatedInvoke('captureScreenshot', 'desktop:capture-screenshot'),
  getAppVersion: () => validatedInvoke('getAppVersion', 'desktop:get-app-version'),
  exportDiagnostics: (payload: DiagnosticsPayload) =>
    validatedInvoke('exportDiagnostics', 'desktop:export-diagnostics', payload),
  recordCsRoutingDiagnostic: (payload: CsRoutingDiagnosticPayload) =>
    validatedInvoke('recordCsRoutingDiagnostic', 'desktop:record-cs-routing-diagnostic', payload),
  recordMessageReminderDiagnostic: (payload: MessageReminderDiagnosticPayload) =>
    validatedInvoke(
      'recordMessageReminderDiagnostic',
      'desktop:record-message-reminder-diagnostic',
      payload,
    ),
  setTaskbarBadge: (payload: TaskbarBadgePayload) =>
    validatedInvoke('setTaskbarBadge', 'desktop:set-taskbar-badge', payload),
  setTrayStatus: (status: TrayStatus) =>
    validatedInvoke('setTrayStatus', 'desktop:set-tray-status', status),
};

contextBridge.exposeInMainWorld('desktopApi', desktopApi);
