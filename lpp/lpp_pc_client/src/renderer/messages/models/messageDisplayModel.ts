import type {
  ConversationListItem,
  GroupMemberDto,
  MessageItemDto,
} from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import {
  type CurrentUserIdentity,
  isSelfSender,
} from "../../data/message-display";
import {
  deriveMessageView,
  type ConversationReadState,
} from "../../data/im-read-model";
import { normalizeMessageType } from "../../data/im-message-normalize";
import { getImConversationType } from "./messageConversationTypeModel";
import { usablePersonName } from "./groupAvatarModel";

export type AvatarProfilePopoverState = {
  x: number;
  y: number;
  title: string;
  subtitle: string;
  avatarUrl?: string | null;
  rows: Array<{ label: string; value: string }>;
};

export type UnreadJumpState = {
  conversationId: string;
  count: number;
  lastReadSeq: number;
};

export function buildGroupMemberMap(members: GroupMemberDto[]) {
  const map = new Map<string, GroupMemberDto>();
  members.forEach((member) => {
    [
      member.userId,
      member.platformUserId,
      member.lppId,
      member.displayName,
    ].forEach((key) => {
      if (key) map.set(key.trim().toLowerCase(), member);
    });
  });
  return map;
}

export function resolveSenderDisplayName(
  message: MessageItemDto,
  conversation: ConversationListItem,
  groupMembers: Map<string, GroupMemberDto>,
) {
  const member = resolveGroupMember(message, groupMembers);
  const senderName = usablePersonName(message.senderDisplayName);
  if (conversation.conversationType === "direct") {
    return senderName || conversation.title || "对方";
  }
  const memberName = usablePersonName(member?.displayName);
  if (memberName) return memberName;
  if (senderName) return senderName;
  const bodyName = usablePersonName(
    stringField(message.body ?? {}, "senderName", "senderDisplayName", "displayName"),
  );
  return bodyName || "成员";
}

export function eventMessageText(message: MessageItemDto) {
  if (!isEventLikeMessage(message)) return undefined;
  const body = message.body ?? {};
  const eventRecord =
    body.event && typeof body.event === "object"
      ? (body.event as Record<string, unknown>)
      : undefined;
  const directText =
    stringField(body, "eventText", "notice") ||
    stringField(eventRecord ?? {}, "text", "preview", "content") ||
    (typeof body.event === "string" ? body.event.trim() : undefined) ||
    extractMessageText(message) ||
    message.preview;
  if (directText && !isGenericGroupJoinText(directText)) return directText;
  return formatGroupMemberEventText(eventRecord ?? body) || directText || undefined;
}

export function resolveSenderAvatarUrl(
  message: MessageItemDto,
  groupMembers: Map<string, GroupMemberDto>,
) {
  return resolveGroupMember(message, groupMembers)?.avatarUrl ?? null;
}

export function buildAvatarProfilePopover({
  conversation,
  groupMembers,
  message,
  mine,
  session,
  x,
  y,
}: {
  conversation: ConversationListItem;
  groupMembers: Map<string, GroupMemberDto>;
  message: MessageItemDto;
  mine: boolean;
  session?: AuthSession | null;
  x: number;
  y: number;
}): AvatarProfilePopoverState {
  if (mine) {
    return {
      x,
      y,
      title: session?.displayName || "我",
      subtitle: "当前账号",
      avatarUrl: session?.avatarUrl,
      rows: compactProfileRows([
        ["绿泡泡号", session?.lppId],
        ["用户 ID", session?.userId],
        ["身份", "我"],
      ]),
    };
  }
  const member = resolveGroupMember(message, groupMembers);
  const isGroup = conversation.conversationType === "group";
  const displayName =
    member?.displayName ||
    message.senderDisplayName ||
    (isGroup ? "群成员" : conversation.title || "联系人");
  const lppId = member?.lppId || message.senderLppId || message.lppId;
  const userId =
    member?.userId ||
    message.senderUserId ||
    message.senderId ||
    message.fromUserId ||
    conversation.peerUserId;
  const platformUserId = member?.platformUserId || message.senderPlatformUserId;
  const role = member?.role || member?.memberRole || (isGroup ? "群成员" : "好友");
  return {
    x,
    y,
    title: displayName,
    subtitle: isGroup ? role : "好友私聊",
    avatarUrl:
      member?.avatarUrl ||
      message.senderAvatarUrl ||
      message.avatarUrl ||
      conversation.avatarUrl,
    rows: compactProfileRows([
      ["绿泡泡号", lppId || conversation.peerLppId],
      ["用户 ID", userId],
      ["平台 ID", platformUserId],
      ["角色", role],
      ["会话", isGroup ? conversation.title : "好友私聊"],
    ]),
  };
}

