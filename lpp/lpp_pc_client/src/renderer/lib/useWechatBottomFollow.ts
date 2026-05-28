import { useCallback, useEffect, useRef, useState } from "react";

const bottomThreshold = 80;

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
  const previousConversationKeyRef = useRef<string | undefined>(undefined);
  const previousMessageKeysRef = useRef<Set<string>>(new Set());
  const [pendingNewMessageCount, setPendingNewMessageCount] = useState(0);

  const isNearBottom = useCallback((threshold = bottomThreshold) => {
    const stage = stageRef.current;
    if (!stage) return true;
    return stage.scrollHeight - stage.scrollTop - stage.clientHeight <= threshold;
  }, []);

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

  const handleScroll = useCallback(() => {
    const atBottom = isNearBottom();
    isAtBottomRef.current = atBottom;
    if (atBottom) setPendingNewMessageCount(0);
  }, [isNearBottom]);

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
      setPendingNewMessageCount(0);
      return;
    }
    if (conversationChanged) {
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
  }, [conversationKey, isMineMessage, messageKey, messages, scrollToBottom]);

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
