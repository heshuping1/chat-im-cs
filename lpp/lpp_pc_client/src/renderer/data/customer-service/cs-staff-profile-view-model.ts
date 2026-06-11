import type {
  CustomerServiceStaffStatusDto,
  CustomerServiceThread,
  MessageItemDto,
} from "../api/types";

export interface CustomerServiceStaffProfileViewModel {
  activeSessionCount?: number | null;
  avatarUrl?: string | null;
  displayName: string;
  isAssigned: boolean;
  lastHeartbeatAt?: string | null;
  lastOnlineAt?: string | null;
  maxConcurrentSessions?: number | null;
  queueAcceptEnabled?: boolean | null;
  staffUserId: string;
  statusLabel: string;
}

export function createCustomerServiceStaffProfileViewModel(input: {
  messages?: MessageItemDto[];
  staffItems?: CustomerServiceStaffStatusDto[];
  statusLabel?: (staff?: CustomerServiceStaffStatusDto) => string;
  thread: CustomerServiceThread;
}): CustomerServiceStaffProfileViewModel {
  const record = input.thread as CustomerServiceThread & Record<string, unknown>;
  const directName = readStringField(record, [
    "assignedStaffDisplayName",
    "assignedStaffName",
    "staffDisplayName",
    "staffName",
  ]);
  const staffUserId = readStringField(record, [
    "assignedStaffUserId",
    "staffUserId",
    "serviceStaffUserId",
  ]);
  const directAvatarUrl = readStringField(record, [
    "assignedStaffAvatarUrl",
    "staffAvatarUrl",
    "serviceStaffAvatarUrl",
  ]);
  const messageStaff = latestStaffMessageProfile(input.messages ?? []);
  const resolvedStaffUserId = staffUserId || messageStaff.staffUserId;
  const staff = input.staffItems?.find((item) => item.staffUserId === resolvedStaffUserId);
  const displayName =
    directName ||
    staff?.displayName ||
    messageStaff.displayName ||
    resolvedStaffUserId ||
    "--";
  const isAssigned = Boolean(resolvedStaffUserId || directName || staff?.displayName);

  return {
    activeSessionCount: staff?.activeSessionCount,
    avatarUrl: staff?.avatarUrl || directAvatarUrl || messageStaff.avatarUrl || null,
    displayName,
    isAssigned,
    lastHeartbeatAt: staff?.lastHeartbeatAt,
    lastOnlineAt: staff?.lastOnlineAt,
    maxConcurrentSessions: staff?.maxConcurrentSessions,
    queueAcceptEnabled: staff?.queueAcceptEnabled,
    staffUserId: staff?.staffUserId || resolvedStaffUserId,
    statusLabel: input.statusLabel?.(staff) ?? "",
  };
}

function latestStaffMessageProfile(messages: MessageItemDto[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || !isStaffMessage(message)) continue;
    const record = message as MessageItemDto & Record<string, unknown>;
    return {
      avatarUrl: readStringField(record, [
        "staffAvatarUrl",
        "senderAvatarUrl",
        "avatarUrl",
      ]),
      displayName: readStringField(record, [
        "staffDisplayName",
        "senderDisplayName",
        "senderName",
        "displayName",
        "nickname",
      ]),
      staffUserId: readStringField(record, [
        "staffUserId",
        "serviceStaffUserId",
        "senderUserId",
        "senderId",
        "fromUserId",
      ]),
    };
  }
  return { avatarUrl: "", displayName: "", staffUserId: "" };
}

function isStaffMessage(message: MessageItemDto) {
  const record = message as MessageItemDto & Record<string, unknown>;
  const role = String(
    record.senderRole ?? record.senderType ?? record.fromRole ?? record.role ?? "",
  )
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
  return (
    ["staff", "agent", "operator", "customer_service", "service_staff", "kefu"].some(
      (item) => role.includes(item),
    ) ||
    ["out", "outbound", "sent", "send", "mine"].some((item) =>
      String(record.direction ?? record.messageDirection ?? "")
        .trim()
        .toLowerCase()
        .includes(item),
    )
  );
}

function readStringField(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}
