import { logSettingsDiagnostic } from "./settings-diagnostics";
import {
  defaultChatBackgroundPreset,
  normalizeChatBackgroundSetting,
  type ChatBackgroundSetting,
} from "../../settings/models/chatBackgroundModel";
import type { ApiTrafficLogLevel } from "../api/api-traffic-diagnostics";
import {
  normalizePcUserTimezone,
  type PcSelectableUserTimezone,
} from "../time/user-timezone";

export interface PcSettings {
  settingsSchemaVersion: number;
  imNotifications: boolean;
  serviceQueueNotifications: boolean;
  customerServiceMessageNotifications: boolean;
  foregroundInAppCustomerServiceReminders: boolean;
  slaTimeoutNotifications: boolean;
  desktopNotifications: boolean;
  notificationPreview: boolean;
  notificationSound: boolean;
  doNotDisturb: boolean;
  minimizeToTray: boolean;
  launchAtStartup: boolean;
  autoReconnect: boolean;
  compactList: boolean;
  fontSize: "\u5c0f" | "\u6807\u51c6" | "\u5927" | "\u8d85\u5927";
  highDensityContext: boolean;
  theme: "porcelain" | "business" | "classic-wechat" | "dark" | "high-contrast";
  skin: "jade" | "blue" | "graphite";
  language: "\u7b80\u4f53\u4e2d\u6587" | "English" | "العربية";
  timezone: PcSelectableUserTimezone;
  autoTranslate: boolean;
  enterToSend: boolean;
  screenshotShortcut: "Alt+A" | "Ctrl+Alt+A" | "Ctrl+Shift+A" | "None";
  dragUpload: boolean;
  chatBackgroundPreset: ChatBackgroundSetting;
  localMessageCache: boolean;
  allowLppSearch: boolean;
  allowMobileSearch: boolean;
  friendRequestVerification: boolean;
  profileVisibility: "\u6240\u6709\u4eba" | "\u4ec5\u597d\u53cb" | "\u4e0d\u5141\u8bb8";
  sensitiveMasking: boolean;
  activeLine: "\u81ea\u52a8\u9009\u62e9" | "\u4e3b\u7ad9" | "\u9999\u6e2f\u7ebf\u8def" | "\u65b0\u52a0\u5761\u7ebf\u8def";
  weakNetworkDiagnostics: boolean;
  apiTrafficLogLevel: ApiTrafficLogLevel;
  reduceMotion: boolean;
  highContrastBoundary: boolean;
  keyboardFocusHint: boolean;
  busyDoNotDisturb: boolean;
  afterWorkReminder: boolean;
  shortcutHints: boolean;
}

export interface PcSettingsStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export interface ReadStoredPcSettingsOptions {
  storage?: PcSettingsStorage | null;
}

export const pcSettingsStorageKey = "lpp.pc.settings";
export const pcSettingsSchemaVersion = 2;

export const defaultPcSettings: PcSettings = {
  settingsSchemaVersion: pcSettingsSchemaVersion,
  imNotifications: true,
  serviceQueueNotifications: false,
  customerServiceMessageNotifications: false,
  foregroundInAppCustomerServiceReminders: false,
  slaTimeoutNotifications: false,
  desktopNotifications: true,
  notificationPreview: true,
  notificationSound: true,
  doNotDisturb: false,
  minimizeToTray: true,
  launchAtStartup: false,
  autoReconnect: true,
  compactList: true,
  fontSize: "\u6807\u51c6",
  highDensityContext: false,
  theme: "porcelain",
  skin: "jade",
  language: "\u7b80\u4f53\u4e2d\u6587",
  timezone: "系统默认",
  autoTranslate: false,
  enterToSend: true,
  screenshotShortcut: "Alt+A",
  dragUpload: true,
  chatBackgroundPreset: defaultChatBackgroundPreset,
  localMessageCache: true,
  allowLppSearch: true,
  allowMobileSearch: true,
  friendRequestVerification: true,
  profileVisibility: "\u4ec5\u597d\u53cb",
  sensitiveMasking: true,
  activeLine: "\u81ea\u52a8\u9009\u62e9",
  weakNetworkDiagnostics: true,
  apiTrafficLogLevel: "summary",
  reduceMotion: false,
  highContrastBoundary: false,
  keyboardFocusHint: true,
  busyDoNotDisturb: false,
  afterWorkReminder: false,
  shortcutHints: true,
};

export function readStoredPcSettings(
  options: ReadStoredPcSettingsOptions = {},
): PcSettings {
  const storage = options.storage ?? safeLocalStorage();
  if (!storage) {
    logSettingsDiagnostic({
      event: "settings.restore",
      phase: "restore",
      result: "skipped",
      reason: "storage_unavailable",
    });
    return defaultPcSettings;
  }
  try {
    const settings = parseStoredPcSettings(storage.getItem(pcSettingsStorageKey));
    logSettingsDiagnostic({
      event: "settings.restore",
      phase: "restore",
      result: "success",
      reason: "storage_read",
    });
    return settings;
  } catch (error) {
    logSettingsDiagnostic({
      event: "settings.restore",
      phase: "restore",
      result: "failed",
      reason: "storage_read_failed",
      error,
    });
    return defaultPcSettings;
  }
}

export function parseStoredPcSettings(raw: string | null): PcSettings {
  if (!raw) return defaultPcSettings;
  try {
    return mergePcSettings(migrateStoredPcSettings(JSON.parse(raw) as Partial<PcSettings>));
  } catch (error) {
    logSettingsDiagnostic({
      event: "settings.parse",
      phase: "parse",
      result: "failed",
      reason: "malformed_storage_json",
      error,
    });
    return defaultPcSettings;
  }
}

export function mergePcSettings(partial: Partial<PcSettings> = {}): PcSettings {
  return {
    ...defaultPcSettings,
    ...partial,
    settingsSchemaVersion: pcSettingsSchemaVersion,
    chatBackgroundPreset: normalizeChatBackgroundSetting(partial.chatBackgroundPreset),
    timezone: normalizePcUserTimezone(partial.timezone),
  };
}

function migrateStoredPcSettings(partial: Partial<PcSettings> = {}): Partial<PcSettings> {
  const version = normalizeSettingsSchemaVersion(partial.settingsSchemaVersion);
  if (version >= pcSettingsSchemaVersion) return partial;
  return {
    ...partial,
    settingsSchemaVersion: pcSettingsSchemaVersion,
  };
}

function normalizeSettingsSchemaVersion(value: unknown) {
  const version = Number(value);
  return Number.isFinite(version) ? Math.floor(version) : 1;
}

export function persistPcSettings(
  settings: PcSettings,
  storage: PcSettingsStorage | null = safeLocalStorage(),
) {
  if (!storage) {
    logSettingsDiagnostic({
      event: "settings.persist",
      phase: "persist",
      result: "skipped",
      reason: "storage_unavailable",
    });
    return;
  }
  try {
    storage.setItem(pcSettingsStorageKey, JSON.stringify(settings));
    logSettingsDiagnostic({
      event: "settings.persist",
      phase: "persist",
      result: "success",
      reason: "stored_settings",
    });
  } catch (error) {
    logSettingsDiagnostic({
      event: "settings.persist",
      phase: "persist",
      result: "failed",
      reason: "storage_write_failed",
      error,
    });
  }
}

function safeLocalStorage(): PcSettingsStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
