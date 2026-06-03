import type {
  DesktopNotificationTargetModule,
  PcRealtimeReminder,
  PcRealtimeReminderInput,
  ReminderDesktopChannel,
  ReminderPolicySettings,
} from "./reminder-types";
import type { NotificationClickedPayload } from "../../../shared/desktop-api";
import { logReminderDiagnostic } from "./reminder-diagnostics";
import { resolveNotificationIconDataUrl } from "./notification-avatar";

export const realtimeReminderLimit = 6;
export const realtimeReminderTtlMs = 30 * 60 * 1000;
export const desktopNotificationDedupeWindowMs = 2_000;

const recentDesktopNotificationKeys = new Map<string, number>();

export interface ReminderReduceOptions {
  limit?: number;
  now?: number;
}

export interface DesktopNotificationPayload {
  title: string;
  body: string;
  conversationId?: string;
  channel?: ReminderDesktopChannel;
  iconDataUrl?: string | null;
  silent?: boolean;
  targetId?: string;
  targetModule?: DesktopNotificationTargetModule;
}

export interface DesktopNotificationOptions {
  authToken?: string | null;
  channel?: ReminderDesktopChannel;
  iconUrl?: string | null;
  settings?: ReminderPolicySettings;
}

export interface TaskbarBadgeInput {
  contactRequestCount?: number;
  imUnreadCount?: number;
  serviceQueueCount?: number;
  serviceUnreadCount?: number;
}

export type DesktopNotificationResult =
  | { result: "sent"; channel: "electron" | "browser" }
  | {
      result: "skipped";
      reason:
        | "deduplicated"
        | "window_unavailable"
        | "notification_unavailable"
        | "permission_denied";
    }
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
  if (settings.doNotDisturb && channel === "im") return false;
  if (channel === "im") return settings.imNotifications;
  if (channel === "sla") return settings.slaTimeoutNotifications;
  return shouldPushCustomerServiceQueueReminder(settings);
}

export function shouldPushCustomerServiceQueueReminder(settings: ReminderPolicySettings) {
  return settings.serviceQueueNotifications;
}

export function shouldPushCustomerServiceThreadMessageReminder(settings: ReminderPolicySettings) {
  return settings.customerServiceMessageNotifications;
}

export function shouldPushCustomerServiceThreadMessageInAppReminder(
  settings: ReminderPolicySettings,
  input: Pick<DesktopNotificationVisibilityInput, "windowFocused"> = {},
) {
  return (
    shouldPushCustomerServiceThreadMessageReminder(settings) &&
    settings.foregroundInAppCustomerServiceReminders &&
    Boolean(input.windowFocused)
  );
}

export function shouldShowCustomerServiceThreadMessageDesktopNotification(
  settings: ReminderPolicySettings,
) {
  return settings.desktopNotifications && shouldPushCustomerServiceThreadMessageReminder(settings);
}

export function shouldPushCustomerServiceMessageReminder(settings: ReminderPolicySettings) {
  return shouldPushCustomerServiceThreadMessageReminder(settings);
}

export function shouldShowCustomerServiceMessageDesktopNotification(
  settings: ReminderPolicySettings,
) {
  return shouldShowCustomerServiceThreadMessageDesktopNotification(settings);
}

export function shouldShowDesktopNotification(
  settings: ReminderPolicySettings,
  channel: ReminderDesktopChannel,
) {
  return settings.desktopNotifications && shouldPushRealtimeReminder(settings, channel);
}

export interface DesktopNotificationVisibilityInput {
  activeModule?: PcRealtimeReminder["targetModule"];
  activeTargetId?: string;
  targetModule?: PcRealtimeReminder["targetModule"];
  targetId?: string;
  windowFocused?: boolean;
}

export function shouldShowDesktopNotificationForTarget(
  settings: ReminderPolicySettings,
  channel: ReminderDesktopChannel,
  input: DesktopNotificationVisibilityInput = {},
) {
  if (!shouldShowDesktopNotification(settings, channel)) return false;
  if (channel !== "serviceQueue") return true;
  if (!input.windowFocused) return true;
  if (input.targetModule !== "onlineService") return true;
  if (input.activeModule !== "onlineService") return true;
  return !input.targetId || input.activeTargetId !== input.targetId;
}

export function shouldShowCustomerServiceThreadMessageDesktopNotificationForTarget(
  settings: ReminderPolicySettings,
  input: DesktopNotificationVisibilityInput = {},
) {
  if (!shouldShowCustomerServiceThreadMessageDesktopNotification(settings)) return false;
  if (!input.windowFocused) return true;
  if (input.targetModule !== "onlineService") return true;
  if (input.activeModule !== "onlineService") return true;
  return !input.targetId || input.activeTargetId !== input.targetId;
}

