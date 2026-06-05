import type {
  ConversationListItem,
  MessageItemDto,
} from "../api-client";
import { normalizeMessageItem } from "../im-message-normalize";
import { applyDirectReadReceiptToMessages } from "../read-receipts";
import type {
  MessageCoreDiagnostic,
  MessageCoreEvent,
  MessageCoreResult,
  MessageCoreState,
} from "./message-core-types";

export type { MessageCoreDiagnostic, MessageCoreDiagnosticEvent, MessageCoreEvent, MessageCoreResult, MessageCoreState } from "./message-core-types";

export function reduceMessageCoreEvent(
  state: MessageCoreState,
  event: MessageCoreEvent,
): MessageCoreResult {
  const diagnostics: MessageCoreDiagnostic[] = [];
  let next: MessageCoreState = {
    conversation: state.conversation,
    messages: sortMessages(state.messages),
  };

  if (event.type === "message.polled") {
    for (const message of event.messages) {
      next = upsertMessage(next, event, normalizeMessageItem(message), diagnostics, {
        recomputeConversation: false,
      });
    }
    next = maybeRecomputeConversation(next, event.conversationId, diagnostics, {
      preserveNewerConversationSummary: true,
    });
  } else if (event.type === "message.gateway_received") {
    next = upsertMessage(next, event, normalizeMessageItem(event.message), diagnostics, {
      unreadCount: event.unreadCount,
      readSeq: event.readSeq,
      recomputeConversation: false,
    });
  } else if (event.type === "message.local_created") {
    next = upsertMessage(next, event, normalizeMessageItem(event.message), diagnostics, {
      recomputeConversation: false,
    });
  } else if (event.type === "message.send_confirmed") {
    next = upsertMessage(next, event, normalizeMessageItem({
      ...event.message,
      status: "sent",
    }), diagnostics, {
      localMessageId: event.localMessageId,
      markSelfRead: true,
      recomputeConversation: false,
    });
  } else if (event.type === "message.send_failed") {
    next = {
      ...next,
      messages: next.messages.map((message) =>
        message.messageId === event.messageId
          ? normalizeMessageItem({
              ...message,
              status: "failed",
              localError: event.reason,
            } as MessageItemDto)
          : message,
      ),
    };
  } else if (event.type === "message.recalled") {
    next = {
      ...next,
      messages: next.messages.map((message) =>
        message.messageId === event.messageId
          ? normalizeMessageItem({
              ...message,
              body: { eventText: "消息已撤回", messageType: "event" },
              isRecalled: true,
              messageType: "event",
              preview: "消息已撤回",
              status: "recalled",
            })
          : message,
      ),
    };
    next = maybeRecomputeConversation(next, event.conversationId, diagnostics);
  } else if (event.type === "message.deleted") {
    next = {
      ...next,
      messages: next.messages.filter((message) => message.messageId !== event.messageId),
    };
    next = maybeRecomputeConversation(next, event.conversationId, diagnostics);
  } else if (event.type === "read.updated") {
    const readSeq = normalizedSeq(event.readSeq);
    const peerReadSeq = normalizedSeq(event.peerReadSeq);
    const conversation = ensureConversation(next.conversation, event);
    next = {
      conversation: {
        ...conversation,
        lastReadSeq: Math.max(normalizedSeq(conversation.lastReadSeq), readSeq),
        unreadCount:
          normalizedSeq(conversation.lastMessageSeq) <= readSeq
            ? 0
            : normalizedSeq(conversation.unreadCount),
      },
      messages:
        peerReadSeq > 0
          ? applyDirectReadReceiptToMessages(next.messages, peerReadSeq, event.identity)
          : next.messages,
    };
  }

  diagnostics.push({
    event: "message_core.event_reduced",
    conversationId: event.conversationId,
  });
  return { state: next, diagnostics };
}

