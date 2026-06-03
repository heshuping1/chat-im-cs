import type { PcSettings } from "../settings/pc-settings";
import type { ModuleKey } from "../types";

export type ReminderSeverity = "info" | "warning" | "critical";

export type ReminderIcon = "contacts" | "im" | "service" | "sla";

export type ReminderDesktopChannel = "im" | "serviceQueue" | "sla";

export type DesktopNotificationTargetModule = "contacts" | "messages" | "onlineService";

export interface PcRealtimeReminder {
  id: string;
  title: string;
  body: string;
  avatarLabel?: string;
  avatarUrl?: string | null;
  targetModule: ModuleKey;
  targetId?: string;
  severity?: ReminderSeverity;
  icon?: ReminderIcon;
  createdAt: number;
}

export type PcRealtimeReminderInput = Omit<PcRealtimeReminder, "createdAt">;

export type ReminderPolicySettings = Pick<
  PcSettings,
  | "desktopNotifications"
  | "doNotDisturb"
  | "imNotifications"
  | "customerServiceMessageNotifications"
  | "notificationPreview"
  | "notificationSound"
  | "foregroundInAppCustomerServiceReminders"
  | "serviceQueueNotifications"
  | "slaTimeoutNotifications"
>;
