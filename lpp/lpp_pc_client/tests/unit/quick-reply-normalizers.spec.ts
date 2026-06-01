import { describe, expect, it } from "vitest";

import {
  filterQuickRepliesForScope,
  normalizeQuickRepliesResponse,
  quickReplyMatchesKeyword,
  quickReplyScopeForThreadType,
} from "../../src/renderer/data/api/quick-reply-normalizers";

describe("quick reply normalizers", () => {
  it("normalizes array and wrapped quick reply responses", () => {
    expect(
      normalizeQuickRepliesResponse({
        data: {
          items: [
            {
              id: "reply-1",
              scope: "im_direct",
              locale: "zh-CN",
              group: "开户",
              name: "KYC 提醒",
              text: "请先完成实名认证。",
              tags: "kyc,认证",
              sort_order: "2",
              enabled: "true",
            },
            { id: "missing-content", title: "Bad" },
          ],
        },
      }),
    ).toEqual([
      expect.objectContaining({
        quickReplyId: "reply-1",
        scope: "direct_customer",
        category: "开户",
        title: "KYC 提醒",
        content: "请先完成实名认证。",
        tags: ["kyc", "认证"],
        sortOrder: 2,
        enabled: true,
      }),
    ]);
  });

  it("drops disabled and tombstoned replies", () => {
    expect(
      normalizeQuickRepliesResponse({
        list: [
          { quickReplyId: "a", title: "A", content: "A", enabled: false },
          { quickReplyId: "b", title: "B", content: "B", deletedAt: "2026-01-01" },
          { quickReplyId: "c", title: "C", content: "C", enabled: true },
        ],
      }),
    ).toEqual([expect.objectContaining({ quickReplyId: "c" })]);
  });

  it("filters by current customer-service thread scope", () => {
    const replies = normalizeQuickRepliesResponse([
      { quickReplyId: "all", scope: "all", title: "All", content: "A" },
      { quickReplyId: "temp", scope: "temp_session", title: "Temp", content: "T" },
      { quickReplyId: "direct", scope: "direct_customer", title: "Direct", content: "D" },
    ]);

    expect(filterQuickRepliesForScope(replies, "temp_session").map((item) => item.quickReplyId))
      .toEqual(["all", "temp"]);
    expect(filterQuickRepliesForScope(replies, "direct_customer").map((item) => item.quickReplyId))
      .toEqual(["all", "direct"]);
    expect(filterQuickRepliesForScope(replies, null).map((item) => item.quickReplyId))
      .toEqual(["all"]);
  });

  it("maps thread types and matches keyword across title content category and tags", () => {
    const [reply] = normalizeQuickRepliesResponse([
      {
        quickReplyId: "reply-1",
        category: "入金",
        title: "银行卡",
        content: "请上传凭证",
        tags: ["deposit"],
      },
    ]);

    expect(quickReplyScopeForThreadType("temp_session")).toBe("temp_session");
    expect(quickReplyScopeForThreadType("im_direct")).toBe("direct_customer");
    expect(quickReplyScopeForThreadType("group")).toBeNull();
    expect(quickReplyMatchesKeyword(reply, "deposit")).toBe(true);
    expect(quickReplyMatchesKeyword(reply, "凭证")).toBe(true);
    expect(quickReplyMatchesKeyword(reply, "出金")).toBe(false);
  });
});
