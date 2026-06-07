import { realtimeSyncPolicy } from "../realtime/realtime-sync-policy";

export const customerServiceRealtimePollIntervalMs =
  realtimeSyncPolicy.customerService.workbenchThreadsFallbackPollMs;

export const customerServiceRealtimeRefetchInBackground =
  realtimeSyncPolicy.customerService.workbenchThreadsRefetchInBackground;

export const customerServiceReceptionPollIntervalMs =
  realtimeSyncPolicy.customerService.receptionFallbackPollMs;

export const customerServiceReceptionRefetchInBackground =
  realtimeSyncPolicy.customerService.receptionRefetchInBackground;
