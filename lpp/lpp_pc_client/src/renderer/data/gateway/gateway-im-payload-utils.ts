import type { MessageItemDto } from "../api-client";
import {
  inferMessageType,
  messagePreviewFromBody,
  normalizeMessageItem,
} from "../im-message-normalize";
import { validateGatewayMessageContract } from "../im-api-contract";
import type { ImCoreEvent } from "../im-read-model";
import {
  asRecord,
  booleanField,
  firstRecord,
  normalizeType,
  numberField,
  stringField,
} from "./gateway-record-utils";

export function imCoreEventFromGatewayMessageForTest(params: {
  payload: Record<string, unknown>;
  active: boolean;
  fallbackConversationId?: string;
  fallbackConversationType?: string;
}): ImCoreEvent | undefined {
  const payload = params.payload;
  const raw = messageRecord(payload);
  const conversationId =
    imConversationId(payload, params.fallbackConversationId) ||
    stringField(raw, "conversationId", "conversation_id", "chatId", "chat_id");
  const conversationType =
    inferImConversationType(payload, params.fallbackConversationType) || "direct";
  const validation = validateGatewayMessageContract(gatewayMessageContractInput(payload));

  if (!conversationId || validation.level === "blocking") return undefined;

  return {
    type: "gateway.message_received",
    conversationId,
    conversationType,
    message: {
      ...validation.normalized,
      conversationId: validation.normalized.conversationId || conversationId,
    },
    isActiveConversation: params.active,
  };
}

export function imCoreEventFromGatewayReadForTest(
  payload: Record<string, unknown>,
): ImCoreEvent | undefined {
  const conversationId = stringField(payload, "conversationId", "conversation_id", "chatId", "chat_id");
  const readSeq =
    numberField(payload, "readSeq", "read_seq", "lastReadSeq", "last_read_seq", "conversationSeq", "conversation_seq") ??
    0;
  if (!conversationId || readSeq <= 0) return undefined;
  return {
    type: "gateway.read_received",
    conversationId,
    conversationType:
      inferImConversationType(
        payload,
        stringField(payload, "conversationType", "conversation_type", "chatType", "chat_type"),
      ) || "direct",
    readerIdentity: readReceiptReaderIdentity(payload),
    readSeq,
  };
}

export function messageRecord(payload: Record<string, unknown>) {
  return firstRecord(
    payload.message,
    payload.msg,
    payload.messageInfo,
    payload.message_info,
    payload.messageDto,
    payload.message_dto,
    payload.item,
  );
}

export function conversationRecord(payload: Record<string, unknown>) {
  return firstRecord(
    payload.conversation,
    payload.chat,
    payload.directChat,
    payload.direct_chat,
    payload.groupChat,
    payload.group_chat,
  );
}

export function imConversationId(payload: Record<string, unknown>, fallbackConversationId = "") {
  const raw = messageRecord(payload);
  const conversation = conversationRecord(payload);
  return (
    stringField(raw, "conversationId", "conversation_id", "chatId", "chat_id", "directChatId", "direct_chat_id", "directId", "direct_id", "groupChatId", "group_chat_id", "groupId", "group_id") ||
    stringField(payload, "conversationId", "conversation_id", "chatId", "chat_id", "directChatId", "direct_chat_id", "directId", "direct_id", "groupChatId", "group_chat_id", "groupId", "group_id") ||
    stringField(conversation, "conversationId", "conversation_id", "chatId", "chat_id", "directChatId", "direct_chat_id", "directId", "direct_id", "groupChatId", "group_chat_id", "groupId", "group_id") ||
    fallbackConversationId
  );
}