export function buildContactCardProfilePopover({
  value,
  x,
  y,
}: {
  value: Record<string, unknown>;
  x: number;
  y: number;
}): AvatarProfilePopoverState {
  const title =
    stringField(
      value,
      "displayName",
      "display_name",
      "name",
      "userName",
      "user_name",
      "realName",
      "real_name",
      "nickname",
      "nickName",
      "nick_name",
    ) ||
    "个人名片";
  const userId = stringField(value, "userId", "user_id", "friendUserId", "customerUserId", "id");
  const platformUserId = stringField(value, "platformUserId", "platform_user_id");
  const lppId = stringField(value, "lppId", "lpp_id", "lppNo", "lppNumber");
  const mobile = stringField(value, "mobile", "phone", "phoneMasked", "mobileMasked");
  const email = stringField(value, "email", "emailMasked");
  const source = stringField(value, "source", "sourceChannel", "channel", "from");
  const avatarUrl = stringField(value, "avatarUrl", "avatar_url", "avatar", "photoUrl");
  return {
    x,
    y,
    title,
    subtitle: lppId || mobile || email || "个人名片",
    avatarUrl,
    rows: compactProfileRows([
      ["绿泡泡号", lppId],
      ["用户 ID", userId],
      ["平台 ID", platformUserId],
      ["手机", mobile],
      ["邮箱", email],
      ["来源", source],
    ]),
  };
}

export function modelBackedMessageReadStatusText(
  message: MessageItemDto,
  conversation: ConversationListItem,
  readState: ConversationReadState | undefined,
  identity?: CurrentUserIdentity | null,
) {
  const status = String(message.status ?? "").trim().toLowerCase();
  if (status === "sending" || status === "uploading" || status === "failed") {
    return messageReadStatusText(message, conversation, identity);
  }
  if (getImConversationType(conversation) === "group") {
    return messageReadStatusText(message, conversation, identity);
  }
  if (readState) {
    const view = deriveMessageView({ identity: identity ?? null, state: readState, message });
    if (view.ownership === "mine") return view.bubbleStatusText || undefined;
  }
  return messageReadStatusText(message, conversation, identity);
}

export function shouldShowFileInlineStatus(message: MessageItemDto) {
  const status = String(message.status ?? "").trim().toLowerCase();
  const type = normalizeMessageType(message);
  return (type === "file" || type === "video") && ["sending", "uploading", "failed"].includes(status);
}

export function findFirstUnreadLoadedMessage(
  messages: MessageItemDto[],
  unreadJump: UnreadJumpState,
  identity?: CurrentUserIdentity | null,
) {
  const readableMessages = messages.filter(
    (message) => !isMineMessage(message, identity) && !eventMessageText(message),
  );
  const seqMatched = readableMessages.find(
    (message) => Number(message.conversationSeq ?? 0) > unreadJump.lastReadSeq,
  );
  if (seqMatched) return seqMatched;
  const fallbackIndex = Math.max(0, readableMessages.length - unreadJump.count);
  return readableMessages[fallbackIndex];
}

export function isMineMessage(message: MessageItemDto, identity?: CurrentUserIdentity | null) {
  const record = message as unknown as Record<string, unknown>;
  const senderIds = [
    message.senderUserId,
    message.senderId,
    message.fromUserId,
    typeof record.platformUserId === "string" ? record.platformUserId : undefined,
    typeof record.senderPlatformUserId === "string"
      ? record.senderPlatformUserId
      : undefined,
    typeof record.senderLppId === "string" ? record.senderLppId : undefined,
    typeof record.lppId === "string" ? record.lppId : undefined,
  ];
  if (
    record.isSelf === true ||
    record.isMine === true ||
    ["out", "outgoing", "sent", "self"].includes(
      String(record.direction ?? "").trim().toLowerCase(),
    )
  ) {
    return true;
  }
  const hasSenderId = senderIds.some((id) => typeof id === "string" && id.trim());
  if (hasSenderId) {
    return (
      isSelfSender(message.senderUserId, undefined, identity) ||
      isSelfSender(message.senderId, undefined, identity) ||
      isSelfSender(message.fromUserId, undefined, identity) ||
      isSelfSender(
        typeof record.platformUserId === "string" ? record.platformUserId : undefined,
        undefined,
        identity,
      ) ||
      isSelfSender(
        typeof record.senderPlatformUserId === "string"
          ? record.senderPlatformUserId
          : undefined,
        undefined,
        identity,
      ) ||
      isSelfSender(
        typeof record.senderLppId === "string" ? record.senderLppId : undefined,
        undefined,
        identity,
      ) ||
      isSelfSender(
        typeof record.lppId === "string" ? record.lppId : undefined,
        undefined,
        identity,
      )
    );
  }
  return Boolean(
    isSelfSender(message.senderUserId, message.senderDisplayName, identity) ||
      isSelfSender(message.senderId, message.senderDisplayName, identity) ||
      isSelfSender(message.fromUserId, message.senderDisplayName, identity) ||
      isSelfSender(
        typeof record.platformUserId === "string" ? record.platformUserId : undefined,
        message.senderDisplayName,
        identity,
      ) ||
      isSelfSender(
        typeof record.senderPlatformUserId === "string"
          ? record.senderPlatformUserId
          : undefined,
        message.senderDisplayName,
        identity,
      ) ||
      isSelfSender(
        typeof record.senderLppId === "string" ? record.senderLppId : undefined,
        message.senderDisplayName,
        identity,
      ) ||
      isSelfSender(
        typeof record.lppId === "string" ? record.lppId : undefined,
        message.senderDisplayName,
        identity,
      ),
  );
}

