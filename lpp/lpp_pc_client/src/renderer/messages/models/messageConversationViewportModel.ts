export interface ConversationViewportState {
  atBottom: boolean;
  pendingNewMessageCount: number;
  scrollTop: number;
}

export interface ConversationViewportRegistry {
  get(conversationId: string): ConversationViewportState | undefined;
  remember(conversationId: string, state: ConversationViewportState): void;
}

export type ConversationViewportRestore =
  | { kind: "initial-bottom" }
  | { kind: "restore"; state: ConversationViewportState };

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
  return state ? { kind: "restore", state } : { kind: "initial-bottom" };
}
