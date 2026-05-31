import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuthSession } from "../../data/auth/auth-store";
import {
  notifyDesktopOrBrowser,
  shouldShowDesktopNotification,
} from "../../data/reminder/reminder-service";
import {
  useDismissRealtimeRemindersForTarget,
  usePushRealtimeReminder,
} from "../../data/reminder/reminder-store";
import { requireApiClient } from "../../data/runtime";
import { usePcSettings } from "../../data/settings/settings-store";
import {
  useActiveModule,
  useContactFilter,
} from "../../data/workspace-ui/workspace-ui-store";
import {
  buildFriendRequestReminder,
  friendRequestReminderKey,
  pendingIncomingFriendRequests,
  shouldSuppressFriendRequestReminder,
} from "../models/friendRequestReminderModel";

export function useFriendRequestReminderController() {
  const session = useAuthSession();
  const activeModule = useActiveModule();
  const contactFilter = useContactFilter();
  const pcSettings = usePcSettings();
  const pushRealtimeReminder = usePushRealtimeReminder();
  const dismissRealtimeRemindersForTarget = useDismissRealtimeRemindersForTarget();
  const readySessionRef = useRef("");
  const seenRequestKeysRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const requestsQuery = useQuery({
    queryKey: ["pc-friend-requests", session?.apiBaseUrl, session?.tenantToken],
    enabled: Boolean(session),
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
    queryFn: async () => requireApiClient(session).getFriendRequests(),
  });

  const pendingIncomingRequests = useMemo(
    () => pendingIncomingFriendRequests(requestsQuery.data ?? [], session?.userId),
    [requestsQuery.data, session?.userId],
  );

  const sessionKey = session
    ? `${session.apiBaseUrl}|${session.tenantToken}|${session.userId ?? ""}`
    : "";

  useEffect(() => {
    if (!sessionKey) {
      readySessionRef.current = "";
      seenRequestKeysRef.current = new Set();
      initializedRef.current = false;
      return;
    }
    if (readySessionRef.current !== sessionKey) {
      readySessionRef.current = sessionKey;
      seenRequestKeysRef.current = new Set();
      initializedRef.current = false;
    }
  }, [sessionKey]);

  useEffect(() => {
    if (!sessionKey || !requestsQuery.isSuccess) return;
    const currentKeys = new Set(
      pendingIncomingRequests.map(friendRequestReminderKey).filter(Boolean),
    );
    if (!initializedRef.current) {
      initializedRef.current = true;
      seenRequestKeysRef.current = currentKeys;
      return;
    }

    const newRequest = pendingIncomingRequests.find((request) => {
      const key = friendRequestReminderKey(request);
      return Boolean(key && !seenRequestKeysRef.current.has(key));
    });
    seenRequestKeysRef.current = currentKeys;
    if (!newRequest) return;
    if (shouldSuppressFriendRequestReminder({
      activeModule,
      contactFilter,
      settings: pcSettings,
    })) {
      return;
    }

    const reminder = buildFriendRequestReminder(newRequest);
    pushRealtimeReminder(reminder);
    if (shouldShowDesktopNotification(pcSettings, "im")) {
      void notifyDesktopOrBrowser(
        {
          title: reminder.title,
          body: reminder.body,
          conversationId: reminder.id,
        },
        { channel: "im" },
      );
    }
  }, [
    activeModule,
    contactFilter,
    pcSettings,
    pendingIncomingRequests,
    pushRealtimeReminder,
    requestsQuery.isSuccess,
    sessionKey,
  ]);

  useEffect(() => {
    if (requestsQuery.isSuccess && pendingIncomingRequests.length === 0) {
      dismissRealtimeRemindersForTarget("contacts", "requests");
    }
  }, [
    dismissRealtimeRemindersForTarget,
    pendingIncomingRequests.length,
    requestsQuery.isSuccess,
  ]);

  return {
    friendRequests: requestsQuery.data ?? [],
    pendingIncomingRequestCount: pendingIncomingRequests.length,
    pendingIncomingRequests,
    requestsQuery,
  };
}
