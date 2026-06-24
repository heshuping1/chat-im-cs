import { describe, expect, it } from "vitest";

import type { CustomerProfileCard, FriendProfileExtraDto } from "../../src/renderer/data/api-client";
import {
  enrichContactWithPublicId,
  publicContactIdFromRecord,
  publicContactIdFromSources,
} from "../../src/renderer/data/contact-public-id";
import type { ContactItem } from "../../src/renderer/data/types";

describe("contact public id model", () => {
  it("normalizes customer profile aliases into one public id", () => {
    expect(publicContactIdFromRecord({ customerLppNo: " lpp-customer " })).toBe("lpp-customer");
    expect(publicContactIdFromRecord({ greenBubbleNo: "gb-10086" })).toBe("gb-10086");
    expect(publicContactIdFromRecord({ userNo: 10086 })).toBe("10086");
  });

  it("resolves profile-extra ids when list contacts omit the public id", () => {
    const contact = {
      id: "customer-u1",
      kind: "customer",
      name: "Customer",
      remark: "",
      subtitle: "",
      tags: [],
      userId: "u1",
    } satisfies ContactItem;
    const profileExtra = {
      friendUserId: "u1",
      lppId: "lpp-extra",
    } satisfies FriendProfileExtraDto;

    expect(publicContactIdFromSources({ contact, profileExtra })).toBe("lpp-extra");
    expect(enrichContactWithPublicId(contact, "lpp-extra")).toMatchObject({
      greenBubbleNo: "lpp-extra",
    });
  });

  it("keeps canonical profile and list ids ahead of fallback detail ids", () => {
    expect(
      publicContactIdFromSources({
        contact: {
          id: "customer-u1",
          kind: "customer",
          name: "Customer",
          remark: "",
          subtitle: "",
          tags: [],
          greenBubbleNo: "gb-list",
        },
        profile: { lppId: "lpp-profile" } satisfies CustomerProfileCard,
        profileExtra: { friendUserId: "u1", lppId: "lpp-extra" },
      }),
    ).toBe("lpp-profile");

    const contact = {
      id: "customer-u2",
      kind: "customer",
      name: "Customer",
      remark: "",
      subtitle: "",
      tags: [],
      greenBubbleNo: "gb-list",
    } satisfies ContactItem;
    expect(enrichContactWithPublicId(contact, "lpp-extra")).toBe(contact);
  });
});
