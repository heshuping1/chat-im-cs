import type { AuthSession } from "./auth/auth-session";
import { formatError } from "../lib/format";

export interface CreateGroupChatPayload {
  title: string;
  name?: string;
  memberUserIds: string[];
}

export type CreateGroupChatInput =
  | CreateGroupChatPayload
  | {
      title?: string;
      name: string;
      memberUserIds: string[];
    };

export interface NormalizedCreateGroupChatPayload {
  title: string;
  memberUserIds: string[];
}

export interface GroupCreateAccess {
  canCreateGroup: boolean;
  reason?: string;
}

const groupCreateDeniedReason = "当前角色暂无建群权限";

export function normalizeCreateGroupChatPayload(
  payload: CreateGroupChatInput,
): NormalizedCreateGroupChatPayload {
  const title = `${payload.title ?? payload.name ?? ""}`.trim();
  if (!title) throw new Error("群聊名称不能为空");

  const memberUserIds = uniqueNonEmptyStrings(payload.memberUserIds);
  if (memberUserIds.length < 2) throw new Error("至少选择 2 位成员");

  return { title, memberUserIds };
}

export function extractCreatedGroupConversationId(result: unknown): string {
  return extractConversationId(result);
}

export function deriveGroupCreateAccess(
  session: AuthSession | null | undefined,
): GroupCreateAccess {
  if (!session) {
    return { canCreateGroup: false, reason: "请先登录" };
  }

  const roleLabel = `${session.roleLabel ?? ""}`.trim().toLowerCase();
  const membershipRole =
    finiteNumber(session.membershipRole) ?? currentTenantMembershipRole(session);

  if (isPersonalSpace(roleLabel) || isAdminOrOwner(roleLabel)) {
    return { canCreateGroup: true };
  }
  if (membershipRole !== undefined) {
    return membershipRole >= 3
      ? { canCreateGroup: true }
      : { canCreateGroup: false, reason: groupCreateDeniedReason };
  }
  if (isExplicitlyDeniedRole(roleLabel)) {
    return { canCreateGroup: false, reason: groupCreateDeniedReason };
  }

  return { canCreateGroup: true };
}

export function formatGroupCreateError(error: unknown) {
  const message = formatError(error);
  if (/group\s+title\s+is\s+required/i.test(message)) return "群聊名称不能为空";
  if (/title\s+is\s+required/i.test(message)) return "群聊名称不能为空";
  return message;
}

function extractConversationId(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  const ownId = stringField(
    record,
    "conversationId",
    "conversation_id",
    "chatId",
    "chat_id",
    "groupId",
    "group_id",
    "id",
  );
  if (ownId) return ownId;

  return (
    extractConversationId(record.group) ||
    extractConversationId(record.conversation) ||
    extractConversationId(record.data)
  );
}

function uniqueNonEmptyStrings(values: unknown[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function stringField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function currentTenantMembershipRole(session: AuthSession) {
  const tenantId = session.tenantId;
  if (!tenantId) return undefined;
  const tenant = session.tenants?.find((item) => item.tenantId === tenantId);
  return finiteNumber(tenant?.membershipRole);
}

function finiteNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function isPersonalSpace(roleLabel: string) {
  return roleLabel.includes("个人空间") || roleLabel.includes("personal");
}

function isAdminOrOwner(roleLabel: string) {
  return (
    roleLabel.includes("管理员") ||
    roleLabel.includes("admin") ||
    roleLabel.includes("所有者") ||
    roleLabel.includes("owner")
  );
}

function isExplicitlyDeniedRole(roleLabel: string) {
  return (
    roleLabel.includes("客服") ||
    roleLabel.includes("customer_service") ||
    roleLabel.includes("成员") ||
    roleLabel.includes("member") ||
    roleLabel.includes("技术支持") ||
    roleLabel.includes("support")
  );
}
