import type { PcSettings } from "../settings/pc-settings";
import type { ModuleKey } from "../types";

export type ReminderSeverity = "info" | "warning" | "critical";

export type ReminderIcon = "contacts" | "im" | "service" | "sla";

export type ReminderDesktopChannel = "im" | "serviceQueue" | "sla";

export interface PcRealtimeReminder {
  id: string;
  title: string;
  body: string;
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
  | "imNotifications"
  | "serviceQueueNotifications"
  | "slaTimeoutNotifications"
>;
