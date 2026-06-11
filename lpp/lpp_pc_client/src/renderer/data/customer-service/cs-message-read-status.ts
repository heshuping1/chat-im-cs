import type {
  CustomerServiceReadStatusDto,
  MessageItemDto,
} from "../api/types";

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

export function applyCustomerServiceReadStatusToMessages(
  detail: unknown,
  messages: MessageItemDto[],
) {
  const snapshot = createCustomerServiceReadSnapshot(detail, messages);
  if (!snapshot) return messages;
  return messages.map((message) => applyCustomerServiceMessageReadStatus(message, snapshot));
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

function readStringField(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}
