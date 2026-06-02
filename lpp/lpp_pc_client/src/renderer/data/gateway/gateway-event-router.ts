import type { QueryClient } from "@tanstack/react-query";
import type { AuthSession } from "../auth/auth-session";
import type { CustomerServiceStatus } from "../types";
import {
  handleFirstStageCustomerServiceGatewayEvent,
} from "./cs-gateway-handler";
import {
  isCustomerServiceLifecycleEventName,
  isCustomerServiceMessageEventName,
  isCustomerServiceQueueEventName,
  isForceLogoutEventName,
  isImMessageEventName,
} from "./gateway-event-registry";
import {
  invalidateImAvatarGatewayQueries,
  invalidateCustomerServiceGatewayQueries,
  invalidateImGatewayQueries,
} from "./gateway-query-invalidation";
import {
  asRecord,
  conversationRecord,
  customerServiceThreadId,
  classifyCustomerServiceGatewayPayload,
  eventPayload,
  fallbackConversationIdFromPeer,
  imConversationId,
  isCustomerServiceGatewayPayload,
  isCustomerServiceStatus,
  normalizeType,
  stringField,
} from "./gateway-payload-utils";
import { recordCsRoutingDiagnostic } from "../customer-service/cs-routing-diagnostics";
import { handleFirstStageImGatewayEvent } from "./im-gateway-handler";
import {
  mergeCustomerServiceGatewayMessage,
  notifyCustomerServiceQueue,
} from "./gateway-cs-side-effects";
import {
  mergeImGatewayMessage,
  mergeReadEvent,
} from "./gateway-im-side-effects";
import { recordGatewayReminderDiagnostic } from "./gateway-message-reminder-diagnostics";

