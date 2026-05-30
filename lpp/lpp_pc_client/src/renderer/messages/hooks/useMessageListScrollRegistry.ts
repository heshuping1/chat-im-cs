import { useCallback, useMemo, useRef } from "react";

export function useMessageListScrollRegistry() {
  const messageElementRefs = useRef(new Map<string, HTMLDivElement>());

  const registerMessageElement = useCallback(
    (messageId: string, element: HTMLDivElement | null) => {
      if (element) {
        messageElementRefs.current.set(messageId, element);
      } else {
        messageElementRefs.current.delete(messageId);
      }
    },
    [],
  );

  const scrollToMessage = useCallback(
    (messageId: string, onMissing?: () => void) => {
      const scroll = () => {
        const element = messageElementRefs.current.get(messageId);
        if (!element) {
          onMissing?.();
          return;
        }
        element.scrollIntoView({ block: "center", behavior: "smooth" });
        element.classList.add("pc-chat-unread-target");
        window.setTimeout(() => element.classList.remove("pc-chat-unread-target"), 1200);
      };
      requestAnimationFrame(scroll);
      window.setTimeout(scroll, 80);
    },
    [],
  );

  return useMemo(
    () => ({
      registerMessageElement,
      scrollToMessage,
    }),
    [registerMessageElement, scrollToMessage],
  );
}
