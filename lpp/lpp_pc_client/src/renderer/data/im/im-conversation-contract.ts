import {
  createContractIssue,
  degradedContract,
  invalidContract,
  okContract,
  type ContractIssue,
  type ContractResult,
} from "../api-contract/contract-result";
import type { ConversationListItem } from "../api-client";

export type ImConversationEntityType = "direct" | "group";

export interface ImConversationLastMessageEntity {
  id?: string;
  type?: string;
  preview?: string;
  sentAt?: string;
  senderUserId?: string;
  senderId?: string;
  fromUserId?: string;
  senderPlatformUserId?: string;
  platformUserId?: string;
  senderLppId?: string;
  lppId?: string;
  senderDisplayName?: string;
  isSelf?: boolean;
  isMine?: boolean;
  direction?: string;
}

export interface ImConversationEntity {
  id: string;
  type: ImConversationEntityType;
  title: string;
  avatarUrl?: string | null;
  groupAvatarUrl?: string | null;
  groupIconUrl?: string | null;
  iconUrl?: string | null;
  memberAvatarUrls: string[];
  memberAvatars: string[];
  avatarVisible?: boolean | null;
  memberAvatarVisible?: boolean | null;
  canViewMemberAvatars?: boolean | null;
  memberListVisible?: boolean | null;
  canViewMemberList?: boolean | null;
  membersVisible?: boolean | null;
  members?: ConversationListItem["members"];
  lastMessage?: ImConversationLastMessageEntity | null;
  unreadCount: number;
  lastReadSeq: number;
  lastMessageSeq: number;
  peerReadSeq: number;
  isPinned?: boolean;
  isMuted?: boolean;
  peerUserId?: string | null;
  peerLppId?: string | null;
  peerLppNo?: string | null;
  peerLppNumber?: string | null;
  peerUserNo?: string | number | null;
  peerDisplayName?: string | null;
  peerPhoneMasked?: string | null;
  peerEmailMasked?: string | null;
  memberCount?: number | null;
  ownerDisplayName?: string | null;
  myRole?: string | null;
}

