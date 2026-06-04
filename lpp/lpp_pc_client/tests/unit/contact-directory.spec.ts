import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import type {
  ConversationListItem,
  DepartmentDto,
  FriendDto,
  TenantMemberDto,
} from "../../src/renderer/data/api/types";
import {
  normalizeFriendDto,
  normalizeTenantMemberDto,
  normalizeTenantMemberProfileDto,
} from "../../src/renderer/data/api/contacts-client";
import { deriveContactDirectoryAccess } from "../../src/renderer/data/contact-directory-permissions";
import {
  contactMatchesDirectoryFilter,
  contactDirectoryEmptyText,
  contactDirectorySearchPlaceholder,
  createContactDirectoryEntries,
  groupOrganizationContactsByRole,
  contactRowSubtitle,
  mapContacts,
  normalizeContactDirectoryFilter,
  resolveContactDirectoryFilter,
} from "../../src/renderer/data/contact-directory";

describe("contact directory model", () => {
  it("keeps legacy staff filter compatible while the UI exposes organization", () => {
    expect(normalizeContactDirectoryFilter("staff")).toBe("organization");
    expect(normalizeContactDirectoryFilter("organization")).toBe("organization");
    expect(normalizeContactDirectoryFilter("customer")).toBe("customer");
  });

  it("resolves customer directory legacy filters to a personal contacts view", () => {
    expect(
      resolveContactDirectoryFilter({
        filter: "customer",
        viewMode: "customer",
        canReadOrganization: false,
      }),
    ).toBe("all");
    expect(
      resolveContactDirectoryFilter({
        filter: "organization",
        viewMode: "customer",
        canReadOrganization: false,
      }),
    ).toBe("all");
    expect(
      resolveContactDirectoryFilter({
        filter: "friend",
        viewMode: "customer",
        canReadOrganization: false,
      }),
    ).toBe("friend");
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
          greenBubbleNo: "lpp-u1",
          displayName: "小周",
          membershipRole: 2,
        } satisfies TenantMemberDto,
      ],
    });

    expect(contacts).toEqual([
      expect.objectContaining({
        departmentName: "客服部",
        kind: "staff",
        greenBubbleNo: "lpp-u1",
        name: "小周",
        position: "一线客服",
        roleLabel: "客服",
        roleRank: 30,
        source: "企业组织",
      }),
    ]);
  });

  it("maps organization member green bubble numbers from the normalized contact model", () => {
    const contacts = mapContacts({
      conversations: [],
      currentUserId: "me",
      departmentMembersById: {},
      departments: [],
      friends: [],
      members: [
        {
          userId: "u1",
          greenBubbleNo: "gb-10086",
          displayName: "灏忓懆",
          membershipRole: 2,
        } satisfies TenantMemberDto,
      ],
    });

    expect(contacts[0]).toMatchObject({
      kind: "staff",
      greenBubbleNo: "gb-10086",
    });
  });

  it("normalizes tenant member API aliases at the contacts anti-corruption boundary", () => {
    expect(
      normalizeTenantMemberDto({
        userId: "u1",
        displayName: "staff",
        lpp_id: "lpp-alias",
      }),
    ).toMatchObject({
      userId: "u1",
      displayName: "staff",
      greenBubbleNo: "lpp-alias",
    });
    expect(
      normalizeTenantMemberDto({
        userId: "u2",
        displayName: "staff",
        greenBubbleNo: "gb-canonical",
        lppId: "lpp-alias",
      }),
    ).toMatchObject({
      greenBubbleNo: "gb-canonical",
    });
  });

  it("normalizes tenant member profile LPP fields at the contacts anti-corruption boundary", () => {
    expect(
      normalizeTenantMemberProfileDto({
        userId: "u1",
        displayName: "staff",
        lppId: "lpp-profile",
      }),
    ).toEqual({
      userId: "u1",
      greenBubbleNo: "lpp-profile",
    });
  });

  it("normalizes friend API aliases at the contacts anti-corruption boundary", () => {
    expect(
      normalizeFriendDto({
        friendUserId: "u1",
        displayName: "friend",
        lpp_no: "friend-lpp",
      }),
    ).toMatchObject({
      friendUserId: "u1",
      displayName: "friend",
      greenBubbleNo: "friend-lpp",
    });
    expect(
      normalizeFriendDto({
        friendUserId: "u2",
        displayName: "friend",
        greenBubbleNo: "friend-gb",
        lppNumber: "friend-lpp",
      }),
    ).toMatchObject({
      greenBubbleNo: "friend-gb",
    });
  });

  it("shows public LPP numbers instead of internal user ids in contact details", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/renderer/components/ContactDetailViews.tsx"),
      "utf8",
    );

    expect(source).toContain('InfoLine label="绿泡泡号" value={contact.greenBubbleNo || "--"}');
    expect(source).toContain('<InfoLine label="身份" value="企业成员" />');
    expect(source).toContain('<InfoLine label="角色" value={contact.roleLabel || "--"} />');
    expect(source).not.toContain('InfoLine label="用户 ID"');
  });

  it("enriches selected organization contacts from user profile instead of UI alias guessing", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/renderer/components/ContactsPage.tsx"),
      "utf8",
    );

    expect(source).toContain("getTenantMemberProfile(activeTenantMemberUserId)");
    expect(source).toContain("activeContactDetail");
    expect(source).not.toContain("lppId");
  });

  it("groups organization contacts by role for the organization list", () => {
    const contacts = mapContacts({
      conversations: [],
      currentUserId: "me",
      departmentMembersById: {},
      departments: [],
      friends: [],
      members: [
        { userId: "u1", displayName: "普通成员", membershipRole: 0 },
        { userId: "u2", displayName: "客服", membershipRole: 2 },
        { userId: "u3", displayName: "管理员", membershipRole: 3 },
        { userId: "u4", displayName: "技术支持", membershipRole: 1 },
        { userId: "me", displayName: "自己", membershipRole: 4 },
      ],
    });

    const groups = groupOrganizationContactsByRole(contacts);

    expect(groups.map((group) => group.label)).toEqual([
      "管理员",
      "客服",
      "技术支持",
      "成员",
    ]);
    expect(groups.map((group) => group.count)).toEqual([1, 1, 1, 1]);
    expect(groups.find((group) => group.label === "客服")?.contacts[0].name).toBe("客服");
  });

  it("keeps customer friends as customers for staff but displays them as friends for customer users", () => {
    const friends: FriendDto[] = [
      { friendUserId: "customer-1", displayName: "客户好友", userType: 1 },
    ];
    const shared = {
      conversations: [],
      currentUserId: "me",
      departmentMembersById: {},
      departments: [],
      friends,
      members: [],
    };

    expect(mapContacts({ ...shared, viewMode: "staff" })[0]).toMatchObject({
      directoryFilters: ["customer", "friend"],
      kind: "customer",
      subtitle: "客户",
    });
    expect(mapContacts({ ...shared, viewMode: "staff" })[0]).not.toHaveProperty("source");
    expect(mapContacts({ ...shared, viewMode: "customer" })[0]).toMatchObject({
      kind: "friend",
      subtitle: "好友",
    });
    expect(mapContacts({ ...shared, viewMode: "customer" })[0]).not.toHaveProperty("source");
  });

  it("shows API contact groups only when groupName exists", () => {
    const [withoutGroup, withGroup] = mapContacts({
      conversations: [],
      currentUserId: "me",
      departmentMembersById: {},
      departments: [],
      friends: [
        { friendUserId: "customer-1", displayName: "customer", userType: 1 },
        { friendUserId: "customer-2", displayName: "vip customer", groupName: "VIP", userType: 1 },
      ],
      members: [],
      viewMode: "staff",
    });

    expect(contactRowSubtitle(withoutGroup)).toBe("客户");
    expect(contactRowSubtitle(withGroup)).toBe("客户 · VIP");
    expect(withoutGroup.subtitle).toBe("客户");
    expect(withGroup.subtitle).toBe("客户 · VIP");
  });

  it("counts customer friends in both customer and friend shortcuts without duplicating all contacts", () => {
    const contacts = mapContacts({
      conversations: [],
      currentUserId: "me",
      departmentMembersById: {},
      departments: [],
      friends: [
        { friendUserId: "customer-1", displayName: "customer", userType: 1 },
      ],
      members: [],
      viewMode: "staff",
    });

    const entries = createContactDirectoryEntries({
      contacts,
      requestCount: 0,
      viewMode: "staff",
      canReadOrganization: true,
    });
    const allEntries = [...entries.fixed, ...entries.shortcuts];
    expect(allEntries.find((item) => item.key === "all")?.count).toBe(1);
    expect(allEntries.find((item) => item.key === "customer")?.count).toBe(1);
    expect(allEntries.find((item) => item.key === "friend")?.count).toBe(1);
    expect(contactMatchesDirectoryFilter(contacts[0], "customer")).toBe(true);
    expect(contactMatchesDirectoryFilter(contacts[0], "friend")).toBe(true);
  });

  it("creates customer and staff entry models without leaking staff-only categories", () => {
    const contacts = mapContacts({
      conversations: [
        {
          conversationId: "group-1",
          conversationType: "group",
          title: "交流群",
          memberCount: 3,
        } satisfies ConversationListItem,
      ],
      currentUserId: "me",
      departmentMembersById: {},
      departments: [],
      friends: [
        { friendUserId: "friend-1", displayName: "好友", userType: 2 },
        { friendUserId: "customer-1", displayName: "客户", userType: 1 },
      ],
      members: [],
      viewMode: "customer",
    });

    const customerEntries = createContactDirectoryEntries({
      contacts,
      requestCount: 2,
      viewMode: "customer",
      canReadOrganization: false,
    });
    expect([...customerEntries.fixed, ...customerEntries.shortcuts].map((item) => item.label))
      .toEqual(["新的朋友", "全部联系人", "好友", "群聊"]);
    expect(customerEntries.shortcuts.map((item) => item.key)).not.toContain("customer");
    expect(customerEntries.shortcuts.map((item) => item.key)).not.toContain("organization");

    const staffEntries = createContactDirectoryEntries({
      contacts: [
        ...contacts,
        {
          id: "staff-1",
          kind: "staff",
          name: "客服",
          subtitle: "员工",
          remark: "企业成员",
          tags: ["员工"],
        },
      ],
      requestCount: 1,
      viewMode: "staff",
      canReadOrganization: true,
    });
    expect([...staffEntries.fixed, ...staffEntries.shortcuts].map((item) => item.label))
      .toEqual(["新的朋友", "全部联系人", "客户", "好友", "组织", "群聊"]);
  });

  it("uses customer-specific search and empty copy", () => {
    expect(
      contactDirectorySearchPlaceholder({
        viewMode: "customer",
        canReadOrganization: false,
      }),
    ).toBe("搜索好友、群聊");
    expect(
      contactDirectorySearchPlaceholder({
        viewMode: "staff",
        canReadOrganization: true,
      }),
    ).toBe("搜索客户、好友、组织、群聊");
    expect(
      contactDirectoryEmptyText({
        filter: "all",
        viewMode: "customer",
      }),
    ).toContain("新的朋友");
  });
});

