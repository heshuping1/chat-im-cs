export type AutoTranslateConversationMode = "inherit" | "enabled" | "disabled";

export type AutoTranslateConversationKind =
  | "im-direct"
  | "im-group"
  | "customer-service";

export interface AutoTranslateConversationPreferenceIdentity {
  conversationId?: string | null;
  conversationKind: AutoTranslateConversationKind;
  scopeKey?: string | null;
}

export interface AutoTranslateConversationPreferenceUpdate
  extends AutoTranslateConversationPreferenceIdentity {
  mode: AutoTranslateConversationMode;
}

export interface AutoTranslatePreferenceStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export const autoTranslateConversationPreferencesStorageKey =
  "lpp.pc.auto-translate.conversations.v1";

export const autoTranslateConversationModes = [
  "inherit",
  "enabled",
  "disabled",
] satisfies AutoTranslateConversationMode[];

export function normalizeAutoTranslateConversationMode(
  value: unknown,
): AutoTranslateConversationMode {
  return typeof value === "string" &&
    autoTranslateConversationModes.includes(value as AutoTranslateConversationMode)
    ? (value as AutoTranslateConversationMode)
    : "inherit";
}

export function resolveAutoTranslateEnabled(
  globalEnabled: boolean,
  mode: unknown,
) {
  const normalizedMode = normalizeAutoTranslateConversationMode(mode);
  if (normalizedMode === "enabled") return true;
  if (normalizedMode === "disabled") return false;
  return globalEnabled;
}

export function nextAutoTranslateConversationMode(
  mode: unknown,
): AutoTranslateConversationMode {
  const normalizedMode = normalizeAutoTranslateConversationMode(mode);
  if (normalizedMode === "inherit") return "enabled";
  if (normalizedMode === "enabled") return "disabled";
  return "inherit";
}

export function autoTranslateConversationPreferenceKey({
  conversationId,
  conversationKind,
  scopeKey,
}: AutoTranslateConversationPreferenceIdentity) {
  return `${stablePreferencePart(scopeKey)}::${conversationKind}::${stablePreferencePart(
    conversationId,
  )}`;
}

export function readAutoTranslateConversationPreference(
  storage: AutoTranslatePreferenceStorage | null,
  identity: AutoTranslateConversationPreferenceIdentity,
): AutoTranslateConversationMode {
  if (!storage || !identity.conversationId) return "inherit";
  const preferences = readAutoTranslateConversationPreferences(storage);
  return normalizeAutoTranslateConversationMode(
    preferences[autoTranslateConversationPreferenceKey(identity)],
  );
}

export function updateAutoTranslateConversationPreference(
  storage: AutoTranslatePreferenceStorage | null,
  update: AutoTranslateConversationPreferenceUpdate,
) {
  if (!storage || !update.conversationId) return;
  const preferences = readAutoTranslateConversationPreferences(storage);
  const key = autoTranslateConversationPreferenceKey(update);
  const mode = normalizeAutoTranslateConversationMode(update.mode);
  if (mode === "inherit") {
    delete preferences[key];
  } else {
    preferences[key] = mode;
  }
  storage.setItem(
    autoTranslateConversationPreferencesStorageKey,
    JSON.stringify(preferences),
  );
}

function readAutoTranslateConversationPreferences(
  storage: AutoTranslatePreferenceStorage,
): Record<string, AutoTranslateConversationMode> {
  const raw = storage.getItem(autoTranslateConversationPreferencesStorageKey);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [
        key,
        normalizeAutoTranslateConversationMode(value),
      ]),
    );
  } catch {
    return {};
  }
}

function stablePreferencePart(value?: string | null) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return encodeURIComponent(normalized || "default");
}
