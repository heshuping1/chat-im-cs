import type {
  ConversationListItem,
  CustomerServiceThread,
  CustomerServiceThreadType,
} from "../api/types";
import type { ImConversationEntity } from "../im/im-conversation-contract";

export type ChatConversationSource = "im" | "customer_service";
export type ChatConversationKind = "direct" | "group" | CustomerServiceThreadType | string;

export interface ChatConversationAvatar {
  avatarUrl?: string | null;
  groupAvatarUrl?: string | null;
  groupIconUrl?: string | null;
  iconUrl?: string | null;
  memberAvatarUrls?: string[];
  memberAvatars?: string[];
}

export interface ChatConversationLastMessage {
  id?: string;
  type?: string;
  preview?: string;
  sentAt?: string | null;
  senderDisplayName?: string;
  isSelf?: boolean;
}

export interface ImConversationExtension {
  conversationId: string;
  conversationType: "direct" | "group";
  lastReadSeq: number;
  lastMessageSeq: number;
  peerReadSeq: number;
  isPinned?: boolean;
  isMuted?: boolean;
  memberCount?: number | null;
  ownerDisplayName?: string | null;
  myRole?: string | null;
  peerUserId?: string | null;
  peerDisplayName?: string | null;
}

export interface CustomerServiceThreadExtension {
  threadId: string;
  threadType: CustomerServiceThreadType;
  conversationId: string;
  status: string;
  normalizedStatus: string;
  isTerminal: boolean;
  source?: string;
  from?: string;
  channel?: string;
  sourceChannel?: string;
  entryChannel?: string;
  platform?: string;
  provider?: string;
  isVip?: boolean;
  customerLevel?: string;
  priority?: string;
  tags?: string[];
}

export interface ChatConversationEntity {
  source: ChatConversationSource;
  stableId: string;
  kind: ChatConversationKind;
  title: string;
  avatar: ChatConversationAvatar;
  lastMessage?: ChatConversationLastMessage | null;
  unreadCount: number;
  lastActivityAt?: string | null;
  im?: ImConversationExtension;
  customerService?: CustomerServiceThreadExtension;
}

export function chatConversationEntityFromImConversation(
  conversation: ImConversationEntity | ConversationListItem,
): ChatConversationEntity {
  const id = "id" in conversation ? conversation.id : conversation.conversationId;
  const type = normalizeImConversationKind(
    "type" in conversation ? conversation.type : conversation.conversationType,
  );
  const lastMessage = normalizeImLastMessage(conversation);
  const lastActivityAt = lastMessage?.sentAt ?? null;

  return {
    source: "im",
    stableId: `im:${type}:${id}`,
    kind: type,
    title: conversation.title,
    avatar: {
      avatarUrl: conversation.avatarUrl,
      groupAvatarUrl: conversation.groupAvatarUrl,
      groupIconUrl: conversation.groupIconUrl,
      iconUrl: conversation.iconUrl,
      memberAvatarUrls: conversation.memberAvatarUrls ?? [],
      memberAvatars: conversation.memberAvatars ?? [],
    },
    lastMessage,
    unreadCount: Math.max(0, Number(conversation.unreadCount ?? 0)),
    lastActivityAt,
    im: {
      conversationId: id,
      conversationType: type,
      lastReadSeq: Math.max(0, Number(conversation.lastReadSeq ?? 0)),
      lastMessageSeq: Math.max(0, Number(conversation.lastMessageSeq ?? 0)),
      peerReadSeq: Math.max(0, Number(conversation.peerReadSeq ?? 0)),
      isPinned: conversation.isPinned,
      isMuted: conversation.isMuted,
      memberCount: conversation.memberCount,
      ownerDisplayName: conversation.ownerDisplayName,
      myRole: conversation.myRole,
      peerUserId: conversation.peerUserId,
      peerDisplayName: conversation.peerDisplayName,
    },
  };
}

export function chatConversationEntityFromCustomerServiceThread(
  thread: CustomerServiceThread,
): ChatConversationEntity {
  const threadType = normalizeCustomerServiceThreadKind(thread.threadType);
  const threadId = thread.threadId || thread.conversationId;
  const conversationId = thread.conversationId || threadId;
  const normalizedStatus = normalizeStatus(thread.status);

  return {
    source: "customer_service",
    stableId: `customer_service:${threadType}:${threadId}`,
    kind: threadType,
    title: thread.title,
    avatar: {
      avatarUrl: thread.avatarUrl ?? thread.customerAvatarUrl,
    },
    lastMessage: thread.lastMessagePreview
      ? {
          preview: thread.lastMessagePreview,
          sentAt: thread.lastMessageAt,
        }
      : null,
    unreadCount: Math.max(0, Number(thread.unreadCount ?? 0)),
    lastActivityAt: thread.lastMessageAt ?? thread.updatedAt ?? null,
    customerService: {
      threadId,
      threadType,
      conversationId,
      status: thread.status,
      normalizedStatus,
      isTerminal: isTerminalCustomerServiceStatus(normalizedStatus),
      source: thread.source,
      from: thread.from,
      channel: thread.channel,
      sourceChannel: thread.sourceChannel,
      entryChannel: thread.entryChannel,
      platform: thread.platform,
      provider: thread.provider,
      isVip: thread.isVip,
      customerLevel: thread.customerLevel,
      priority: thread.priority,
      tags: thread.tags,
    },
  };
}

function normalizeImLastMessage(
  conversation: ImConversationEntity | ConversationListItem,
): ChatConversationLastMessage | null | undefined {
  const message = conversation.lastMessage;
  if (!message) return message;
  const record = message as Record<string, unknown>;
  return {
    id: stringValue(record.id) || stringValue(record.messageId),
    type: stringValue(record.type) || stringValue(record.messageType),
    preview: message.preview,
    sentAt: message.sentAt,
    senderDisplayName: message.senderDisplayName,
    isSelf: message.isSelf ?? message.isMine,
  };
}

function normalizeImConversationKind(value: string): "direct" | "group" {
  const normalized = normalizeStatus(value);
  return normalized.includes("group") ? "group" : "direct";
}

function normalizeCustomerServiceThreadKind(value: string): CustomerServiceThreadType {
  return normalizeStatus(value) === "temp_session" ? "temp_session" : "im_direct";
}

function normalizeStatus(value?: string | null) {
  return String(value ?? "").trim().toLowerCase().replace(/-/g, "_");
}

function isTerminalCustomerServiceStatus(status: string) {
  return (
    status.startsWith("closed") ||
    [
      "archived",
      "ended",
      "finished",
      "resolved",
      "terminated",
      "cancelled",
      "canceled",
      "expired",
      "5",
      "6",
      "7",
      "8",
      "9",
    ].includes(status)
  );
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
