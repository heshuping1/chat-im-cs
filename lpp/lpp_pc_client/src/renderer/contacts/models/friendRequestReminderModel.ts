import type { FriendRequestDto } from "../../data/api/types";
import type { ContactFilter, ModuleKey } from "../../data/types";
import type { ReminderPolicySettings } from "../../data/reminder/reminder-types";
import { shouldPushRealtimeReminder } from "../../data/reminder/reminder-service";

export function pendingIncomingFriendRequests(
  requests: FriendRequestDto[],
  currentUserId?: string | null,
) {
  return requests.filter((request) => isPendingIncomingFriendRequest(request, currentUserId));
}

export function isPendingIncomingFriendRequest(
  request: FriendRequestDto,
  currentUserId?: string | null,
) {
  if (normalizeRequestStatus(request.status) !== "pending") return false;
  if (sameId(request.fromUserId, currentUserId)) return false;
  return !request.toUserId || !currentUserId || sameId(request.toUserId, currentUserId);
}

export function friendRequestReminderKey(request: FriendRequestDto) {
  const requestId = request.requestId?.trim();
  if (requestId) return requestId;
  const fromUserId = request.fromUserId?.trim();
  return fromUserId ? `from:${fromUserId}` : "";
}

export function buildFriendRequestReminder(request: FriendRequestDto) {
  const key = friendRequestReminderKey(request);
  const name = request.fromDisplayName?.trim();
  return {
    id: `friend-request-${key || "unknown"}`,
    title: "新的好友申请",
    body: name ? `${name}想添加你为好友` : "有人想添加你为好友",
    targetModule: "contacts" as const,
    targetId: "requests",
    severity: "info" as const,
    icon: "contacts" as const,
  };
}

export function shouldSuppressFriendRequestReminder({
  activeModule,
  contactFilter,
  settings,
}: {
  activeModule: ModuleKey;
  contactFilter: ContactFilter;
  settings: ReminderPolicySettings;
}) {
  if (!shouldPushRealtimeReminder(settings, "im")) return true;
  return activeModule === "contacts" && contactFilter === "requests";
}

function normalizeRequestStatus(status?: string | null) {
  const value = `${status ?? "pending"}`.trim().toLowerCase();
  return value || "pending";
}

function sameId(left?: string | null, right?: string | null) {
  return Boolean(left && right && left.trim().toLowerCase() === right.trim().toLowerCase());
}
