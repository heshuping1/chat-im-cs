import type { ConversationListItem } from "../api/types";
import { getCustomerServiceConversationIndex } from "../customer-service/cs-conversation-index";

export type StrictImConversationType = "direct" | "group";

export function normalizeConversationType(value?: string | null) {
  return String(value ?? "").trim().toLowerCase().replace(/-/g, "_");
}

export function isStrictImConversationType(
  value?: string | null,
): value is StrictImConversationType {
  const normalized = normalizeConversationType(value);
  return normalized === "direct" || normalized === "group";
}

export function strictImConversationType(
  value?: string | null,
): StrictImConversationType | undefined {
  const normalized = normalizeConversationType(value);
  if (normalized === "direct") return "direct";
  if (normalized === "group") return "group";
  return undefined;
}

export function isVisibleImConversationInScope(
  item: ConversationListItem,
  scopeKey?: string,
) {
  if (!isStrictImConversationType(item.conversationType)) return false;
  const indexed = getCustomerServiceConversationIndex(item.conversationId, scopeKey);
  return indexed?.threadType !== "temp_session" && indexed?.threadType !== "im_direct";
}
