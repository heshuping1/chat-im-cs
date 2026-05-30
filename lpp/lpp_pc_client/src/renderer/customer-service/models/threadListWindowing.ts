export const defaultThreadRenderWindowSize = 120;
export const threadRenderWindowExpandStep = 120;

export interface ThreadRenderWindowInput<T> {
  enabled: boolean;
  expandedCount?: number;
  threads: T[];
  windowSize?: number;
}

export interface ThreadRenderWindow<T> {
  hiddenAfterCount: number;
  renderedThreads: T[];
  totalCount: number;
  windowed: boolean;
}

export function createThreadRenderWindow<T>({
  enabled,
  expandedCount = 0,
  threads,
  windowSize = defaultThreadRenderWindowSize,
}: ThreadRenderWindowInput<T>): ThreadRenderWindow<T> {
  if (!enabled || threads.length <= windowSize) {
    return {
      hiddenAfterCount: 0,
      renderedThreads: threads,
      totalCount: threads.length,
      windowed: false,
    };
  }

  const renderedCount = Math.min(threads.length, windowSize + expandedCount);
  return {
    hiddenAfterCount: Math.max(0, threads.length - renderedCount),
    renderedThreads: threads.slice(0, renderedCount),
    totalCount: threads.length,
    windowed: renderedCount < threads.length,
  };
}
