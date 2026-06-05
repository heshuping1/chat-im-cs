export type SettingsSectionId =
  | "account"
  | "enterprise"
  | "messages"
  | "privacy"
  | "customerService"
  | "network"
  | "common"
  | "storageDiagnostics"
  | "about";

export type SettingSource = "local" | "account" | "enterprise" | "system";
export type SettingCapability =
  | "available"
  | "localEffective"
  | "recordOnly"
  | "missingBackendApi"
  | "missingDesktopApi"
  | "missingRuntimeWiring";
export type SettingControl = "switch" | "select" | "action" | "info";

export interface SettingSourceMeta {
  label: string;
  effect: string;
  desc: string;
}

export interface SettingsSectionCatalog {
  id: SettingsSectionId;
  title: string;
  desc: string;
  priority: "core" | "support";
  sources: SettingSource[];
}

export interface SettingsRowCatalog {
  id: string;
  sectionId: SettingsSectionId;
  label: string;
  desc: string;
  source: SettingSource;
  control: SettingControl;
  capability: SettingCapability;
  enabled: boolean;
  statusLabel?: string;
  visibleInMainList: boolean;
  disabledReason?: string;
  productValue?: string;
  dependency?: string;
  nextAction?: string;
}

export type SettingsRowPresentation = Pick<
  SettingsRowCatalog,
  | "label"
  | "desc"
  | "source"
  | "capability"
  | "enabled"
  | "statusLabel"
  | "visibleInMainList"
  | "disabledReason"
  | "productValue"
  | "dependency"
  | "nextAction"
>;

export type SettingsCatalogTranslate = (
  key: string,
  params?: Record<string, string | number>,
) => string;

export const settingSourceMeta: Record<SettingSource, SettingSourceMeta> = {
  local: {
    label: "local",
    effect: "local-only",
    desc: "Stored with PC preferences and applied by the current client runtime.",
  },
  account: {
    label: "account",
    effect: "account-synced",
    desc: "Saved by account APIs and invalidated through existing account queries.",
  },
  enterprise: {
    label: "enterprise",
    effect: "enterprise-managed",
    desc: "Reserved for organization policy or administrator-controlled settings.",
  },
  system: {
    label: "system",
    effect: "requires-system-support",
    desc: "Requires a dedicated desktop capability before it can be enabled.",
  },
};

export const settingsSections = [
  section("account", "core", ["account"]),
  section("enterprise", "core", ["enterprise"]),
  section("messages", "core", ["account"]),
  section("privacy", "core", ["account", "local"]),
  section("customerService", "core", ["account", "local"]),
  section("network", "support", ["local", "system"]),
  section("common", "core", ["account", "local", "system"]),
  section("storageDiagnostics", "support", ["local", "system"]),
  section("about", "support", ["enterprise", "local", "system"]),
] satisfies SettingsSectionCatalog[];

