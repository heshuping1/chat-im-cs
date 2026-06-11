import type {
  CustomerServiceReadStatusDto,
  DirectReadStatusDto,
  MessageItemDto,
} from "../api/types";

export const customerServiceDirectPeerReaderId = "__customer_service_direct_peer__";

type CustomerServiceReadMember = {
  userId: string;
  lastReadSeq: number;
  lastReadAt?: string | null;
};

type CustomerServiceReadSnapshot = {
  customer?: CustomerServiceReadMember;
  staff?: CustomerServiceReadMember;
  visitorUserId?: string;
};

export type CustomerServiceMessageReadReceiptState = "read" | "unread" | "unknown";

export function applyCustomerServiceReadStatusToMessages(
  detail: unknown,
  messages: MessageItemDto[],
) {
  const snapshot = createCustomerServiceReadSnapshot(detail, messages);
  if (!snapshot) return messages;
  return messages.map((message) => applyCustomerServiceMessageReadStatus(message, snapshot));
}

export function mergeCustomerServiceThreadDetailReadStatus<
  T extends { readStatus?: CustomerServiceReadStatusDto | null } | undefined,
>(detail: T, readStatus?: CustomerServiceReadStatusDto | null): T {
  if (!detail || !readStatus) return detail;
  return {
    ...detail,
    readStatus: mergeCustomerServiceReadStatuses(detail.readStatus, readStatus),
  } as T;
}

export function mergeCustomerServiceReadStatuses(
  ...statuses: Array<CustomerServiceReadStatusDto | null | undefined>
): CustomerServiceReadStatusDto | null {
  const validStatuses = statuses.filter(
    (status): status is CustomerServiceReadStatusDto => Boolean(status?.members?.length),
  );
  if (validStatuses.length === 0) return null;
  const members = new Map<string, CustomerServiceReadStatusDto["members"][number]>();
  let sessionId = "";
  let conversationId = "";
  let visitorUserId = "";
  for (const status of validStatuses) {
    sessionId ||= status.sessionId ?? "";
    conversationId ||= status.conversationId ?? "";
    visitorUserId ||= status.visitorUserId ?? "";
    for (const member of status.members) {
      if (!member.userId) continue;
      const nextSeq = normalizedReadSeq(member.lastReadSeq);
      const previous = members.get(member.userId);
      const previousSeq = normalizedReadSeq(previous?.lastReadSeq);
      if (!previous || nextSeq > previousSeq || (nextSeq === previousSeq && !previous.lastReadAt && member.lastReadAt)) {
        members.set(member.userId, {
          userId: member.userId,
          lastReadSeq: nextSeq,
          lastReadAt: member.lastReadAt ?? previous?.lastReadAt ?? null,
        });
      }
    }
  }
  const mergedMembers = [...members.values()];
  if (mergedMembers.length === 0) return null;
  return {
    ...(sessionId ? { sessionId } : {}),
    ...(conversationId ? { conversationId } : {}),
    ...(visitorUserId ? { visitorUserId } : {}),
    members: mergedMembers,
  };
}

export function customerServiceReadStatusFromDirectStatus(
  status: DirectReadStatusDto | null | undefined,
  conversationId?: string | null,
): CustomerServiceReadStatusDto | null {
  if (!status) return null;
  return {
    ...(conversationId ? { conversationId } : {}),
    visitorUserId: customerServiceDirectPeerReaderId,
    members: [
      {
        userId: customerServiceDirectPeerReaderId,
        lastReadSeq: normalizedReadSeq(status.peerLastReadSeq),
        lastReadAt: status.peerLastReadAt ?? null,
      },
    ],
  };
}

export function createCustomerServiceGatewayReadStatus(input: {
  conversationId?: string | null;
  readAt?: string | null;
  readSeq?: number | null;
  readerUserId?: string | null;
  sessionId?: string | null;
  visitorUserId?: string | null;
}): CustomerServiceReadStatusDto | null {
  const readSeq = normalizedReadSeq(input.readSeq);
  if (readSeq <= 0) return null;
  const userId = input.readerUserId?.trim() || input.visitorUserId?.trim() || customerServiceDirectPeerReaderId;
  return {
    ...(input.sessionId ? { sessionId: input.sessionId } : {}),
    ...(input.conversationId ? { conversationId: input.conversationId } : {}),
    visitorUserId: input.visitorUserId?.trim() || userId,
    members: [
      {
        userId,
        lastReadSeq: readSeq,
        lastReadAt: input.readAt ?? null,
      },
    ],
  };
}

