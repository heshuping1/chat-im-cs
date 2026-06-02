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
import { getAppInstanceProfile } from "../data/app-instance/app-instance";
import { recordMessageReminderDiagnostic } from "../data/diagnostics/message-reminder-diagnostics";
import { recordGatewayReminderDiagnostic } from "../data/gateway/gateway-message-reminder-diagnostics";

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
    recordMessageReminderDiagnostic({
      event: "gateway.bridge.lifecycle",
      source: "gateway-bridge",
      phase: "effect-start",
      route: session ? "session-present" : "no-session",
      classification: {
        apiHost: session ? safeUrlHost(session.apiBaseUrl) : "",
        hasSession: Boolean(session),
        sessionKeyPresent: Boolean(sessionKey),
        tenantTokenPresent: Boolean(session?.tenantToken),
      },
    });
    let disposed = false;
    const previous = connectionRef.current;
    connectionRef.current = null;
    void previous?.stop().catch(() => undefined);

    if (!session || !sessionKey) return;

    void getAppInstanceProfile()
      .then((instance) => {
        if (disposed) return;
        const gatewayUrl = new URL(
          `${session.apiBaseUrl.replace(/\/$/, "")}/ws/client`,
        );
        gatewayUrl.searchParams.set("deviceId", instance.deviceId);
        gatewayUrl.searchParams.set("clientInstanceId", instance.clientInstanceId);
        gatewayUrl.searchParams.set("clientPlatform", "pc");

        const connection = new HubConnectionBuilder()
          .withUrl(gatewayUrl.toString(), {
            accessTokenFactory: () => session.tenantToken,
          })
          .withAutomaticReconnect([0, 2_000, 5_000, 10_000, 30_000])
          .configureLogging(LogLevel.Warning)
          .build();

        connectionRef.current = connection;
        recordMessageReminderDiagnostic({
          event: "gateway.bridge.lifecycle",
          source: "gateway-bridge",
          phase: "connection-created",
          route: "gateway",
          classification: {
            apiHost: safeUrlHost(session.apiBaseUrl),
            gatewayHost: gatewayUrl.host,
            state: connection.state,
          },
        });

        const eventRouter = createGatewayEventRouter({
          clearAuthSession,
          queryClient,
          session,
          setCustomerServiceStatus,
        });

        gatewayEvents.forEach((eventName) => {
          connection.on(eventName, (...args: unknown[]) => {
            recordGatewayReminderDiagnostic({
              args,
              eventName,
              phase: "received",
              route: "gateway",
              source: "gateway-bridge",
            });
            eventRouter.handleEvent(eventName, args);
          });
        });

        connection.onreconnected(() => {
          recordMessageReminderDiagnostic({
            event: "gateway.bridge.lifecycle",
            source: "gateway-bridge",
            phase: "reconnected",
            route: "gateway",
            classification: {
              gatewayHost: gatewayUrl.host,
              state: connection.state,
            },
          });
          eventRouter.invalidateIm();
          eventRouter.invalidateCustomerService();
          void heartbeat(connection);
        });

        connection.onclose(() => {
          recordMessageReminderDiagnostic({
            event: "gateway.bridge.lifecycle",
            source: "gateway-bridge",
            phase: "closed",
            route: "gateway",
            classification: {
              gatewayHost: gatewayUrl.host,
              state: connection.state,
            },
          });
          if (disposed) return;
          // SignalR automatic reconnect handles transient drops; the next successful
          // reconnect performs a full query refresh to compensate for missed events.
        });

        void connection
          .start()
          .then(() => {
            if (disposed) return;
            recordMessageReminderDiagnostic({
              event: "gateway.bridge.lifecycle",
              source: "gateway-bridge",
              phase: "started",
              route: "gateway",
              classification: {
                gatewayHost: gatewayUrl.host,
                state: connection.state,
              },
            });
            void heartbeat(connection);
          })
          .catch((error) => {
            recordMessageReminderDiagnostic({
              event: "gateway.bridge.lifecycle",
              source: "gateway-bridge",
              phase: "start-failed",
              route: "gateway",
              classification: {
                gatewayHost: gatewayUrl.host,
                state: connection.state,
              },
              summary: {
                errorName: error instanceof Error ? error.name : typeof error,
              },
            });
            // Gateway is an accelerator, not a blocker. Query pages remain usable and
            // manual refresh/refetch still works if the websocket endpoint is down.
          });

        heartbeatTimer = window.setInterval(() => {
          if (connection.state === HubConnectionState.Connected) {
            void heartbeat(connection);
          }
        }, 30_000);

        if (import.meta.env.DEV) {
          window.__lppTestPushImMessage = (payload) => {
            eventRouter.pushDevImMessage(payload);
          };
        }
      })
      .catch((error) => {
        recordMessageReminderDiagnostic({
          event: "gateway.bridge.lifecycle",
          source: "gateway-bridge",
          phase: "profile-failed",
          route: "gateway",
          classification: {
            apiHost: safeUrlHost(session.apiBaseUrl),
          },
          summary: {
            errorName: error instanceof Error ? error.name : typeof error,
          },
        });
        // Profile identity is local metadata; if it is unavailable the gateway
        // should fail soft and let polling keep the app usable.
      });

    let heartbeatTimer: number | undefined;

    return () => {
      disposed = true;
      if (heartbeatTimer !== undefined) window.clearInterval(heartbeatTimer);
      if (window.__lppTestPushImMessage) delete window.__lppTestPushImMessage;
      const connection = connectionRef.current;
      if (connection) {
        gatewayEvents.forEach((eventName) => connection.off(eventName));
        void connection.stop().catch(() => undefined);
        if (connectionRef.current === connection) connectionRef.current = null;
      }
    };
  }, [clearAuthSession, queryClient, session, sessionKey, setCustomerServiceStatus]);

  return null;
}

function safeUrlHost(value: string) {
  try {
    return new URL(value).host;
  } catch {
    return "";
  }
}

async function heartbeat(connection: HubConnection) {
  try {
    await connection.invoke("HeartbeatAsync", "pc");
  } catch {
    // Older gateway builds may not require explicit heartbeat.
  }
}
