import type { MessageItemDto } from "../../api/types";

export type CustomerServiceMessage = MessageItemDto;

export type CustomerServiceMessageMatchedBy =
  | "clientMsgId"
  | "conversationSeq"
  | "localMessageId"
  | "messageId"
  | "none";

export type CustomerServiceMessageDecision = "append" | "ignored" | "replace";

export interface CustomerServiceMessageState {
  messages: CustomerServiceMessage[];
}

export interface CustomerServiceServerFields {
  conversationId?: string;
  conversationSeq?: number;
  isRead?: boolean;
  messageId?: string;
  readAt?: string | null;
  readCount?: number;
  sentAt?: string;
  serverTime?: string;
  status?: string;
}

export type CustomerServiceMessageEvent =
  | {
      type: "cs.message.local_created";
      message: CustomerServiceMessage;
    }
  | {
      type: "cs.message.send_ack_received";
      ack: {
        clientMsgId?: string;
        localMessageId?: string;
        serverFields?: CustomerServiceServerFields;
        serverMessage?: CustomerServiceMessage;
      };
    }
  | {
      type: "cs.message.gateway_received";
      message: CustomerServiceMessage;
    }
  | {
      type: "cs.message.detail_synced";
      messages: CustomerServiceMessage[];
    }
  | {
      type: "cs.message.send_failed";
      failedAt: number;
      localMessageId: string;
      reason: string;
    }
  | {
      type: "cs.message.recalled";
      messageId: string;
    };

export interface CustomerServiceMessageReduceResult {
  changedMessage?: CustomerServiceMessage;
  decision: CustomerServiceMessageDecision;
  matchedBy: CustomerServiceMessageMatchedBy;
  messages: CustomerServiceMessage[];
  state: CustomerServiceMessageState;
}
