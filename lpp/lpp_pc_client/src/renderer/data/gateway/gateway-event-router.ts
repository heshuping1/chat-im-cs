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
  invalidateCustomerServiceGatewayQueries,
  invalidateImGatewayQueries,
} from "./gateway-query-invalidation";
import {
  asRecord,
  conversationRecord,
  customerServiceThreadId,
  eventPayload,
  fallbackConversationIdFromPeer,
  imConversationId,
  isCustomerServiceGatewayPayload,
  isCustomerServiceStatus,
  normalizeType,
  stringField,
} from "./gateway-payload-utils";
import { handleFirstStageImGatewayEvent } from "./im-gateway-handler";
import {
  mergeCustomerServiceGatewayMessage,
  notifyCustomerServiceQueue,
} from "./gateway-cs-side-effects";
import {
  mergeImGatewayMessage,
  mergeReadEvent,
} from "./gateway-im-side-effects";

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
          if (isImMessageEventName(eventName)) {
            invalidateIm(event.message.conversationId || event.threadId);
          }
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
    if (isForceLogoutEventName(eventName)) {
      queryClient.clear();
      clearAuthSession();
      return;
    }

    if (handleFirstStageGatewayEvent(eventName, args)) return;
    if (handleFirstStageCustomerServiceEvent(eventName, args)) return;

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
        mergeCustomerServiceGatewayMessage(queryClient, payload, threadId);
        invalidateCustomerService(threadId);
        invalidateIm(conversationId);
      } else {
        mergeImGatewayMessage(queryClient, payload, conversationId, conversationType);
        void queryClient.invalidateQueries({ queryKey: ["pc-im-conversations"] });
      }
      return;
    }

    if (isCustomerServiceMessageEventName(eventName)) {
      const threadId =
        customerServiceThreadId(payload) ||
        stringField(payload, "conversationId", "chatId", "threadId", "sessionId");
      mergeCustomerServiceGatewayMessage(queryClient, payload, threadId);
      invalidateCustomerService(threadId);
      return;
    }

    if (isCustomerServiceQueueEventName(eventName)) {
      const threadId =
        customerServiceThreadId(payload) ||
        stringField(payload, "conversationId", "chatId", "threadId", "sessionId");
      invalidateCustomerService(threadId);
      notifyCustomerServiceQueue(payload, threadId);
      return;
    }

    if (eventName === "msg.read" || eventName === "msg.recalled" || eventName === "space.notice") {
      if (eventName === "msg.read") {
        mergeReadEvent(queryClient, payload, session);
        void queryClient.invalidateQueries({ queryKey: ["pc-im-conversations"] });
        return;
      }
      invalidateIm(stringField(payload, "conversationId", "chatId"));
      if (eventName === "space.notice") invalidateCustomerService();
      return;
    }

    if (isCustomerServiceLifecycleEventName(eventName)) {
      const nextStatus = stringField(payload, "serviceStatus", "status", "staffStatus");
      if (isCustomerServiceStatus(nextStatus)) setCustomerServiceStatus(nextStatus);
      invalidateCustomerService(stringField(payload, "threadId", "sessionId"));
      return;
    }

    if (eventName.startsWith("friend.")) {
      void queryClient.invalidateQueries({ queryKey: ["pc-friends"] });
      void queryClient.invalidateQueries({ queryKey: ["pc-friend-requests"] });
      void queryClient.invalidateQueries({ queryKey: ["pc-im-conversations"] });
      return;
    }

    if (eventName === "friend.profile.updated" || eventName === "presence.changed") {
      void queryClient.invalidateQueries({ queryKey: ["pc-friends"] });
      void queryClient.invalidateQueries({ queryKey: ["pc-tenant-members"] });
      void queryClient.invalidateQueries({ queryKey: ["pc-im-conversations"] });
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
