import type { ImConversationType } from "../../data/im-read-model";
import { realtimeSyncPolicy } from "../../data/realtime/realtime-sync-policy";

export function activeDirectReadStatusRefetchIntervalMs() {
  return realtimeSyncPolicy.im.directReadStatusFallbackPollMs;
}

export function activeDirectReadStatusFastTrackIntervalMs() {
  return 1_000;
}

export function activeDirectReadStatusFastTrackWindowMs() {
  return 15_000;
}

export function activeDirectReadStatusRefetchInBackground() {
  return realtimeSyncPolicy.im.directReadStatusRefetchInBackground;
}

export function activeDirectReadStatusStaleMs() {
  return realtimeSyncPolicy.im.directReadStatusStaleMs;
}

export function shouldEnableDirectReadStatusQuery({
  conversationType,
  hasActiveConversation,
  hasSession,
}: {
  conversationType?: ImConversationType | null;
  hasActiveConversation: boolean;
  hasSession: boolean;
}) {
  return Boolean(hasSession && hasActiveConversation && conversationType === "direct");
}
