export type ApiContractLevel = "ok" | "degraded" | "blocking";
export type ImConversationType = "direct" | "group";

export interface ApiContractValidation<T> {
  level: ApiContractLevel;
  normalized: T;
  diagnostics: string[];
}

export interface NormalizedConversationSummary {
  conversationId: string;
  conversationType: ImConversationType;
  lastMessageSeq: number;
  lastReadSeq: number;
  peerReadSeq: number;
  unreadCount: number;
  lastMessage?: NormalizedImMessage;
}

export interface NormalizedMessagePage {
  conversationId: string;
  conversationType: ImConversationType;
  items: NormalizedImMessage[];
  page: {
    minSeq: number;
    maxSeq: number;
    hasMoreBefore?: boolean;
    hasMoreAfter?: boolean;
    isLatestPage?: boolean;
  };
}

export interface NormalizedImMessage {
  messageId?: string;
  conversationId?: string;
  conversationSeq?: number;
  senderUserId?: string;
  senderId?: string;
  fromUserId?: string;
  senderPlatformUserId?: string;
  senderLppId?: string;
  direction?: string;
  isSelf?: boolean;
  isMine?: boolean;
  messageType?: string;
  sentAt?: string;
}

export function validateConversationSummaryContract(
  input: unknown,
): ApiContractValidation<NormalizedConversationSummary> {
  const record = objectField(input) ?? {};
  const diagnostics: string[] = [];
  const conversationType = normalizeConversationType(
    stringField(record, "conversationType", "conversation_type", "type"),
  );
  const conversationId =
    stringField(record, "conversationId", "conversation_id", "chatId", "chat_id") ?? "";
  const lastMessage = objectField(record.lastMessage ?? record.last_message);
  const providedLastMessageSeq = numberField(record, "lastMessageSeq", "last_message_seq");
  const providedLastReadSeq = numberField(record, "lastReadSeq", "last_read_seq");
  const providedPeerReadSeq = numberField(
    record,
    "peerReadSeq",
    "peer_read_seq",
    "peerLastReadSeq",
    "peer_last_read_seq",
    "oppositeReadSeq",
    "opposite_read_seq",
  );
  const lastMessageSeq = providedLastMessageSeq ?? 0;
  const lastReadSeq = providedLastReadSeq ?? 0;
  const peerReadSeq = providedPeerReadSeq ?? 0;
  const unreadCount = Math.max(0, numberField(record, "unreadCount", "unread_count") ?? 0);

  if (
    !conversationId ||
    !conversationType ||
    providedLastMessageSeq === undefined ||
    lastMessageSeq <= 0 ||
    providedLastReadSeq === undefined ||
    lastReadSeq < 0
  ) {
    diagnostics.push("im.read.api_contract_blocking");
  }
  if (providedPeerReadSeq !== undefined && peerReadSeq < 0) {
    diagnostics.push("im.read.api_contract_blocking");
  }

  return {
    level: hasDiagnostic(diagnostics, "im.read.api_contract_blocking") ? "blocking" : "ok",
    normalized: {
      conversationId,
      conversationType: conversationType ?? "direct",
      lastMessageSeq,
      lastReadSeq,
      peerReadSeq,
      unreadCount,
      lastMessage: lastMessage ? normalizeMessage(lastMessage) : undefined,
    },
    diagnostics: uniqueDiagnostics(diagnostics),
  };
}

export function validateMessagePageContract(
  input: unknown,
): ApiContractValidation<NormalizedMessagePage> {
  const record = objectField(input) ?? {};
  const diagnostics: string[] = [];
  const conversationId = stringField(record, "conversationId", "conversation_id") ?? "";
  const conversationType =
    normalizeConversationType(stringField(record, "conversationType", "conversation_type", "type")) ??
    "direct";
  const rawItems = Array.isArray(record.items)
    ? record.items
    : Array.isArray(record.messages)
      ? record.messages
      : Array.isArray(input)
        ? input
        : [];
  const items = rawItems.map((item) => normalizeMessage(objectField(item) ?? {}));
  const pageRecord = objectField(record.page) ?? record;
  const seqs = items
    .map((item) => item.conversationSeq ?? 0)
    .filter((seq) => seq > 0);
  const page = {
    minSeq: numberField(pageRecord, "minSeq", "min_seq") ?? minSeq(seqs),
    maxSeq: numberField(pageRecord, "maxSeq", "max_seq") ?? maxSeq(seqs),
    hasMoreBefore: booleanField(
      pageRecord,
      "hasMoreBefore",
      "has_more_before",
      "hasPrevious",
      "has_previous",
      "hasPrev",
      "has_prev",
    ),
    hasMoreAfter: booleanField(
      pageRecord,
      "hasMoreAfter",
      "has_more_after",
      "hasNext",
      "has_next",
      "hasMore",
      "has_more",
    ),
    isLatestPage: booleanField(
      pageRecord,
      "isLatestPage",
      "is_latest_page",
      "latest",
      "isLatest",
      "is_latest",
    ),
  };

  if (page.hasMoreAfter === undefined && page.isLatestPage === undefined) {
    diagnostics.push("im.read.missing_page_coverage");
  }
  if (items.some((item) => !item.conversationSeq)) {
    diagnostics.push("im.read.missing_seq");
  }
  appendSenderDiagnostics(diagnostics, items);

  return {
    level: validationLevel(diagnostics),
    normalized: { conversationId, conversationType, items, page },
    diagnostics: uniqueDiagnostics(diagnostics),
  };
}

