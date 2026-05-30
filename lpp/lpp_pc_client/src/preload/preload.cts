import type {
  DesktopApi,
  DesktopApiMethod,
  DiagnosticsPayload,
  NotifyPayload,
  TrayStatus,
} from '../shared/desktop-api.js';

const { contextBridge, ipcRenderer } = require('electron') as typeof import('electron');

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
  openFile: (path: string) => validatedInvoke('openFile', 'desktop:open-file', path),
  cacheMediaFile: (payload) => validatedInvoke('cacheMediaFile', 'desktop:cache-media-file', payload),
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
  openExternal: (url: string) => validatedInvoke('openExternal', 'desktop:open-external', url),
  readAuthSession: () => validatedInvoke('readAuthSession', 'desktop:read-auth-session'),
  saveAuthSession: (payload) =>
    validatedInvoke('saveAuthSession', 'desktop:save-auth-session', payload),
  clearAuthSession: () => validatedInvoke('clearAuthSession', 'desktop:clear-auth-session'),
  captureScreenshot: () => validatedInvoke('captureScreenshot', 'desktop:capture-screenshot'),
  getAppVersion: () => validatedInvoke('getAppVersion', 'desktop:get-app-version'),
  exportDiagnostics: (payload: DiagnosticsPayload) =>
    validatedInvoke('exportDiagnostics', 'desktop:export-diagnostics', payload),
  setTrayStatus: (status: TrayStatus) =>
    validatedInvoke('setTrayStatus', 'desktop:set-tray-status', status),
};

contextBridge.exposeInMainWorld('desktopApi', desktopApi);
