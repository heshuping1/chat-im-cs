import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
  type HubConnection,
} from "@microsoft/signalr";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import {
  useAuthSession,
  useClearAuthSession,
} from "../data/auth/auth-store";
import {
  useSetCustomerServiceStatus,
} from "../data/workspace-ui/workspace-ui-store";
import {
  gatewayEvents,
} from "../data/gateway/gateway-event-registry";
import { createGatewayEventRouter } from "../data/gateway/gateway-event-router";

export function GatewayBridge() {
  const session = useAuthSession();
  const clearAuthSession = useClearAuthSession();
  const setCustomerServiceStatus = useSetCustomerServiceStatus();
  const queryClient = useQueryClient();
  const connectionRef = useRef<HubConnection | null>(null);
  const sessionKey = useMemo(
    () =>
      session
        ? `${session.apiBaseUrl.replace(/\/$/, "")}|${session.tenantToken}`
        : "",
    [session],
  );

  useEffect(() => {
    let disposed = false;
    const previous = connectionRef.current;
    connectionRef.current = null;
    void previous?.stop().catch(() => undefined);

    if (!session || !sessionKey) return;

    const connection = new HubConnectionBuilder()
      .withUrl(`${session.apiBaseUrl.replace(/\/$/, "")}/ws/client`, {
        accessTokenFactory: () => session.tenantToken,
      })
      .withAutomaticReconnect([0, 2_000, 5_000, 10_000, 30_000])
      .configureLogging(LogLevel.Warning)
      .build();

    connectionRef.current = connection;

    const eventRouter = createGatewayEventRouter({
      clearAuthSession,
      queryClient,
      session,
      setCustomerServiceStatus,
    });

    gatewayEvents.forEach((eventName) => {
      connection.on(eventName, (...args: unknown[]) => eventRouter.handleEvent(eventName, args));
    });

    connection.onreconnected(() => {
      eventRouter.invalidateIm();
      eventRouter.invalidateCustomerService();
      void heartbeat(connection);
    });

    connection.onclose(() => {
      if (disposed) return;
      // SignalR automatic reconnect handles transient drops; the next successful
      // reconnect performs a full query refresh to compensate for missed events.
    });

    void connection
      .start()
      .then(() => {
        if (disposed) return;
        void heartbeat(connection);
      })
      .catch(() => {
        // Gateway is an accelerator, not a blocker. Query pages remain usable and
        // manual refresh/refetch still works if the websocket endpoint is down.
      });

    const heartbeatTimer = window.setInterval(() => {
      if (connection.state === HubConnectionState.Connected) {
        void heartbeat(connection);
      }
    }, 30_000);

    if (import.meta.env.DEV) {
      window.__lppTestPushImMessage = (payload) => {
        eventRouter.pushDevImMessage(payload);
      };
    }

    return () => {
      disposed = true;
      window.clearInterval(heartbeatTimer);
      if (window.__lppTestPushImMessage) delete window.__lppTestPushImMessage;
      gatewayEvents.forEach((eventName) => connection.off(eventName));
      void connection.stop().catch(() => undefined);
      if (connectionRef.current === connection) connectionRef.current = null;
    };
  }, [clearAuthSession, queryClient, session, sessionKey, setCustomerServiceStatus]);

  return null;
}

async function heartbeat(connection: HubConnection) {
  try {
    await connection.invoke("HeartbeatAsync", "pc");
  } catch {
    // Older gateway builds may not require explicit heartbeat.
  }
}
