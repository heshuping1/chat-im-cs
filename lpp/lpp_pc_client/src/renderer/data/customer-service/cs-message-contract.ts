import {
  createContractIssue,
  degradedContract,
  failedContract,
  okContract,
  type ContractIssue,
  type ContractResult,
} from "../api-contract/contract-result";
import type { CustomerServiceThreadType, MessageItemDto } from "../api/types";
import {
  inferMessageType,
  messagePreviewFromBody,
  normalizeMessageBody,
  normalizeMessageType,
} from "../im-message-normalize";
import {
  chatMessageEntityFromDto,
  chatMessageEntityToDto,
  type ChatMessageEntity,
} from "../message/message-domain";

export type CustomerServiceMessageEntity = ChatMessageEntity & {
  source: "customer_service";
  threadId: string;
  threadType: CustomerServiceThreadType;
};

export interface NormalizeCustomerServiceMessageOptions {
  threadId: string;
  threadType: CustomerServiceThreadType;
  fallbackConversationId?: string;
  fallbackMessageId?: string;
}

export function normalizeCustomerServiceMessageDto(
  input: unknown,
  options: NormalizeCustomerServiceMessageOptions,
): ContractResult<CustomerServiceMessageEntity> {
  try {
    const record = asRecord(input);
    const issues: ContractIssue[] = [];
    const conversationId =
      stringField(record, "conversationId", "conversation_id", "threadId", "thread_id") ||
      options.fallbackConversationId ||
      options.threadId;
    const conversationSeq = numberField(
      record,
      "conversationSeq",
      "conversation_seq",
      "seq",
      "messageSeq",
      "message_seq",
    );
    const rawBody =
      asNullableRecord(record.body) ||
      asNullableRecord(record.messageBody) ||
      asNullableRecord(record.message_body) ||
      asNullableRecord(record.content) ||
      {};
    const type =
      normalizeMessageType({
        messageId: "type-probe",
        messageType: stringField(record, "messageType", "message_type", "type"),
        body: rawBody,
      }) ||
      inferMessageType(rawBody) ||
      "text";
    const body = normalizeMessageBody(rawBody, type);
    const rawId = stringField(record, "messageId", "message_id", "id");
    const id = rawId || options.fallbackMessageId || "";

    if (!rawId) {
      issues.push(
        createContractIssue("cs.message.generated_id", "warning", {
          field: "messageId",
        }),
      );
    }
    if (!conversationSeq || conversationSeq <= 0) {
      issues.push(
        createContractIssue("cs.message.missing_seq", "warning", {
          field: "conversationSeq",
        }),
      );
    }
    if (!conversationId) {
      issues.push(
        createContractIssue("cs.message.missing_conversation_id", "warning", {
          field: "conversationId",
        }),
      );
    }
    if (!stringField(record, "messageType", "message_type", "type") && !inferMessageType(rawBody)) {
      issues.push(
        createContractIssue("cs.message.missing_type", "warning", {
          field: "messageType",
        }),
      );
    }

    const preview =
      stringField(record, "preview", "text", "message") ||
      messagePreviewFromBody(body, type) ||
      "[消息]";
    const dto: MessageItemDto = {
      messageId: id || `${options.threadId}:unknown`,
      conversationId,
      conversationSeq: conversationSeq ? Math.max(0, Math.floor(conversationSeq)) : undefined,
      senderUserId: stringField(record, "senderUserId", "sender_user_id", "userId", "user_id"),
      senderId: stringField(record, "senderId", "sender_id"),
      fromUserId: stringField(record, "fromUserId", "from_user_id"),
      senderPlatformUserId: stringField(
        record,
        "senderPlatformUserId",
        "sender_platform_user_id",
        "platformUserId",
        "platform_user_id",
      ),
      platformUserId: stringField(
        record,
        "senderPlatformUserId",
        "sender_platform_user_id",
        "platformUserId",
        "platform_user_id",
      ),
      senderLppId: stringField(record, "senderLppId", "sender_lpp_id", "lppId", "lpp_id"),
      lppId: stringField(record, "senderLppId", "sender_lpp_id", "lppId", "lpp_id"),
      senderDisplayName: stringField(
        record,
        "senderDisplayName",
        "sender_display_name",
        "displayName",
        "display_name",
      ),
      senderAvatarUrl: nullableStringField(
        record,
        "senderAvatarUrl",
        "sender_avatar_url",
        "avatarUrl",
        "avatar_url",
      ),
      avatarUrl: nullableStringField(
        record,
        "senderAvatarUrl",
        "sender_avatar_url",
        "avatarUrl",
        "avatar_url",
      ),
      messageType: type,
      body,
      preview,
      sentAt: stringField(record, "sentAt", "sent_at", "createdAt", "created_at", "serverTime", "server_time"),
      readAt: nullableStringField(record, "readAt", "read_at"),
      readCount: numberField(record, "readCount", "read_count"),
      isRead: booleanField(record, "isRead", "is_read"),
      status: stringField(record, "status"),
      isRecalled: booleanField(record, "isRecalled", "is_recalled"),
      isSelf: booleanField(record, "isSelf", "is_self"),
      isMine: booleanField(record, "isMine", "is_mine"),
      direction: stringField(record, "direction", "messageDirection", "message_direction"),
    };
    const entity: CustomerServiceMessageEntity = {
      ...chatMessageEntityFromDto(dto, {
        source: "customer_service",
        conversationId,
        conversationType: options.threadType,
        threadId: options.threadId,
        threadType: options.threadType,
      }),
      source: "customer_service",
      threadId: options.threadId,
      threadType: options.threadType,
    };

    return issues.length ? degradedContract(entity, issues) : okContract(entity);
  } catch (error) {
    return failedContract(error, [
      createContractIssue("cs.message.normalize_failed", "error", {
        field: "message",
      }),
    ]);
  }
}

export function customerServiceMessageEntityToDto(
  entity: CustomerServiceMessageEntity,
  source: Partial<MessageItemDto> = {},
): MessageItemDto {
  return chatMessageEntityToDto(entity, source);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asNullableRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function stringField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return undefined;
}

function nullableStringField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value === null) return null;
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return undefined;
}

function numberField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return undefined;
}

function booleanField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true") return true;
      if (normalized === "false") return false;
    }
  }
  return undefined;
}
