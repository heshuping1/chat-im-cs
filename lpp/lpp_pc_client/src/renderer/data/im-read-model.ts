export type ImConversationType = "direct" | "group";

export interface ImIdentity {
  userId?: string | null;
  platformUserId?: string | null;
  lppId?: string | null;
  displayName?: string | null;
}

export interface ImMessageLike {
  messageId?: string;
  conversationId?: string;
  conversationSeq?: number;
  senderUserId?: string | null;
  senderId?: string | null;
  fromUserId?: string | null;
  senderPlatformUserId?: string | null;
  platformUserId?: string | null;
  senderLppId?: string | null;
  lppId?: string | null;
  senderDisplayName?: string | null;
  direction?: string | null;
  isSelf?: boolean;
  isMine?: boolean;
  messageType?: string | null;
  status?: string;
  isRead?: boolean;
}

export interface ConversationReadState {
  conversationKey: string;
  conversationId: string;
  conversationType: ImConversationType;
  myReadSeq: number;
  peerReadSeq: number;
  lastMessageSeq: number;
  unreadCount: number;
  pendingReadSeq?: number;
  updatedAt: number;
}

export interface ConversationReadView {
  conversationKey: string;
  conversationId: string;
  conversationType: ImConversationType;
  unreadCount: number;
  hasUnread: boolean;
  titleUnreadText: string;
  showNewMessageJump: boolean;
}

export interface MessageReadView {
  messageId?: string;
  ownership: "mine" | "incoming" | "system";
  bubbleStatusText: "" | "已发送" | "已读";
}

export type ImCoreCommand =
  | {
      type: "mark_read";
      conversationId: string;
      conversationType: ImConversationType;
      readSeq: number;
    }
  | {
      type: "retry_pending_read";
      conversationId: string;
      conversationType: ImConversationType;
      readSeq: number;
    }
  | {
      type: "clear_new_message_jump";
      conversationId: string;
      conversationType: ImConversationType;
    }
  | { type: "log_diagnostic"; event: string; context: unknown };

export type ImCoreEvent =
  | {
      type: "ui.conversation_opened";
      conversationId: string;
      conversationType: ImConversationType;
      loadedMessages: ImMessageLike[];
      conversation?: Partial<ConversationReadState> & { unreadCount?: number };
    }
  | {
      type: "ui.messages_visible";
      conversationId: string;
      conversationType: ImConversationType;
      visibleMessages: ImMessageLike[];
      conversation?: Partial<ConversationReadState> & { unreadCount?: number };
    }
  | {
      type: "api.conversation_snapshot";
      conversationId: string;
      conversationType: ImConversationType;
      conversation: Partial<ConversationReadState> & { unreadCount?: number };
    }
  | {
      type: "gateway.message_received";
      conversationId: string;
      conversationType: ImConversationType;
      message: ImMessageLike;
      isActiveConversation: boolean;
    }
  | {
      type: "gateway.read_received";
      conversationId: string;
      conversationType: ImConversationType;
      readerIdentity: ImIdentity;
      readSeq: number;
    }
  | {
      type: "send.message_succeeded";
      conversationId: string;
      conversationType: ImConversationType;
      message: ImMessageLike;
    };

export interface ReduceImCoreInput {
  identity: ImIdentity | null;
  stateByConversation: Record<string, ConversationReadState>;
  event: ImCoreEvent;
}

export interface ImCoreResult {
  stateByConversation: Record<string, ConversationReadState>;
  viewByConversation: Record<string, ConversationReadView>;
  commands: ImCoreCommand[];
}

export function conversationKey(type: ImConversationType, id: string) {
  return `${type}:${id}`;
}

export function createInitialImReadState(
  conversationType: ImConversationType,
  conversationId: string,
  patch: Partial<ConversationReadState> = {},
): ConversationReadState {
  return {
    conversationKey: conversationKey(conversationType, conversationId),
    conversationId,
    conversationType,
    myReadSeq: 0,
    peerReadSeq: 0,
    lastMessageSeq: 0,
    unreadCount: 0,
    updatedAt: 0,
    ...patch,
  };
}

