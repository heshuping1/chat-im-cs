import type { ConversationListItem, MessageItemDto } from "../../data/api/types";

export interface ChatArchiveSessionScope {
  apiBaseUrl?: string;
  tenantId?: string;
  tenantName?: string;
  userId?: string;
  displayName?: string;
  spaceType?: number;
}

export interface ChatArchiveMessage {
  messageId: string;
  conversationSeq?: number;
  messageType?: string;
  sentAt?: string;
  senderUserId?: string;
  preview?: string;
  body?: Record<string, unknown>;
}

export interface ChatArchiveConversation {
  conversationId: string;
  conversationType: string;
  title: string;
  exportedMessageCount: number;
  messages: ChatArchiveMessage[];
}

export interface ChatArchiveExport {
  version: 1;
  kind: "lpp-chat-export";
  generatedAt: string;
  scope: ChatArchiveSafeScope;
  conversations: ChatArchiveConversation[];
}

export interface ChatArchiveBackupPackage {
  version: 1;
  kind: "lpp-chat-backup";
  generatedAt: string;
  checksum: string;
  archive: ChatArchiveExport;
}

export type ChatArchiveSafeScope = Required<
  Pick<ChatArchiveSessionScope, "apiBaseUrl" | "displayName" | "spaceType" | "tenantId" | "tenantName" | "userId">
>;

export interface ChatArchiveRestorePreflight {
  ok: boolean;
  reason?: string;
  conversationCount: number;
  messageCount: number;
}

export function exportChatArchiveJson(input: {
  conversations: ChatArchiveConversation[];
  generatedAt?: string;
  scope: ChatArchiveSessionScope;
}) {
  return JSON.stringify(buildChatArchiveExport(input), null, 2);
}

export function buildChatArchiveExport({
  conversations,
  generatedAt = new Date().toISOString(),
  scope,
}: {
  conversations: ChatArchiveConversation[];
  generatedAt?: string;
  scope: ChatArchiveSessionScope;
}): ChatArchiveExport {
  return {
    version: 1,
    kind: "lpp-chat-export",
    generatedAt,
    scope: safeScope(scope),
    conversations: conversations.map(normalizeArchiveConversation),
  };
}

export function buildChatArchiveBackup(input: {
  conversations: ChatArchiveConversation[];
  generatedAt?: string;
  scope: ChatArchiveSessionScope;
}) {
  const archive = buildChatArchiveExport(input);
  const checksum = checksumForArchive(archive);
  const backup: ChatArchiveBackupPackage = {
    version: 1,
    kind: "lpp-chat-backup",
    generatedAt: archive.generatedAt,
    checksum,
    archive,
  };
  return JSON.stringify(backup, null, 2);
}

export function parseChatArchiveBackup(text: string): ChatArchiveBackupPackage {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("备份文件不是有效 JSON");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("备份文件格式不正确");
  }
  const record = parsed as Partial<ChatArchiveBackupPackage>;
  if (
    record.version !== 1 ||
    record.kind !== "lpp-chat-backup" ||
    typeof record.generatedAt !== "string" ||
    typeof record.checksum !== "string" ||
    !record.archive
  ) {
    throw new Error("备份文件格式不正确");
  }
  const archive = validateArchiveExport(record.archive);
  if (record.checksum !== checksumForArchive(archive)) {
    throw new Error("备份文件校验失败");
  }
  return {
    version: 1,
    kind: "lpp-chat-backup",
    generatedAt: record.generatedAt,
    checksum: record.checksum,
    archive,
  };
}

export function preflightChatArchiveRestore(
  backup: ChatArchiveBackupPackage,
  currentScope: ChatArchiveSessionScope,
): ChatArchiveRestorePreflight {
  const archive = backup.archive;
  const current = safeScope(currentScope);
  const sameScope =
    archive.scope.apiBaseUrl === current.apiBaseUrl &&
    archive.scope.tenantId === current.tenantId &&
    archive.scope.userId === current.userId &&
    archive.scope.spaceType === current.spaceType;
  const messageCount = archive.conversations.reduce(
    (total, conversation) => total + conversation.messages.length,
    0,
  );
  if (!sameScope) {
    return {
      ok: false,
      reason: "备份文件属于其他账号或空间，不能恢复到当前客户端。",
      conversationCount: archive.conversations.length,
      messageCount,
    };
  }
  return {
    ok: true,
    conversationCount: archive.conversations.length,
    messageCount,
  };
}