export function shouldShowCustomerServiceMessageDesktopNotificationForTarget(
  settings: ReminderPolicySettings,
  input: DesktopNotificationVisibilityInput = {},
) {
  return shouldShowCustomerServiceThreadMessageDesktopNotificationForTarget(settings, input);
}

export function isRendererWindowFocused() {
  if (typeof document === "undefined") return false;
  return document.hasFocus();
}

export function subscribeDesktopNotificationClicks(
  callback: (payload: NotificationClickedPayload) => void,
) {
  if (typeof window === "undefined" || !window.desktopApi?.onNotificationClicked) {
    return undefined;
  }
  return window.desktopApi.onNotificationClicked(callback);
}

export function taskbarBadgeLabel(count: number) {
  const normalizedCount = Math.max(0, Math.floor(Number(count) || 0));
  if (normalizedCount <= 0) return "";
  return normalizedCount > 99 ? "99+" : String(normalizedCount);
}

export function deriveTaskbarBadge(input: TaskbarBadgeInput) {
  const serviceQueueCount = normalizedBadgeCount(input.serviceQueueCount);
  const serviceUnreadCount = normalizedBadgeCount(input.serviceUnreadCount);
  const count =
    normalizedBadgeCount(input.imUnreadCount) +
    normalizedBadgeCount(input.contactRequestCount) +
    serviceQueueCount +
    serviceUnreadCount;
  return {
    count,
    urgent: serviceQueueCount + serviceUnreadCount > 0,
  };
}

export async function applyTaskbarBadge(input: TaskbarBadgeInput) {
  if (typeof window === "undefined" || !window.desktopApi?.setTaskbarBadge) return;
  await window.desktopApi.setTaskbarBadge(deriveTaskbarBadge(input));
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

  const notificationPayload = notificationPayloadForPolicy(
    {
      ...payload,
      channel: payload.channel ?? options.channel,
      iconDataUrl:
        payload.iconDataUrl ??
        (await resolveNotificationIconDataUrl({
          token: options.authToken,
          url: options.iconUrl,
        })),
      silent: options.settings ? !options.settings.notificationSound : payload.silent,
    },
    options.settings,
  );
  if (consumeDesktopNotificationDedupe(notificationPayload, options)) {
    logReminderDiagnostic({
      event: "reminder.desktop-notify",
      phase: "notify",
      result: "skipped",
      reason: "deduplicated",
      context: desktopNotificationContext(notificationPayload, options),
    });
    return { result: "skipped", reason: "deduplicated" };
  }

  if (window.desktopApi?.notify) {
    try {
      await window.desktopApi.notify(notificationPayload);
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
    new window.Notification(notificationPayload.title, {
      body: notificationPayload.body,
      icon: notificationPayload.iconDataUrl ?? undefined,
      tag: payload.targetId || payload.conversationId,
      silent: options.settings ? !options.settings.notificationSound : undefined,
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

export function notificationPayloadForPolicy(
  payload: DesktopNotificationPayload,
  settings?: ReminderPolicySettings,
): DesktopNotificationPayload {
  if (settings?.notificationPreview === false) {
    return {
      ...payload,
      body:
        payload.channel === "serviceQueue"
          ? "收到一条在线客服消息"
          : "你有一条新提醒，内容已按隐私设置隐藏。",
    };
  }
  return payload;
}

export function desktopNotificationDedupeKey(
  payload: DesktopNotificationPayload,
  options: DesktopNotificationOptions = {},
) {
  const channel = payload.channel ?? options.channel ?? "";
  const targetModule = payload.targetModule ?? "";
  const targetId = payload.targetId || payload.conversationId || "";
  return [channel, targetModule, targetId, payload.title, payload.body].join("\u001f");
}

export function consumeDesktopNotificationDedupe(
  payload: DesktopNotificationPayload,
  options: DesktopNotificationOptions = {},
  now = Date.now(),
  windowMs = desktopNotificationDedupeWindowMs,
) {
  const key = desktopNotificationDedupeKey(payload, options);
  for (const [itemKey, timestamp] of recentDesktopNotificationKeys) {
    if (now - timestamp > windowMs) recentDesktopNotificationKeys.delete(itemKey);
  }
  const previous = recentDesktopNotificationKeys.get(key);
  if (previous !== undefined && now - previous <= windowMs) return true;
  recentDesktopNotificationKeys.set(key, now);
  return false;
}

export function resetDesktopNotificationDedupeForTest() {
  recentDesktopNotificationKeys.clear();
}

function desktopNotificationContext(
  payload: DesktopNotificationPayload,
  options: DesktopNotificationOptions,
) {
  return {
    channel: payload.channel ?? options.channel,
    conversationId: payload.conversationId,
    targetId: payload.targetId,
    targetModule: payload.targetModule,
  };
}

function normalizedBadgeCount(value: unknown) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return 0;
  return Math.max(0, Math.floor(numberValue));
}
