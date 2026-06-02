import type { ConversationListItem } from "../../data/api/types";
import { chatConversationEntityFromImConversation } from "../../data/conversation/conversation-domain";
import { imConversationEffectiveUnreadCount } from "../../data/im-read/im-conversation-read-view";
import type { CurrentUserIdentity } from "../../data/message-display";
import { timestampFromDateValue } from "../../lib/format";
import { getImConversationType } from "./messageConversationTypeModel";

export type MessageConversationFilterKey = "all" | "friends" | "groups" | "unread";

export function sortMessageConversations(
  conversations: ConversationListItem[],
  userIdentity?: CurrentUserIdentity | null,
) {
  return [...conversations].sort((left, right) => {
    const pinnedDelta = Number(Boolean(right.isPinned)) - Number(Boolean(left.isPinned));
    if (pinnedDelta !== 0) return pinnedDelta;
    const unreadDelta =
      Number(imConversationEffectiveUnreadCount(right, userIdentity) > 0) -
      Number(imConversationEffectiveUnreadCount(left, userIdentity) > 0);
    if (unreadDelta !== 0) return unreadDelta;
    return conversationActivityTime(right) - conversationActivityTime(left);
  });
}

export function filterMessageConversations(
  conversations: ConversationListItem[],
  filter: MessageConversationFilterKey,
  keyword: string,
  userIdentity?: CurrentUserIdentity | null,
) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  return conversations.filter((item) => {
    const conversationType = getImConversationType(item);
    if (filter === "friends" && conversationType !== "direct") return false;
    if (filter === "groups" && conversationType !== "group") return false;
    if (
      filter === "unread" &&
      imConversationEffectiveUnreadCount(item, userIdentity) <= 0
    ) {
      return false;
    }
    if (!normalizedKeyword) return true;
    const entity = chatConversationEntityFromImConversation(item);
    return `${entity.title} ${entity.lastMessage?.preview ?? ""}`
      .toLowerCase()
      .includes(normalizedKeyword);
  });
}

function conversationActivityTime(conversation: ConversationListItem) {
  const entity = chatConversationEntityFromImConversation(conversation);
  return timestampFromDateValue(entity.lastActivityAt);
}