export function validateGatewayMessageContract(
  input: unknown,
): ApiContractValidation<NormalizedImMessage> {
  const record = objectField(input) ?? {};
  const message = normalizeMessage(objectField(record.message) ?? record);
  const diagnostics: string[] = [];

  if (!message.conversationSeq) diagnostics.push("im.read.missing_seq");
  appendSenderDiagnostics(diagnostics, [message]);

  return {
    level: validationLevel(diagnostics),
    normalized: message,
    diagnostics: uniqueDiagnostics(diagnostics),
  };
}

export function normalizeMessage(input: Record<string, unknown>): NormalizedImMessage {
  const sender = objectField(input.sender);

  return {
    messageId: stringField(input, "messageId", "message_id", "id"),
    conversationId: stringField(input, "conversationId", "conversation_id", "chatId", "chat_id"),
    conversationSeq: numberField(
      input,
      "conversationSeq",
      "conversation_seq",
      "seq",
      "messageSeq",
      "message_seq",
    ),
    senderUserId:
      stringField(input, "senderUserId", "sender_user_id", "userId", "user_id") ??
      stringField(sender, "userId", "user_id"),
    senderId: stringField(input, "senderId", "sender_id") ?? stringField(sender, "id", "senderId"),
    fromUserId:
      stringField(input, "fromUserId", "from_user_id") ?? stringField(sender, "fromUserId"),
    senderPlatformUserId:
      stringField(
        input,
        "senderPlatformUserId",
        "sender_platform_user_id",
        "platformUserId",
        "platform_user_id",
      ) ?? stringField(sender, "platformUserId", "platform_user_id"),
    senderLppId:
      stringField(input, "senderLppId", "sender_lpp_id", "lppId", "lpp_id") ??
      stringField(sender, "lppId", "lpp_id"),
    direction: stringField(input, "direction", "messageDirection", "message_direction"),
    isSelf: booleanField(input, "isSelf", "is_self"),
    isMine: booleanField(input, "isMine", "is_mine"),
    messageType: stringField(input, "messageType", "message_type", "type"),
    sentAt: stringField(input, "sentAt", "sent_at", "createdAt", "created_at"),
  };
}

function validationLevel(diagnostics: string[]): ApiContractLevel {
  if (hasDiagnostic(diagnostics, "im.read.missing_seq")) return "blocking";
  return diagnostics.length ? "degraded" : "ok";
}

function appendSenderDiagnostics(diagnostics: string[], items: NormalizedImMessage[]) {
  if (items.some((item) => !hasSenderIdentity(item) && !isSelfIdentifyingMessage(item))) {
    diagnostics.push("im.read.missing_sender");
  }
}

function hasSenderIdentity(message: NormalizedImMessage) {
  return Boolean(
    message.senderUserId ||
      message.senderId ||
      message.fromUserId ||
      message.senderPlatformUserId ||
      message.senderLppId,
  );
}

function isSelfIdentifyingMessage(message: NormalizedImMessage) {
  return (
    message.isSelf === true ||
    message.isMine === true ||
    ["out", "outgoing", "sent", "mine", "self"].includes(
      message.direction?.trim().toLowerCase() ?? "",
    )
  );
}

function normalizeConversationType(value?: string): ImConversationType | undefined {
  const normalized = value?.trim().toLowerCase().replace(/-/g, "_");
  if (["group", "im_group", "group_chat"].includes(normalized ?? "")) return "group";
  if (["direct", "im_direct", "direct_chat", "direct_customer", "customer_direct"].includes(normalized ?? "")) {
    return "direct";
  }
  return undefined;
}

function objectField(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function stringField(record: Record<string, unknown> | undefined, ...keys: string[]) {
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
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
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return undefined;
}

function minSeq(seqs: number[]) {
  return seqs.length > 0 ? Math.min(...seqs) : 0;
}

function maxSeq(seqs: number[]) {
  return seqs.length > 0 ? Math.max(...seqs) : 0;
}

function hasDiagnostic(diagnostics: string[], code: string) {
  return diagnostics.includes(code);
}

function uniqueDiagnostics(diagnostics: string[]) {
  return Array.from(new Set(diagnostics));
}
