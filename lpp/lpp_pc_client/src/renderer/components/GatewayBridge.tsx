import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
  type HubConnection,
} from "@microsoft/signalr";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import {
  useAuthSession,
  useClearAuthSession,
} from "../data/auth/auth-store";
import {
  useSetCustomerServiceStatus,
  useSetGatewayRealtimeStatus,
} from "../data/workspace-ui/workspace-ui-store";
import {
  gatewayEvents,
} from "../data/gateway/gateway-event-registry";
import { createGatewayEventRouter } from "../data/gateway/gateway-event-router";
import { getAppInstanceProfile } from "../data/app-instance/app-instance";
import { customerServiceIndexScopeKey } from "../data/customer-service/cs-conversation-index";
import { recordGatewayReminderDiagnostic } from "../data/gateway/gateway-message-reminder-diagnostics";
import { GatewayConnectionManager } from "../data/gateway/gateway-connection-manager";
import { recordGatewayHealthDiagnostic } from "../data/gateway/gateway-health-diagnostics";
import { eventPayload } from "../data/gateway/gateway-payload-utils";
import { triggerMessageGapSync } from "../data/gateway/message-gap-sync-coordinator";
import { recordGatewayPushReceived } from "../data/gateway/message-delivery-service";

export function GatewayBridge() {
  const session = useAuthSession();
  const clearAuthSession = useClearAuthSession();
  const setCustomerServiceStatus = useSetCustomerServiceStatus();
  const setGatewayRealtimeStatus = useSetGatewayRealtimeStatus();
  const queryClient = useQueryClient();
  const sessionKey = useMemo(
    () =>
      session
        ? `${session.apiBaseUrl.replace(/\/$/, "")}|${session.tenantToken}`
        : "",
    [session],
  );
  const scopeKey = useMemo(
    () => (session ? customerServiceIndexScopeKey(session) : ""),
    [session],
  );

  useEffect(() => {
    let disposed = false;
    let heartbeatTimer: number | undefined;

    recordGatewayHealthDiagnostic({
      apiHost: session ? safeUrlHost(session.apiBaseUrl) : "",
      phase: "start-attempt",
      route: session ? "session-present" : "no-session",
      scopeKey,
      sessionKeyPresent: Boolean(sessionKey),
      state: session ? "session-present" : "no-session",
      summary: {
        hasSession: Boolean(session),
        tenantTokenPresent: Boolean(session?.tenantToken),
      },
    });

    if (!session || !sessionKey) {
      setGatewayRealtimeStatus("idle");
      return;
    }

    const eventRouter = createGatewayEventRouter({
      clearAuthSession,
      queryClient,
      session,
      setCustomerServiceStatus,
    });

    const clearHeartbeat = () => {
      if (heartbeatTimer !== undefined) window.clearInterval(heartbeatTimer);
      heartbeatTimer = undefined;
    };
    const startHeartbeat = (connection: HubConnection) => {
      clearHeartbeat();
      void heartbeat(connection);
      heartbeatTimer = window.setInterval(() => {
        if (connection.state === HubConnectionState.Connected) {
          void heartbeat(connection);
        }
      }, 30_000);
    };

    let manager: GatewayConnectionManager;
    manager = new GatewayConnectionManager({
      createConnection: async () => {
        const instance = await getAppInstanceProfile();
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

        gatewayEvents.forEach((eventName) => {
          connection.on(eventName, (...args: unknown[]) => {
            const payload = eventPayload(args);
            recordGatewayPushReceived({
              args,
              eventName,
              payload,
              scopeKey,
              source: "gateway-bridge",
            });
            recordGatewayReminderDiagnostic({
              args,
              eventName,
              phase: "received",
              route: "gateway",
              scopeKey,
              source: "gateway-bridge",
            });
            eventRouter.handleEvent(eventName, args);
          });
        });

        connection.onreconnecting((error) => {
          setGatewayRealtimeStatus("reconnecting");
          recordGatewayHealthDiagnostic({
            apiHost: safeUrlHost(session.apiBaseUrl),
            error,
            gatewayHost: gatewayUrl.host,
            phase: "reconnecting",
            scopeKey,
            state: connection.state,
          });
        });

        connection.onreconnected(() => {
          setGatewayRealtimeStatus("connected");
          recordGatewayHealthDiagnostic({
            apiHost: safeUrlHost(session.apiBaseUrl),
            gatewayHost: gatewayUrl.host,
            phase: "reconnected",
            scopeKey,
            state: connection.state,
          });
          eventRouter.invalidateCustomerService();
          triggerMessageGapSync(queryClient, {
            reason: "gateway-reconnected",
            scopeKey,
            source: "gateway-bridge",
          });
          startHeartbeat(connection);
        });

        connection.onclose((error) => {
          if (disposed) return;
          setGatewayRealtimeStatus("retrying");
          recordGatewayHealthDiagnostic({
            apiHost: safeUrlHost(session.apiBaseUrl),
            error,
            gatewayHost: gatewayUrl.host,
            phase: "closed",
            scopeKey,
            state: connection.state,
          });
          clearHeartbeat();
          manager.handleConnectionClosed(connection, error);
        });

        if (import.meta.env.DEV) {
          window.__lppTestPushImMessage = (payload) => {
            eventRouter.pushDevImMessage(payload);
          };
        }

        return connection;
      },
      onConnected: ({ attempt, connection, elapsedMs }) => {
        if (disposed) return;
        setGatewayRealtimeStatus("connected");
        recordGatewayHealthDiagnostic({
          apiHost: safeUrlHost(session.apiBaseUrl),
          attempt,
          elapsedMs,
          phase: "started",
          scopeKey,
          state: connection.state,
        });
        triggerMessageGapSync(queryClient, {
          reason: "gateway-started",
          scopeKey,
          source: "gateway-bridge",
        });
        startHeartbeat(connection as HubConnection);
      },
      onRetryScheduled: ({ attempt, delayMs }) => {
        setGatewayRealtimeStatus("retrying");
        recordGatewayHealthDiagnostic({
          apiHost: safeUrlHost(session.apiBaseUrl),
          attempt,
          phase: "retry-scheduled",
          retryDelayMs: delayMs,
          scopeKey,
          state: "retrying",
        });
      },
      onStartAttempt: ({ attempt }) => {
        setGatewayRealtimeStatus(attempt === 1 ? "connecting" : "retrying");
        recordGatewayHealthDiagnostic({
          apiHost: safeUrlHost(session.apiBaseUrl),
          attempt,
          phase: "start-attempt",
          scopeKey,
          state: attempt === 1 ? "connecting" : "retrying",
        });
      },
      onStartFailed: ({ attempt, elapsedMs, error }) => {
        setGatewayRealtimeStatus("retrying");
        recordGatewayHealthDiagnostic({
          apiHost: safeUrlHost(session.apiBaseUrl),
          attempt,
          elapsedMs,
          error,
          phase: "start-failed",
          scopeKey,
          state: "retrying",
        });
      },
    });

    manager.start();

    return () => {
      disposed = true;
      clearHeartbeat();
      if (window.__lppTestPushImMessage) delete window.__lppTestPushImMessage;
      manager.stop();
      setGatewayRealtimeStatus("stopped");
      recordGatewayHealthDiagnostic({
        apiHost: safeUrlHost(session.apiBaseUrl),
        phase: "stopped",
        scopeKey,
        state: "stopped",
      });
    };
  }, [
    clearAuthSession,
    queryClient,
    scopeKey,
    session,
    sessionKey,
    setCustomerServiceStatus,
    setGatewayRealtimeStatus,
  ]);

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