export function reduceImCoreEvent(input: ReduceImCoreInput): ImCoreResult {
  const key = conversationKey(input.event.conversationType, input.event.conversationId);
  const current =
    input.stateByConversation[key] ??
    createInitialImReadState(input.event.conversationType, input.event.conversationId);
  let next = mergeConversationPatch(current, input.event);
  const commands: ImCoreCommand[] = [];

  if (input.event.type === "send.message_succeeded") {
    const seq = seqOf(input.event.message);
    next = advanceLastMessageSeq(next, seq);
    next = advanceMyReadSeq(next, seq);
    next = clearUnread(next);
    pushMarkRead(commands, next, seq);
  }

  if (input.event.type === "gateway.message_received") {
    const seq = seqOf(input.event.message);
    const isNewMessageSeq = seq > current.lastMessageSeq;
    next = advanceLastMessageSeq(next, seq);
    if (isMine(input.event.message, input.identity)) {
      next = advanceMyReadSeq(next, seq);
      next = clearUnread(next);
      pushMarkRead(commands, next, seq);
    } else if (input.event.isActiveConversation && seq > next.myReadSeq) {
      next = advanceMyReadSeq(next, seq);
      next = clearUnread(next);
      pushMarkRead(commands, next, seq);
      commands.push(clearJumpCommand(next));
    } else if (seq > next.myReadSeq && isNewMessageSeq) {
      next = incrementUnread(next, 1);
    } else if (seq > 0 && !isNewMessageSeq) {
      commands.push({
        type: "log_diagnostic",
        event: "im.read.duplicate_or_out_of_order_message",
        context: {
          conversationId: input.event.conversationId,
          conversationType: input.event.conversationType,
          readSeq: seq,
        },
      });
    }
  }

  if (input.event.type === "ui.conversation_opened" || input.event.type === "ui.messages_visible") {
    const messages =
      input.event.type === "ui.conversation_opened"
        ? input.event.loadedMessages
        : input.event.visibleMessages;
    const visibleReadSeq = nextReadSeqFromVisibleMessages(
      messages,
      next.myReadSeq,
      input.identity,
      normalizedSeq(input.event.conversation?.lastMessageSeq),
    );
    if (visibleReadSeq !== undefined && visibleReadSeq > next.myReadSeq) {
      next = advanceMyReadSeq(next, visibleReadSeq);
      next = advanceLastMessageSeq(next, visibleReadSeq);
      if (visibleReadSeq >= next.lastMessageSeq) {
        next = clearUnread(next);
      }
      pushMarkRead(commands, next, visibleReadSeq);
      if (visibleReadSeq >= next.lastMessageSeq) {
        commands.push(clearJumpCommand(next));
      }
    }
  }

  if (input.event.type === "gateway.read_received") {
    const readSeq = normalizedSeq(input.event.readSeq);
    if (identityMatches(input.event.readerIdentity, input.identity)) {
      next = advanceMyReadSeq(next, readSeq);
      if (readSeq >= next.lastMessageSeq) {
        next = clearUnread(next);
      }
    } else if (!hasIdentityEvidence(input.event.readerIdentity)) {
      commands.push({
        type: "log_diagnostic",
        event: "im.read.missing_reader_identity",
        context: {
          conversationId: input.event.conversationId,
          conversationType: input.event.conversationType,
          readSeq,
        },
      });
    } else if (next.conversationType === "direct") {
      next = { ...next, peerReadSeq: Math.max(next.peerReadSeq, readSeq) };
    }
  }

  if (
    input.event.type === "api.conversation_snapshot" &&
    normalizedSeq(next.pendingReadSeq) > normalizedSeq(input.event.conversation.myReadSeq)
  ) {
    commands.push({
      type: "retry_pending_read",
      conversationId: next.conversationId,
      conversationType: next.conversationType,
      readSeq: normalizedSeq(next.pendingReadSeq),
    });
  }

  next = { ...next, updatedAt: current.updatedAt + 1 };
  const stateByConversation = { ...input.stateByConversation, [key]: next };

  return {
    stateByConversation,
    viewByConversation: { [key]: deriveConversationReadView(next) },
    commands: coalesceImCoreCommands(commands),
  };
}

export function deriveConversationReadView(state: ConversationReadState): ConversationReadView {
  const unreadCount = Math.max(0, Math.floor(state.unreadCount));
  return {
    conversationKey: state.conversationKey,
    conversationId: state.conversationId,
    conversationType: state.conversationType,
    unreadCount,
    hasUnread: unreadCount > 0,
    titleUnreadText: unreadCount > 0 ? `${unreadCount} 条未读` : "暂无未读",
    showNewMessageJump: unreadCount > 0,
  };
}

