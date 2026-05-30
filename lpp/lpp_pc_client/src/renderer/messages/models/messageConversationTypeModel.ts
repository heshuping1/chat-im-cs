import type { ConversationListItem } from "../../data/api/types";

export type MessageCenterConversationType = "direct" | "group";

export function getImConversationType(
  conversation?: ConversationListItem,
): MessageCenterConversationType | undefined {
  const conversationType = conversation?.conversationType
    ?.trim()
    .toLowerCase()
    .replace(/-/g, "_");
  if (
    conversationType === "direct" ||
    conversationType === "im_direct" ||
    conversationType === "direct_chat" ||
    conversationType === "direct_customer" ||
    conversationType === "customer_direct"
  ) {
    return "direct";
  }
  if (
    conversationType === "group" ||
    conversationType === "im_group" ||
    conversationType === "group_chat"
  ) {
    return "group";
  }
  return undefined;
}
