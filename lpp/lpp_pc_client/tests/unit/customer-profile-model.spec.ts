import { describe, expect, it } from "vitest";

import { buildCustomerModel } from "../../src/renderer/components/CustomerProfileModel";

describe("customer profile model business ownership", () => {
  it("does not treat contact group name as channel application", () => {
    const model = buildCustomerModel({
      contact: {
        id: "contact-1",
        kind: "customer",
        name: "测试客户",
        remark: "",
        subtitle: "",
        tags: [],
        groupName: "默认分组",
      },
    });

    expect(model.appName).toBe("--");
  });

  it("does not use contact source fallback as the customer source channel", () => {
    const model = buildCustomerModel({
      contact: {
        id: "contact-1",
        kind: "customer",
        name: "测试客户",
        remark: "",
        source: "客户通讯录",
        subtitle: "",
        tags: [],
      },
    });

    expect(model.source).toBe("--");
  });

  it("uses only real profile source fields for the customer source channel", () => {
    expect(
      buildCustomerModel({
        profileExtra: {
          friendUserId: "u2",
          source: "小程序",
        },
      }).source,
    ).toBe("小程序");
    expect(
      buildCustomerModel({
        profile: {
          sourceChannel: "web",
        },
      }).source,
    ).toBe("网页");
  });

  it("uses profile extra note as the private customer handling remark", () => {
    const model = buildCustomerModel({
      contact: {
        id: "contact-1",
        kind: "customer",
        name: "测试客户",
        remark: "联系人备注名",
        subtitle: "",
        tags: [],
      },
      profileExtra: {
        friendUserId: "u2",
        note: "重点跟进客户",
      },
    });

    expect(model.remark).toBe("重点跟进客户");
  });

  it("does not use contact remark fallback as private handling remark", () => {
    const model = buildCustomerModel({
      contact: {
        id: "contact-1",
        kind: "customer",
        name: "测试客户",
        remark: "添加于 2026-05-31",
        subtitle: "",
        tags: [],
      },
    });

    expect(model.remark).toBe("--");
  });

  it("exposes direct conversation peer id for friend profile edits", () => {
    const model = buildCustomerModel({
      conversation: {
        conversationId: "c1",
        conversationType: "direct",
        title: "测试客户",
        peerUserId: "u2",
      },
    });

    expect(model.friendUserId).toBe("u2");
  });

  it("uses real profile application and assigned staff fields when provided", () => {
    const model = buildCustomerModel({
      profile: {
        appName: "真实渠道应用",
        assignedAgentName: "客服 A",
        displayName: "测试客户",
      },
    });

    expect(model.appName).toBe("真实渠道应用");
    expect(model.assignedStaff).toBe("客服 A");
  });

  it("keeps fixed customer 360 layout slots when profile data is sparse", () => {
    const model = buildCustomerModel({
      profile: {
        customerUserId: "u1",
        displayName: "测试客户A",
      },
    });

    expect(model.registrationStatus).toBe("未注册");
    expect(model.activationStatus).toBe("未激活");
    expect(model.verificationStatus).toBe("未认证");
    expect(model.statusChips).toHaveLength(3);
    expect(model.statusChips.map((chip) => chip.label)).toEqual([
      "未注册",
      "未激活",
      "未认证",
    ]);
    expect(model.assetRows).toHaveLength(4);
    expect(model.assetRows.every((row) => row.empty)).toBe(true);
    expect(model.assetRows.map((row) => row.amount)).toEqual(["--", "--", "--", "--"]);
    expect(model.recent7dTrading.bars).toHaveLength(7);
    expect(model.recent7dTrading.bars.every((bar) => bar.empty)).toBe(true);
    expect(model.recent7dTrading.latest).toBe("--");
  });

  it("keeps VIP as identity level and removes duplicate VIP tags", () => {
    const model = buildCustomerModel({
      profile: {
        isVip: true,
        tags: ["VIP", "活跃用户", "黄金客户"],
      },
    });

    expect(model.vipLevel).toBe("VIP");
    expect(model.tags).toEqual(["活跃用户", "黄金客户"]);
  });

  it("separates IB relationship from VIP level", () => {
    const model = buildCustomerModel({
      profile: {
        ib: "IB-008",
        customerLevel: "VIP",
      },
    });

    expect(model.hasAgentRelationship).toBe(true);
    expect(model.vipLevel).toBe("VIP");
  });

  it("normalizes activation and verification status for customer status chips", () => {
    const model = buildCustomerModel({
      profile: {
        accountStatus: "active",
        kycStatus: "verified",
      },
    });

    expect(model.activationStatus).toBe("已激活");
    expect(model.verificationStatus).toBe("已认证");
  });

  it("falls back missing IM presence to offline instead of an empty marker", () => {
    const model = buildCustomerModel({
      profile: {
        displayName: "测试客户A",
      },
    });

    expect(model.onlineStatus).toBe("离线");
  });

  it("derives registered status from registration time", () => {
    const model = buildCustomerModel({
      profile: {
        registeredAt: "2026-05-31T10:20:00Z",
      },
    });

    expect(model.registrationStatus).toBe("已注册");
    expect(model.statusChips.map((chip) => chip.label)).toEqual([
      "已注册",
      "未激活",
      "未认证",
    ]);
  });

  it("normalizes asset structure and recent seven day trading summaries", () => {
    const model = buildCustomerModel({
      profile: {
        assetMix: [
          { name: "黄金", percent: 45, amount: "$12,852" },
          { name: "外汇", percent: "35%", amount: "$9,996" },
        ],
        tradingSummary: {
          recent7dTrading: {
            deposit: "$5,200",
            withdrawal: "$2,300",
            volume: "$18,650",
            days: [
              { label: "5/12", value: 100 },
              { label: "5/13", value: 200 },
            ],
          },
          latestTrade: {
            symbol: "XAUUSD",
            lot: 0.8,
            profit: "盈利 $326",
          },
        },
      } as never,
    });

    expect(model.assetMix).toHaveLength(2);
    expect(model.assetRows).toHaveLength(4);
    expect(model.assetRows[0]).toMatchObject({
      amount: "$12,852",
      empty: false,
      name: "黄金",
      percentLabel: "45%",
    });
    expect(model.assetRows[2]).toMatchObject({ empty: true, name: "指数" });
    expect(model.assetMix[0]).toMatchObject({ name: "黄金", percent: 45 });
    expect(model.recent7dTrading.deposit).toBe("$5,200");
    expect(model.recent7dTrading.days).toHaveLength(2);
    expect(model.recent7dTrading.bars).toHaveLength(7);
    expect(model.recent7dTrading.bars[0]).toMatchObject({ empty: false, label: "5/12" });
    expect(model.recent7dTrading.bars[2]).toMatchObject({ empty: true });
    expect(model.recent7dTrading.latest).toContain("XAUUSD");
  });
});
