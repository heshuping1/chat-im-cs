import type { ConversationListItem, GroupMemberDto } from "../../data/api-client";
import { timestampFromDateValue } from "../../lib/format";
import type {
  GroupAvatarCell,
  GroupConversationAvatar,
} from "./groupAvatarTypes";
import { groupMemberDisplayName } from "./groupManagementModel";

export function resolveGroupConversationAvatar(
  conversation?: ConversationListItem,
  groupMembers?: GroupMemberDto[],
  snapshotUrl?: string,
): GroupConversationAvatar | undefined {
  if (!conversation) return undefined;
  const formalAvatar = firstStringField(
    conversation as unknown as Record<string, unknown>,
    "groupAvatarUrl",
    "groupIconUrl",
    "iconUrl",
    "avatarUrl",
  );
  if (formalAvatar) return { kind: "image", url: formalAvatar };
  if (snapshotUrl) return { kind: "image", url: snapshotUrl };
  if (!groupCompositeAvatarAllowed(conversation)) return undefined;
  const cells = groupCompositeAvatarCells(conversation, groupMembers);
  return cells.length > 0 ? { kind: "grid", cells } : undefined;
}

export function groupCompositeAvatarAllowed(conversation?: ConversationListItem) {
  if (!conversation) return false;
  const record = conversation as unknown as Record<string, unknown>;
  const avatarVisible = firstBooleanField(
    record,
    "memberAvatarVisible",
    "canViewMemberAvatars",
    "canViewMemberAvatar",
    "avatarVisible",
    "avatarsVisible",
    "showMemberAvatar",
    "showMemberAvatars",
    "allowViewMemberAvatar",
    "allowViewMemberAvatars",
  );
  const listVisible = firstBooleanField(
    record,
    "memberListVisible",
    "canViewMemberList",
    "membersVisible",
    "showMemberList",
    "allowViewMemberList",
  );
  return avatarVisible !== false && listVisible !== false;
}

export function groupCompositeAvatarCells(
  conversation?: ConversationListItem,
  groupMembers?: GroupMemberDto[],
) {
  if (!conversation) return [];
  const record = conversation as unknown as Record<string, unknown>;
  const cells: GroupAvatarCell[] = [];

  arrayRecordField(record, "members", "groupMembers").forEach((member, index) => {
    cells.push({
      avatarUrl: firstStringField(member, "avatarUrl", "avatar", "photoUrl", "headUrl"),
      name:
        firstStringField(member, "displayName", "name", "nickname", "userName") ||
        `Member ${index + 1}`,
    });
  });

  (groupMembers ?? [])
    .slice()
    .sort(compareGroupAvatarMemberPriority)
    .forEach((member, index) => {
      cells.push({
        avatarUrl: member.avatarUrl,
        name: groupMemberDisplayName(member) || member.userId || `Member ${index + 1}`,
      });
    });

  arrayStringField(record, "memberAvatarUrls", "memberAvatars", "avatarUrls").forEach((url, index) => {
    cells.push({ avatarUrl: url, name: `Member ${index + 1}` });
  });

  return uniqueGroupAvatarCells(cells).slice(0, 9);
}

export function usablePersonName(value?: string | null) {
  const text = value?.trim();
  if (!text || text === "00000000-0000-0000-0000-000000000000") return undefined;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)) {
    return undefined;
  }
  if (isLikelyMojibakeText(text)) return undefined;
  return text;
}

function compareGroupAvatarMemberPriority(left: GroupMemberDto, right: GroupMemberDto) {
  return (
    groupMemberRoleRank(left) - groupMemberRoleRank(right) ||
    timestampFromDateValue(left.joinedAt) - timestampFromDateValue(right.joinedAt)
  );
}

function groupMemberRoleRank(member: GroupMemberDto) {
  const role = `${member.role ?? member.memberRole ?? ""}`.toLowerCase();
  if (role.includes("owner") || role.includes("\u7fa4\u4e3b")) return 0;
  if (role.includes("admin") || role.includes("\u7ba1\u7406\u5458")) return 1;
  return 2;
}

function firstStringField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function firstBooleanField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "1", "yes", "visible", "enabled", "allow"].includes(normalized)) return true;
      if (["false", "0", "no", "hidden", "disabled", "deny"].includes(normalized)) return false;
    }
    if (typeof value === "number" && Number.isFinite(value)) return value !== 0;
  }
  return undefined;
}

function arrayStringField(record: Record<string, unknown>, ...keys: string[]) {
  return keys.flatMap((key) => {
    const value = record[key];
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()));
  });
}

function arrayRecordField(record: Record<string, unknown>, ...keys: string[]) {
  return keys.flatMap((key) => {
    const value = record[key];
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is Record<string, unknown> => Boolean(item && typeof item === "object"),
    );
  });
}

function uniqueGroupAvatarCells(values: GroupAvatarCell[]) {
  const seen = new Set<string>();
  const next: GroupAvatarCell[] = [];
  values.forEach((value) => {
    const normalized = `${value.avatarUrl || ""}|${value.name}`.trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    next.push(value);
  });
  return next;
}

function isLikelyMojibakeText(text: string) {
  return /[\u8119\u8117\ufffd\u7d54]|(\u95b9|\u78e1|\u940e|\u7959|\u7dd7|\u95b4|\u95bb|\ue562|\u95b8|\u941f|\u95ba|\u5255|\u6bb0|\u5a11|\u6422|\u5a34|\u7218|\u7f02|\u5a75|\u95bc|\u7727|\u9420|\u6077|\u745b|\u58cb|\u95bd|\u20ac|\u7f01|\u9207)/.test(
    text,
  );
}
