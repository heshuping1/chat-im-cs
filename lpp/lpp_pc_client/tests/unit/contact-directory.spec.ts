import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import type { DepartmentDto, TenantMemberDto } from "../../src/renderer/data/api/types";
import {
  mapContacts,
  normalizeContactDirectoryFilter,
} from "../../src/renderer/data/contact-directory";

describe("contact directory model", () => {
  it("keeps legacy staff filter compatible while the UI exposes organization", () => {
    expect(normalizeContactDirectoryFilter("staff")).toBe("organization");
    expect(normalizeContactDirectoryFilter("organization")).toBe("organization");
    expect(normalizeContactDirectoryFilter("customer")).toBe("customer");
  });

  it("maps tenant members into organization contacts with role labels", () => {
    const contacts = mapContacts({
      conversations: [],
      currentUserId: "me",
      departmentMembersById: {
        dep1: [{ userId: "u1", position: "一线客服" }],
      },
      departments: [
        {
          departmentId: "dep1",
          departmentName: "客服部",
          status: "active",
        } satisfies DepartmentDto,
      ],
      friends: [],
      members: [
        {
          userId: "u1",
          displayName: "小周",
          membershipRole: 2,
        } satisfies TenantMemberDto,
      ],
    });

    expect(contacts).toEqual([
      expect.objectContaining({
        departmentName: "客服部",
        kind: "staff",
        name: "小周",
        position: "一线客服",
        roleLabel: "客服",
        source: "企业组织",
      }),
    ]);
  });
});

describe("contacts page closure", () => {
  const contactsPage = readFileSync(
    resolve(process.cwd(), "src/renderer/components/ContactsPage.tsx"),
    "utf8",
  );

  it("shows one organization tab instead of separate organization and staff tabs", () => {
    expect(contactsPage).toContain('{ key: "organization", label: "组织" }');
    expect(contactsPage).not.toContain('{ key: "staff", label: "员工" }');
  });

  it("keeps add contact and relationship actions reachable", () => {
    expect(contactsPage).toContain("handleAddContact");
    expect(contactsPage).not.toContain('title="添加联系人接口未接入"');
    expect(contactsPage).toContain("onDeleteFriend");
    expect(contactsPage).toContain("onBlockContact");
    expect(contactsPage).toContain("contacts-role-chip");
  });
});
