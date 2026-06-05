import type {
  ContactCardDto,
  FriendDto,
  FriendRequestDto,
} from "../../data/api/types";
import type { AuthSession } from "../../data/auth/auth-session";
import { stringField, stringValue } from "../../data/im-message-normalize";

export type ContactCardRelationStatus =
  | "self"
  | "friend"
  | "incomingPending"
  | "outgoingPending"
  | "none";

export interface NormalizedContactCard extends ContactCardDto {
  lppId?: string | null;
  subtitle?: string;
}

export interface AnchoredContactCardProfile extends NormalizedContactCard {
  x: number;
  y: number;
}

export type ContactCardRelation =
  | { status: "self" }
  | { status: "friend"; friendUserId: string }
  | { status: "incomingPending"; requestId: string }
  | { status: "outgoingPending"; requestId: string }
  | { status: "none" };

export function normalizeContactCard(value: unknown): NormalizedContactCard {
  const record = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  const displayName =
    stringField(
      record,
      "displayName",
      "display_name",
      "name",
      "userName",
      "user_name",
      "realName",
      "real_name",
      "nickname",
      "nickName",
      "nick_name",
    ) || "";
  const mobile = stringField(record, "mobile", "phone", "phoneNumber", "phone_number");
  const email = stringField(record, "email", "mail");
  const lppId = stringField(record, "lppId", "lpp_id", "userNo", "user_no");
  const normalized = {
    userId:
      stringField(
        record,
        "userId",
        "user_id",
        "friendUserId",
        "friend_user_id",
        "platformUserId",
        "platform_user_id",
      ) || "",
    displayName,
    avatarUrl: stringField(record, "avatarUrl", "avatar_url", "avatar", "photoUrl") ?? null,
    ...(lppId ? { lppId } : {}),
    mobile,
    email,
    subtitle: lppId || "个人名片",
  };
  return normalized;
}

export function contactCardMessageBody(card: NormalizedContactCard | ContactCardDto) {
  return {
    contactCard: sanitizeContactCard(card),
  };
}

export function sanitizeContactCard(card: NormalizedContactCard | ContactCardDto): ContactCardDto {
  return {
    userId: card.userId,
    displayName: card.displayName,
    avatarUrl: card.avatarUrl ?? null,
    ...(card.mobile ? { mobile: card.mobile } : {}),
    ...(card.email ? { email: card.email } : {}),
  };
}

export function resolveContactCardRelation({
  card,
  friends,
  requests,
  session,
  userId,
}: {
  card: Pick<NormalizedContactCard, "userId">;
  friends: FriendDto[];
  requests: FriendRequestDto[];
  session?: AuthSession | null;
  userId?: string | null;
}): ContactCardRelation {
  const targetUserId = card.userId;
  const currentUserId = userId || sessionUserId(session);
  if (targetUserId && currentUserId && sameId(targetUserId, currentUserId)) {
    return { status: "self" };
  }
  const friend = friends.find((item) => sameId(item.friendUserId, targetUserId));
  if (friend) return { status: "friend", friendUserId: friend.friendUserId };
  const pendingRequests = requests.filter((request) =>
    normalizeRequestStatus(request.status) === "pending",
  );
  const incoming = pendingRequests.find((request) =>
    sameId(request.fromUserId, targetUserId) &&
    (!currentUserId || !request.toUserId || sameId(request.toUserId, currentUserId)),
  );
  if (incoming?.requestId) {
    return { status: "incomingPending", requestId: incoming.requestId };
  }
  const outgoing = pendingRequests.find((request) =>
    sameId(request.toUserId, targetUserId) &&
    (!currentUserId || !request.fromUserId || sameId(request.fromUserId, currentUserId)),
  );
  if (outgoing?.requestId) {
    return { status: "outgoingPending", requestId: outgoing.requestId };
  }
  return { status: "none" };
}

export function resolveUserRelation({
  friends,
  localOutgoingUserIds = [],
  requests,
  session,
  targetUserId,
  userId,
}: {
  friends: FriendDto[];
  localOutgoingUserIds?: string[];
  requests: FriendRequestDto[];
  session?: AuthSession | null;
  targetUserId?: string | null;
  userId?: string | null;
}): ContactCardRelation {
  const relation = resolveContactCardRelation({
    card: { userId: targetUserId ?? "" },
    friends,
    requests,
    session,
    userId,
  });
  if (
    relation.status === "none" &&
    localOutgoingUserIds.some((item) => sameId(item, targetUserId))
  ) {
    return { status: "outgoingPending", requestId: "local" };
  }
  return relation;
}

export type ContactCardActionErrorKind =
  | "alreadyFriend"
  | "requestPending"
  | "blockRestricted"
  | "privacyRestricted"
  | "forbidden"
  | "unknown";

export interface ContactCardActionErrorDescriptor {
  kind: ContactCardActionErrorKind;
  message?: string;
}

export function contactCardActionErrorDescriptor(
  error: unknown,
): ContactCardActionErrorDescriptor {
  const record = error && typeof error === "object" ? error as Record<string, unknown> : {};
  const code = stringValue(record.code)?.toUpperCase() ?? "";
  const message = error instanceof Error ? error.message : stringValue(error);
  if (code.includes("ALREADY_EXISTS") || message?.includes("\u5df2\u7ecf\u662f\u597d\u53cb")) {
    return { kind: "alreadyFriend", message };
  }
  if (code.includes("REQUEST_PENDING") || message?.includes("\u5f85\u5904\u7406")) {
    return { kind: "requestPending", message };
  }
  if (code.includes("BLOCK") || message?.includes("\u9ed1\u540d\u5355") || message?.includes("\u62c9\u9ed1")) {
    return { kind: "blockRestricted", message };
  }
  if (code.includes("PRIVACY") || message?.includes("\u9690\u79c1")) {
    return { kind: "privacyRestricted", message };
  }
  if (message?.includes("403") || code.includes("FORBIDDEN")) {
    return { kind: "forbidden", message };
  }
  return { kind: "unknown", message };
}

function sessionUserId(session?: AuthSession | null) {
  return session?.userId || session?.platformUserId || session?.lppId || "";
}

function sameId(left?: string | null, right?: string | null) {
  return Boolean(left && right && left.trim().toLowerCase() === right.trim().toLowerCase());
}

function normalizeRequestStatus(status?: string | null) {
  const value = `${status ?? "pending"}`.trim().toLowerCase();
  return value || "pending";
}
