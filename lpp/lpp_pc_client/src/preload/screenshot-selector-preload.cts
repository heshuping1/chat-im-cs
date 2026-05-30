const { contextBridge, ipcRenderer } = require('electron') as typeof import('electron');

const channel = readArgument('--lpp-screenshot-channel=');
const readyChannel = readArgument('--lpp-screenshot-ready-channel=');

function assertScreenshotChannel(value: string | undefined, label: string) {
  if (!value || !value.startsWith('desktop:screenshot-selection:')) {
    throw new Error(`Invalid ${label}`);
  }
  return value;
}

const screenshotChannel = assertScreenshotChannel(channel, 'screenshot channel');
const screenshotReadyChannel = assertScreenshotChannel(readyChannel, 'screenshot ready channel');

contextBridge.exposeInMainWorld('screenshotSelector', {
  onSource(callback: (dataUrl: string) => void) {
    ipcRenderer.once('desktop:screenshot-source', (_event, dataUrl: string) => callback(dataUrl));
  },
  sendReady() {
    ipcRenderer.send(screenshotReadyChannel);
  },
  sendResult(value: { dataUrl?: string; canceled?: boolean; error?: string }) {
    ipcRenderer.send(screenshotChannel, value);
  },
});

function readArgument(prefix: string) {
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
}