export function persistRestoredChatArchive(
  backup: ChatArchiveBackupPackage,
  storage: Pick<Storage, "setItem"> = window.localStorage,
) {
  const key = restoredChatArchiveStorageKey(backup.archive.scope);
  storage.setItem(
    key,
    JSON.stringify({
      archive: backup.archive,
      restoredAt: new Date().toISOString(),
    }),
  );
  return key;
}

export function restoredChatArchiveStorageKey(scope: ChatArchiveSessionScope) {
  const safe = safeScope(scope);
  return [
    "lpp.pc.chatArchive.restored.v1",
    encodeURIComponent(safe.apiBaseUrl),
    encodeURIComponent(safe.tenantId),
    encodeURIComponent(safe.userId),
    safe.spaceType,
  ].join("|");
}

export function conversationToArchiveConversation(
  conversation: ConversationListItem,
  messages: MessageItemDto[],
): ChatArchiveConversation {
  return normalizeArchiveConversation({
    conversationId: conversation.conversationId,
    conversationType: conversation.conversationType,
    title: conversation.title || conversation.conversationId,
    exportedMessageCount: messages.length,
    messages: messages.map(messageToArchiveMessage),
  });
}

function messageToArchiveMessage(message: MessageItemDto): ChatArchiveMessage {
  return {
    body: sanitizeMessageBody(message.body),
    conversationSeq: finiteNumber(message.conversationSeq),
    messageId: safeText(message.messageId, "unknown-message"),
    messageType: optionalText(message.messageType),
    preview: optionalText(message.preview),
    senderUserId: optionalText(
      message.senderUserId ?? message.senderId ?? message.fromUserId ?? message.platformUserId,
    ),
    sentAt: optionalText(message.sentAt),
  };
}

function validateArchiveExport(value: unknown): ChatArchiveExport {
  if (!value || typeof value !== "object") throw new Error("备份文件格式不正确");
  const record = value as Partial<ChatArchiveExport>;
  if (
    record.version !== 1 ||
    record.kind !== "lpp-chat-export" ||
    typeof record.generatedAt !== "string" ||
    !record.scope ||
    !Array.isArray(record.conversations)
  ) {
    throw new Error("备份文件格式不正确");
  }
  return buildChatArchiveExport({
    conversations: record.conversations,
    generatedAt: record.generatedAt,
    scope: record.scope,
  });
}

function normalizeArchiveConversation(value: ChatArchiveConversation): ChatArchiveConversation {
  return {
    conversationId: safeText(value.conversationId, "unknown-conversation"),
    conversationType: safeText(value.conversationType, "unknown"),
    exportedMessageCount: Math.max(0, Math.floor(Number(value.exportedMessageCount) || 0)),
    messages: Array.isArray(value.messages)
      ? value.messages.map(normalizeArchiveMessage)
      : [],
    title: safeText(value.title, "未命名会话"),
  };
}

function normalizeArchiveMessage(value: ChatArchiveMessage): ChatArchiveMessage {
  return {
    body: sanitizeMessageBody(value.body),
    conversationSeq: finiteNumber(value.conversationSeq),
    messageId: safeText(value.messageId, "unknown-message"),
    messageType: optionalText(value.messageType),
    preview: optionalText(value.preview),
    senderUserId: optionalText(value.senderUserId),
    sentAt: optionalText(value.sentAt),
  };
}

function safeScope(scope: ChatArchiveSessionScope): ChatArchiveSafeScope {
  return {
    apiBaseUrl: safeText(scope.apiBaseUrl, "--"),
    displayName: safeText(scope.displayName, "--"),
    spaceType: Number.isFinite(Number(scope.spaceType)) ? Number(scope.spaceType) : 0,
    tenantId: safeText(scope.tenantId, "--"),
    tenantName: safeText(scope.tenantName, "--"),
    userId: safeText(scope.userId, "--"),
  };
}

function checksumForArchive(archive: ChatArchiveExport) {
  let hash = 0xcbf29ce484222325n;
  const text = stableStringify(archive);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= BigInt(text.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, "0");
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
    .join(",")}}`;
}

function sanitizeMessageBody(body: unknown): Record<string, unknown> | undefined {
  if (!body || typeof body !== "object" || Array.isArray(body)) return undefined;
  return sanitizeObject(body as Record<string, unknown>);
}

function sanitizeObject(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record)
      .filter(([key]) => !/token|authorization|password|secret|credential/i.test(key))
      .map(([key, value]) => [key, sanitizeValue(value)]),
  );
}

function sanitizeValue(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === "object") return sanitizeObject(value as Record<string, unknown>);
  return undefined;
}

function safeText(value: unknown, fallback: string) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

function optionalText(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || undefined;
}

function finiteNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}
