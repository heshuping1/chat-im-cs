import { nativeImage, Notification, type BrowserWindow } from 'electron';
import type { NotifyPayload } from '../shared/desktop-api.js';

export function showDesktopNotification({
  appIconPath,
  mainWindow,
  payload,
}: {
  appIconPath: string;
  mainWindow: BrowserWindow | null;
  payload: NotifyPayload;
}) {
  if (!Notification.isSupported()) return;
  const notification = new Notification({
    title: payload.title,
    body: payload.body,
    icon: notificationIcon(payload.iconDataUrl, appIconPath),
    silent: Boolean(payload.silent),
  });
  notification.on('click', () => {
    if (!mainWindow) return;
    mainWindow.show();
    mainWindow.focus();
    const targetId = payload.targetId || payload.conversationId;
    if (targetId || payload.targetModule || payload.channel) {
      mainWindow.webContents.send('desktop:notification-clicked', {
        channel: payload.channel,
        conversationId: payload.conversationId,
        targetId,
        targetModule: payload.targetModule,
      });
    }
  });
  notification.show();
}

function notificationIcon(iconDataUrl: string | null | undefined, appIconPath: string) {
  if (!iconDataUrl) return appIconPath;
  try {
    const icon = nativeImage.createFromDataURL(iconDataUrl);
    return icon.isEmpty() ? appIconPath : icon;
  } catch {
    return appIconPath;
  }
}
