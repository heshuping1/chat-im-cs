import type { ConversationListItem } from "../../data/api/types";
import { strictImConversationType } from "../../data/im/im-conversation-boundary";

export type MessageCenterConversationType = "direct" | "group";

export function getImConversationType(
  conversation?: ConversationListItem,
): MessageCenterConversationType | undefined {
  return strictImConversationType(conversation?.conversationType);
}