function upsertMessage(
  state: MessageCoreState,
  event: Extract<
    MessageCoreEvent,
    | { type: "message.polled" }
    | { type: "message.gateway_received" }
    | { type: "message.local_created" }
    | { type: "message.send_confirmed" }
  >,
  message: MessageItemDto,
  diagnostics: MessageCoreDiagnostic[],
  options: {
    localMessageId?: string;
    markSelfRead?: boolean;
    readSeq?: number;
    recomputeConversation: boolean;
    unreadCount?: number;
  },
): MessageCoreState {
  const messages = [...state.messages];
  const matchIndex = findMergeIndex(messages, message, options.localMessageId);
  const merged =
    matchIndex >= 0 ? mergeMessage(messages[matchIndex], message) : message;

  if (matchIndex >= 0) {
    const existing = messages[matchIndex];
    if (existing.messageId === message.messageId && event.type !== "message.send_confirmed") {
      diagnostics.push({
        event: "message_core.duplicate_ignored",
        conversationId: event.conversationId,
        messageId: message.messageId,
        reason: "server_message_id",
      });
    }
    messages[matchIndex] = merged;
  } else {
    messages.push(merged);
  }

  const sortedMessages = sortMessages(messages);
  const conversation = applyMessageToConversation(
    ensureConversation(state.conversation, event),
    merged,
    {
      markSelfRead: options.markSelfRead,
      readSeq: options.readSeq,
      unreadCount: options.unreadCount,
    },
    diagnostics,
  );

  const next = {
    conversation,
    messages: sortedMessages,
  };
  return options.recomputeConversation
    ? maybeRecomputeConversation(next, event.conversationId, diagnostics)
    : next;
}

function findMergeIndex(
  messages: MessageItemDto[],
  incoming: MessageItemDto,
  localMessageId?: string,
) {
  if (localMessageId) {
    const byLocalId = messages.findIndex((message) => message.messageId === localMessageId);
    if (byLocalId >= 0) return byLocalId;
  }

  const incomingServerId = serverMessageId(incoming);
  if (incomingServerId) {
    const byServerId = messages.findIndex(
      (message) => serverMessageId(message) === incomingServerId,
    );
    if (byServerId >= 0) return byServerId;
  }

  const incomingClientId = clientMessageId(incoming);
  if (incomingClientId) {
    const byClientId = messages.findIndex(
      (message) => clientMessageId(message) === incomingClientId,
    );
    if (byClientId >= 0) return byClientId;
  }

  const incomingSeq = normalizedSeq(incoming.conversationSeq);
  if (incoming.conversationId && incomingSeq > 0) {
    const bySeq = messages.findIndex(
      (message) =>
        message.conversationId === incoming.conversationId &&
        normalizedSeq(message.conversationSeq) === incomingSeq,
    );
    if (bySeq >= 0) return bySeq;
  }

  const incomingSignature = messageSignature(incoming);
  if (incomingSignature) {
    return messages.findIndex(
      (message) => isPendingLocalMessage(message) && messageSignature(message) === incomingSignature,
    );
  }

  return -1;
}

function mergeMessage(existing: MessageItemDto, incoming: MessageItemDto): MessageItemDto {
  const existingRecord = existing as unknown as Record<string, unknown>;
  const incomingRecord = incoming as unknown as Record<string, unknown>;
  return normalizeMessageItem({
    ...existing,
    ...incoming,
    body: mergeBody(existing.body, incoming.body),
    localTaskId: incomingRecord.localTaskId ?? existingRecord.localTaskId,
    clientMsgId: incomingRecord.clientMsgId ?? existingRecord.clientMsgId,
    clientMessageId: incomingRecord.clientMessageId ?? existingRecord.clientMessageId,
  } as MessageItemDto);
}

function mergeBody(
  existing: Record<string, unknown> | undefined,
  incoming: Record<string, unknown> | undefined,
) {
  if (!existing) return incoming;
  if (!incoming) return existing;
  return { ...existing, ...incoming };
}

function applyMessageToConversation(
  conversation: ConversationListItem,
  message: MessageItemDto,
  options: {
    markSelfRead?: boolean;
    readSeq?: number;
    unreadCount?: number;
  },
  diagnostics: MessageCoreDiagnostic[],
): ConversationListItem {
  const currentSeq = normalizedSeq(conversation.lastMessageSeq);
  const incomingSeq = normalizedSeq(message.conversationSeq);
  const sameLastMessage =
    conversation.lastMessage?.messageId && conversation.lastMessage.messageId === message.messageId;
  const outOfOrder = incomingSeq > 0 && currentSeq > 0 && incomingSeq < currentSeq;
  const shouldUpdateLastMessage = !outOfOrder || sameLastMessage || currentSeq === 0;
  const nextReadSeq =
    options.markSelfRead || options.readSeq !== undefined
      ? Math.max(
          normalizedSeq(conversation.lastReadSeq),
          normalizedSeq(options.readSeq),
          options.markSelfRead ? incomingSeq : 0,
        )
      : conversation.lastReadSeq;

  if (outOfOrder && !sameLastMessage) {
    diagnostics.push({
      event: "message_core.out_of_order_ignored",
      conversationId: conversation.conversationId,
      messageId: message.messageId,
      reason: "older_conversation_seq",
    });
  }

  return {
    ...conversation,
    ...(shouldUpdateLastMessage
      ? {
          lastMessage: conversationLastMessageFromMessage(message),
          lastMessageSeq: Math.max(currentSeq, incomingSeq),
        }
      : {}),
    lastReadSeq: nextReadSeq,
    unreadCount:
      options.unreadCount !== undefined
        ? options.unreadCount
        : options.markSelfRead
          ? 0
          : conversation.unreadCount,
  };
}