export function createGatewayEventRouter(options: {
  clearAuthSession: () => void;
  queryClient: QueryClient;
  session: AuthSession;
  setCustomerServiceStatus: (status: CustomerServiceStatus) => void;
}) {
  const { clearAuthSession, queryClient, session, setCustomerServiceStatus } = options;
  const invalidateIm = (conversationId?: string) =>
    invalidateImGatewayQueries(queryClient, conversationId);
  const invalidateCustomerService = (threadId?: string) =>
    invalidateCustomerServiceGatewayQueries(queryClient, threadId);

  const handleFirstStageGatewayEvent = (eventName: string, args: unknown[]) => {
    return handleFirstStageImGatewayEvent(
      { eventName, args },
      {
        onMessageReceived: (event) => {
          mergeImGatewayMessage(
            queryClient,
            event.rawPayload,
            event.conversationId,
            event.conversationType,
          );
          void queryClient.invalidateQueries({ queryKey: ["pc-im-conversations"] });
        },
        onReadReceived: (event) => {
          mergeReadEvent(queryClient, event.rawPayload, session);
          void queryClient.invalidateQueries({ queryKey: ["pc-im-conversations"] });
        },
        onHandlerError: () => undefined,
      },
    );
  };

  const handleFirstStageCustomerServiceEvent = (eventName: string, args: unknown[]) => {
    return handleFirstStageCustomerServiceGatewayEvent(
      { eventName, args },
      {
        onMessageReceived: (event) => {
          mergeCustomerServiceGatewayMessage(queryClient, event.rawPayload, event.threadId);
          invalidateCustomerService(event.threadId);
        },
        onThreadChanged: (event) => {
          if (event.serviceStatus && isCustomerServiceStatus(event.serviceStatus)) {
            setCustomerServiceStatus(event.serviceStatus);
          }
          invalidateCustomerService(event.threadId);
          if (event.shouldNotifyQueue) {
            notifyCustomerServiceQueue(event.rawPayload, event.threadId ?? "");
          }
        },
        onHandlerError: () => undefined,
      },
    );
  };

  const handleEvent = (eventName: string, args: unknown[]) => {
    const payload = eventPayload(args);
    const classification = classifyCustomerServiceGatewayPayload(payload);
    if (
      isImMessageEventName(eventName) ||
      isCustomerServiceMessageEventName(eventName) ||
      isCustomerServiceQueueEventName(eventName)
    ) {
      recordCsRoutingDiagnostic({
        event: eventName,
        source: "gateway-router",
        phase: "received",
        classification,
        summary: payload,
      });
      if (isImMessageEventName(eventName)) {
        recordCsRoutingDiagnostic({
          event: "cs-conversation-index",
          source: "gateway-router",
          phase: classification.reason === "indexed-temp-session" ? "cs-index-hit" : "cs-index-miss",
          route: classification.isCustomerService ? "customer-service" : "im",
          classification,
          summary: payload,
        });
      }
    }
    if (isForceLogoutEventName(eventName)) {
      recordGatewayReminderDiagnostic({
        eventName,
        payload,
        phase: "routed",
        route: "ignored-force-logout",
        source: "gateway-router",
      });
      queryClient.clear();
      clearAuthSession();
      return;
    }

    if (handleFirstStageCustomerServiceEvent(eventName, args)) {
      recordGatewayReminderDiagnostic({
        eventName,
        payload,
        phase: "routed",
        route: "customer-service-first-stage",
        source: "gateway-router",
      });
      recordCsRoutingDiagnostic({
        event: eventName,
        source: "gateway-router",
        phase: "routed",
        route: "customer-service-first-stage",
        classification,
        summary: payload,
      });
      return;
    }
    if (handleFirstStageGatewayEvent(eventName, args)) {
      recordGatewayReminderDiagnostic({
        eventName,
        payload,
        phase: "routed",
        route: "im-first-stage",
        source: "gateway-router",
      });
      recordCsRoutingDiagnostic({
        event: eventName,
        source: "gateway-router",
        phase: "routed",
        route: "im-first-stage",
        classification,
        summary: payload,
      });
      return;
    }

    if (isImMessageEventName(eventName)) {
      const isCustomerServiceMessage = isCustomerServiceGatewayPayload(payload);
      const conversationType = normalizeType(
        stringField(payload, "conversationType", "conversation_type", "threadType", "thread_type") ||
          stringField(conversationRecord(payload), "conversationType", "conversation_type", "threadType", "thread_type"),
      );
      const conversationId =
        imConversationId(payload) ||
        stringField(payload, "threadId", "thread_id", "sessionId", "session_id") ||
        stringField(conversationRecord(payload), "conversationId", "conversation_id", "chatId", "chat_id");
      if (isCustomerServiceMessage) {
        const threadId = customerServiceThreadId(payload) || conversationId;
        recordGatewayReminderDiagnostic({
          eventName,
          payload,
          phase: "routed",
          route: "customer-service",
          source: "gateway-router",
        });
        recordCsRoutingDiagnostic({
          event: eventName,
          source: "gateway-router",
          phase: "fallback-route",
          route: "customer-service",
          classification,
          summary: payload,
        });
        mergeCustomerServiceGatewayMessage(queryClient, payload, threadId);
        invalidateCustomerService(threadId);
      } else {
        recordGatewayReminderDiagnostic({
          eventName,
          payload,
          phase: "routed",
          route: "im",
          source: "gateway-router",
        });
        recordCsRoutingDiagnostic({
          event: eventName,
          source: "gateway-router",
          phase: "fallback-route",
          route: "im",
          classification,
          summary: payload,
        });
        mergeImGatewayMessage(queryClient, payload, conversationId, conversationType);
        void queryClient.invalidateQueries({ queryKey: ["pc-im-conversations"] });
      }
      return;
    }

    if (isCustomerServiceMessageEventName(eventName)) {
      const threadId =
        customerServiceThreadId(payload) ||
        stringField(payload, "conversationId", "chatId", "threadId", "sessionId");
      recordGatewayReminderDiagnostic({
        eventName,
        payload,
        phase: "routed",
        route: "customer-service",
        source: "gateway-router",
      });
      mergeCustomerServiceGatewayMessage(queryClient, payload, threadId);
      invalidateCustomerService(threadId);
      return;
    }

    if (isCustomerServiceQueueEventName(eventName)) {
      const threadId =
        customerServiceThreadId(payload) ||
        stringField(payload, "conversationId", "chatId", "threadId", "sessionId");
      recordGatewayReminderDiagnostic({
        eventName,
        payload,
        phase: "routed",
        route: "customer-service-queue",
        source: "gateway-router",
      });
      invalidateCustomerService(threadId);
      notifyCustomerServiceQueue(payload, threadId);
      return;
    }

    if (eventName === "msg.read" || eventName === "msg.recalled" || eventName === "space.notice") {
      if (eventName === "msg.read") {
        recordGatewayReminderDiagnostic({
          eventName,
          payload,
          phase: "routed",
          route: "im-read",
          source: "gateway-router",
        });
        mergeReadEvent(queryClient, payload, session);
        void queryClient.invalidateQueries({ queryKey: ["pc-im-conversations"] });
        return;
      }
      invalidateIm(stringField(payload, "conversationId", "chatId"));
      if (eventName === "space.notice") invalidateCustomerService();
      recordGatewayReminderDiagnostic({
        eventName,
        payload,
        phase: "routed",
        route: eventName === "space.notice" ? "im-and-customer-service-refresh" : "im-refresh",
        source: "gateway-router",
      });
      return;
    }

    if (isCustomerServiceLifecycleEventName(eventName)) {
      const nextStatus = stringField(payload, "serviceStatus", "status", "staffStatus");
      if (isCustomerServiceStatus(nextStatus)) setCustomerServiceStatus(nextStatus);
      invalidateCustomerService(stringField(payload, "threadId", "sessionId"));
      recordGatewayReminderDiagnostic({
        eventName,
        payload,
        phase: "routed",
        route: "customer-service-lifecycle",
        source: "gateway-router",
      });
      return;
    }

    if (eventName.startsWith("friend.")) {
      void queryClient.invalidateQueries({ queryKey: ["pc-friends"] });
      void queryClient.invalidateQueries({ queryKey: ["pc-friend-requests"] });
      void queryClient.invalidateQueries({ queryKey: ["pc-im-conversations"] });
      invalidateImAvatarGatewayQueries(queryClient);
      return;
    }

    if (eventName === "friend.profile.updated" || eventName === "presence.changed") {
      void queryClient.invalidateQueries({ queryKey: ["pc-im-conversations"] });
      invalidateImAvatarGatewayQueries(queryClient);
    }
  };

  const pushDevImMessage = (payload: unknown) => {
    const record = asRecord(payload);
    if (handleFirstStageGatewayEvent("msg.new", [record])) return;
    mergeImGatewayMessage(
      queryClient,
      record,
      imConversationId(record) || fallbackConversationIdFromPeer(record),
      normalizeType(stringField(record, "conversationType", "conversation_type", "chatType", "chat_type")),
    );
  };

  return {
    handleEvent,
    invalidateCustomerService,
    invalidateIm,
    pushDevImMessage,
  };
}
