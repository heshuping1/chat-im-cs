import { useEffect, useMemo, useRef } from "react";

import type { MessageItemDto } from "../data/api/types";
import {
  evaluateMessageDetailSync,
  type MessageDetailSyncTarget,
} from "../data/message-detail-sync";

export function useMessageDetailSync({
  enabled = true,
  isFetching,
  messages,
  refetch,
  target,
}: {
  enabled?: boolean;
  isFetching?: boolean;
  messages?: MessageItemDto[] | null;
  refetch: () => Promise<unknown>;
  target?: MessageDetailSyncTarget | null;
}) {
  const attemptsByKeyRef = useRef<Map<string, number>>(new Map());
  const inFlightKeyRef = useRef<string | null>(null);
  const lastAttemptedAtByKeyRef = useRef<Map<string, number>>(new Map());
  const retryTimerRef = useRef<number | null>(null);
  const targetIdentity = `${target?.targetType ?? ""}:${target?.targetId ?? ""}`;
  const alternateTargetIdentity = target?.alternateTargetIds?.join("|") ?? "";

  useEffect(() => {
    attemptsByKeyRef.current.clear();
    inFlightKeyRef.current = null;
    lastAttemptedAtByKeyRef.current.clear();
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    return () => {
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [targetIdentity]);

  const decision = useMemo(
    () => evaluateMessageDetailSync({ messages, target }),
    [
      messages,
      target?.lastMessageAt,
      target?.lastMessageId,
      target?.lastMessagePreview,
      target?.lastMessageSeq,
      target?.targetId,
      target?.targetType,
      alternateTargetIdentity,
    ],
  );

  useEffect(() => {
    if (!enabled || !decision.needsSync || !decision.syncKey) {
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      return;
    }
    if (isFetching || inFlightKeyRef.current === decision.syncKey) return;
    if ((attemptsByKeyRef.current.get(decision.syncKey) ?? 0) >= 5) return;

    const triggerRefetch = () => {
      if (!decision.syncKey) return;
      retryTimerRef.current = null;
      attemptsByKeyRef.current.set(
        decision.syncKey,
        (attemptsByKeyRef.current.get(decision.syncKey) ?? 0) + 1,
      );
      lastAttemptedAtByKeyRef.current.set(decision.syncKey, Date.now());
      inFlightKeyRef.current = decision.syncKey;
      void refetch().finally(() => {
        if (inFlightKeyRef.current === decision.syncKey) {
          inFlightKeyRef.current = null;
        }
      });
    };

    const lastAttemptedAt = lastAttemptedAtByKeyRef.current.get(decision.syncKey) ?? 0;
    const waitMs = Math.max(0, 1_000 - (Date.now() - lastAttemptedAt));
    if (waitMs > 0) {
      if (retryTimerRef.current === null) {
        retryTimerRef.current = window.setTimeout(triggerRefetch, waitMs);
      }
      return;
    }
    triggerRefetch();
  }, [decision.needsSync, decision.syncKey, enabled, isFetching, refetch]);

  return decision;
}
