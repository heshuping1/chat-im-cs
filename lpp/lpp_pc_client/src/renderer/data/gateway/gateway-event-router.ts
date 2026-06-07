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
  isTenantJoinRequestEventName,
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
  numberField,
  stringField,
  booleanField,
} from "./gateway-payload-utils";
import { recordCsRoutingDiagnostic } from "../customer-service/cs-routing-diagnostics";
import { customerServiceIndexScopeKey } from "../customer-service/cs-conversation-index";
import { handleFirstStageImGatewayEvent } from "./im-gateway-handler";
import { recordGatewayReminderDiagnostic } from "./gateway-message-reminder-diagnostics";
import { createMessageDeliveryService } from "./message-delivery-service";
import { pcQueryKeys } from "../query-keys";
import {
  applySpaceNoticeReminder,
  spaceReminderScopeKey,
} from "../spaces/space-reminder-ledger";

export function createGatewayEventRouter(options: {
  clearAuthSession: () => void;
  queryClient: QueryClient;
  session: AuthSession;
  setCustomerServiceStatus: (status: CustomerServiceStatus) => void;
}) {
  const { clearAuthSession, queryClient, session, setCustomerServiceStatus } = options;
  const scopeKey = customerServiceIndexScopeKey(session);
  const invalidateIm = (conversationId?: string) =>
    invalidateImGatewayQueries(queryClient, conversationId, scopeKey);
  const invalidateCustomerService = (threadId?: string) =>
    invalidateCustomerServiceGatewayQueries(queryClient, threadId);
  const delivery = createMessageDeliveryService({
    queryClient,
    scopeKey,
    session,
    setCustomerServiceStatus,
  });

  const handleFirstStageGatewayEvent = (eventName: string, args: unknown[]) => {
    return handleFirstStageImGatewayEvent(
      { eventName, args, scopeKey },
      {
        onMessageReceived: (event) => {
          delivery.deliverImMessage({
            conversationId: event.conversationId,
            conversationType: event.conversationType,
            payload: event.rawPayload,
            route: "im-first-stage",
            source: "gateway-router",
          });
        },
        onReadReceived: (event) => {
          delivery.deliverImRead({
            conversationId: event.conversationId,
            payload: event.rawPayload,
            route: "im-read-first-stage",
            source: "gateway-router",
          });
        },
        onHandlerError: () => undefined,
      },
    );
  };

  const handleFirstStageCustomerServiceEvent = (eventName: string, args: unknown[]) => {
    return handleFirstStageCustomerServiceGatewayEvent(
      { eventName, args, scopeKey },
      {
        onMessageReceived: (event) => {
          delivery.deliverCustomerServiceMessage({
            payload: event.rawPayload,
            route: "customer-service-first-stage",
            source: "gateway-router",
            threadId: event.threadId,
          });
        },
        onThreadChanged: (event) => {
          if (event.serviceStatus && isCustomerServiceStatus(event.serviceStatus)) {
            setCustomerServiceStatus(event.serviceStatus);
          }
          invalidateCustomerService(event.threadId);
          if (event.shouldNotifyQueue) {
            delivery.deliverCustomerServiceQueue({
              payload: event.rawPayload,
              route: "customer-service-queue-first-stage",
              source: "gateway-router",
              threadId: event.threadId,
            });
          }
        },
        onHandlerError: () => undefined,
      },
    );
  };

  const handleEvent = (eventName: string, args: unknown[]) => {
    const payload = eventPayload(args);
    const classification = classifyCustomerServiceGatewayPayload(payload, scopeKey);
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
        scopeKey,
        source: "gateway-router",
      });
      queryClient.clear();
      clearAuthSession();
      return;
    }

    if (isTenantJoinRequestEventName(eventName)) {
      recordGatewayReminderDiagnostic({
        eventName,
        payload,
        phase: "routed",
        route: "tenant-join-request",
        scopeKey,
        source: "gateway-router",
      });
      void queryClient.invalidateQueries({
        queryKey: pcQueryKeys.tenantJoinRequests(
          session.apiBaseUrl,
          session.platformToken,
        ),
      });
      void queryClient.invalidateQueries({
        queryKey: pcQueryKeys.accountSpaces(
          session.apiBaseUrl,
          session.platformToken,
        ),
      });
      return;
    }

    if (handleFirstStageCustomerServiceEvent(eventName, args)) {
      recordGatewayReminderDiagnostic({
        eventName,
        payload,
        phase: "routed",
        route: "customer-service-first-stage",
        scopeKey,
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
        scopeKey,
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
      const isCustomerServiceMessage = isCustomerServiceGatewayPayload(payload, scopeKey);
      const conversationType = normalizeType(
        stringField(payload, "conversationType", "conversation_type", "threadType", "thread_type") ||
          stringField(conversationRecord(payload), "conversationType", "conversation_type", "threadType", "thread_type"),
      );
      const conversationId =
        imConversationId(payload) ||
        stringField(payload, "threadId", "thread_id", "sessionId", "session_id") ||
        stringField(conversationRecord(payload), "conversationId", "conversation_id", "chatId", "chat_id");
      if (isCustomerServiceMessage) {
        const threadId = classification.threadId || customerServiceThreadId(payload, scopeKey) || conversationId;
        recordGatewayReminderDiagnostic({
          eventName,
          payload,
          phase: "routed",
          route: "customer-service",
          scopeKey,
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
        delivery.deliverCustomerServiceMessage({
          payload,
          route: "customer-service",
          source: "gateway-router",
          threadId,
        });
      } else {
        recordGatewayReminderDiagnostic({
          eventName,
          payload,
          phase: "routed",
          route: "im",
          scopeKey,
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
        delivery.deliverImMessage({
          conversationId,
          conversationType,
          payload,
          route: "im",
          source: "gateway-router",
        });
      }
      return;
    }

    if (isCustomerServiceMessageEventName(eventName)) {
      const threadId =
        customerServiceThreadId(payload, scopeKey) ||
        stringField(payload, "conversationId", "chatId", "threadId", "sessionId");
      recordGatewayReminderDiagnostic({
        eventName,
        payload,
        phase: "routed",
        route: "customer-service",
        scopeKey,
        source: "gateway-router",
      });
      delivery.deliverCustomerServiceMessage({
        payload,
        route: "customer-service",
        source: "gateway-router",
        threadId,
      });
      return;
    }

    if (isCustomerServiceQueueEventName(eventName)) {
      const threadId =
        customerServiceThreadId(payload, scopeKey) ||
        stringField(payload, "conversationId", "chatId", "threadId", "sessionId");
      recordGatewayReminderDiagnostic({
        eventName,
        payload,
        phase: "routed",
        route: "customer-service-queue",
        scopeKey,
        source: "gateway-router",
      });
      delivery.deliverCustomerServiceQueue({
        payload,
        route: "customer-service-queue",
        source: "gateway-router",
        threadId,
      });
      return;
    }

    if (eventName === "msg.read" || eventName === "msg.recalled" || eventName === "space.notice") {
      if (eventName === "msg.read") {
        recordGatewayReminderDiagnostic({
          eventName,
          payload,
          phase: "routed",
          route: "im-read",
          scopeKey,
          source: "gateway-router",
        });
        delivery.deliverImRead({
          conversationId: stringField(payload, "conversationId", "chatId"),
          payload,
          route: "im-read",
          source: "gateway-router",
        });
        return;
      }
      invalidateIm(stringField(payload, "conversationId", "chatId"));
      if (eventName === "space.notice") {
        applySpaceNoticeReminder(
          spaceReminderScopeKey(session.apiBaseUrl, session.platformToken),
          {
            noticeType: stringField(payload, "noticeType", "notice_type"),
            requiresSwitch: booleanField(payload, "requiresSwitch", "requires_switch"),
            spaceType: numberField(payload, "spaceType", "space_type"),
            targetUnreadConversationCount: numberField(
              payload,
              "targetUnreadConversationCount",
              "target_unread_conversation_count",
            ),
            targetUnreadMessageCount: numberField(
              payload,
              "targetUnreadMessageCount",
              "target_unread_message_count",
            ),
            tenantId: stringField(payload, "tenantId", "tenant_id"),
            totalUnreadConversationCount: numberField(
              payload,
              "totalUnreadConversationCount",
              "total_unread_conversation_count",
            ),
            totalUnreadMessageCount: numberField(
              payload,
              "totalUnreadMessageCount",
              "total_unread_message_count",
            ),
            unreadSpaceCount: numberField(payload, "unreadSpaceCount", "unread_space_count"),
          },
        );
        queryClient.invalidateQueries({
          queryKey: pcQueryKeys.accountSpaceUnreadSummary(
            session.apiBaseUrl,
            session.platformToken,
          ),
        });
        invalidateCustomerService();
      }
      recordGatewayReminderDiagnostic({
        eventName,
        payload,
        phase: "routed",
        route: eventName === "space.notice" ? "im-and-customer-service-refresh" : "im-refresh",
        scopeKey,
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
        scopeKey,
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
    delivery.deliverImMessage({
      conversationId: imConversationId(record) || fallbackConversationIdFromPeer(record),
      conversationType: normalizeType(stringField(record, "conversationType", "conversation_type", "chatType", "chat_type")),
      payload: record,
      route: "im-dev-push",
      source: "gateway-router",
    });
  };

  return {
    handleEvent,
    invalidateCustomerService,
    invalidateIm,
    pushDevImMessage,
  };
}