export function extractMessageText(message: MessageItemDto) {
  const body = message.body ?? {};
  const directText = stringField(
    body,
    "text",
    "content",
    "message",
    "markdown",
    "markdownText",
    "caption",
  );
  if (directText) return directText;
  const nested = [
    body.parts,
    body.bodies,
    body.items,
    body.contents,
    body.messageBodies,
  ].flatMap((value) => (Array.isArray(value) ? value : []));
  for (const item of nested) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const nestedBody =
      record.body && typeof record.body === "object"
        ? (record.body as Record<string, unknown>)
        : record;
    const text = stringField(
      nestedBody,
      "text",
      "content",
      "message",
      "markdown",
      "markdownText",
      "caption",
    );
    if (text) return text;
  }
  return undefined;
}

function messageReadStatusText(
  message: MessageItemDto,
  conversation: ConversationListItem,
  identity?: CurrentUserIdentity | null,
) {
  if (!isMineMessage(message, identity)) return undefined;
  const record = message as unknown as Record<string, unknown>;
  const status = String(message.status ?? "").trim().toLowerCase();
  if (status === "sending" || status === "uploading") {
    const type = normalizeMessageType(message);
    return type === "image" || type === "video" || type === "file" ? "上传中" : "发送中";
  }
  if (status === "failed") {
    const reason = typeof record.localError === "string" && record.localError.trim()
      ? `：${record.localError.trim()}`
      : "";
    return `发送失败${reason}`;
  }
  if (conversation.conversationType === "group") {
    if (typeof message.readCount === "number" && message.readCount > 0) {
      return `${message.readCount}人已读`;
    }
    return "已发送";
  }
  if (
    message.isRead ||
    message.readAt ||
    ["read", "seen"].includes(status) ||
    record.deliveryStatus === "read"
  ) {
    return "已读";
  }
  return "已发送";
}

function resolveGroupMember(
  message: MessageItemDto,
  groupMembers: Map<string, GroupMemberDto>,
) {
  const keys = [
    message.senderUserId,
    message.senderId,
    message.fromUserId,
    message.senderPlatformUserId,
    message.platformUserId,
    message.senderLppId,
    message.lppId,
    message.senderDisplayName,
  ];
  for (const key of keys) {
    const member = key ? groupMembers.get(key.trim().toLowerCase()) : undefined;
    if (member) return member;
  }
  return undefined;
}

function compactProfileRows(rows: Array<[string, string | number | null | undefined]>) {
  return rows
    .map(([label, value]) => ({
      label,
      value: value === null || value === undefined || value === "" ? "--" : String(value),
    }))
    .filter((row, index) => row.value !== "--" || index < 3);
}

function isEventLikeMessage(message: MessageItemDto) {
  const type = normalizeMessageType(message);
  return Boolean(
    type === "event" ||
      type === "system" ||
      type === "notice" ||
      message.body?.event ||
      message.body?.eventText ||
      message.body?.notice,
  );
}

function isGenericGroupJoinText(text: string) {
  return ["Member joined the group", "joined the group"].includes(text.trim());
}

function formatGroupMemberEventText(record: Record<string, unknown>) {
  const type = String(record.type ?? record.eventType ?? "").trim();
  const joinTypes = new Set([
    "members_added",
    "member_added",
    "group_member_added",
    "group_member_joined",
    "member_joined",
    "join_group",
    "joined_group",
  ]);
  if (!joinTypes.has(type)) return undefined;
  const names = eventMemberNames(record);
  if (names.length === 0) return undefined;
  return `${joinNames(names)}加入了群聊`;
}

function eventMemberNames(record: Record<string, unknown>) {
  const names: string[] = [];
  const addName = (value: unknown) => {
    const name = usablePersonName(String(value ?? ""));
    if (name && !names.includes(name)) names.push(name);
  };
  [
    "addedUserDisplayNames",
    "addedUserNames",
    "addedDisplayNames",
    "memberDisplayNames",
    "memberNames",
  ].forEach((key) => {
    const value = record[key];
    if (Array.isArray(value)) value.forEach(addName);
  });
  ["addedUsers", "addedMembers", "members", "users"].forEach((key) => {
    const value = record[key];
    if (!Array.isArray(value)) return;
    value.forEach((item) => {
      if (!item || typeof item !== "object") return;
      addName(
        stringField(
          item as Record<string, unknown>,
          "displayName",
          "name",
          "nickname",
          "userName",
          "loginName",
        ),
      );
    });
  });
  addName(
    stringField(
      record,
      "addedUserDisplayName",
      "addedUserName",
      "memberDisplayName",
      "memberName",
      "targetDisplayName",
      "targetName",
      "displayName",
      "userName",
    ),
  );
  return names;
}

function joinNames(names: string[]) {
  return names.length <= 3 ? names.join(", ") : `${names.slice(0, 3).join(", ")} and ${names.length} people`;
}

function stringField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}
