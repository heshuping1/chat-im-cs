import { useCallback, useRef } from "react";

export function useSerialTaskQueue() {
  const queueRef = useRef(Promise.resolve());

  return useCallback((task: () => Promise<void>) => {
    queueRef.current = queueRef.current.catch(() => undefined).then(task);
    return queueRef.current;
  }, []);
}