describe("contacts page closure", () => {
  const contactsPage = readFileSync(
    resolve(process.cwd(), "src/renderer/components/ContactsPage.tsx"),
    "utf8",
  );
  const contactsController = readFileSync(
    resolve(
      process.cwd(),
      "src/renderer/contacts/hooks/useContactsDirectoryController.ts",
    ),
    "utf8",
  );

  it("uses list entries instead of horizontal contact tabs", () => {
    expect(contactsPage).toContain("contacts-entry-list");
    expect(contactsPage).toContain("ContactEntryButton");
    expect(contactsPage).not.toContain("contacts-tabs");
    expect(contactsPage).not.toContain('{ key: "staff", label: "员工" }');
  });

  it("keeps add contact and relationship actions reachable", () => {
    expect(contactsPage).toContain("handleAddContact");
    expect(contactsPage).not.toContain('title="添加联系人接口未接入"');
    expect(contactsPage).toContain("onDeleteFriend");
    expect(contactsPage).toContain("onBlockContact");
    expect(contactsPage).toContain("contacts-role-chip");
  });

  it("renders organization members by role groups instead of department groups", () => {
    expect(contactsPage).toContain("groupOrganizationContactsByRole");
    expect(contactsPage).toContain("roleGroups.map");
    expect(contactsPage).not.toContain("contactsByDepartmentId");
  });

  it("hides organization affordances for customer tenant members", () => {
    expect(contactsPage).toContain("directoryViewMode");
    expect(contactsPage).toContain("createContactDirectoryEntries");
    expect(contactsPage).toContain("contactAccess.canReadOrganization");
    expect(contactsPage).toContain("contactDirectorySearchPlaceholder");
    expect(contactsPage).toContain('directoryViewMode === "staff"');
  });

  it("guards organization directory queries behind the access model", () => {
    expect(contactsController).toContain("contactAccess.canReadOrganization");
    expect(contactsController).toContain("organizationQueriesEnabled");
    expect(contactsController).toContain("requestListError");
    expect(contactsController).not.toContain(
      "membersQuery.error ||\n    conversationsQuery.error ||\n    departmentsQuery.error ||\n    requestsQuery.error",
    );
  });
});