export function normalizeImConversationDto(
  input: unknown,
): ContractResult<ImConversationEntity> {
  try {
    const record = asRecord(input);
    const issues: ContractIssue[] = [];
    const id = stringField(record, "conversationId", "conversation_id", "chatId", "chat_id");
    const rawType = stringField(record, "conversationType", "conversation_type", "type");
    const type = normalizeImConversationType(rawType);

    if (!id) {
      issues.push(
        createContractIssue("im.conversation.missing_id", "error", {
          field: "conversationId",
        }),
      );
    }
    if (!type) {
      issues.push(
        createContractIssue("im.conversation.unsupported_type", "error", {
          field: "conversationType",
        }),
      );
    }

    if (hasErrorIssue(issues)) return invalidContract(issues);

    const title =
      stringField(record, "title", "name", "displayName", "display_name") ||
      stringField(record, "peerDisplayName", "peer_display_name") ||
      (type === "group" ? "未命名群聊" : "未命名会话");
    if (!stringField(record, "title", "name", "displayName", "display_name")) {
      issues.push(
        createContractIssue("im.conversation.missing_title", "warning", {
          field: "title",
        }),
      );
    }

    const lastMessageRecord = asNullableRecord(
      record.lastMessage ?? record.last_message,
    );
    const lastMessage = lastMessageRecord
      ? normalizeLastMessage(lastMessageRecord)
      : undefined;
    const lastMessageSeq = numberField(
      record,
      "lastMessageSeq",
      "last_message_seq",
      "messageSeq",
      "message_seq",
    );
    const lastReadSeq = numberField(record, "lastReadSeq", "last_read_seq");
    const unreadCount = numberField(record, "unreadCount", "unread_count");

    if (lastMessageSeq === undefined) {
      issues.push(
        createContractIssue("im.conversation.missing_last_message_seq", "warning", {
          field: "lastMessageSeq",
        }),
      );
    }
    if (lastReadSeq === undefined) {
      issues.push(
        createContractIssue("im.conversation.missing_last_read_seq", "warning", {
          field: "lastReadSeq",
        }),
      );
    }

    const entity: ImConversationEntity = {
      id,
      type: type ?? "direct",
      title,
      avatarUrl: nullableStringField(record, "avatarUrl", "avatar_url"),
      groupAvatarUrl: nullableStringField(record, "groupAvatarUrl", "group_avatar_url"),
      groupIconUrl: nullableStringField(record, "groupIconUrl", "group_icon_url"),
      iconUrl: nullableStringField(record, "iconUrl", "icon_url"),
      memberAvatarUrls: stringArrayField(record, "memberAvatarUrls", "member_avatar_urls"),
      memberAvatars: stringArrayField(record, "memberAvatars", "member_avatars"),
      avatarVisible: nullableBooleanField(record, "avatarVisible", "avatar_visible"),
      memberAvatarVisible: nullableBooleanField(
        record,
        "memberAvatarVisible",
        "member_avatar_visible",
      ),
      canViewMemberAvatars: nullableBooleanField(
        record,
        "canViewMemberAvatars",
        "can_view_member_avatars",
      ),
      memberListVisible: nullableBooleanField(record, "memberListVisible", "member_list_visible"),
      canViewMemberList: nullableBooleanField(record, "canViewMemberList", "can_view_member_list"),
      membersVisible: nullableBooleanField(record, "membersVisible", "members_visible"),
      members: Array.isArray(record.members)
        ? (record.members as ConversationListItem["members"])
        : undefined,
      lastMessage,
      unreadCount: Math.max(0, Math.floor(unreadCount ?? 0)),
      lastReadSeq: Math.max(0, Math.floor(lastReadSeq ?? 0)),
      lastMessageSeq: Math.max(0, Math.floor(lastMessageSeq ?? 0)),
      peerReadSeq: Math.max(
        0,
        Math.floor(
          numberField(
            record,
            "peerReadSeq",
            "peer_read_seq",
            "peerLastReadSeq",
            "peer_last_read_seq",
            "oppositeReadSeq",
            "opposite_read_seq",
          ) ?? 0,
        ),
      ),
      isPinned: booleanField(record, "isPinned", "is_pinned"),
      isMuted: booleanField(record, "isMuted", "is_muted"),
      peerUserId: nullableStringField(record, "peerUserId", "peer_user_id"),
      peerLppId: nullableStringField(record, "peerLppId", "peer_lpp_id"),
      peerLppNo: nullableStringField(record, "peerLppNo", "peer_lpp_no"),
      peerLppNumber: nullableStringField(record, "peerLppNumber", "peer_lpp_number"),
      peerUserNo: record.peerUserNo as string | number | null | undefined,
      peerDisplayName: nullableStringField(record, "peerDisplayName", "peer_display_name"),
      peerPhoneMasked: nullableStringField(record, "peerPhoneMasked", "peer_phone_masked"),
      peerEmailMasked: nullableStringField(record, "peerEmailMasked", "peer_email_masked"),
      memberCount: nullableNumberField(record, "memberCount", "member_count"),
      ownerDisplayName: nullableStringField(record, "ownerDisplayName", "owner_display_name"),
      myRole: nullableStringField(record, "myRole", "my_role"),
    };

    return issues.length ? degradedContract(entity, issues) : okContract(entity);
  } catch (error) {
    return {
      status: "failed",
      issues: [
        createContractIssue("im.conversation.normalize_failed", "error", {
          field: "conversation",
        }),
      ],
      error: error instanceof Error
        ? { name: error.name, message: error.message }
        : { message: String(error) },
    };
  }
}

