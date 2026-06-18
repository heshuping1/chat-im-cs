import { describe, expect, it } from "vitest";
import {
  customerProfileEntityToDto,
  customerServiceThreadEntityToDto,
  normalizeCustomerProfileDto,
  normalizeCustomerServiceThreadDto,
} from "../../src/renderer/data/customer-service/cs-contract";

describe("customer service contract", () => {
  it("normalizes a complete queued temp session thread", () => {
    const result = normalizeCustomerServiceThreadDto({
      threadId: "t1",
      conversationId: "c1",
      threadType: "temp-session",
      status: "queued",
      customerDisplayName: "访客 A",
      sourceChannel: "web",
      sourcePlatform: "h5",
      unreadCount: 2,
      tags: ["vip"],
    });

    expect(result.status).toBe("ok");
    expect(result.data).toMatchObject({
      id: "t1",
      conversationId: "c1",
      type: "temp_session",
      normalizedStatus: "queued",
      title: "访客 A",
      sourceChannel: "web",
      sourcePlatform: "h5",
      unreadCount: 2,
      tags: ["vip"],
      isTerminal: false,
    });
  });

  it("accepts compatible fields and maps back to CustomerServiceThread", () => {
    const result = normalizeCustomerServiceThreadDto({
      session_id: "s1",
      thread_type: "direct",
      status: "closed-by-staff",
      visitor_name: "访客 B",
      customer_avatar_url: "https://example.com/a.png",
      unread_count: "3",
    });

    expect(result.status).toBe("ok");
    expect(customerServiceThreadEntityToDto(result.data!)).toMatchObject({
      threadId: "s1",
      conversationId: "s1",
      threadType: "im_direct",
      status: "closed-by-staff",
      title: "访客 B",
      customerAvatarUrl: "https://example.com/a.png",
      unreadCount: 3,
    });
    expect(result.data?.isTerminal).toBe(true);
  });

  it("maps sourcePlatform back to CustomerServiceThread", () => {
    const result = normalizeCustomerServiceThreadDto({
      threadId: "t-source",
      status: "active",
      title: "访客 C",
      sourceChannel: "website",
      sourcePlatform: "miniprogram",
    });

    expect(customerServiceThreadEntityToDto(result.data!)).toMatchObject({
      sourceChannel: "website",
      sourcePlatform: "miniprogram",
    });
  });

  it("marks missing thread id as invalid and missing title/status as degraded", () => {
    const invalid = normalizeCustomerServiceThreadDto({ status: "queued" });
    expect(invalid.status).toBe("invalid");
    expect(invalid.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "cs.thread.missing_id",
          level: "error",
        }),
      ]),
    );

    const degraded = normalizeCustomerServiceThreadDto({
      threadId: "t2",
      threadType: "temp_session",
    });
    expect(degraded.status).toBe("degraded");
    expect(degraded.data).toMatchObject({
      id: "t2",
      title: "访客",
      unreadCount: 0,
    });
    expect(degraded.issues.map((issue) => issue.code)).toEqual([
      "cs.thread.missing_status",
      "cs.thread.missing_title",
    ]);
  });

  it("normalizes customer profile without exposing sensitive fields in issues", () => {
    const result = normalizeCustomerProfileDto({
      customerUserId: "u1",
      customerDisplayName: "客户 A",
      avatarUrl: "https://example.com/p.png",
      phone: "13800000000",
      email: "a@example.com",
      riskLevel: "medium",
      tags: ["vip"],
      tabCounts: { orders: 2 },
    });

    expect(result.status).toBe("ok");
    expect(customerProfileEntityToDto(result.data!)).toMatchObject({
      customerUserId: "u1",
      displayName: "客户 A",
      avatarUrl: "https://example.com/p.png",
      riskLevel: "medium",
      tags: ["vip"],
      tabCounts: { orders: 2 },
    });
    expect(result.issues).toEqual([]);
  });

  it("degrades profile display name fallback", () => {
    const result = normalizeCustomerProfileDto({ customerId: "c1" });

    expect(result.status).toBe("degraded");
    expect(result.data).toMatchObject({
      customerId: "c1",
      displayName: "访客",
    });
    expect(result.issues).toEqual([
      expect.objectContaining({ code: "cs.profile.missing_display_name" }),
    ]);
  });
});
