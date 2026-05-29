import type {
  DesktopApi,
  DiagnosticsPayload,
  NotifyPayload,
  TrayStatus,
} from '../shared/desktop-api.js';

const { contextBridge, ipcRenderer } = require('electron') as typeof import('electron');

const desktopApi: DesktopApi = {
  notify: (payload: NotifyPayload) => ipcRenderer.invoke('desktop:notify', payload),
  openFile: (path: string) => ipcRenderer.invoke('desktop:open-file', path),
  cacheMediaFile: (payload) => ipcRenderer.invoke('desktop:cache-media-file', payload),
  getCachedMediaStatus: (payload) => ipcRenderer.invoke('desktop:get-cached-media-status', payload),
  cacheMediaPoster: (payload) => ipcRenderer.invoke('desktop:cache-media-poster', payload),
  openVideoPlayer: (payload) => ipcRenderer.invoke('desktop:open-video-player', payload),
  openDownloadedFile: (payload) => ipcRenderer.invoke('desktop:open-downloaded-file', payload),
  openMediaFile: (payload) => ipcRenderer.invoke('desktop:open-media-file', payload),
  editMediaFile: (payload) => ipcRenderer.invoke('desktop:edit-media-file', payload),
  copyMediaFile: (payload) => ipcRenderer.invoke('desktop:copy-media-file', payload),
  copyFilePath: (path: string) => ipcRenderer.invoke('desktop:copy-file-path', path),
  saveMediaAs: (payload) => ipcRenderer.invoke('desktop:save-media-as', payload),
  revealMediaInFolder: (payload) => ipcRenderer.invoke('desktop:reveal-media-in-folder', payload),
  copyImageFromUrl: (payload) => ipcRenderer.invoke('desktop:copy-image-from-url', payload),
  saveFile: (defaultName: string, content: string) =>
    ipcRenderer.invoke('desktop:save-file', defaultName, content),
  openExternal: (url: string) => ipcRenderer.invoke('desktop:open-external', url),
  captureScreenshot: () => ipcRenderer.invoke('desktop:capture-screenshot'),
  getAppVersion: () => ipcRenderer.invoke('desktop:get-app-version'),
  exportDiagnostics: (payload: DiagnosticsPayload) =>
    ipcRenderer.invoke('desktop:export-diagnostics', payload),
  setTrayStatus: (status: TrayStatus) => ipcRenderer.invoke('desktop:set-tray-status', status),
};

contextBridge.exposeInMainWorld('desktopApi', desktopApi);
