import type {
  DesktopApi,
  DesktopApiMethod,
  ClientUpdatePreferences,
  ClientUpdateState,
  AppLogPayload,
  ApiTrafficDiagnosticPayload,
  CsRoutingDiagnosticPayload,
  DiagnosticsPayload,
  MessageReminderDiagnosticPayload,
  NotificationClickedPayload,
  TaskbarBadgePayload,
  NotifyPayload,
  TrayStatus,
} from '../shared/desktop-api.js';

const { contextBridge, ipcRenderer, webUtils } = require('electron') as typeof import('electron');
const desktopUpdateStateChangedChannel = 'desktop:update-state-changed';

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
  onUpdateStateChanged: (callback: (payload: ClientUpdateState) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: ClientUpdateState) => {
      callback(payload);
    };
    ipcRenderer.on(desktopUpdateStateChangedChannel, handler);
    return () => {
      ipcRenderer.removeListener(desktopUpdateStateChangedChannel, handler);
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
  readMediaFileAsDataUrl: (payload) =>
    validatedInvoke('readMediaFileAsDataUrl', 'desktop:read-media-file-as-data-url', payload),
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
  saveAndRevealFile: (payload) =>
    validatedInvoke('saveAndRevealFile', 'desktop:save-and-reveal-file', payload),
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
  getUpdatePreferences: () =>
    validatedInvoke('getUpdatePreferences', 'desktop:get-update-preferences'),
  setUpdatePreferences: (payload: ClientUpdatePreferences) =>
    validatedInvoke('setUpdatePreferences', 'desktop:set-update-preferences', payload),
  getUpdateState: () => validatedInvoke('getUpdateState', 'desktop:get-update-state'),
  checkForUpdates: () => validatedInvoke('checkForUpdates', 'desktop:check-for-updates'),
  downloadUpdate: () => validatedInvoke('downloadUpdate', 'desktop:download-update'),
  installUpdate: () => validatedInvoke('installUpdate', 'desktop:install-update'),
  quitApp: () => validatedInvoke('quitApp', 'desktop:quit-app'),
  captureScreenshot: () => validatedInvoke('captureScreenshot', 'desktop:capture-screenshot'),
  getAppVersion: () => validatedInvoke('getAppVersion', 'desktop:get-app-version'),
  exportDiagnostics: (payload: DiagnosticsPayload) =>
    validatedInvoke('exportDiagnostics', 'desktop:export-diagnostics', payload),
  writeAppLog: (payload: AppLogPayload) =>
    validatedInvoke('writeAppLog', 'desktop:write-app-log', payload),
  recordApiTrafficDiagnostic: (payload: ApiTrafficDiagnosticPayload) =>
    validatedInvoke('recordApiTrafficDiagnostic', 'desktop:record-api-traffic-diagnostic', payload),
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
  localDataClearScope: (payload) =>
    validatedInvoke('localDataClearScope', 'desktop:local-data-clear-scope', payload),
  localDataCleanup: (payload) =>
    validatedInvoke('localDataCleanup', 'desktop:local-data-cleanup', payload),
  localDataDeleteMessage: (payload) =>
    validatedInvoke('localDataDeleteMessage', 'desktop:local-data-delete-message', payload),
  localDataDeleteOutbox: (payload) =>
    validatedInvoke('localDataDeleteOutbox', 'desktop:local-data-delete-outbox', payload),
  localDataGetMediaVariant: (payload) =>
    validatedInvoke('localDataGetMediaVariant', 'desktop:local-data-get-media-variant', payload),
  localDataGetStorageStats: (payload) =>
    validatedInvoke('localDataGetStorageStats', 'desktop:local-data-get-storage-stats', payload),
  localDataListCustomerServiceThreads: (payload) =>
    validatedInvoke(
      'localDataListCustomerServiceThreads',
      'desktop:local-data-list-customer-service-threads',
      payload,
    ),
  localDataListMessages: (payload) =>
    validatedInvoke('localDataListMessages', 'desktop:local-data-list-messages', payload),
  localDataListOutbox: (payload) =>
    validatedInvoke('localDataListOutbox', 'desktop:local-data-list-outbox', payload),
  localDataRepair: (payload) =>
    validatedInvoke('localDataRepair', 'desktop:local-data-repair', payload),
  localDataSearchMessages: (payload) =>
    validatedInvoke('localDataSearchMessages', 'desktop:local-data-search-messages', payload),
  localDataUpsertCustomerServiceThread: (payload) =>
    validatedInvoke(
      'localDataUpsertCustomerServiceThread',
      'desktop:local-data-upsert-customer-service-thread',
      payload,
    ),
  localDataUpsertMedia: (payload) =>
    validatedInvoke('localDataUpsertMedia', 'desktop:local-data-upsert-media', payload),
  localDataUpsertMessages: (payload) =>
    validatedInvoke('localDataUpsertMessages', 'desktop:local-data-upsert-messages', payload),
  localDataUpsertOutbox: (payload) =>
    validatedInvoke('localDataUpsertOutbox', 'desktop:local-data-upsert-outbox', payload),
};

contextBridge.exposeInMainWorld('desktopApi', desktopApi);