export function deriveMessageView(params: {
  identity: ImIdentity | null;
  state: ConversationReadState;
  message: ImMessageLike;
}): MessageReadView {
  if (isSystemMessage(params.message)) {
    return {
      messageId: params.message.messageId,
      ownership: "system",
      bubbleStatusText: "",
    };
  }

  const mine = isMine(params.message, params.identity);
  const seq = seqOf(params.message);
  return {
    messageId: params.message.messageId,
    ownership: mine ? "mine" : "incoming",
    bubbleStatusText: mine
      ? seq > 0 && seq <= params.state.peerReadSeq
        ? "已读"
        : "已发送"
      : "",
  };
}

export function nextReadSeqFromVisibleMessages(
  messages: ImMessageLike[],
  currentReadSeq: number,
  identity: ImIdentity | null,
  fallbackLastMessageSeq = 0,
) {
  const normalizedCurrentReadSeq = normalizedSeq(currentReadSeq);
  const normalizedFallbackLastSeq = normalizedSeq(fallbackLastMessageSeq);
  let maxVisibleSeq = normalizedCurrentReadSeq;
  let hasIncomingAfterRead = false;
  let hasSelfAfterRead = false;
  let hasIncomingWithoutSeq = false;

  for (const message of messages) {
    const seq = seqOf(message);
    const mine = isMine(message, identity);
    if (seq <= 0) {
      if (!mine && !isSystemMessage(message)) {
        hasIncomingWithoutSeq = true;
      }
      continue;
    }
    maxVisibleSeq = Math.max(maxVisibleSeq, seq);
    if (mine && seq > normalizedCurrentReadSeq) {
      hasSelfAfterRead = true;
    }
    if (!mine && !isSystemMessage(message) && seq > normalizedCurrentReadSeq) {
      hasIncomingAfterRead = true;
    }
  }

  if ((hasIncomingAfterRead || hasSelfAfterRead) && maxVisibleSeq > normalizedCurrentReadSeq) {
    return maxVisibleSeq;
  }
  if (hasIncomingWithoutSeq && normalizedFallbackLastSeq > normalizedCurrentReadSeq) {
    return normalizedFallbackLastSeq;
  }
  return undefined;
}

export function coalesceImCoreCommands(commands: ImCoreCommand[]) {
  const markReads = new Map<string, Extract<ImCoreCommand, { type: "mark_read" }>>();
  const rest: ImCoreCommand[] = [];
  for (const command of commands) {
    if (command.type === "mark_read") {
      const key = conversationKey(command.conversationType, command.conversationId);
      const current = markReads.get(key);
      if (!current || command.readSeq > current.readSeq) {
        markReads.set(key, command);
      }
    } else {
      rest.push(command);
    }
  }
  return [...markReads.values(), ...rest];
}

export function markReadEndpointType(
  command: Extract<ImCoreCommand, { type: "mark_read" | "retry_pending_read" }>,
) {
  return command.conversationType === "group" ? "group" : "direct";
}

export function isMine(message: ImMessageLike, identity: ImIdentity | null) {
  if (message.isSelf || message.isMine) return true;
  if (["out", "outgoing", "sent", "mine", "self"].includes(normalizeText(message.direction))) {
    return true;
  }

  const currentIds = compactIdentityValues([
    identity?.userId,
    identity?.platformUserId,
    identity?.lppId,
  ]);
  const senderIds = compactIdentityValues([
    message.senderUserId,
    message.senderId,
    message.fromUserId,
    message.senderPlatformUserId,
    message.platformUserId,
    message.senderLppId,
    message.lppId,
  ]);

  if (senderIds.length > 0) {
    return senderIds.some((id) => currentIds.includes(id));
  }

  return Boolean(
    identity?.displayName &&
      message.senderDisplayName &&
      normalizeText(identity.displayName) === normalizeText(message.senderDisplayName),
  );
}

function mergeConversationPatch(
  current: ConversationReadState,
  event: ImCoreEvent,
): ConversationReadState {
  if (
    event.type !== "ui.conversation_opened" &&
    event.type !== "ui.messages_visible" &&
    event.type !== "api.conversation_snapshot"
  ) {
    return { ...current };
  }
  const conversation = event.conversation;
  if (!conversation) return { ...current };

  const preserveLocalUnread = shouldPreserveLocalUnreadFromSnapshot(current, event);
  const snapshotUnreadCount =
    conversation.unreadCount === undefined
      ? current.unreadCount
      : Math.max(0, Math.floor(Number(conversation.unreadCount) || 0));
  const merged = {
    ...current,
    myReadSeq: preserveLocalUnread
      ? current.myReadSeq
      : Math.max(current.myReadSeq, snapshotMyReadSeq),
    peerReadSeq: Math.max(current.peerReadSeq, normalizedSeq(conversation.peerReadSeq)),
    lastMessageSeq: Math.max(current.lastMessageSeq, normalizedSeq(conversation.lastMessageSeq)),
    unreadCount: preserveLocalUnread ? current.unreadCount : snapshotUnreadCount,
    pendingReadSeq:
      conversation.pendingReadSeq === undefined
        ? current.pendingReadSeq
        : Math.max(normalizedSeq(current.pendingReadSeq), normalizedSeq(conversation.pendingReadSeq)),
  };
  return merged.myReadSeq >= merged.lastMessageSeq ? clearUnread(merged) : merged;
}

