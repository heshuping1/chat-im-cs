import { describe, expect, it } from "vitest";

import type { GroupMemberDto } from "../../src/renderer/data/api-client";
import type { ContactPickerItem } from "../../src/renderer/messages/components/MessageStartDialogs";
import {
  groupInviteCandidateItems,
  groupMemberInviteIdSet,
  parseGroupInviteIds,
  uniqueGroupInviteIds,
} from "../../src/renderer/messages/models/groupInviteModel";

describe("groupInviteModel", () => {
  it("parses manual invite ids split by whitespace and commas", () => {
    expect(parseGroupInviteIds("u1, u2，u3\nu4")).toEqual(["u1", "u2", "u3", "u4"]);
  });

  it("deduplicates invite ids and excludes existing group members", () => {
    const existing = groupMemberInviteIdSet([
      { userId: "u1", platformUserId: "p1", lppId: "l1", displayName: "Alice" },
    ] as GroupMemberDto[]);

    expect(uniqueGroupInviteIds(["u1", "U2", "u2", "p1", "u3"], existing)).toEqual(["U2", "u3"]);
  });

  it("filters invite candidates by keyword and existing members", () => {
    const contacts: ContactPickerItem[] = [
      { id: "u1", name: "Alice", source: "friend", subtitle: "Friend" },
      { id: "u2", name: "Bob", source: "member", subtitle: "Enterprise member" },
      { id: "u3", name: "Carol", source: "department", subtitle: "Sales" },
    ];
    const existing = new Set(["u1"]);

    expect(groupInviteCandidateItems({
      contacts,
      excludedIds: existing,
      keyword: "sales",
    }).map((item) => item.id)).toEqual(["u3"]);
  });
});
