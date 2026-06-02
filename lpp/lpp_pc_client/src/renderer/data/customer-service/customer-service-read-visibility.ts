import type { CustomerServiceThreadOpenSource } from "../workspace-ui/workspace-store-core";

export type CustomerServiceThreadReadVisibility = "hidden" | "listOnly" | "detailVisible";

export interface ResolveCustomerServiceThreadReadVisibilityInput {
  activeModule?: string | null;
  activeThreadId?: string | null;
  activeThreadOpenSource?: CustomerServiceThreadOpenSource | null;
  conversationId?: string | null;
  detailLoaded: boolean;
  threadId?: string | null;
}

export function resolveCustomerServiceThreadReadVisibility(
  input: ResolveCustomerServiceThreadReadVisibilityInput,
): CustomerServiceThreadReadVisibility {
  const threadId = input.threadId?.trim();
  const conversationId = input.conversationId?.trim();
  const activeThreadId = input.activeThreadId?.trim();
  if (
    input.activeModule !== "onlineService" ||
    !activeThreadId ||
    (!threadId && !conversationId) ||
    (activeThreadId !== threadId && activeThreadId !== conversationId)
  ) {
    return "hidden";
  }
  if (!isExplicitCustomerServiceThreadOpenSource(input.activeThreadOpenSource)) {
    return "listOnly";
  }
  return input.detailLoaded ? "detailVisible" : "listOnly";
}

export function canMarkCustomerServiceThreadRead(input: {
  visibility: CustomerServiceThreadReadVisibility;
}) {
  return input.visibility === "detailVisible";
}

export function isExplicitCustomerServiceThreadOpenSource(
  source?: CustomerServiceThreadOpenSource | null,
) {
  return source === "user" || source === "reminder" || source === "claim";
}
