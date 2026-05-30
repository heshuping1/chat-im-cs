import type { BrowserWindowConstructorOptions } from 'electron';

export function createScreenshotSelectionWindowOptions(
  payload: {
    displayBounds: Electron.Rectangle;
    displaySize: Electron.Size;
  },
  channels: {
    result: string;
    ready: string;
  },
  preloadPath: string,
): BrowserWindowConstructorOptions {
  return {
    x: payload.displayBounds.x,
    y: payload.displayBounds.y,
    width: payload.displaySize.width,
    height: payload.displaySize.height,
    show: false,
    frame: false,
    transparent: true,
    fullscreenable: false,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#00000000',
    webPreferences: {
      additionalArguments: [
        `--lpp-screenshot-channel=${channels.result}`,
        `--lpp-screenshot-ready-channel=${channels.ready}`,
      ],
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadPath,
      sandbox: false,
    },
  };
}