function shouldPreserveLocalUnreadFromSnapshot(
  current: ConversationReadState,
  event: ImCoreEvent,
) {
  if (event.type !== "api.conversation_snapshot") return false;
  const conversation = event.conversation;
  if (!conversation) return false;
  const currentLastMessageSeq = normalizedSeq(current.lastMessageSeq);
  const currentMyReadSeq = normalizedSeq(current.myReadSeq);
  const currentUnreadCount = Math.max(0, Math.floor(Number(current.unreadCount) || 0));
  const pendingReadSeq = normalizedSeq(current.pendingReadSeq);
  const snapshotMyReadSeq = normalizedSeq(conversation.myReadSeq);
  const snapshotUnreadCount =
    conversation.unreadCount === undefined
      ? currentUnreadCount
      : Math.max(0, Math.floor(Number(conversation.unreadCount) || 0));
  if (currentUnreadCount <= 0) return false;
  if (currentLastMessageSeq <= 0 || currentMyReadSeq >= currentLastMessageSeq) return false;
  if (pendingReadSeq >= currentLastMessageSeq) return false;
  return snapshotUnreadCount === 0;
}

function advanceMyReadSeq(state: ConversationReadState, readSeq: number) {
  const normalizedReadSeq = normalizedSeq(readSeq);
  return {
    ...state,
    myReadSeq: Math.max(state.myReadSeq, normalizedReadSeq),
    pendingReadSeq: Math.max(normalizedSeq(state.pendingReadSeq), normalizedReadSeq),
  };
}

function advanceLastMessageSeq(state: ConversationReadState, seq: number) {
  return { ...state, lastMessageSeq: Math.max(state.lastMessageSeq, normalizedSeq(seq)) };
}

function incrementUnread(state: ConversationReadState, delta: number) {
  return { ...state, unreadCount: Math.max(0, state.unreadCount + delta) };
}

function clearUnread(state: ConversationReadState) {
  return { ...state, unreadCount: 0 };
}

function pushMarkRead(
  commands: ImCoreCommand[],
  state: ConversationReadState,
  readSeq: number,
) {
  const normalizedReadSeq = normalizedSeq(readSeq);
  if (normalizedReadSeq <= 0) return;
  commands.push({
    type: "mark_read",
    conversationId: state.conversationId,
    conversationType: state.conversationType,
    readSeq: normalizedReadSeq,
  });
}

function clearJumpCommand(
  state: ConversationReadState,
): Extract<ImCoreCommand, { type: "clear_new_message_jump" }> {
  return {
    type: "clear_new_message_jump",
    conversationId: state.conversationId,
    conversationType: state.conversationType,
  };
}

function identityMatches(left: ImIdentity | null, right: ImIdentity | null) {
  const leftIds = compactIdentityValues([left?.userId, left?.platformUserId, left?.lppId]);
  const rightIds = compactIdentityValues([right?.userId, right?.platformUserId, right?.lppId]);
  if (leftIds.some((id) => rightIds.includes(id))) return true;
  return Boolean(
    left?.displayName &&
      right?.displayName &&
      normalizeText(left.displayName) === normalizeText(right.displayName),
  );
}

function hasIdentityEvidence(identity: ImIdentity | null) {
  return compactIdentityValues([
    identity?.userId,
    identity?.platformUserId,
    identity?.lppId,
    identity?.displayName,
  ]).length > 0;
}

function seqOf(message: ImMessageLike) {
  return normalizedSeq(message.conversationSeq);
}

function normalizedSeq(value: number | undefined) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(Number(value))) : 0;
}

function isSystemMessage(message: ImMessageLike) {
  return ["system", "notice", "tip"].includes(normalizeText(message.messageType));
}

function compactIdentityValues(values: Array<string | null | undefined>) {
  return values.map(normalizeText).filter(Boolean);
}

function normalizeText(value: string | null | undefined) {
  return value?.trim().toLowerCase().replace(/-/g, "_") ?? "";
}