export function imConversationEntityToListItem(
  entity: ImConversationEntity,
  source: Partial<ConversationListItem> = {},
): ConversationListItem {
  return {
    ...source,
    conversationId: entity.id,
    conversationType: entity.type,
    title: entity.title,
    avatarUrl: entity.avatarUrl,
    groupAvatarUrl: entity.groupAvatarUrl,
    groupIconUrl: entity.groupIconUrl,
    iconUrl: entity.iconUrl,
    memberAvatarUrls: entity.memberAvatarUrls,
    memberAvatars: entity.memberAvatars,
    avatarVisible: entity.avatarVisible,
    memberAvatarVisible: entity.memberAvatarVisible,
    canViewMemberAvatars: entity.canViewMemberAvatars,
    memberListVisible: entity.memberListVisible,
    canViewMemberList: entity.canViewMemberList,
    membersVisible: entity.membersVisible,
    members: entity.members,
    lastMessage: entity.lastMessage
      ? {
          messageId: entity.lastMessage.id,
          messageType: entity.lastMessage.type,
          preview: entity.lastMessage.preview,
          sentAt: entity.lastMessage.sentAt,
          senderUserId: entity.lastMessage.senderUserId,
          senderId: entity.lastMessage.senderId,
          fromUserId: entity.lastMessage.fromUserId,
          senderPlatformUserId: entity.lastMessage.senderPlatformUserId,
          platformUserId: entity.lastMessage.platformUserId,
          senderLppId: entity.lastMessage.senderLppId,
          lppId: entity.lastMessage.lppId,
          senderDisplayName: entity.lastMessage.senderDisplayName,
          isSelf: entity.lastMessage.isSelf,
          isMine: entity.lastMessage.isMine,
          direction: entity.lastMessage.direction,
        }
      : entity.lastMessage,
    unreadCount: entity.unreadCount,
    lastReadSeq: entity.lastReadSeq,
    lastMessageSeq: entity.lastMessageSeq,
    peerReadSeq: entity.peerReadSeq,
    isPinned: entity.isPinned,
    isMuted: entity.isMuted,
    peerUserId: entity.peerUserId,
    peerLppId: entity.peerLppId,
    peerLppNo: entity.peerLppNo,
    peerLppNumber: entity.peerLppNumber,
    peerUserNo: entity.peerUserNo,
    peerDisplayName: entity.peerDisplayName,
    peerPhoneMasked: entity.peerPhoneMasked,
    peerEmailMasked: entity.peerEmailMasked,
    memberCount: entity.memberCount,
    ownerDisplayName: entity.ownerDisplayName,
    myRole: entity.myRole,
  };
}

export function normalizeImConversationType(
  value: string | undefined,
): ImConversationEntityType | undefined {
  const normalized = value?.trim().toLowerCase().replace(/-/g, "_");
  if (
    normalized === "direct" ||
    normalized === "im_direct" ||
    normalized === "direct_chat" ||
    normalized === "direct_customer" ||
    normalized === "customer_direct"
  ) {
    return "direct";
  }
  if (
    normalized === "group" ||
    normalized === "im_group" ||
    normalized === "group_chat"
  ) {
    return "group";
  }
  return undefined;
}

function normalizeLastMessage(record: Record<string, unknown>): ImConversationLastMessageEntity {
  return {
    id: stringField(record, "messageId", "message_id", "id") || undefined,
    type: stringField(record, "messageType", "message_type", "type") || undefined,
    preview: stringField(record, "preview", "text", "content") || undefined,
    sentAt: stringField(record, "sentAt", "sent_at", "createdAt", "created_at") || undefined,
    senderUserId: stringField(record, "senderUserId", "sender_user_id", "userId", "user_id") || undefined,
    senderId: stringField(record, "senderId", "sender_id") || undefined,
    fromUserId: stringField(record, "fromUserId", "from_user_id") || undefined,
    senderPlatformUserId:
      stringField(record, "senderPlatformUserId", "sender_platform_user_id", "platformUserId", "platform_user_id") ||
      undefined,
    platformUserId: stringField(record, "platformUserId", "platform_user_id") || undefined,
    senderLppId: stringField(record, "senderLppId", "sender_lpp_id", "lppId", "lpp_id") || undefined,
    lppId: stringField(record, "lppId", "lpp_id") || undefined,
    senderDisplayName: stringField(record, "senderDisplayName", "sender_display_name") || undefined,
    isSelf: booleanField(record, "isSelf", "is_self"),
    isMine: booleanField(record, "isMine", "is_mine"),
    direction: stringField(record, "direction", "messageDirection", "message_direction") || undefined,
  };
}

function hasErrorIssue(issues: ContractIssue[]) {
  return issues.some((issue) => issue.level === "error");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asNullableRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function stringField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
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

function nullableNumberField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value === null) return null;
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

function nullableBooleanField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value === null) return null;
    if (typeof value === "boolean") return value;
  }
  return undefined;
}

function stringArrayField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string" && item.length > 0);
    }
  }
  return [];
}
