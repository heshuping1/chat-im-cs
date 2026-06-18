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
import { resolveCustomerServiceMessageSender } from "./message-domain";

export type CustomerServiceMessageEntity = ChatMessageEntity & {
  source: "customer_service";
  senderRole?: string;
  senderType?: string;
  fromRole?: string;
  staffAvatarUrl?: string | null;
  staffDisplayName?: string | null;
  staffName?: string | null;
  staffUserId?: string | null;
  serviceStaffUserId?: string | null;
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
      stringField(
        record,
        "conversationId",
        "conversation_id",
        "threadId",
        "thread_id",
      ) ||
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
    const structuredBody =
      asNullableRecord(record.body) ||
      asNullableRecord(record.messageBody) ||
      asNullableRecord(record.message_body) ||
      asNullableRecord(record.content);
    const type =
      normalizeMessageType({
        messageId: "type-probe",
        messageType: stringField(record, "messageType", "message_type", "type"),
        body: structuredBody ?? {},
      }) ||
      inferMessageType(structuredBody ?? {}) ||
      "text";
    const rawBody = structuredBody ?? textBodyFromRecord(record, type) ?? {};
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
    if (
      !stringField(record, "messageType", "message_type", "type") &&
      !inferMessageType(rawBody)
    ) {
      issues.push(
        createContractIssue("cs.message.missing_type", "warning", {
          field: "messageType",
        }),
      );
    }

    const preview =
      stringField(record, "preview", "text", "message", "content") ||
      messagePreviewFromBody(body, type) ||
      "";
    const dto: MessageItemDto = {
      messageId: id || `${options.threadId}:unknown`,
      conversationId,
      conversationSeq: conversationSeq
        ? Math.max(0, Math.floor(conversationSeq))
        : undefined,
      senderUserId: stringField(
        record,
        "senderUserId",
        "sender_user_id",
        "userId",
        "user_id",
      ),
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
      senderLppId: stringField(
        record,
        "senderLppId",
        "sender_lpp_id",
        "lppId",
        "lpp_id",
      ),
      lppId: stringField(
        record,
        "senderLppId",
        "sender_lpp_id",
        "lppId",
        "lpp_id",
      ),
      senderDisplayName: stringField(
        record,
        "senderDisplayName",
        "sender_display_name",
        "senderName",
        "sender_name",
        "fromName",
        "from_name",
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
      senderRole: stringField(
        record,
        "senderRole",
        "sender_role",
        "authorRole",
        "author_role",
      ),
      senderType: stringField(
        record,
        "senderType",
        "sender_type",
        "authorType",
        "author_type",
        "fromType",
        "from_type",
      ),
      fromRole: stringField(record, "fromRole", "from_role", "role"),
      staffAvatarUrl: nullableStringField(
        record,
        "staffAvatarUrl",
        "staff_avatar_url",
        "agentAvatarUrl",
        "agent_avatar_url",
      ),
      staffDisplayName: nullableStringField(
        record,
        "staffDisplayName",
        "staff_display_name",
        "agentDisplayName",
        "agent_display_name",
        "operatorDisplayName",
        "operator_display_name",
      ),
      staffName: nullableStringField(
        record,
        "staffName",
        "staff_name",
        "agentName",
        "agent_name",
        "operatorName",
        "operator_name",
      ),
      staffUserId: nullableStringField(
        record,
        "staffUserId",
        "staff_user_id",
        "agentUserId",
        "agent_user_id",
        "operatorUserId",
        "operator_user_id",
      ),
      serviceStaffUserId: nullableStringField(
        record,
        "serviceStaffUserId",
        "service_staff_user_id",
      ),
      messageType: type,
      body,
      preview,
      sentAt: stringField(
        record,
        "sentAt",
        "sent_at",
        "createdAt",
        "created_at",
        "serverTime",
        "server_time",
      ),
      readAt: nullableStringField(
        record,
        "readAt",
        "read_at",
        "readTime",
        "read_time",
        "seenAt",
        "seen_at",
        "customerReadAt",
        "customer_read_at",
        "customerReadTime",
        "customer_read_time",
        "customerSeenAt",
        "customer_seen_at",
        "readByCustomerAt",
        "read_by_customer_at",
        "receiverReadAt",
        "receiver_read_at",
      ),
      readCount: numberField(record, "readCount", "read_count"),
      isRead: booleanField(
        record,
        "isRead",
        "is_read",
        "seen",
        "isSeen",
        "is_seen",
        "customerRead",
        "customer_read",
        "isCustomerRead",
        "is_customer_read",
        "readByCustomer",
        "read_by_customer",
        "receiverRead",
        "receiver_read",
      ),
      status: stringField(record, "status"),
      isRecalled: booleanField(record, "isRecalled", "is_recalled"),
      isSelf: booleanField(record, "isSelf", "is_self"),
      isMine: booleanField(record, "isMine", "is_mine"),
      direction: stringField(
        record,
        "direction",
        "messageDirection",
        "message_direction",
      ),
    };
    const sender = resolveCustomerServiceMessageSender({
      direction: dto.direction,
      fromRole: dto.fromRole,
      messageType: dto.messageType,
      senderDisplayName: dto.senderDisplayName,
      senderRole: dto.senderRole,
      senderType: dto.senderType,
    });
    if (sender.missingRole) {
      issues.push(
        createContractIssue("cs.message.sender_role_missing", "warning", {
          field: "senderRole",
        }),
      );
    }
    if (sender.unknownRole) {
      issues.push(
        createContractIssue("cs.message.sender_role_unknown", "warning", {
          field: "senderRole",
        }),
      );
    }
    if (sender.missingDisplayName) {
      issues.push(
        createContractIssue("cs.message.sender_display_name_missing", "warning", {
          field: "senderDisplayName",
        }),
      );
    }
    const entity: CustomerServiceMessageEntity = {
      ...chatMessageEntityFromDto(dto, {
        source: "customer_service",
        conversationId,
        conversationType: options.threadType,
        threadId: options.threadId,
        threadType: options.threadType,
      }),
      preview,
      source: "customer_service",
      senderRole: dto.senderRole,
      senderType: dto.senderType,
      fromRole: dto.fromRole,
      staffAvatarUrl: dto.staffAvatarUrl,
      staffDisplayName: dto.staffDisplayName,
      staffName: dto.staffName,
      staffUserId: dto.staffUserId,
      serviceStaffUserId: dto.serviceStaffUserId,
      threadId: options.threadId,
      threadType: options.threadType,
    };

    return issues.length
      ? degradedContract(entity, issues)
      : okContract(entity);
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
  return chatMessageEntityToDto(entity, {
    senderRole: entity.senderRole,
    senderType: entity.senderType,
    fromRole: entity.fromRole,
    staffAvatarUrl: entity.staffAvatarUrl,
    staffDisplayName: entity.staffDisplayName,
    staffName: entity.staffName,
    staffUserId: entity.staffUserId,
    serviceStaffUserId: entity.serviceStaffUserId,
    ...source,
  });
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

function textBodyFromRecord(record: Record<string, unknown>, type: string) {
  if (normalizeMessageType(type) !== "text") return undefined;
  const text = stringField(record, "text", "message", "content");
  return text ? { text } : undefined;
}

function nullableStringField(
  record: Record<string, unknown>,
  ...keys: string[]
) {
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
    if (
      typeof value === "string" &&
      value.trim() &&
      Number.isFinite(Number(value))
    ) {
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
