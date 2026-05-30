import type {
  ConversationListItem,
  MessageItemDto,
} from "../api-client";
import type { CurrentUserIdentity } from "../message-display";

export type MessageCoreConversationType = "direct" | "group";

export interface MessageCoreState {
  conversation?: ConversationListItem;
  messages: MessageItemDto[];
}

export type MessageCoreDiagnosticEvent =
  | "message_core.event_reduced"
  | "message_core.duplicate_ignored"
  | "message_core.out_of_order_ignored"
  | "message_core.last_message_recomputed";

export interface MessageCoreDiagnostic {
  event: MessageCoreDiagnosticEvent;
  conversationId: string;
  messageId?: string;
  reason?: string;
}

export type MessageCoreEvent =
  | {
      type: "message.polled";
      conversationId: string;
      conversationType: MessageCoreConversationType;
      messages: MessageItemDto[];
    }
  | {
      type: "message.gateway_received";
      conversationId: string;
      conversationType: MessageCoreConversationType;
      message: MessageItemDto;
      unreadCount?: number;
      readSeq?: number;
    }
  | {
      type: "message.local_created";
      conversationId: string;
      conversationType: MessageCoreConversationType;
      message: MessageItemDto;
    }
  | {
      type: "message.send_confirmed";
      conversationId: string;
      conversationType: MessageCoreConversationType;
      localMessageId?: string;
      message: MessageItemDto;
    }
  | {
      type: "message.send_failed";
      conversationId: string;
      conversationType: MessageCoreConversationType;
      messageId: string;
      reason: string;
    }
  | {
      type: "message.recalled";
      conversationId: string;
      conversationType: MessageCoreConversationType;
      messageId: string;
    }
  | {
      type: "message.deleted";
      conversationId: string;
      conversationType: MessageCoreConversationType;
      messageId: string;
    }
  | {
      type: "read.updated";
      conversationId: string;
      conversationType: MessageCoreConversationType;
      readSeq: number;
      peerReadSeq?: number;
      identity: CurrentUserIdentity | null;
    };

export interface MessageCoreResult {
  state: MessageCoreState;
  diagnostics: MessageCoreDiagnostic[];
}
