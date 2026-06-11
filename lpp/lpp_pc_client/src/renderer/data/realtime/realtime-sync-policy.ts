export const realtimeSyncPolicy = {
  im: {
    activeMessagesFallbackPollMs: 60_000,
    activeMessagesRefetchInBackground: false,
    conversationListFallbackPollMs: 60_000,
    conversationListRefetchInBackground: false,
    conversationListStaleMs: 30_000,
    directReadStatusFallbackPollMs: 30_000,
    directReadStatusRefetchInBackground: false,
    directReadStatusStaleMs: 10_000,
  },
  customerService: {
    receptionFallbackPollMs: 30_000,
    receptionRefetchInBackground: true,
    workbenchThreadsFallbackPollMs: 3_000,
    workbenchThreadsRefetchInBackground: true,
  },
  spaces: {
    unreadSummaryFallbackPollMs: 60_000,
    unreadSummaryRefetchInBackground: true,
    unreadSummaryStaleMs: 30_000,
  },
} as const;