export function customerServiceMessageReadReceiptState(
  message: MessageItemDto,
  mine: boolean,
  threadType?: string | null,
): CustomerServiceMessageReadReceiptState | undefined {
  if (!mine || !isCustomerServiceThreadType(threadType)) return undefined;
  if (!isCustomerServiceReadableSentMessage(message)) return undefined;
  const seq = Number(message.conversationSeq ?? 0);
  if (!Number.isFinite(seq) || seq <= 0) return undefined;
  if (message.isRead || message.readAt || Number(message.readCount ?? 0) > 0) {
    return message.readAt ? "read" : "unknown";
  }
  return "unread";
}

export function createCustomerServiceReadSnapshot(
  detail: unknown,
  messages: MessageItemDto[],
): CustomerServiceReadSnapshot | null {
  const readStatus = readCustomerServiceDetailReadStatus(detail);
  if (!readStatus?.members.length) return null;
  const visitorUserId =
    readStatus.visitorUserId ||
    messages.map(customerServiceMessageSenderUserId).find((userId, index) =>
      Boolean(userId && !isCustomerServiceStaffMessage(messages[index])),
    ) ||
    "";
  const customer = readStatus.members.find((member) => member.userId === visitorUserId);
  const staff = readStatus.members.find((member) => member.userId !== customer?.userId);
  return {
    customer: customer ? normalizeCustomerServiceReadMember(customer) : undefined,
    staff: staff ? normalizeCustomerServiceReadMember(staff) : undefined,
    visitorUserId,
  };
}

export function isCustomerServiceStaffMessage(message: MessageItemDto) {
  const record = message as MessageItemDto & Record<string, unknown>;
  const role = String(
    record.senderRole ?? record.senderType ?? record.fromRole ?? record.role ?? "",
  )
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
  if (
    ["staff", "agent", "operator", "customer_service", "service_staff", "kefu"].some(
      (item) => role.includes(item),
    )
  ) {
    return true;
  }
  const direction = String(record.direction ?? record.messageDirection ?? "")
    .trim()
    .toLowerCase();
  return ["out", "outbound", "sent", "send", "mine"].some((item) =>
    direction.includes(item),
  );
}

export function customerServiceMessageSenderUserId(message: MessageItemDto) {
  const record = message as MessageItemDto & Record<string, unknown>;
  return readStringField(record, [
    "senderUserId",
    "senderId",
    "fromUserId",
    "userId",
    "visitorUserId",
  ]);
}

function applyCustomerServiceMessageReadStatus(
  message: MessageItemDto,
  snapshot: CustomerServiceReadSnapshot,
) {
  const seq = Number(message.conversationSeq ?? 0);
  if (!Number.isFinite(seq) || seq <= 0) return message;
  const reader = isCustomerServiceStaffMessage(message) ? snapshot.customer : snapshot.staff;
  if (!reader) return message;
  const read = reader.lastReadSeq >= seq;
  if (read) {
    return {
      ...message,
      isRead: true,
      readAt: reader.lastReadAt ?? message.readAt ?? null,
      readCount: Math.max(1, Number(message.readCount ?? 0) || 0),
    };
  }
  return {
    ...message,
    isRead: false,
    readAt: null,
    readCount: 0,
    status: normalizeCustomerServiceUnreadMessageStatus(message.status),
  };
}

function readCustomerServiceDetailReadStatus(detail: unknown): CustomerServiceReadStatusDto | null {
  if (!detail || typeof detail !== "object") return null;
  const status = (detail as Record<string, unknown>).readStatus;
  if (!status || typeof status !== "object") return null;
  const typed = status as CustomerServiceReadStatusDto;
  return Array.isArray(typed.members) ? typed : null;
}

function normalizeCustomerServiceReadMember(
  member: CustomerServiceReadStatusDto["members"][number],
): CustomerServiceReadMember {
  return {
    userId: member.userId,
    lastReadSeq: Math.max(0, Math.floor(Number(member.lastReadSeq ?? 0) || 0)),
    lastReadAt: member.lastReadAt ?? null,
  };
}

function normalizeCustomerServiceUnreadMessageStatus(status?: string) {
  const normalized = String(status ?? "").trim().toLowerCase();
  return normalized === "read" || normalized === "seen" ? "sent" : status;
}

function normalizedReadSeq(value: unknown) {
  return Math.max(0, Math.floor(Number(value ?? 0) || 0));
}

function isCustomerServiceThreadType(threadType?: string | null) {
  const normalized = String(threadType ?? "").trim().toLowerCase().replace(/-/g, "_");
  return normalized === "temp_session" || normalized === "im_direct";
}

function isCustomerServiceReadableSentMessage(message: MessageItemDto) {
  if (message.isRecalled) return false;
  const status = String(message.status ?? "").trim().toLowerCase();
  return ![
    "failed",
    "rejected",
    "sending",
    "queued",
    "uploading",
    "paused",
    "canceled",
    "cancelled",
    "recalled",
  ].includes(status);
}

function readStringField(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}
