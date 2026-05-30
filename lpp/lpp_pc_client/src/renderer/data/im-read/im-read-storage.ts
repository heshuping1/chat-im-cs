import type { AuthSession } from "../auth/auth-session";
import {
  conversationKey,
  type ConversationReadState,
  type ImConversationType,
} from "../im-read-model";

export interface LocalImConversationRead {
  readSeq: number;
  messageKey?: string;
  readAt?: number;
}

export interface LocalImPeerReadReceipt {
  readSeq: number;
  readAt?: number;
}

export interface ImReadStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export type StoredImReadState = Record<string, ConversationReadState>;

const localImReadsStoragePrefix = "lpp.pc.im.localReads";
const localImPeerReadsStoragePrefix = "lpp.pc.im.peerReads";

export function localImReadsStorageKey(session: AuthSession | null) {
  if (!session) return `${localImReadsStoragePrefix}.anonymous`;
  return [
    localImReadsStoragePrefix,
    session.apiBaseUrl,
    session.tenantId || session.tenantCode || session.tenantToken.slice(0, 24),
    session.userId || session.platformUserId || session.lppId || session.displayName,
  ].join("|");
}

export function localImPeerReadsStorageKey(session: AuthSession | null) {
  if (!session) return `${localImPeerReadsStoragePrefix}.anonymous`;
  return [
    localImPeerReadsStoragePrefix,
    session.apiBaseUrl,
    session.tenantId || session.tenantCode || session.tenantToken.slice(0, 24),
    session.userId || session.platformUserId || session.lppId || session.displayName,
  ].join("|");
}

export function imConversationStorageKey(session: AuthSession | null) {
  if (!session) return "lpp.pc.im.readState.anonymous";
  return [
    "lpp.pc.im.readState",
    session.apiBaseUrl,
    session.tenantId || session.tenantCode || session.tenantToken.slice(0, 24),
    session.userId || session.platformUserId || session.lppId || session.displayName,
  ].join("|");
}

export function sanitizeStoredImReadState(input: unknown): StoredImReadState {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};

  return Object.fromEntries(
    Object.entries(input as Record<string, Partial<ConversationReadState>>)
      .filter(([key, value]) => isValidStoredImReadState(key, value))
      .map(([key, value]) => {
        const conversationType = value.conversationType as ImConversationType;
        const pendingReadSeq =
          value.pendingReadSeq === undefined
            ? undefined
            : normalizedStoredSeq(value.pendingReadSeq);
        return [
          key,
          {
            conversationKey: key,
            conversationId: value.conversationId as string,
            conversationType,
            myReadSeq: normalizedStoredSeq(value.myReadSeq),
            peerReadSeq: normalizedStoredSeq(value.peerReadSeq),
            lastMessageSeq: normalizedStoredSeq(value.lastMessageSeq),
            unreadCount: normalizedStoredSeq(value.unreadCount),
            pendingReadSeq,
            updatedAt: normalizedStoredSeq(value.updatedAt),
          } satisfies ConversationReadState,
        ];
      }),
  );
}

export function readStoredLocalImConversationReads(
  session: AuthSession | null,
  storage: ImReadStorage | null = safeLocalStorage(),
): Record<string, LocalImConversationRead> {
  if (!storage) return {};
  try {
    const raw = storage.getItem(localImReadsStorageKey(session));
    if (!raw) return {};
    return sanitizeLocalReadEntries(JSON.parse(raw), (readSeq, value) => ({
      readSeq,
      messageKey: typeof value.messageKey === "string" ? value.messageKey : undefined,
      readAt: Number.isFinite(Number(value.readAt))
        ? normalizedStoredSeq(value.readAt)
        : undefined,
    }));
  } catch {
    return {};
  }
}

export function readStoredLocalImPeerReadReceipts(
  session: AuthSession | null,
  storage: ImReadStorage | null = safeLocalStorage(),
): Record<string, LocalImPeerReadReceipt> {
  if (!storage) return {};
  try {
    const raw = storage.getItem(localImPeerReadsStorageKey(session));
    if (!raw) return {};
    return sanitizeLocalReadEntries(JSON.parse(raw), (readSeq, value) => ({
      readSeq,
      readAt: Number.isFinite(Number(value.readAt))
        ? normalizedStoredSeq(value.readAt)
        : undefined,
    }));
  } catch {
    return {};
  }
}

export function readStoredImReadState(
  session: AuthSession | null,
  storage: ImReadStorage | null = safeLocalStorage(),
): StoredImReadState {
  if (!storage) return {};
  try {
    const raw = storage.getItem(imConversationStorageKey(session));
    return raw ? sanitizeStoredImReadState(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

export function persistLocalImConversationReads(
  session: AuthSession | null,
  reads: Record<string, LocalImConversationRead>,
  storage: ImReadStorage | null = safeLocalStorage(),
) {
  if (!session) return;
  storage?.setItem(localImReadsStorageKey(session), JSON.stringify(reads));
}

export function persistLocalImPeerReadReceipts(
  session: AuthSession | null,
  receipts: Record<string, LocalImPeerReadReceipt>,
  storage: ImReadStorage | null = safeLocalStorage(),
) {
  if (!session) return;
  storage?.setItem(localImPeerReadsStorageKey(session), JSON.stringify(receipts));
}

export function persistImReadState(
  session: AuthSession | null,
  readState: StoredImReadState,
  storage: ImReadStorage | null = safeLocalStorage(),
) {
  storage?.setItem(imConversationStorageKey(session), JSON.stringify(readState));
}

export function normalizedStoredSeq(value: unknown) {
  return Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
}

function isValidStoredImReadState(
  key: string,
  value: Partial<ConversationReadState> | undefined,
) {
  const expectedKey =
    value &&
    (value.conversationType === "direct" || value.conversationType === "group") &&
    typeof value.conversationId === "string"
      ? conversationKey(value.conversationType, value.conversationId)
      : "";
  return (
    key === expectedKey &&
    value &&
    typeof value === "object" &&
    (value.conversationType === "direct" || value.conversationType === "group") &&
    typeof value.conversationId === "string" &&
    value.conversationId.length > 0 &&
    Number.isFinite(Number(value.myReadSeq)) &&
    Number.isFinite(Number(value.peerReadSeq)) &&
    Number.isFinite(Number(value.lastMessageSeq)) &&
    (value.unreadCount === undefined || Number.isFinite(Number(value.unreadCount))) &&
    (value.pendingReadSeq === undefined || Number.isFinite(Number(value.pendingReadSeq))) &&
    Number.isFinite(Number(value.updatedAt ?? 0))
  );
}

function sanitizeLocalReadEntries<T extends LocalImConversationRead | LocalImPeerReadReceipt>(
  input: unknown,
  createRead: (readSeq: number, value: Record<string, unknown>) => T,
): Record<string, T> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};

  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>).flatMap(([id, value]) => {
      if (!id || !value || typeof value !== "object" || Array.isArray(value)) return [];
      const readSeq = normalizedStoredSeq((value as Record<string, unknown>).readSeq);
      return [[id, createRead(readSeq, value as Record<string, unknown>)]];
    }),
  );
}

function safeLocalStorage(): ImReadStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
