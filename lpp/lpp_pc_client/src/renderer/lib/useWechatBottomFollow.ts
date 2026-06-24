import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  conversationBottomScrollTop,
  createConversationViewportRegistry,
  decideConversationViewportAfterAppend,
  restoreConversationViewport,
  shouldKeepBottomPinnedAfterLayout,
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
  const bottomPinnedConversationKeysRef = useRef(new Set<string>());
  const userControlledConversationKeysRef = useRef(new Set<string>());
  const pendingNewMessageCountRef = useRef(0);
  const layoutBottomFollowSuppressedUntilRef = useRef(0);
  const recentOwnAppendUntilRef = useRef(0);
  const programmaticScrollTimerRef = useRef<number | null>(null);
  const viewportSnapshotRef = useRef<ViewportAnchorSnapshot | null>(null);
  const observedLayoutHeightsRef = useRef(new WeakMap<Element, number>());
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

  const markConversationBottomPinned = useCallback((key: string | undefined) => {
    if (!key) return;
    bottomPinnedConversationKeysRef.current.add(key);
    userControlledConversationKeysRef.current.delete(key);
  }, []);

  const clearConversationBottomPinned = useCallback((key: string | undefined) => {
    if (!key) return;
    bottomPinnedConversationKeysRef.current.delete(key);
  }, []);

  const shouldForceBottomPinned = useCallback(
    (key: string | undefined) =>
      Boolean(
        key &&
          bottomPinnedConversationKeysRef.current.has(key) &&
          !hasRecentUserScrollIntent(),
      ),
    [hasRecentUserScrollIntent],
  );

  const rememberConversationViewport = useCallback(
    (key: string | undefined) => {
      const stage = stageRef.current;
      if (!key || !stage) return;
      const forceBottomPinned = shouldForceBottomPinned(key);
      const atBottom = forceBottomPinned || rawIsNearBottom();
      const userControlled =
        !atBottom && userControlledConversationKeysRef.current.has(key);
      viewportRegistryRef.current.remember(key, {
        atBottom,
        pendingNewMessageCount: pendingNewMessageCountRef.current,
        scrollTop: stage.scrollTop,
        userControlled,
      });
    },
    [rawIsNearBottom, shouldForceBottomPinned],
  );

  const rememberConversationViewportSnapshot = useCallback(
    (key: string | undefined, snapshot: ViewportAnchorSnapshot | null) => {
      if (!key || !snapshot) return;
      const forceBottomPinned = shouldForceBottomPinned(key);
      const atBottom = forceBottomPinned || snapshot.atBottom;
      if (atBottom) userControlledConversationKeysRef.current.delete(key);
      const userControlled =
        !atBottom && userControlledConversationKeysRef.current.has(key);
      viewportRegistryRef.current.remember(key, {
        atBottom,
        pendingNewMessageCount: pendingNewMessageCountRef.current,
        scrollTop: snapshot.scrollTop,
        userControlled,
      });
    },
    [shouldForceBottomPinned],
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
      if (
        shouldKeepBottomPinnedAfterLayout({
          atBottom: Boolean(snapshot?.atBottom),
          recentUserScroll: hasRecentUserScrollIntent(),
        })
      ) {
        const stage = stageRef.current;
        if (stage) {
          const nextTop = conversationBottomScrollTop({
            clientHeight: stage.clientHeight,
            scrollHeight: stage.scrollHeight,
          });
          logChatScrollTrace({
            context: {
              nextTop,
              reason: "snapshot_was_at_bottom",
            },
            event: "bottom-follow.stabilize.pin-bottom.before",
            stack: true,
            stage,
          });
          markProgrammaticScroll(stage);
          if (Math.abs(stage.scrollTop - nextTop) > 1) {
            stage.scrollTop = nextTop;
          }
          isAtBottomRef.current = true;
          const nextSnapshot = captureViewportSnapshot();
          if (nextSnapshot) nextSnapshot.atBottom = true;
          viewportSnapshotRef.current = nextSnapshot;
          logChatScrollTrace({
            context: {
              nextTop,
              reason: "snapshot_was_at_bottom",
            },
            event: "bottom-follow.stabilize.pin-bottom.after",
            stage,
          });
          return;
        }
      }
      restoreAnchorPosition(snapshot);
      const nextSnapshot = captureViewportSnapshot();
      if (nextSnapshot && snapshot?.atBottom) {
        nextSnapshot.atBottom = true;
        isAtBottomRef.current = true;
      }
      viewportSnapshotRef.current = nextSnapshot;
    },
    [
      captureViewportSnapshot,
      hasRecentUserScrollIntent,
      markProgrammaticScroll,
      restoreAnchorPosition,
    ],
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
          conversationKey,
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
      markConversationBottomPinned(conversationKey);
      updatePendingNewMessageCount(0);
      storeViewportSnapshot();
      logChatScrollTrace({
        context: {
          conversationKey,
          behavior,
          nextTop,
          reason: "align_bottom",
        },
        event: "bottom-follow.align-bottom.after",
        stage,
      });
    },
    [
      conversationKey,
      markConversationBottomPinned,
      markProgrammaticScroll,
      storeViewportSnapshot,
      updatePendingNewMessageCount,
    ],
  );

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      alignBottom(behavior);
    },
    [alignBottom],
  );

  const handleScroll = useCallback(() => {
    const atBottom = rawIsNearBottom();
    const programmatic = stageRef.current?.dataset.programmaticScroll === "true";
    if (conversationKey) {
      if (atBottom) {
        markConversationBottomPinned(conversationKey);
      } else if (!programmatic && hasRecentUserScrollIntent()) {
        userControlledConversationKeysRef.current.add(conversationKey);
        clearConversationBottomPinned(conversationKey);
      }
    }
    logChatScrollTrace({
      context: {
        atBottom,
        conversationKey,
        programmatic,
        userControlled: conversationKey
          ? userControlledConversationKeysRef.current.has(conversationKey)
          : false,
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
    clearConversationBottomPinned,
    hasRecentUserScrollIntent,
    markConversationBottomPinned,
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
    const previousSnapshot = viewportSnapshotRef.current;
    if (conversationChanged) {
      rememberConversationViewportSnapshot(previousConversationKey, previousSnapshot);
    }
    previousConversationKeyRef.current = conversationKey;
    previousMessageKeysRef.current = currentKeys;
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
        if (restore.state.atBottom) {
          markConversationBottomPinned(conversationKey);
        } else {
          userControlledConversationKeysRef.current.add(conversationKey);
          clearConversationBottomPinned(conversationKey);
        }
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
      markConversationBottomPinned(conversationKey);
      updatePendingNewMessageCount(0);
      scrollToBottom("auto");
      return;
    }

    const addedMessages = messages.filter((message) => !previousKeys.has(messageKey(message)));
    if (addedMessages.length === 0) {
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
          event: "bottom-follow.commit.no-added.suppressed",
          stage: stageRef.current,
        });
        storeViewportSnapshot();
        return;
      }
      if (shouldForceBottomPinned(conversationKey)) {
        logChatScrollTrace({
          context: {
            conversationKey,
            reason: "bottom_pinned_no_added_messages",
          },
          event: "bottom-follow.commit.no-added.pin-bottom",
          stage: stageRef.current,
        });
        scrollToBottom("auto");
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
    if (shouldForceBottomPinned(conversationKey)) {
      scrollToBottom("auto");
      return;
    }
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
    rememberConversationViewportSnapshot,
    hasRecentUserScrollIntent,
    hasRecentOwnAppend,
    hasSuppressedLayoutBottomFollow,
    markConversationBottomPinned,
    clearConversationBottomPinned,
    shouldForceBottomPinned,
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
    const layoutHeightByElement = observedLayoutHeightsRef.current;
    const collectResizeChanges = (entries: ResizeObserverEntry[]) => {
      const changes = entries
        .map((entry) => {
          const target = entry.target;
          const previousHeight = layoutHeightByElement.get(target);
          const nextHeight = Math.round(entry.contentRect.height * 100) / 100;
          layoutHeightByElement.set(target, nextHeight);
          if (previousHeight === undefined) return undefined;
          const delta = Math.round((nextHeight - previousHeight) * 100) / 100;
          if (Math.abs(delta) <= 1) return undefined;
          const element = target instanceof HTMLElement ? target : null;
          const messageElement = element?.closest<HTMLElement>(messageAnchorSelector);
          return {
            delta,
            messageId: messageElement?.dataset.messageId,
            messageMine: messageElement?.dataset.messageMine,
            messageRenderKey: messageElement?.dataset.messageRenderKey,
            messageSeq: messageElement?.dataset.messageSeq,
            messageType: messageElement?.dataset.messageType,
            nextHeight,
            previousHeight,
            targetClassName: element?.className,
            targetTagName: element?.tagName.toLowerCase(),
          };
        })
        .filter((change): change is NonNullable<typeof change> => Boolean(change));
      if (changes.length === 0) return;
      logChatScrollTrace({
        context: {
          changes: changes.slice(0, 12),
          conversationKey,
          totalChangedEntries: changes.length,
        },
        event: "bottom-follow.observer.resize-entries",
        stage,
      });
    };
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
      if (shouldForceBottomPinned(conversationKey)) {
        logChatScrollTrace({
          context: {
            conversationKey,
            reason: "bottom_pinned_observed_layout_change",
          },
          event: "bottom-follow.observer.pin-bottom",
          stage,
        });
        scrollToBottom("auto");
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
    const resizeObserver = new ResizeObserver((entries) => {
      collectResizeChanges(entries);
      scheduleLayoutStabilization();
    });
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
    scrollToBottom,
    shouldForceBottomPinned,
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
