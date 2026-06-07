export interface ResolveCustomerServiceOverlayUnreadInput {
  previousUnread: number;
  read: boolean;
  sameMessage: boolean;
  source?: "gateway" | "imListCompat" | "workbench" | "readClear" | "send";
}

export interface ResolveCustomerServiceCompatUnreadInput {
  compatReadMessageId?: string;
  compatReadSeq?: number;
  lastMessageId?: string;
  lastMessageSeq?: number | null;
  lastReadSeq?: number | null;
  localStaffSentSeqs?: number[];
  rawUnreadCount?: number | null;
  trustedUnread?: boolean;
  unreadCount?: number | null;
  unreadReason?: string;
}

export interface CustomerServiceCompatUnreadDecision {
  candidate: number;
  lastMessageSeq: number;
  lastReadSeq: number;
  previousReadClearedMessageId?: string;
  previousReadClearedSeq: number;
  rawUnreadCount: number;
  staffSentAfterRead: number;
  trustedUnread: boolean;
  unreadCount: number;
  unreadReason: string;
  unreadWindow: number;
}

export interface ResolveCustomerServiceThreadUnreadInput {
  compatUnreadCandidate: number;
  overlayUnread: number;
  serverUnread: number;
}

export type CustomerServiceThreadUnreadReason =
  | "server"
  | "gatewayOverlay"
  | "none";

export function resolveCustomerServiceOverlayUnread(
  input: ResolveCustomerServiceOverlayUnreadInput,
) {
  const previousUnread = Math.max(0, Number(input.previousUnread ?? 0));
  if (input.source === "send") return previousUnread;
  if (input.read) return 0;
  if (input.sameMessage) return Math.max(1, previousUnread);
  return Math.max(1, previousUnread + 1);
}

export function resolveCustomerServiceCompatUnreadCandidate(
  input: ResolveCustomerServiceCompatUnreadInput,
): CustomerServiceCompatUnreadDecision {
  const lastMessageSeq = Math.max(0, Number(input.lastMessageSeq ?? 0));
  const lastReadSeq = Math.max(0, Number(input.lastReadSeq ?? 0));
  const unreadCount = Math.max(0, Number(input.unreadCount ?? 0));
  const rawUnreadCount = Math.max(0, Number(input.rawUnreadCount ?? input.unreadCount ?? 0));
  const readClearedSeq = Math.max(0, Number(input.compatReadSeq ?? 0));
  const baseReadSeq = Math.max(lastReadSeq, readClearedSeq);
  const staffSentAfterRead = (input.localStaffSentSeqs ?? []).filter(
    (seq) => seq > baseReadSeq && (!lastMessageSeq || seq <= lastMessageSeq),
  ).length;
  const unreadWindow =
    lastMessageSeq > baseReadSeq ? Math.max(0, lastMessageSeq - baseReadSeq) : 0;
  const boundedRawUnread =
    rawUnreadCount > 0 && unreadWindow > 0 ? Math.min(rawUnreadCount, unreadWindow) : 0;
  const allowUnknownBounded = input.unreadReason === "compat-unknown-suppressed";
  const candidate =
    unreadCount > 0 &&
    lastMessageSeq > baseReadSeq &&
    (!input.lastMessageId || input.lastMessageId !== input.compatReadMessageId)
      ? input.trustedUnread === true
        ? unreadCount
        : allowUnknownBounded
          ? Math.max(0, boundedRawUnread - staffSentAfterRead)
          : 0
      : 0;
  const unreadReason =
    candidate > 0
      ? input.trustedUnread === true
        ? input.unreadReason || "compat-inbound-trusted"
        : "compat-unknown-bounded"
      : input.unreadReason || "compat-untrusted";
  return {
    candidate,
    lastMessageSeq,
    lastReadSeq,
    previousReadClearedMessageId: input.compatReadMessageId,
    previousReadClearedSeq: readClearedSeq,
    rawUnreadCount,
    staffSentAfterRead,
    trustedUnread: input.trustedUnread === true,
    unreadCount,
    unreadReason,
    unreadWindow,
  };
}

export function resolveCustomerServiceEffectiveCompatUnread(input: {
  candidate?: number;
  lastMessageId?: string;
  lastMessageSeq?: number;
  lastReadSeq?: number;
  readMessageId?: string;
  readSeq?: number;
}) {
  const candidate = Math.max(0, Number(input.candidate ?? 0));
  const lastMessageSeq = Math.max(0, Number(input.lastMessageSeq ?? 0));
  const lastReadSeq = Math.max(0, Number(input.lastReadSeq ?? 0));
  const readClearedSeq = Math.max(0, Number(input.readSeq ?? 0));
  if (candidate <= 0) return 0;
  if (lastMessageSeq <= Math.max(lastReadSeq, readClearedSeq)) return 0;
  if (input.lastMessageId && input.lastMessageId === input.readMessageId) return 0;
  return candidate;
}

export function resolveCustomerServiceThreadUnread(
  input: ResolveCustomerServiceThreadUnreadInput,
): { reason: CustomerServiceThreadUnreadReason; unreadCount: number } {
  const serverUnread = Math.max(0, Number(input.serverUnread ?? 0));
  const overlayUnread = Math.max(0, Number(input.overlayUnread ?? 0));
  if (serverUnread > 0) return { reason: "server", unreadCount: serverUnread };
  if (overlayUnread > 0) return { reason: "gatewayOverlay", unreadCount: overlayUnread };
  return { reason: "none", unreadCount: 0 };
}
