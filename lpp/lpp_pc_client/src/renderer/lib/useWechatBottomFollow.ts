import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  conversationBottomScrollTop,
  createConversationViewportRegistry,
  decideConversationViewportAfterAppend,
  restoreConversationViewport,
} from "../messages/models/messageConversationViewportModel";
import { logChatScrollTrace } from "./chatScrollTrace";

const bottomThreshold = 80;
const userScrollIntentMs = 450;
const programmaticScrollSuppressMs = 700;
const layoutBottomFollowSuppressMs = 260;
const recentOwnAppendSuppressMs = 420;
const messageAnchorSelector = "[data-message-render-key]";

interface ViewportAnchorSnapshot {
  anchorKey?: string;
  anchorTop?: number;
  atBottom: boolean;
  scrollHeight: number;
  scrollTop: number;
}

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
  const layoutBottomFollowSuppressedUntilRef = useRef(0);
  const recentOwnAppendUntilRef = useRef(0);
  const programmaticScrollTimerRef = useRef<number | null>(null);
  const viewportSnapshotRef = useRef<ViewportAnchorSnapshot | null>(null);
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

  const hasSuppressedLayoutBottomFollow = useCallback(
    () => Date.now() <= layoutBottomFollowSuppressedUntilRef.current,
    [],
  );

  const hasRecentOwnAppend = useCallback(
    () => Date.now() <= recentOwnAppendUntilRef.current,
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

  const markProgrammaticScroll = useCallback((stage: HTMLElement) => {
    stage.dataset.programmaticScroll = "true";
    if (programmaticScrollTimerRef.current !== null) {
      window.clearTimeout(programmaticScrollTimerRef.current);
    }
    programmaticScrollTimerRef.current = window.setTimeout(() => {
      delete stage.dataset.programmaticScroll;
      programmaticScrollTimerRef.current = null;
    }, programmaticScrollSuppressMs);
  }, []);

  const captureViewportSnapshot = useCallback((): ViewportAnchorSnapshot | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const stageRect = stage.getBoundingClientRect();
    const anchorElement = Array.from(
      stage.querySelectorAll<HTMLElement>(messageAnchorSelector),
    ).find((element) => {
      const rect = element.getBoundingClientRect();
      return rect.bottom > stageRect.top + 1 && rect.top < stageRect.bottom - 1;
    });
    const anchorKey = anchorElement?.dataset.messageRenderKey;
    const anchorTop = anchorElement
      ? anchorElement.getBoundingClientRect().top - stageRect.top
      : undefined;
    return {
      ...(anchorKey && anchorTop !== undefined ? { anchorKey, anchorTop } : {}),
      atBottom: rawIsNearBottom(),
      scrollHeight: stage.scrollHeight,
      scrollTop: stage.scrollTop,
    };
  }, [rawIsNearBottom]);

  const storeViewportSnapshot = useCallback(() => {
    viewportSnapshotRef.current = captureViewportSnapshot();
  }, [captureViewportSnapshot]);

  const restoreAnchorPosition = useCallback(
    (snapshot: ViewportAnchorSnapshot | null) => {
      const stage = stageRef.current;
      if (!stage || !snapshot?.anchorKey || snapshot.anchorTop === undefined) return false;
      const anchorElement = Array.from(
        stage.querySelectorAll<HTMLElement>(messageAnchorSelector),
      ).find((element) => element.dataset.messageRenderKey === snapshot.anchorKey);
      if (!anchorElement) return false;
      const stageRect = stage.getBoundingClientRect();
      const nextAnchorTop = anchorElement.getBoundingClientRect().top - stageRect.top;
      const delta = nextAnchorTop - snapshot.anchorTop;
      if (Math.abs(delta) <= 1) return false;
      logChatScrollTrace({
        context: {
          anchorKey: snapshot.anchorKey,
          delta,
          nextAnchorTop,
          previousAnchorTop: snapshot.anchorTop,
          reason: "anchor_position_changed",
        },
        event: "bottom-follow.restore-anchor.before",
        stack: true,
        stage,
      });
      markProgrammaticScroll(stage);
      stage.scrollTop += delta;
      isAtBottomRef.current = rawIsNearBottom();
      logChatScrollTrace({
        context: {
          anchorKey: snapshot.anchorKey,
          delta,
          reason: "anchor_position_changed",
        },
        event: "bottom-follow.restore-anchor.after",
        stage,
      });
      return true;
    },
    [markProgrammaticScroll, rawIsNearBottom],
  );

  const stabilizeViewportFromSnapshot = useCallback(
    (snapshot: ViewportAnchorSnapshot | null) => {
      restoreAnchorPosition(snapshot);
      const nextSnapshot = captureViewportSnapshot();
      if (nextSnapshot && snapshot?.atBottom) {
        nextSnapshot.atBottom = true;
        isAtBottomRef.current = true;
      }
      viewportSnapshotRef.current = nextSnapshot;
    },
    [captureViewportSnapshot, restoreAnchorPosition],
  );

  const alignBottom = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      const stage = stageRef.current;
      if (!stage) return;
      layoutBottomFollowSuppressedUntilRef.current =
        Date.now() + layoutBottomFollowSuppressMs;
      markProgrammaticScroll(stage);
      const nextTop = conversationBottomScrollTop({
        clientHeight: stage.clientHeight,
        scrollHeight: stage.scrollHeight,
      });
      logChatScrollTrace({
        context: {
          behavior,
          nextTop,
          reason: "align_bottom",
        },
        event: "bottom-follow.align-bottom.before",
        stack: true,
        stage,
      });
      if (Math.abs(stage.scrollTop - nextTop) > 1) {
        if (behavior === "smooth") {
          stage.scrollTo({ top: nextTop, behavior });
        } else {
          stage.scrollTop = nextTop;
        }
      }
      isAtBottomRef.current = true;
      updatePendingNewMessageCount(0);
      storeViewportSnapshot();
      logChatScrollTrace({
        context: {
          behavior,
          nextTop,
          reason: "align_bottom",
        },
        event: "bottom-follow.align-bottom.after",
        stage,
      });
    },
    [markProgrammaticScroll, storeViewportSnapshot, updatePendingNewMessageCount],
  );

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      alignBottom(behavior);
    },
    [alignBottom],
  );

  const handleScroll = useCallback(() => {
    const atBottom = rawIsNearBottom();
    logChatScrollTrace({
      context: {
        atBottom,
        conversationKey,
        programmatic: stageRef.current?.dataset.programmaticScroll === "true",
      },
      event: "bottom-follow.scroll-event",
      stage: stageRef.current,
    });
    isAtBottomRef.current = atBottom;
    if (atBottom) updatePendingNewMessageCount(0);
    rememberConversationViewport(conversationKey);
    storeViewportSnapshot();
  }, [
    conversationKey,
    rawIsNearBottom,
    rememberConversationViewport,
    storeViewportSnapshot,
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
    const previousSnapshot = viewportSnapshotRef.current;
    logChatScrollTrace({
      context: {
        conversationChanged,
        conversationKey,
        currentKeyCount: currentKeys.size,
        previousKeyCount: previousKeys.size,
        previousSnapshotAtBottom: previousSnapshot?.atBottom,
        previousSnapshotScrollHeight: previousSnapshot?.scrollHeight,
        previousSnapshotScrollTop: previousSnapshot?.scrollTop,
      },
      event: "bottom-follow.commit.start",
      stage: stageRef.current,
    });

    if (!conversationKey) {
      updatePendingNewMessageCount(0);
      viewportSnapshotRef.current = null;
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
            markProgrammaticScroll(stage);
            stage.scrollTo({
              top: conversationBottomScrollTop({
                clientHeight: stage.clientHeight,
                scrollHeight: stage.scrollHeight,
              }),
              behavior: "auto",
            });
          } else {
            markProgrammaticScroll(stage);
            stage.scrollTo({ top: restore.state.scrollTop, behavior: "auto" });
          }
        };
        restoreScroll();
        storeViewportSnapshot();
        return;
      }
      isAtBottomRef.current = true;
      updatePendingNewMessageCount(0);
      scrollToBottom("auto");
      return;
    }

    const addedMessages = messages.filter((message) => !previousKeys.has(messageKey(message)));
    if (addedMessages.length === 0) {
      if (hasRecentOwnAppend()) {
        logChatScrollTrace({
          context: {
            conversationKey,
            reason: "no_added_messages_recent_own_append",
          },
          event: "bottom-follow.commit.no-added.suppressed",
          stage: stageRef.current,
        });
        storeViewportSnapshot();
        return;
      }
      logChatScrollTrace({
        context: {
          conversationKey,
          reason: "no_added_messages_restore_snapshot",
        },
        event: "bottom-follow.commit.no-added.restore",
        stage: stageRef.current,
      });
      stabilizeViewportFromSnapshot(previousSnapshot);
      return;
    }

    const addedIncomingCount = addedMessages.filter((message) => !isMineMessage(message)).length;
    const addedMineCount = addedMessages.filter(isMineMessage).length;
    const decision = decideConversationViewportAfterAppend({
      addedIncomingCount,
      addedMineCount,
      wasAtBottom: isAtBottomRef.current,
    });
    logChatScrollTrace({
      context: {
        addedIncomingCount,
        addedKeys: addedMessages.map(messageKey),
        addedMineCount,
        conversationKey,
        decision,
        wasAtBottom: isAtBottomRef.current,
      },
      event: "bottom-follow.commit.added",
      stage: stageRef.current,
    });
    if (decision.kind === "follow-bottom") {
      if (addedMineCount > 0) {
        recentOwnAppendUntilRef.current = Date.now() + recentOwnAppendSuppressMs;
      }
      scrollToBottom(decision.behavior);
      return;
    }
    if (decision.pendingNewMessageDelta > 0) {
      updatePendingNewMessageCount((count) => count + decision.pendingNewMessageDelta);
    }
    stabilizeViewportFromSnapshot(previousSnapshot);
  }, [
    conversationKey,
    isMineMessage,
    messageKey,
    messages,
    rememberConversationViewport,
    hasRecentOwnAppend,
    scrollToBottom,
    stabilizeViewportFromSnapshot,
    storeViewportSnapshot,
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
    const stabilizeObservedLayout = () => {
      if (
        hasSuppressedLayoutBottomFollow() ||
        hasRecentOwnAppend() ||
        hasRecentUserScrollIntent()
      ) {
        logChatScrollTrace({
          context: {
            conversationKey,
            recentOwnAppend: hasRecentOwnAppend(),
            recentUserScrollIntent: hasRecentUserScrollIntent(),
            suppressedLayoutBottomFollow: hasSuppressedLayoutBottomFollow(),
          },
          event: "bottom-follow.observer.suppressed",
          stage,
        });
        storeViewportSnapshot();
        return;
      }
      logChatScrollTrace({
        context: {
          conversationKey,
          reason: "observed_layout_change",
        },
        event: "bottom-follow.observer.stabilize",
        stage,
      });
      stabilizeViewportFromSnapshot(viewportSnapshotRef.current);
    };
    const scheduleLayoutStabilization = () => {
      if (resizeFrame !== null) return;
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;
        stabilizeObservedLayout();
      });
    };
    const resizeObserver = new ResizeObserver(scheduleLayoutStabilization);
    const observeCurrentLayout = () => {
      resizeObserver.observe(stage);
      Array.from(stage.children).forEach((child) => resizeObserver.observe(child));
    };
    observeCurrentLayout();
    const mutationObserver = new MutationObserver(() => {
      observeCurrentLayout();
      scheduleLayoutStabilization();
    });
    mutationObserver.observe(stage, { childList: true, subtree: false });
    return () => {
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
      mutationObserver.disconnect();
      resizeObserver.disconnect();
    };
  }, [
    conversationKey,
    hasRecentUserScrollIntent,
    hasRecentOwnAppend,
    hasSuppressedLayoutBottomFollow,
    messages.length,
    stabilizeViewportFromSnapshot,
    storeViewportSnapshot,
  ]);

  useEffect(
    () => () => {
      if (programmaticScrollTimerRef.current !== null) {
        window.clearTimeout(programmaticScrollTimerRef.current);
      }
      if (stageRef.current) {
        delete stageRef.current.dataset.programmaticScroll;
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
