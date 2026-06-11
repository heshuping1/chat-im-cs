import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import type { CustomerServiceQuickReplyDto } from "../../src/renderer/data/api/types";
import { createQuickReplyPickerViewModel } from "../../src/renderer/customer-service/components/CustomerServiceQuickReplyDrawer";

describe("quick reply picker view model", () => {
  const pickerSource = readFileSync(
    resolve(
      process.cwd(),
      "src/renderer/customer-service/components/CustomerServiceQuickReplyDrawer.tsx",
    ),
    "utf8",
  );

  it("inserts a quick reply directly from a list item double click", () => {
    expect(pickerSource).toContain("onInsert={() => insertReply(reply)}");
    expect(pickerSource).toContain("onDoubleClick={onInsert}");
  });

  it("derives scoped all replies, categories and selected reply", () => {
    const vm = createQuickReplyPickerViewModel({
      filter: "all",
      keyword: "",
      recentIds: [],
      replies: replies(),
      scope: "direct_customer",
      selectedId: "direct-1",
    });

    expect(vm.totalCount).toBe(3);
    expect(vm.visibleReplies.map((reply) => reply.quickReplyId)).toEqual([
      "all-1",
      "direct-1",
      "direct-2",
    ]);
    expect(vm.categories).toEqual(["通用", "售后", "开场"]);
    expect(vm.categoryCounts).toEqual({ 开场: 1, 售后: 1, 通用: 1 });
    expect(vm.filterItems).toEqual([
      { count: 3, key: "all", label: "全部" },
      { count: 3, disabled: false, key: "current", label: "当前场景" },
      { count: 0, disabled: true, key: "recent", label: "最近使用" },
      { count: 1, key: "category:通用", label: "通用" },
      { count: 1, key: "category:售后", label: "售后" },
      { count: 1, key: "category:开场", label: "开场" },
    ]);
    expect(vm.filterLabel).toBe("全部");
    expect(vm.selectedReply?.quickReplyId).toBe("direct-1");
    expect(vm.emptyState).toBeUndefined();
  });

  it("filters by current scene, category, recent ids and search keyword", () => {
    expect(
      createQuickReplyPickerViewModel({
        filter: "current",
        keyword: "",
        recentIds: [],
        replies: replies(),
        scope: "temp_session",
      }).visibleReplies.map((reply) => reply.quickReplyId),
    ).toEqual(["all-1", "temp-1"]);

    expect(
      createQuickReplyPickerViewModel({
        filter: "category:售后",
        keyword: "",
        recentIds: [],
        replies: replies(),
        scope: "direct_customer",
      }),
    ).toMatchObject({
      filterLabel: "售后",
      visibleReplies: [{ quickReplyId: "direct-1" }],
    });

    expect(
      createQuickReplyPickerViewModel({
        filter: "recent",
        keyword: "",
        recentIds: ["missing", "direct-2", "all-1"],
        replies: replies(),
        scope: "direct_customer",
      }),
    ).toMatchObject({
      filterItems: expect.arrayContaining([
        { count: 2, disabled: false, key: "recent", label: "最近使用" },
      ]),
      filterLabel: "最近使用",
      visibleReplies: [{ quickReplyId: "direct-2" }, { quickReplyId: "all-1" }],
    });

    expect(
      createQuickReplyPickerViewModel({
        filter: "all",
        keyword: "物流",
        recentIds: [],
        replies: replies(),
        scope: "direct_customer",
      }).visibleReplies.map((reply) => reply.quickReplyId),
    ).toEqual(["direct-1"]);
  });

  it("falls back selection to first visible reply when selected item disappears", () => {
    const vm = createQuickReplyPickerViewModel({
      filter: "all",
      keyword: "",
      recentIds: [],
      replies: replies(),
      scope: "direct_customer",
      selectedId: "temp-1",
    });

    expect(vm.selectedReply?.quickReplyId).toBe("all-1");
  });

  it("derives loading, error, empty and no-match states without fallback data", () => {
    expect(
      createQuickReplyPickerViewModel({
        filter: "all",
        keyword: "",
        loading: true,
        recentIds: [],
        replies: [],
        scope: "direct_customer",
      }).emptyState,
    ).toMatchObject({ text: "正在读取快捷话术..." });

    expect(
      createQuickReplyPickerViewModel({
        errorText: "network",
        filter: "all",
        keyword: "",
        recentIds: [],
        replies: [],
        scope: "direct_customer",
      }).emptyState,
    ).toMatchObject({ text: "话术加载失败：network", tone: "error" });

    expect(
      createQuickReplyPickerViewModel({
        filter: "all",
        keyword: "",
        recentIds: [],
        replies: [],
        scope: "direct_customer",
      }).emptyState,
    ).toMatchObject({ text: "当前会话暂无可用话术。" });

    expect(
      createQuickReplyPickerViewModel({
        filter: "all",
        keyword: "不存在",
        recentIds: [],
        replies: replies(),
        scope: "direct_customer",
      }).emptyState,
    ).toMatchObject({ text: "没有匹配“不存在”的话术。" });
  });
});

function replies(): CustomerServiceQuickReplyDto[] {
  return [
    reply({
      category: "通用",
      content: "您好，这里是在线客服。",
      quickReplyId: "all-1",
      scope: "all",
      tags: ["开场", "通用"],
      title: "标准欢迎语",
    }),
    reply({
      category: "售后",
      content: "我来帮您核对物流进度。",
      quickReplyId: "direct-1",
      scope: "direct_customer",
      tags: ["物流"],
      title: "售后跟进",
    }),
    reply({
      category: "开场",
      content: "上次的问题我会继续跟进。",
      quickReplyId: "direct-2",
      scope: "direct_customer",
      tags: ["回访"],
      title: "客户回访",
    }),
    reply({
      category: "处理",
      content: "问题已进入处理流程。",
      quickReplyId: "temp-1",
      scope: "temp_session",
      tags: ["进度"],
      title: "处理中",
    }),
  ];
}

function reply(overrides: Partial<CustomerServiceQuickReplyDto>): CustomerServiceQuickReplyDto {
  return {
    category: "通用",
    content: "content",
    quickReplyId: "reply",
    scope: "all",
    tags: [],
    title: "title",
    ...overrides,
  };
}
