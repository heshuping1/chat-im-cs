import type { GroupMemberDto } from "../../data/api-client";

export type GroupInviteContactItem = {
  id: string;
  name: string;
  subtitle: string;
};

export function parseGroupInviteIds(value: string) {
  return value
    .split(/[\s,，]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function uniqueGroupInviteIds(values: Iterable<string>, excludedIds: Set<string>) {
  const seen = new Set<string>();
  const result: string[] = [];
  Array.from(values).forEach((value) => {
    const id = value.trim();
    const key = id.toLowerCase();
    if (!id || excludedIds.has(key) || seen.has(key)) return;
    seen.add(key);
    result.push(id);
  });
  return result;
}

export function groupMemberInviteIdSet(members: GroupMemberDto[]) {
  const ids = new Set<string>();
  members.forEach((member) => {
    [member.userId, member.platformUserId, member.lppId].forEach((value) => {
      const id = value?.trim().toLowerCase();
      if (id) ids.add(id);
    });
  });
  return ids;
}

export function groupInviteCandidateItems<T extends GroupInviteContactItem>({
  contacts,
  excludedIds,
  keyword,
  limit = 30,
}: {
  contacts: T[];
  excludedIds: Set<string>;
  keyword: string;
  limit?: number;
}) {
  const normalized = keyword.trim().toLowerCase();
  return contacts
    .filter((item) => item.id && !excludedIds.has(item.id.trim().toLowerCase()))
    .filter((item) =>
      !normalized ||
      `${item.name} ${item.subtitle} ${item.id}`.toLowerCase().includes(normalized),
    )
    .slice(0, limit);
}
