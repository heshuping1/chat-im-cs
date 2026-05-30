import { logSettingsDiagnostic } from "./settings-diagnostics";

export interface PcSettings {
  imNotifications: boolean;
  serviceQueueNotifications: boolean;
  slaTimeoutNotifications: boolean;
  desktopNotifications: boolean;
  minimizeToTray: boolean;
  launchAtStartup: boolean;
  autoReconnect: boolean;
  compactList: boolean;
  fontSize: "小" | "标准" | "大" | "超大";
  highDensityContext: boolean;
  theme: "porcelain" | "business" | "classic-wechat" | "dark" | "high-contrast";
  skin: "jade" | "blue" | "graphite";
  language: "简体中文" | "English" | "العربية";
  timezone: "系统默认" | "Asia/Shanghai" | "UTC";
  autoTranslate: boolean;
  screenshotShortcut: "Alt+A" | "Ctrl+Alt+A" | "Ctrl+Shift+A" | "None";
  dragUpload: boolean;
  localMessageCache: boolean;
  allowLppSearch: boolean;
  allowMobileSearch: boolean;
  friendRequestVerification: boolean;
  profileVisibility: "所有人" | "仅好友" | "不允许";
  sensitiveMasking: boolean;
  activeLine: "自动选择" | "主站" | "香港线路" | "新加坡线路";
  weakNetworkDiagnostics: boolean;
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

export const defaultPcSettings: PcSettings = {
  imNotifications: true,
  serviceQueueNotifications: true,
  slaTimeoutNotifications: true,
  desktopNotifications: true,
  minimizeToTray: true,
  launchAtStartup: false,
  autoReconnect: true,
  compactList: true,
  fontSize: "标准",
  highDensityContext: true,
  theme: "porcelain",
  skin: "jade",
  language: "简体中文",
  timezone: "系统默认",
  autoTranslate: false,
  screenshotShortcut: "Alt+A",
  dragUpload: true,
  localMessageCache: true,
  allowLppSearch: true,
  allowMobileSearch: true,
  friendRequestVerification: true,
  profileVisibility: "仅好友",
  sensitiveMasking: true,
  activeLine: "自动选择",
  weakNetworkDiagnostics: true,
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
    return mergePcSettings(JSON.parse(raw) as Partial<PcSettings>);
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
  };
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