describe("contact directory access", () => {
  it("blocks organization reads for customer tenant members", () => {
    expect(
      deriveContactDirectoryAccess({
        apiBaseUrl: "https://example.test",
        displayName: "客户",
        membershipRole: 0,
        tenantToken: "token",
        userType: 1,
      }),
    ).toMatchObject({
      canReadOrganization: false,
      canReadSocialContacts: true,
      isCustomerTenantMember: true,
    });
  });

  it("allows staff and admin roles to read the organization directory", () => {
    expect(
      deriveContactDirectoryAccess({
        apiBaseUrl: "https://example.test",
        displayName: "客服",
        membershipRole: 2,
        tenantToken: "token",
        userType: 2,
      }).canReadOrganization,
    ).toBe(true);
    expect(
      deriveContactDirectoryAccess({
        apiBaseUrl: "https://example.test",
        displayName: "管理员",
        membershipRole: 3,
        tenantToken: "token",
      }).canReadOrganization,
    ).toBe(true);
  });

  it("does not treat unknown high membership roles as organization members", () => {
    expect(
      deriveContactDirectoryAccess({
        apiBaseUrl: "https://example.test",
        displayName: "unknown",
        membershipRole: 5,
        tenantToken: "token",
      }).canReadOrganization,
    ).toBe(false);
  });

  it("falls back to tenant membership role and keeps unknown legacy sessions open", () => {
    expect(
      deriveContactDirectoryAccess({
        apiBaseUrl: "https://example.test",
        displayName: "旧客户会话",
        tenantId: "tenant-1",
        tenantToken: "token",
        tenants: [{ tenantId: "tenant-1", tenantName: "企业", membershipRole: 0 }],
      }).canReadOrganization,
    ).toBe(false);

    expect(
      deriveContactDirectoryAccess({
        apiBaseUrl: "https://example.test",
        displayName: "旧员工会话",
        tenantToken: "token",
      }).canReadOrganization,
    ).toBe(true);
  });
});