export function inferImConversationType(
  payload: Record<string, unknown>,
  fallbackConversationType = "",
): "direct" | "group" | "" {
  const raw = messageRecord(payload);
  const conversation = conversationRecord(payload);
  const explicit = normalizeImConversationType(
    fallbackConversationType ||
      stringField(raw, "conversationType", "conversation_type", "chatType", "chat_type", "type") ||
      stringField(payload, "conversationType", "conversation_type", "chatType", "chat_type", "type") ||
      stringField(conversation, "conversationType", "conversation_type", "chatType", "chat_type", "type"),
  );
  if (explicit) return explicit;

  const groupMarker =
    stringField(raw, "groupChatId", "group_chat_id", "groupId", "group_id") ||
    stringField(payload, "groupChatId", "group_chat_id", "groupId", "group_id") ||
    stringField(conversation, "groupChatId", "group_chat_id", "groupId", "group_id");
  if (groupMarker) return "group";

  const directMarker =
    stringField(raw, "directChatId", "direct_chat_id", "directId", "direct_id", "peerUserId", "peer_user_id", "targetUserId", "target_user_id", "receiverUserId", "receiver_user_id", "toUserId", "to_user_id") ||
    stringField(payload, "directChatId", "direct_chat_id", "directId", "direct_id", "peerUserId", "peer_user_id", "targetUserId", "target_user_id", "receiverUserId", "receiver_user_id", "toUserId", "to_user_id") ||
    stringField(conversation, "directChatId", "direct_chat_id", "directId", "direct_id", "peerUserId", "peer_user_id", "targetUserId", "target_user_id", "receiverUserId", "receiver_user_id", "toUserId", "to_user_id");
  if (directMarker) return "direct";

  return imConversationId(payload, fallbackConversationIdFromPeer(payload)) ? "direct" : "";
}

export function fallbackConversationIdFromPeer(payload: Record<string, unknown>) {
  const raw = messageRecord(payload);
  const conversation = conversationRecord(payload);
  return (
    stringField(raw, "peerUserId", "peer_user_id", "targetUserId", "target_user_id", "receiverUserId", "receiver_user_id", "toUserId", "to_user_id", "fromUserId", "from_user_id", "senderUserId", "sender_user_id") ||
    stringField(payload, "peerUserId", "peer_user_id", "targetUserId", "target_user_id", "receiverUserId", "receiver_user_id", "toUserId", "to_user_id", "fromUserId", "from_user_id", "senderUserId", "sender_user_id") ||
    stringField(conversation, "peerUserId", "peer_user_id", "targetUserId", "target_user_id", "receiverUserId", "receiver_user_id", "toUserId", "to_user_id")
  );
}

export function readReceiptReaderIds(payload: Record<string, unknown>) {
  return [
    stringField(payload, "userId", "user_id"),
    stringField(payload, "readerUserId", "reader_user_id"),
    stringField(payload, "readUserId", "read_user_id"),
    stringField(payload, "readerId", "reader_id"),
    stringField(payload, "platformUserId", "platform_user_id"),
    stringField(payload, "readerPlatformUserId", "reader_platform_user_id"),
    stringField(payload, "lppId", "lpp_id"),
    stringField(payload, "readerLppId", "reader_lpp_id"),
  ];
}

export function gatewayMessage(
  payload: Record<string, unknown>,
  fallbackConversationId: string,
): MessageItemDto {
  const nestedMessage = messageRecord(payload);
  const raw = Object.keys(nestedMessage).length ? nestedMessage : payload;
  const conversationId = imConversationId(payload, fallbackConversationId);
  const body = asRecord(raw.body ?? raw.messageBody ?? raw.message_body ?? raw.content) ?? {};
  const messageType =
    stringField(raw, "messageType", "message_type", "type") ||
    stringField(body, "messageType", "message_type", "type") ||
    inferMessageType(body) ||
    "text";
  return normalizeMessageItem({
    messageId:
      stringField(raw, "messageId", "message_id", "id", "serverMessageId", "server_message_id") ||
      `gateway-${conversationId}-${numberField(raw, "conversationSeq", "seq") ?? Date.now()}`,
    conversationId,
    conversationSeq: numberField(raw, "conversationSeq", "conversation_seq", "seq", "messageSeq", "message_seq"),
    senderUserId: stringField(raw, "senderUserId", "sender_user_id", "senderId", "sender_id", "fromUserId", "from_user_id", "userId", "user_id") || stringField(payload, "senderUserId", "sender_user_id", "senderId", "sender_id", "fromUserId", "from_user_id", "userId", "user_id"),
    senderId: stringField(raw, "senderId", "sender_id") || stringField(payload, "senderId", "sender_id"),
    fromUserId: stringField(raw, "fromUserId", "from_user_id") || stringField(payload, "fromUserId", "from_user_id"),
    senderPlatformUserId: stringField(raw, "senderPlatformUserId", "sender_platform_user_id", "platformUserId", "platform_user_id") || stringField(payload, "senderPlatformUserId", "sender_platform_user_id", "platformUserId", "platform_user_id"),
    senderLppId: stringField(raw, "senderLppId", "sender_lpp_id", "lppId", "lpp_id") || stringField(payload, "senderLppId", "sender_lpp_id", "lppId", "lpp_id"),
    senderDisplayName: stringField(raw, "senderDisplayName", "sender_display_name", "senderName", "sender_name", "nickname", "nickName", "nick_name") || stringField(payload, "senderDisplayName", "sender_display_name", "senderName", "sender_name", "nickname", "nickName", "nick_name"),
    senderAvatarUrl: stringField(raw, "senderAvatarUrl", "sender_avatar_url", "avatarUrl", "avatar_url") || null,
    messageType,
    body: bodyWithType(body, messageType),
    preview: stringField(raw, "preview", "text", "content") || previewFromBody(body),
    sentAt:
      stringField(raw, "sentAt", "sent_at", "createdAt", "created_at", "serverTime", "server_time", "timestamp") ||
      new Date().toISOString(),
    isSelf: booleanField(raw, "isSelf", "is_self", "isMine", "is_mine"),
    direction: stringField(raw, "direction"),
  });
}