export const settingsRows = [
  row("profile", "account", "account", "action"),
  row("enterpriseIdentity", "enterprise", "enterprise", "info", "recordOnly"),
  row("changePassword", "account", "account", "action"),
  row("loginDevices", "account", "account", "action"),
  row("logoutAccount", "account", "account", "action"),
  row("deactivateAccount", "account", "account", "action"),

  row("allowMobileSearch", "privacy", "account", "switch"),
  row("allowLppSearch", "privacy", "account", "switch"),
  row("friendRequestVerification", "privacy", "account", "select"),
  row("profileVisibility", "privacy", "account", "select"),
  row("blocklist", "privacy", "account", "action"),

  row("imNotifications", "messages", "account", "switch"),
  row("friendRequestNotifications", "messages", "account", "info", "recordOnly"),
  row("serviceQueueNotifications", "customerService", "account", "switch"),
  row("customerServiceMessageNotifications", "customerService", "local", "switch"),
  row("foregroundInAppCustomerServiceReminders", "customerService", "local", "switch", "localEffective"),
  row("slaTimeoutNotifications", "customerService", "account", "switch"),
  row("desktopNotifications", "common", "account", "switch"),
  row("notificationPreview", "common", "account", "switch"),
  row("notificationSound", "common", "account", "switch"),
  row("doNotDisturb", "messages", "account", "switch"),

  row("enterToSend", "common", "local", "switch", "localEffective"),
  row("screenshotShortcut", "common", "local", "select", "localEffective"),
  row("dragUpload", "common", "local", "switch", "localEffective"),
  row("autoTranslate", "common", "local", "switch", "localEffective"),
  row("shortcutHints", "common", "local", "switch", "localEffective"),
  row("chatBackground", "common", "local", "action", "localEffective"),
  row("chatExport", "common", "local", "action"),
  row("chatBackup", "common", "system", "action"),
  row("chatRestore", "common", "system", "action"),

  row("theme", "common", "local", "select", "localEffective"),
  row("skin", "common", "local", "select", "localEffective"),
  row("fontSize", "common", "local", "select", "localEffective"),
  row("compactList", "common", "local", "switch", "localEffective"),
  row("highDensityContext", "customerService", "local", "switch", "localEffective"),
  row("reduceMotion", "common", "local", "switch", "localEffective"),
  row("highContrastBoundary", "common", "local", "switch", "localEffective"),
  row("keyboardFocusHint", "common", "local", "switch", "localEffective"),
  row("minimizeToTray", "common", "system", "switch"),
  row("launchAtStartup", "common", "system", "switch"),
  row("multiProfileIndicator", "common", "system", "info", "recordOnly"),

  row("language", "common", "local", "info", "recordOnly"),
  row("timezone", "common", "local", "select", "localEffective"),
  row("currentEnvironment", "network", "system", "info", "recordOnly"),
  row("activeLine", "network", "system", "action", "available"),
  row("lineLatencyTest", "network", "system", "action", "localEffective"),
  row("autoReconnect", "network", "local", "info", "recordOnly"),
  row("weakNetworkDiagnostics", "network", "local", "info", "recordOnly"),

  row("clearLocalCache", "storageDiagnostics", "local", "action"),
  row("diagnosticsExport", "storageDiagnostics", "local", "action"),
  row("apiTrafficLogLevel", "storageDiagnostics", "local", "select", "localEffective"),
  row("diagnosticsRecentRecords", "storageDiagnostics", "local", "info"),
  row("connectivityHealth", "storageDiagnostics", "local", "info"),
  row("developmentDiagnostics", "storageDiagnostics", "system", "info", "recordOnly"),
  row("runtimeStatus", "storageDiagnostics", "local", "info", "recordOnly"),

  row("feedback", "about", "enterprise", "action"),
  row("terms", "about", "local", "action"),
  row("privacyPolicy", "about", "local", "action"),
  row("aboutClient", "about", "local", "action"),
  row("autoCheckUpdates", "about", "system", "switch"),
  row("updateChannel", "about", "system", "select"),
  row("updateDownloadStrategy", "about", "system", "info", "recordOnly"),
  row("checkUpdate", "about", "system", "action"),
] satisfies SettingsRowCatalog[];

export function getSettingsSection(id: SettingsSectionId) {
  return settingsSections.find((sectionItem) => sectionItem.id === id);
}

export function getSettingsRow(id: string) {
  return settingsRows.find((rowItem) => rowItem.id === id);
}

export function settingsRowsForSection(sectionId: SettingsSectionId) {
  return settingsRows.filter((rowItem) => rowItem.sectionId === sectionId);
}

export function settingRowProps(id: string): SettingsRowPresentation {
  const rowItem = getSettingsRow(id);
  if (!rowItem) {
    throw new Error(`Unknown settings row: ${id}`);
  }
  return {
    label: rowItem.label,
    desc: rowItem.desc,
    source: rowItem.source,
    capability: rowItem.capability,
    enabled: rowItem.enabled,
    statusLabel: rowItem.statusLabel,
    visibleInMainList: rowItem.visibleInMainList,
    disabledReason: rowItem.disabledReason,
    productValue: rowItem.productValue,
    dependency: rowItem.dependency,
    nextAction: rowItem.nextAction,
  };
}

