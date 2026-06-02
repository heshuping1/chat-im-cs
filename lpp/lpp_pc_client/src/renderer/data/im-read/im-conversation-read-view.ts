import type { ConversationListItem } from "../api/types";
import {
  conversationUnreadDiagnostic,
  type ConversationUnreadDiagnostic,
  type CurrentUserIdentity,
} from "../message-display";

export type ImConversationVisibility = "hidden" | "listOnly" | "paneVisible";

export interface ResolveImConversationReadViewInput {
  activeConversationId?: string | null;
  conversation: ConversationListItem;
  identity?: CurrentUserIdentity | null;
  messagesLoaded?: boolean;
  visibility?: ImConversationVisibility;
}

export interface ImConversationReadView {
  diagnostic: ConversationUnreadDiagnostic;
  effectiveUnread: number;
  reason: string;
  shouldNotify: boolean;
  shouldShowBadge: boolean;
}

export function resolveImConversationReadView(
  input: ResolveImConversationReadViewInput,
): ImConversationReadView {
  const diagnostic = conversationUnreadDiagnostic(input.conversation, input.identity);
  const paneVisible =
    input.visibility === "paneVisible" &&
    input.messagesLoaded === true &&
    Boolean(input.activeConversationId) &&
    input.activeConversationId === input.conversation.conversationId;
  const effectiveUnread = paneVisible ? 0 : diagnostic.effectiveUnread;
  const reason = paneVisible ? "pane-visible" : diagnosticReason(diagnostic);
  return {
    diagnostic,
    effectiveUnread,
    reason,
    shouldNotify: effectiveUnread > 0 && !paneVisible,
    shouldShowBadge: effectiveUnread > 0,
  };
}

export function imConversationEffectiveUnreadCount(
  conversation: ConversationListItem,
  identity?: CurrentUserIdentity | null,
  options: {
    activeConversationId?: string | null;
    messagesLoaded?: boolean;
    visibility?: ImConversationVisibility;
  } = {},
) {
  return resolveImConversationReadView({
    activeConversationId: options.activeConversationId,
    conversation,
    identity,
    messagesLoaded: options.messagesLoaded,
    visibility: options.visibility,
  }).effectiveUnread;
}

function diagnosticReason(diagnostic: ConversationUnreadDiagnostic) {
  if (diagnostic.selfLastMessage) return "self-last-message";
  if (diagnostic.localReadCoverReason !== "none") {
    return `local-read-${diagnostic.localReadCoverReason}`;
  }
  if (diagnostic.effectiveUnread > 0) return "server-unread";
  return "none";
}
