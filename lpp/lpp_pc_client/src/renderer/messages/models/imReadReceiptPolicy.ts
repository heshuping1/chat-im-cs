import type { ImConversationType } from "../../data/im-read-model";

export function activeDirectReadStatusRefetchIntervalMs() {
  return 1_000;
}

export function shouldEnableDirectReadStatusQuery({
  conversationType,
  hasActiveConversation,
  hasSession,
}: {
  conversationType?: ImConversationType | null;
  hasActiveConversation: boolean;
  hasSession: boolean;
}) {
  return Boolean(hasSession && hasActiveConversation && conversationType === "direct");
}
