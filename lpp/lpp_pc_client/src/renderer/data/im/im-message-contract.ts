import {
  createContractIssue,
  degradedContract,
  failedContract,
  invalidContract,
  okContract,
  type ContractIssue,
  type ContractResult,
} from "../api-contract/contract-result";
import type { MessageItemDto } from "../api-client";
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
  type ChatMessageSenderEntity,
} from "../message/message-domain";

export interface NormalizeImMessageOptions {
  fallbackConversationId?: string;
  fallbackConversationType?: "direct" | "group";
}

export type ImMessageSenderEntity = ChatMessageSenderEntity;

export type ImMessageEntity = ChatMessageEntity & {
  source: "im";
  conversationId?: string;
  status?: string;
  isRecalled?: boolean;
  isSelf?: boolean;
  isMine?: boolean;
};

export function normalizeImMessageDto(
  input: unknown,
  options: NormalizeImMessageOptions = {},
): ContractResult<ImMessageEntity> {
  try {
    const record = asRecord(input);
    const issues: ContractIssue[] = [];
    const conversationId =
      stringField(record, "conversationId", "conversation_id", "chatId", "chat_id") ||
      options.fallbackConversationId;
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
    const id =
      rawId ||
      (conversationId && conversationSeq
        ? `seq:${conversationId}:${conversationSeq}`
        : "");

    if (!conversationSeq || conversationSeq <= 0) {
      issues.push(
        createContractIssue("im.message.missing_seq", "error", {
          field: "conversationSeq",
        }),
      );
    }
    if (!id) {
      issues.push(
        createContractIssue("im.message.missing_id", "error", {
          field: "messageId",
        }),
      );
    } else if (!rawId) {
      issues.push(
        createContractIssue("im.message.generated_id", "warning", {
          field: "messageId",
        }),
      );
    }
    if (!conversationId) {
      issues.push(
        createContractIssue("im.message.missing_conversation_id", "warning", {
          field: "conversationId",
        }),
      );
    }
    if (!stringField(record, "messageType", "message_type", "type") && !inferMessageType(rawBody)) {
      issues.push(
        createContractIssue("im.message.missing_type", "warning", {
          field: "messageType",
        }),
      );
    }

    if (hasErrorIssue(issues)) return invalidContract(issues);

    const derivedPreview = messagePreviewFromBody(body, type);
    const preview =
      stringField(record, "preview", "text", "message") ||
      (derivedPreview === "Unsupported message type: text" ? "" : derivedPreview) ||
      "[消息]";
    const dto: MessageItemDto = {
      messageId: id,
      conversationId,
      conversationSeq: Math.max(0, Math.floor(conversationSeq ?? 0)),
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
      senderDisplayName: stringField(record, "senderDisplayName", "sender_display_name"),
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
    const entity: ImMessageEntity = {
      ...chatMessageEntityFromDto(dto, {
        source: "im",
        conversationId,
        conversationType: options.fallbackConversationType ?? "direct",
      }),
      source: "im",
      conversationId,
      status: dto.status,
      isRecalled: dto.isRecalled,
      isSelf: dto.isSelf,
      isMine: dto.isMine,
    };

    return issues.length ? degradedContract(entity, issues) : okContract(entity);
  } catch (error) {
    return failedContract(error, [
      createContractIssue("im.message.normalize_failed", "error", {
        field: "message",
      }),
    ]);
  }
}

export function imMessageEntityToDto(
  entity: ImMessageEntity,
  source: Partial<MessageItemDto> = {},
): MessageItemDto {
  const dto = chatMessageEntityToDto(entity, {
    ...source,
    conversationId: entity.conversationId ?? source.conversationId,
    status: entity.status ?? source.status,
    isRecalled: entity.isRecalled ?? source.isRecalled,
    isSelf: entity.isSelf ?? source.isSelf,
    isMine: entity.isMine ?? source.isMine,
  });
  return {
    ...dto,
    conversationId: entity.conversationId ?? dto.conversationId,
    status: entity.status ?? dto.status,
    isRecalled: entity.isRecalled ?? dto.isRecalled,
    isSelf: entity.isSelf ?? dto.isSelf,
    isMine: entity.isMine ?? dto.isMine,
  };
}

function hasErrorIssue(issues: ContractIssue[]) {
  return issues.some((issue) => issue.level === "error");
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
  }
  return undefined;
}
