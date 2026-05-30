import type {
  PcRealtimeReminder,
  PcRealtimeReminderInput,
  ReminderDesktopChannel,
  ReminderPolicySettings,
} from "./reminder-types";
import { logReminderDiagnostic } from "./reminder-diagnostics";

export const realtimeReminderLimit = 6;
export const realtimeReminderTtlMs = 30 * 60 * 1000;

export interface ReminderReduceOptions {
  limit?: number;
  now?: number;
}

export interface DesktopNotificationPayload {
  title: string;
  body: string;
  conversationId?: string;
}

export interface DesktopNotificationOptions {
  channel?: ReminderDesktopChannel;
}

export type DesktopNotificationResult =
  | { result: "sent"; channel: "electron" | "browser" }
  | { result: "skipped"; reason: "window_unavailable" | "notification_unavailable" | "permission_denied" }
  | { result: "failed"; reason: "electron_failed" | "browser_failed"; error: unknown };

export function createRealtimeReminder(
  reminder: PcRealtimeReminderInput,
  now = Date.now(),
): PcRealtimeReminder {
  return {
    ...reminder,
    createdAt: now,
  };
}

export function reduceRealtimeReminders(
  current: PcRealtimeReminder[],
  reminder: PcRealtimeReminderInput,
  options: ReminderReduceOptions = {},
) {
  const now = options.now ?? Date.now();
  const limit = options.limit ?? realtimeReminderLimit;
  const next = createRealtimeReminder(reminder, now);
  return [next, ...current.filter((item) => item.id !== reminder.id)]
    .filter((item) => !isRealtimeReminderExpired(item, now))
    .slice(0, Math.max(1, limit));
}

export function dismissRealtimeReminderById(
  current: PcRealtimeReminder[],
  id: string,
) {
  return current.filter((item) => item.id !== id);
}

export function dismissRealtimeRemindersForTarget(
  current: PcRealtimeReminder[],
  targetModule: PcRealtimeReminder["targetModule"],
  targetId?: string,
) {
  return current.filter((item) => {
    if (item.targetModule !== targetModule) return true;
    return targetId ? item.targetId !== targetId : false;
  });
}

export function isRealtimeReminderExpired(
  reminder: PcRealtimeReminder,
  now = Date.now(),
  ttlMs = realtimeReminderTtlMs,
) {
  return now - reminder.createdAt > ttlMs;
}

export function shouldPushRealtimeReminder(
  settings: ReminderPolicySettings,
  channel: ReminderDesktopChannel,
) {
  if (channel === "im") return settings.imNotifications;
  if (channel === "sla") return settings.slaTimeoutNotifications;
  return settings.serviceQueueNotifications;
}

export function shouldShowDesktopNotification(
  settings: ReminderPolicySettings,
  channel: ReminderDesktopChannel,
) {
  return settings.desktopNotifications && shouldPushRealtimeReminder(settings, channel);
}

export async function notifyDesktopOrBrowser(
  payload: DesktopNotificationPayload,
  options: DesktopNotificationOptions = {},
): Promise<DesktopNotificationResult> {
  if (typeof window === "undefined") {
    logReminderDiagnostic({
      event: "reminder.desktop-notify",
      phase: "notify",
      result: "skipped",
      reason: "window_unavailable",
      context: desktopNotificationContext(payload, options),
    });
    return { result: "skipped", reason: "window_unavailable" };
  }

  if (window.desktopApi?.notify) {
    try {
      await window.desktopApi.notify(payload);
      logReminderDiagnostic({
        event: "reminder.desktop-notify",
        phase: "notify",
        result: "success",
        reason: "electron_notify_sent",
        context: {
          ...desktopNotificationContext(payload, options),
          desktopChannel: "electron",
        },
      });
      return { result: "sent", channel: "electron" };
    } catch (error) {
      logReminderDiagnostic({
        event: "reminder.desktop-notify",
        phase: "notify",
        result: "failed",
        reason: "electron_failed",
        context: desktopNotificationContext(payload, options),
        error,
      });
      return { result: "failed", reason: "electron_failed", error };
    }
  }

  if (!("Notification" in window)) {
    logReminderDiagnostic({
      event: "reminder.desktop-notify",
      phase: "notify",
      result: "skipped",
      reason: "notification_unavailable",
      context: desktopNotificationContext(payload, options),
    });
    return { result: "skipped", reason: "notification_unavailable" };
  }

  if (window.Notification.permission === "default" && window.Notification.requestPermission) {
    const permission = await window.Notification.requestPermission();
    if (permission !== "granted") {
      logReminderDiagnostic({
        event: "reminder.desktop-notify",
        phase: "notify",
        result: "skipped",
        reason: "permission_denied",
        context: desktopNotificationContext(payload, options),
      });
      return { result: "skipped", reason: "permission_denied" };
    }
  }

  if (window.Notification.permission !== "granted") {
    logReminderDiagnostic({
      event: "reminder.desktop-notify",
      phase: "notify",
      result: "skipped",
      reason: "permission_denied",
      context: desktopNotificationContext(payload, options),
    });
    return { result: "skipped", reason: "permission_denied" };
  }

  try {
    new window.Notification(payload.title, {
      body: payload.body,
      tag: payload.conversationId,
    });
    logReminderDiagnostic({
      event: "reminder.desktop-notify",
      phase: "notify",
      result: "success",
      reason: "browser_notify_sent",
      context: {
        ...desktopNotificationContext(payload, options),
        desktopChannel: "browser",
      },
    });
    return { result: "sent", channel: "browser" };
  } catch (error) {
    logReminderDiagnostic({
      event: "reminder.desktop-notify",
      phase: "notify",
      result: "failed",
      reason: "browser_failed",
      context: desktopNotificationContext(payload, options),
      error,
    });
    return { result: "failed", reason: "browser_failed", error };
  }
}

function desktopNotificationContext(
  payload: DesktopNotificationPayload,
  options: DesktopNotificationOptions,
) {
  return {
    channel: options.channel,
    conversationId: payload.conversationId,
  };
}
