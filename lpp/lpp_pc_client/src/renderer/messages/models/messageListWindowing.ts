export const defaultMessageRenderWindowSize = 240;
export const messageRenderWindowExpandStep = 240;

export interface MessageRenderWindowExpansionState {
  expandedOlderCount: number;
  resetKey: string;
}

export interface MessageRenderWindowInput<T> {
  enabled: boolean;
  expandedOlderCount?: number;
  messages: T[];
  windowSize?: number;
}

export interface MessageRenderWindow<T> {
  hiddenBeforeCount: number;
  renderedMessages: T[];
  totalCount: number;
  windowed: boolean;
}

export function createMessageRenderWindow<T>({
  enabled,
  expandedOlderCount = 0,
  messages,
  windowSize = defaultMessageRenderWindowSize,
}: MessageRenderWindowInput<T>): MessageRenderWindow<T> {
  if (!enabled || messages.length <= windowSize) {
    return {
      hiddenBeforeCount: 0,
      renderedMessages: messages,
      totalCount: messages.length,
      windowed: false,
    };
  }

  const renderedCount = Math.min(messages.length, windowSize + expandedOlderCount);
  const hiddenBeforeCount = Math.max(0, messages.length - renderedCount);
  return {
    hiddenBeforeCount,
    renderedMessages: messages.slice(hiddenBeforeCount),
    totalCount: messages.length,
    windowed: hiddenBeforeCount > 0,
  };
}

export function messageRenderWindowResetKey({
  conversationId,
  messageCount,
}: {
  conversationId: string;
  messageCount: number;
}) {
  return `${conversationId}:${messageCount}`;
}

export function resetMessageRenderWindowExpansion(
  resetKey: string,
): MessageRenderWindowExpansionState {
  return {
    expandedOlderCount: 0,
    resetKey,
  };
}

export function effectiveMessageRenderWindowExpandedOlderCount(
  state: MessageRenderWindowExpansionState,
  resetKey: string,
) {
  return state.resetKey === resetKey ? state.expandedOlderCount : 0;
}

export function expandMessageRenderWindowOlder({
  resetKey,
  state,
  step = messageRenderWindowExpandStep,
}: {
  resetKey: string;
  state: MessageRenderWindowExpansionState;
  step?: number;
}): MessageRenderWindowExpansionState {
  return {
    expandedOlderCount:
      effectiveMessageRenderWindowExpandedOlderCount(state, resetKey) + step,
    resetKey,
  };
}
