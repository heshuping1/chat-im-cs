export const defaultMessageRenderWindowSize = 240;
export const messageRenderWindowExpandStep = 240;

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