function gatewayMessageContractInput(payload: Record<string, unknown>) {
  const raw = messageRecord(payload);
  return {
    ...raw,
    conversationId:
      stringField(raw, "conversationId", "conversation_id", "chatId", "chat_id") ||
      stringField(payload, "conversationId", "conversation_id", "chatId", "chat_id"),
    conversationSeq:
      numberField(raw, "conversationSeq", "conversation_seq", "seq", "messageSeq", "message_seq") ??
      numberField(payload, "conversationSeq", "conversation_seq", "seq", "messageSeq", "message_seq"),
    senderUserId:
      stringField(raw, "senderUserId", "sender_user_id", "userId", "user_id") ||
      stringField(payload, "senderUserId", "sender_user_id", "userId", "user_id"),
    senderId:
      stringField(raw, "senderId", "sender_id") ||
      stringField(payload, "senderId", "sender_id"),
    fromUserId:
      stringField(raw, "fromUserId", "from_user_id") ||
      stringField(payload, "fromUserId", "from_user_id"),
    senderPlatformUserId:
      stringField(
        raw,
        "senderPlatformUserId",
        "sender_platform_user_id",
        "platformUserId",
        "platform_user_id",
      ) ||
      stringField(
        payload,
        "senderPlatformUserId",
        "sender_platform_user_id",
        "platformUserId",
        "platform_user_id",
      ),
    senderLppId:
      stringField(raw, "senderLppId", "sender_lpp_id", "lppId", "lpp_id") ||
      stringField(payload, "senderLppId", "sender_lpp_id", "lppId", "lpp_id"),
    direction: stringField(raw, "direction") || stringField(payload, "direction"),
    isSelf: booleanField(raw, "isSelf", "is_self", "isMine", "is_mine"),
    isMine: booleanField(raw, "isMine", "is_mine"),
    messageType:
      stringField(raw, "messageType", "message_type", "type") ||
      stringField(payload, "messageType", "message_type", "type"),
    sentAt:
      stringField(raw, "sentAt", "sent_at", "createdAt", "created_at") ||
      stringField(payload, "sentAt", "sent_at", "createdAt", "created_at"),
  };
}

function readReceiptReaderIdentity(payload: Record<string, unknown>) {
  return {
    userId:
      stringField(payload, "userId", "user_id", "readerUserId", "reader_user_id", "readUserId", "read_user_id") ||
      undefined,
    platformUserId:
      stringField(payload, "platformUserId", "platform_user_id", "readerPlatformUserId", "reader_platform_user_id") ||
      undefined,
    lppId:
      stringField(payload, "lppId", "lpp_id", "readerLppId", "reader_lpp_id") ||
      undefined,
    displayName:
      stringField(payload, "displayName", "display_name", "readerDisplayName", "reader_display_name") ||
      undefined,
  };
}

function normalizeImConversationType(value: string): "direct" | "group" | "" {
  const normalized = normalizeType(value);
  if (
    [
      "direct",
      "im_direct",
      "direct_chat",
      "direct_customer",
      "customer_direct",
      "private",
      "single",
      "single_chat",
      "one_to_one",
      "p2p",
      "friend",
      "friend_chat",
    ].includes(normalized)
  ) {
    return "direct";
  }
  if (["group", "im_group", "group_chat"].includes(normalized)) return "group";
  return "";
}

function bodyWithType(body: Record<string, unknown>, messageType: string) {
  return body.messageType || body.type ? body : { ...body, messageType };
}

function previewFromBody(body: Record<string, unknown>) {
  return messagePreviewFromBody(body, inferMessageType(body));
}
