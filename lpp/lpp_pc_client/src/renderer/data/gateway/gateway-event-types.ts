import type { NormalizedImMessage } from "../im-api-contract";
import type { CustomerServiceThreadType, MessageItemDto } from "../api/types";
import type { ImConversationType, ImIdentity } from "../im-read-model";

export type GatewayEventKind =
  | "im.message.received"
  | "im.read.received"
  | "cs.message.received"
  | "cs.thread.changed"
  | "ignored"
  | "invalid";

export type GatewayIgnoredReason =
  | "unsupported_event"
  | "customer_service_event"
  | "non_cs_event"
  | "non_im_event";

export type GatewayInvalidReason =
  | "missing_conversation_id"
  | "missing_conversation_type"
  | "missing_message"
  | "missing_read_seq"
  | "missing_thread_id"
  | "blocking_contract"
  | "malformed_payload";

export type GatewayContractStatus = "ok" | "degraded";

export interface GatewayEventEnvelope {
  eventName: string;
  receivedAt: number;
  traceId?: string;
  rawPayload: Record<string, unknown>;
}

export interface GatewayRawEventInput {
  eventName: string;
  args: unknown[];
  receivedAt?: number;
  traceId?: string;
}

export interface GatewayImMessageReceivedEvent extends GatewayEventEnvelope {
  kind: "im.message.received";
  conversationId: string;
  conversationType: ImConversationType;
  message: NormalizedImMessage;
  contractStatus?: GatewayContractStatus;
  diagnostics?: string[];
}

export interface GatewayImReadReceivedEvent extends GatewayEventEnvelope {
  kind: "im.read.received";
  conversationId: string;
  conversationType: ImConversationType;
  readerIdentity: ImIdentity;
  readSeq: number;
}

export type CustomerServiceGatewayChangeKind =
  | "queue_created"
  | "thread_created"
  | "thread_queued"
  | "thread_assigned"
  | "thread_closed"
  | "thread_rated"
  | "thread_status_changed"
  | "staff_status_changed"
  | "sla_warning"
  | "sla_breached";

export interface GatewayCustomerServiceMessageReceivedEvent extends GatewayEventEnvelope {
  kind: "cs.message.received";
  threadId: string;
  threadType: CustomerServiceThreadType;
  message: MessageItemDto;
  contractStatus?: GatewayContractStatus;
  diagnostics?: string[];
}

export interface GatewayCustomerServiceThreadChangedEvent extends GatewayEventEnvelope {
  kind: "cs.thread.changed";
  changeKind: CustomerServiceGatewayChangeKind;
  threadId?: string;
  serviceStatus?: string;
  threadStatus?: string;
  shouldNotifyQueue?: boolean;
}

export interface GatewayIgnoredEvent extends GatewayEventEnvelope {
  kind: "ignored";
  reason: GatewayIgnoredReason;
  diagnostics?: string[];
}

export interface GatewayInvalidEvent extends GatewayEventEnvelope {
  kind: "invalid";
  reason: GatewayInvalidReason;
  diagnostics: string[];
}

export type GatewayHandledEvent =
  | GatewayImMessageReceivedEvent
  | GatewayImReadReceivedEvent
  | GatewayCustomerServiceMessageReceivedEvent
  | GatewayCustomerServiceThreadChangedEvent;

export type GatewayTypedEvent =
  | GatewayHandledEvent
  | GatewayIgnoredEvent
  | GatewayInvalidEvent;