function maybeRecomputeConversation(
  state: MessageCoreState,
  conversationId: string,
  diagnostics: MessageCoreDiagnostic[],
  options: { preserveNewerConversationSummary?: boolean } = {},
): MessageCoreState {
  const conversation = state.conversation;
  if (!conversation) return state;
  const lastMessage = latestMessage(state.messages, conversationId);
  const lastMessageSeq = normalizedSeq(lastMessage?.conversationSeq);
  const currentLastSeq = normalizedSeq(conversation.lastMessageSeq);
  if (
    options.preserveNewerConversationSummary &&
    currentLastSeq > 0 &&
    lastMessageSeq > 0 &&
    currentLastSeq > lastMessageSeq
  ) {
    return state;
  }
  diagnostics.push({
    event: "message_core.last_message_recomputed",
    conversationId,
    messageId: lastMessage?.messageId,
  });
  return {
    ...state,
    conversation: {
      ...conversation,
      lastMessage: lastMessage ? conversationLastMessageFromMessage(lastMessage) : null,
      lastMessageSeq,
      unreadCount:
        lastMessageSeq > normalizedSeq(conversation.lastReadSeq)
          ? normalizedSeq(conversation.unreadCount)
          : 0,
    },
  };
}

function latestMessage(messages: MessageItemDto[], conversationId: string) {
  return sortMessages(
    messages.filter((message) => !message.conversationId || message.conversationId === conversationId),
  ).at(-1);
}

function conversationLastMessageFromMessage(message: MessageItemDto) {
  return {
    messageId: message.messageId,
    messageType: message.messageType,
    preview: message.preview,
    sentAt: message.sentAt,
    senderUserId: message.senderUserId,
    senderId: message.senderId,
    fromUserId: message.fromUserId,
    senderPlatformUserId: message.senderPlatformUserId,
    platformUserId: message.platformUserId,
    senderLppId: message.senderLppId,
    lppId: message.lppId,
    senderDisplayName: message.senderDisplayName,
    isSelf: message.isSelf,
    isMine: message.isMine,
    direction: message.direction,
  };
}

function ensureConversation(
  conversation: ConversationListItem | undefined,
  event: { conversationId: string; conversationType: string },
): ConversationListItem {
  return (
    conversation ?? {
      conversationId: event.conversationId,
      conversationType: event.conversationType,
      title: "New conversation",
      unreadCount: 0,
      lastReadSeq: 0,
      lastMessageSeq: 0,
    }
  );
}

function sortMessages(messages: MessageItemDto[]) {
  return [...messages].sort((left, right) => {
    const leftSeq = normalizedSeq(left.conversationSeq) || Number.MAX_SAFE_INTEGER;
    const rightSeq = normalizedSeq(right.conversationSeq) || Number.MAX_SAFE_INTEGER;
    return leftSeq - rightSeq || timestamp(left.sentAt) - timestamp(right.sentAt);
  });
}

function serverMessageId(message: MessageItemDto) {
  return message.messageId && !message.messageId.startsWith("pc-local-")
    ? message.messageId
    : "";
}

function clientMessageId(message: MessageItemDto) {
  const record = message as unknown as Record<string, unknown>;
  return stringValue(record.clientMsgId) || stringValue(record.clientMessageId) || stringValue(record.localTaskId);
}

function isPendingLocalMessage(message: MessageItemDto) {
  const status = String(message.status ?? "").trim().toLowerCase();
  return (
    message.messageId.startsWith("pc-local-") ||
    status === "sending" ||
    status === "uploading" ||
    status === "queued"
  );
}

function messageSignature(message: MessageItemDto) {
  const body = message.body ?? {};
  const text = stringValue(body.text);
  if (text) return `text:${text}`;
  for (const key of ["image", "video", "file"] as const) {
    const media = mediaRecord(body[key]);
    if (!media) continue;
    return [
      key,
      stringValue(media.fileName),
      stringValue(media.name),
      stringValue(media.mimeType),
      stringValue(media.sizeBytes),
      stringValue(media.fileSize),
    ].join(":");
  }
  return stringValue(message.preview);
}

function mediaRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function normalizedSeq(value: unknown) {
  return Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
}

function timestamp(value: unknown) {
  if (typeof value !== "string") return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function stringValue(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}