function section(
  id: SettingsSectionId,
  priority: SettingsSectionCatalog["priority"],
  sources: SettingSource[],
): SettingsSectionCatalog {
  return {
    id,
    title: `me.section.${id}.title`,
    desc: `me.section.${id}.desc`,
    priority,
    sources,
  };
}

function plannedRow(
  id: string,
  sectionId: SettingsSectionId,
  source: SettingSource,
  control: SettingControl,
  productValue: string,
  dependency: string,
  nextAction: string,
  capability: Extract<
    SettingCapability,
    "missingBackendApi" | "missingDesktopApi" | "missingRuntimeWiring"
  > = "missingBackendApi",
): SettingsRowCatalog {
  return row(id, sectionId, source, control, capability, false, {
    productValue,
    dependency,
    nextAction,
  });
}

function row(
  id: string,
  sectionId: SettingsSectionId,
  source: SettingSource,
  control: SettingControl,
  capability: SettingCapability = "available",
  enabled = true,
  planning?: {
    productValue?: string;
    dependency?: string;
    nextAction?: string;
    disabledReason?: string;
  },
): SettingsRowCatalog {
  const visibleInMainList =
    capability === "available" ||
    capability === "localEffective" ||
    capability === "recordOnly";
  return {
    id,
    sectionId,
    label: settingsRowLabelKey(id),
    desc: settingsRowDescKey(id),
    source,
    control,
    capability,
    enabled,
    statusLabel: statusLabelForCapability(capability),
    visibleInMainList,
    disabledReason: planning?.disabledReason,
    productValue: planning?.productValue,
    dependency: planning?.dependency,
    nextAction: planning?.nextAction,
  };
}

function statusLabelForCapability(capability: SettingCapability) {
  if (capability === "missingBackendApi") return "me.capability.missingBackendApi";
  if (capability === "missingDesktopApi") return "me.capability.missingDesktopApi";
  if (capability === "missingRuntimeWiring") return "me.capability.missingRuntimeWiring";
  return undefined;
}

export function settingsRowLabel(
  rowItem: Pick<SettingsRowCatalog, "id" | "label">,
  translate: SettingsCatalogTranslate,
) {
  return translate(rowItem.label || settingsRowLabelKey(rowItem.id));
}

export function settingsRowDescription(
  rowItem: Pick<SettingsRowCatalog, "id" | "desc" | "source" | "capability">,
  translate: SettingsCatalogTranslate,
) {
  const desc = translate(rowItem.desc || settingsRowDescKey(rowItem.id));
  const effectKey = settingsRowEffectKey(rowItem.source, rowItem.capability);
  return effectKey ? `${desc} ${translate(effectKey)}` : desc;
}

export function settingsCapabilityLabel(
  key: string | undefined,
  translate: SettingsCatalogTranslate,
) {
  return key ? translate(key) : undefined;
}

function settingsRowLabelKey(id: string) {
  return `me.row.${id}.label`;
}

function settingsRowDescKey(id: string) {
  return `me.row.${id}.desc`;
}

function settingsRowEffectKey(source: SettingSource, capability: SettingCapability) {
  if (capability === "recordOnly") {
    return "me.rowEffect.recordOnly";
  }
  if (capability === "localEffective") {
    return "me.rowEffect.localEffective";
  }
  if (capability === "missingBackendApi") {
    return "me.rowEffect.missingBackendApi";
  }
  if (capability === "missingDesktopApi") {
    return "me.rowEffect.missingDesktopApi";
  }
  if (capability === "missingRuntimeWiring") {
    return "me.rowEffect.missingRuntimeWiring";
  }
  if (source === "local") {
    return "me.rowEffect.local";
  }
  if (source === "system") {
    return "me.rowEffect.system";
  }
  if (source === "account") {
    return "me.rowEffect.account";
  }
  if (source === "enterprise") {
    return "me.rowEffect.enterprise";
  }
  return undefined;
}
