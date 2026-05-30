import { Notification, type BrowserWindow } from 'electron';
import type { NotifyPayload } from '../shared/desktop-api.js';

export function showDesktopNotification({
  mainWindow,
  payload,
}: {
  mainWindow: BrowserWindow | null;
  payload: NotifyPayload;
}) {
  if (!Notification.isSupported()) return;
  const notification = new Notification({
    title: payload.title,
    body: payload.body,
    silent: false,
  });
  notification.on('click', () => {
    if (!mainWindow) return;
    mainWindow.show();
    mainWindow.focus();
    if (payload.conversationId) {
      mainWindow.webContents.send('desktop:notification-clicked', payload.conversationId);
    }
  });
  notification.show();
}
