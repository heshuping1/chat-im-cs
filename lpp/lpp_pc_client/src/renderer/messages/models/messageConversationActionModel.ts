import type { ConversationListItem } from "../../data/api-client";

export type ConversationContextAction = "pin" | "mute" | "hide" | "delete" | "restore";

export function nextConversationPinned(conversation: ConversationListItem) {
  return !conversation.isPinned;
}

export function nextConversationMuted(conversation: ConversationListItem) {
  return !conversation.isMuted;
}

export function conversationVisibilityHidden(action: ConversationContextAction) {
  return action === "hide" || action === "delete";
}

export function conversationActionRequiresDeleteConfirmation(action: ConversationContextAction) {
  return action === "delete";
}
