import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  createConversationViewportRegistry,
  decideConversationViewportAfterAppend,
  restoreConversationViewport,
  shouldKeepBottomPinnedAfterLayout,
} from "../messages/models/messageConversationViewportModel";

const bottomThreshold = 80;
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
  const userScrollIntentUntilRef = useRef(0);
  const previousConversationKeyRef = useRef<string | undefined>(undefined);
  const previousMessageKeysRef = useRef<Set<string>>(new Set());
  const viewportRegistryRef = useRef(createConversationViewportRegistry());
  const pendingNewMessageCountRef = useRef(0);
  const scheduledScrollFrameRef = useRef<number | null>(null);
  const [pendingNewMessageCount, setPendingNewMessageCount] = useState(0);

  const updatePendingNewMessageCount = useCallback(
    (next: number | ((current: number) => number)) => {
      setPendingNewMessageCount((current) => {
        const value = typeof next === "function" ? next(current) : next;
        pendingNewMessageCountRef.current = value;
        return value;
      });
    },
    [],
  );

  const rawIsNearBottom = useCallback((threshold = bottomThreshold) => {
    const stage = stageRef.current;
    if (!stage) return true;
    return stage.scrollHeight - stage.scrollTop - stage.clientHeight <= threshold;
  }, []);

  const hasRecentUserScrollIntent = useCallback(
    () => Date.now() <= userScrollIntentUntilRef.current,
    [],
  );

  const rememberConversationViewport = useCallback(
    (key: string | undefined) => {
      const stage = stageRef.current;
      if (!key || !stage) return;
      viewportRegistryRef.current.remember(key, {
        atBottom: rawIsNearBottom(),
        pendingNewMessageCount: pendingNewMessageCountRef.current,
        scrollTop: stage.scrollTop,
      });
    },
    [rawIsNearBottom],
  );

  const isNearBottom = useCallback(
    (threshold = bottomThreshold) => rawIsNearBottom(threshold),
    [rawIsNearBottom],
  );

  const alignBottom = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      const stage = stageRef.current;
      if (!stage) return;
      stage.scrollTo({ top: stage.scrollHeight, behavior });
      isAtBottomRef.current = true;
      updatePendingNewMessageCount(0);
    },
    [updatePendingNewMessageCount],
  );

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      alignBottom(behavior);
      if (scheduledScrollFrameRef.current !== null) {
        cancelAnimationFrame(scheduledScrollFrameRef.current);
      }
      scheduledScrollFrameRef.current = requestAnimationFrame(() => {
        scheduledScrollFrameRef.current = null;
        alignBottom(behavior);
      });
    },
    [alignBottom],
  );

  const handleScroll = useCallback(() => {
    const atBottom = rawIsNearBottom();
    isAtBottomRef.current = atBottom;
    if (atBottom) updatePendingNewMessageCount(0);
    rememberConversationViewport(conversationKey);
  }, [
    conversationKey,
    rawIsNearBottom,
    rememberConversationViewport,
    updatePendingNewMessageCount,
  ]);

  const jumpToLatest = useCallback(() => {
    scrollToBottom("smooth");
  }, [scrollToBottom]);

  useLayoutEffect(() => {
    const currentKeys = new Set(messages.map(messageKey));
    const previousConversationKey = previousConversationKeyRef.current;
    const previousKeys = previousMessageKeysRef.current;
    const conversationChanged = previousConversationKey !== conversationKey;
    if (conversationChanged) rememberConversationViewport(previousConversationKey);
    previousConversationKeyRef.current = conversationKey;
    previousMessageKeysRef.current = currentKeys;

    if (!conversationKey) {
      updatePendingNewMessageCount(0);
      return;
    }

    if (conversationChanged) {
      const restore = restoreConversationViewport(viewportRegistryRef.current, conversationKey);
      if (restore.kind === "restore") {
        isAtBottomRef.current = restore.state.atBottom;
        updatePendingNewMessageCount(restore.state.pendingNewMessageCount);
        const restoreScroll = () => {
          const stage = stageRef.current;
          if (!stage) return;
          if (restore.state.atBottom) {
            stage.scrollTo({ top: stage.scrollHeight, behavior: "auto" });
          } else {
            stage.scrollTo({ top: restore.state.scrollTop, behavior: "auto" });
          }
        };
        restoreScroll();
        requestAnimationFrame(restoreScroll);
        return;
      }
      isAtBottomRef.current = true;
      updatePendingNewMessageCount(0);
      scrollToBottom("auto");
      return;
    }

    const addedMessages = messages.filter((message) => !previousKeys.has(messageKey(message)));
    if (addedMessages.length === 0) return;

    const decision = decideConversationViewportAfterAppend({
      addedIncomingCount: addedMessages.filter((message) => !isMineMessage(message)).length,
      addedMineCount: addedMessages.filter(isMineMessage).length,
      wasAtBottom: isAtBottomRef.current,
    });
    if (decision.kind === "follow-bottom") {
      scrollToBottom(decision.behavior);
    } else if (decision.pendingNewMessageDelta > 0) {
      updatePendingNewMessageCount((count) => count + decision.pendingNewMessageDelta);
    }
  }, [
    conversationKey,
    isMineMessage,
    messageKey,
    messages,
    rememberConversationViewport,
    scrollToBottom,
    updatePendingNewMessageCount,
  ]);

  useEffect(
    () => () => {
      rememberConversationViewport(previousConversationKeyRef.current);
    },
    [rememberConversationViewport],
  );

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
    let resizeFrame: number | null = null;
    const followBottomIfNeeded = () => {
      if (
        shouldKeepBottomPinnedAfterLayout({
          atBottom: isAtBottomRef.current,
          recentUserScroll: hasRecentUserScrollIntent(),
        })
      ) {
        scrollToBottom("auto");
      }
    };
    const scheduleFollowBottom = () => {
      if (resizeFrame !== null) return;
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;
        followBottomIfNeeded();
      });
    };
    const resizeObserver = new ResizeObserver(scheduleFollowBottom);
    const observeCurrentLayout = () => {
      resizeObserver.observe(stage);
      Array.from(stage.children).forEach((child) => resizeObserver.observe(child));
    };
    observeCurrentLayout();
    const mutationObserver = new MutationObserver(() => {
      observeCurrentLayout();
      scheduleFollowBottom();
    });
    mutationObserver.observe(stage, { childList: true, subtree: false });
    return () => {
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
      mutationObserver.disconnect();
      resizeObserver.disconnect();
    };
  }, [conversationKey, hasRecentUserScrollIntent, messages.length, scrollToBottom]);

  useEffect(
    () => () => {
      if (scheduledScrollFrameRef.current !== null) {
        cancelAnimationFrame(scheduledScrollFrameRef.current);
      }
    },
    [],
  );

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
