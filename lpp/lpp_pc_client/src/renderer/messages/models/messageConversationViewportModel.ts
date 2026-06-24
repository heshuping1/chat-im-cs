export interface ConversationViewportState {
  atBottom: boolean;
  pendingNewMessageCount: number;
  scrollTop: number;
  userControlled?: boolean;
}

export interface ConversationViewportAppendInput {
  addedIncomingCount: number;
  addedMineCount: number;
  wasAtBottom: boolean;
}

export type ConversationViewportAppendDecision =
  | { kind: "follow-bottom"; behavior: ScrollBehavior }
  | { kind: "keep-position"; pendingNewMessageDelta: number };

export interface ConversationViewportRegistry {
  get(conversationId: string): ConversationViewportState | undefined;
  remember(conversationId: string, state: ConversationViewportState): void;
}

export type ConversationViewportRestore =
  | { kind: "initial-bottom" }
  | { kind: "restore"; state: ConversationViewportState };

export function conversationBottomScrollTop({
  clientHeight,
  scrollHeight,
}: {
  clientHeight: number;
  scrollHeight: number;
}) {
  return Math.max(0, scrollHeight - clientHeight);
}

export function createConversationViewportRegistry(): ConversationViewportRegistry {
  const states = new Map<string, ConversationViewportState>();
  return {
    get: (conversationId) => states.get(conversationId),
    remember: (conversationId, state) => {
      states.set(conversationId, state);
    },
  };
}

export function restoreConversationViewport(
  registry: ConversationViewportRegistry,
  conversationId: string,
): ConversationViewportRestore {
  const state = registry.get(conversationId);
  if (!state) return { kind: "initial-bottom" };
  if (!state.atBottom && !state.userControlled) return { kind: "initial-bottom" };
  return { kind: "restore", state };
}

export function shouldKeepBottomPinnedAfterLayout({
  atBottom,
  recentUserScroll,
}: {
  atBottom: boolean;
  recentUserScroll: boolean;
}) {
  return atBottom && !recentUserScroll;
}

export function decideConversationViewportAfterAppend({
  addedIncomingCount,
  addedMineCount,
  wasAtBottom,
}: ConversationViewportAppendInput): ConversationViewportAppendDecision {
  if (wasAtBottom) return { kind: "follow-bottom", behavior: "auto" };
  if (addedMineCount > 0) return { kind: "follow-bottom", behavior: "auto" };
  return {
    kind: "keep-position",
    pendingNewMessageDelta: Math.max(0, addedIncomingCount),
  };
}
