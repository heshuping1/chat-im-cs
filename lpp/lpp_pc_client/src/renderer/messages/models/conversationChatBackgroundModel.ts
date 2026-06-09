import {
  defaultChatBackgroundPreset,
  normalizeChatBackgroundSetting,
  type ChatBackgroundSetting,
} from "../../settings/models/chatBackgroundModel";

const storagePrefix = "lpp.pc.conversationChatBackground.";

export function conversationChatBackgroundStorageKey(conversationId: string) {
  return `${storagePrefix}${conversationId}`;
}

export function readConversationChatBackground(conversationId?: string | null) {
  if (!conversationId || typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(conversationChatBackgroundStorageKey(conversationId));
    if (!raw) return undefined;
    return normalizeChatBackgroundSetting(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

export function writeConversationChatBackground(
  conversationId: string,
  value: ChatBackgroundSetting,
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    conversationChatBackgroundStorageKey(conversationId),
    JSON.stringify(normalizeChatBackgroundSetting(value)),
  );
}

export function clearConversationChatBackground(conversationId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(conversationChatBackgroundStorageKey(conversationId));
}

export function effectiveConversationChatBackground(
  conversationValue: ChatBackgroundSetting | undefined,
  globalValue: unknown,
) {
  return conversationValue ?? normalizeChatBackgroundSetting(globalValue ?? defaultChatBackgroundPreset);
}
