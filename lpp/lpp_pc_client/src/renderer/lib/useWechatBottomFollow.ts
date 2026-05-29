import { useCallback, useEffect, useRef, useState } from "react";

const bottomThreshold = 80;
const conversationBottomLockMs = 2400;
const userScrollIntentMs = 450;

export function useWechatBottomFollow<TMessage>({
  conversationKey,
  isMineMessage,
  messages,
  messageKey,
}: {
  conversationKey?: string;
  isMineMessage: (message: TMessage) => boolean;
  messages: TMessage[];
  messageKey: (message: TMessage) => string;
}) {
  const stageRef = useRef<HTMLElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const isAtBottomRef = useRef(true);
  const bottomLockUntilRef = useRef(0);
  const userScrollIntentUntilRef = useRef(0);
  const previousConversationKeyRef = useRef<string | undefined>(undefined);
  const previousMessageKeysRef = useRef<Set<string>>(new Set());
  const [pendingNewMessageCount, setPendingNewMessageCount] = useState(0);

  const isBottomLocked = useCallback(
    () => Date.now() < bottomLockUntilRef.current,
    [],
  );

  const rawIsNearBottom = useCallback((threshold = bottomThreshold) => {
    const stage = stageRef.current;
    if (!stage) return true;
    return stage.scrollHeight - stage.scrollTop - stage.clientHeight <= threshold;
  }, []);

  const isNearBottom = useCallback(
    (threshold = bottomThreshold) => isBottomLocked() || rawIsNearBottom(threshold),
    [isBottomLocked, rawIsNearBottom],
  );

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const scroll = () => {
      const stage = stageRef.current;
      if (!stage) return;
      stage.scrollTo({ top: stage.scrollHeight, behavior });
      bottomRef.current?.scrollIntoView({ block: "end", behavior });
      isAtBottomRef.current = true;
      setPendingNewMessageCount(0);
    };
    requestAnimationFrame(scroll);
    window.setTimeout(scroll, 80);
    window.setTimeout(scroll, 260);
  }, []);

  const beginBottomLock = useCallback(() => {
    bottomLockUntilRef.current = Date.now() + conversationBottomLockMs;
  }, []);

  const handleScroll = useCallback(() => {
    const atBottom = rawIsNearBottom();
    if (
      !atBottom &&
      isBottomLocked() &&
      Date.now() <= userScrollIntentUntilRef.current
    ) {
      bottomLockUntilRef.current = 0;
    }
    if (!atBottom && isBottomLocked()) {
      scrollToBottom("auto");
      return;
    }
    isAtBottomRef.current = atBottom;
    if (atBottom) setPendingNewMessageCount(0);
  }, [isBottomLocked, rawIsNearBottom, scrollToBottom]);

  const jumpToLatest = useCallback(() => {
    scrollToBottom("smooth");
  }, [scrollToBottom]);

  useEffect(() => {
    const currentKeys = new Set(messages.map(messageKey));
    const previousKeys = previousMessageKeysRef.current;
    const conversationChanged = previousConversationKeyRef.current !== conversationKey;
    previousConversationKeyRef.current = conversationKey;
    previousMessageKeysRef.current = currentKeys;

    if (!conversationKey) {
      bottomLockUntilRef.current = 0;
      setPendingNewMessageCount(0);
      return;
    }
    if (conversationChanged) {
      beginBottomLock();
      isAtBottomRef.current = true;
      setPendingNewMessageCount(0);
      scrollToBottom("auto");
      return;
    }
    const addedMessages = messages.filter((message) => !previousKeys.has(messageKey(message)));
    if (addedMessages.length === 0) return;
    if (isAtBottomRef.current) {
      scrollToBottom("auto");
      return;
    }
    const incomingCount = addedMessages.filter((message) => !isMineMessage(message)).length;
    if (incomingCount > 0) {
      setPendingNewMessageCount((count) => count + incomingCount);
    }
    if (addedMessages.some(isMineMessage)) {
      scrollToBottom("smooth");
    }
  }, [beginBottomLock, conversationKey, isMineMessage, messageKey, messages, scrollToBottom]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const markUserScrollIntent = () => {
      userScrollIntentUntilRef.current = Date.now() + userScrollIntentMs;
    };
    stage.addEventListener("wheel", markUserScrollIntent, { passive: true });
    stage.addEventListener("pointerdown", markUserScrollIntent, { passive: true });
    stage.addEventListener("touchstart", markUserScrollIntent, { passive: true });
    stage.addEventListener("keydown", markUserScrollIntent);
    return () => {
      stage.removeEventListener("wheel", markUserScrollIntent);
      stage.removeEventListener("pointerdown", markUserScrollIntent);
      stage.removeEventListener("touchstart", markUserScrollIntent);
      stage.removeEventListener("keydown", markUserScrollIntent);
    };
  }, [conversationKey]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return undefined;
    const followBottomIfNeeded = () => {
      if (isBottomLocked() || isAtBottomRef.current) {
        scrollToBottom("auto");
      }
    };
    const resizeObserver = new ResizeObserver(followBottomIfNeeded);
    const observeCurrentLayout = () => {
      resizeObserver.observe(stage);
      Array.from(stage.children).forEach((child) => resizeObserver.observe(child));
    };
    observeCurrentLayout();
    const mutationObserver = new MutationObserver(() => {
      observeCurrentLayout();
      followBottomIfNeeded();
    });
    mutationObserver.observe(stage, { childList: true, subtree: false });
    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
    };
  }, [conversationKey, isBottomLocked, messages.length, scrollToBottom]);

  return {
    bottomRef,
    handleScroll,
    isNearBottom,
    jumpToLatest,
    pendingNewMessageCount,
    scrollToBottom,
    stageRef,
  };
}
