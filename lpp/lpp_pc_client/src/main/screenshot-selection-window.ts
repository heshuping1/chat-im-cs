import { BrowserWindow, ipcMain } from 'electron';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { screenshotSelectorHtml } from './screenshot-selection-template.js';
import { createScreenshotSelectionWindowOptions } from './screenshot-selection-window-options.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function selectScreenshotRegion(payload: {
  dataUrl: string;
  displayBounds: Electron.Rectangle;
  displaySize: Electron.Size;
}) {
  return new Promise<{ dataUrl: string; fileName: string }>((resolve, reject) => {
    const channel = `desktop:screenshot-selection:${Date.now()}:${Math.random()
      .toString(16)
      .slice(2)}`;
    const readyChannel = `${channel}:ready`;
    let settled = false;
    const overlay = new BrowserWindow(
      createScreenshotSelectionWindowOptions(
        payload,
        {
          result: channel,
          ready: readyChannel,
        },
        join(__dirname, '../preload/screenshot-selector-preload.cjs'),
      ),
    );
    overlay.setAlwaysOnTop(true, 'screen-saver');
    overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      ipcMain.removeAllListeners(channel);
      ipcMain.removeAllListeners(readyChannel);
      if (!overlay.isDestroyed()) overlay.close();
      callback();
    };
    ipcMain.once(readyChannel, () => {
      if (settled || overlay.isDestroyed()) return;
      overlay.show();
      overlay.focus();
    });
    ipcMain.once(channel, (_event, result: { dataUrl?: string; canceled?: boolean; error?: string }) => {
      if (result?.canceled) {
        finish(() => reject(new Error('\u5df2\u53d6\u6d88\u622a\u56fe')));
        return;
      }
      if (result?.error || !result?.dataUrl) {
        finish(() => reject(new Error(result?.error || '\u622a\u56fe\u5931\u8d25')));
        return;
      }
      finish(() =>
        resolve({
          dataUrl: result.dataUrl!,
          fileName: `\u622a\u56fe-${new Date().toISOString().replace(/[:.]/g, '-')}.png`,
        }),
      );
    });
    overlay.on('closed', () => {
      if (!settled) finish(() => reject(new Error('\u5df2\u53d6\u6d88\u622a\u56fe')));
    });
    void overlay.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(
        screenshotSelectorHtml(channel, readyChannel),
      )}`,
    );
    overlay.webContents.once('did-finish-load', () => {
      overlay.webContents.send('desktop:screenshot-source', payload.dataUrl);
    });
  });
}
