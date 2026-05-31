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

  it("exposes contact remark for the customer handling summary", () => {
    const model = buildCustomerModel({
      contact: {
        id: "contact-1",
        kind: "customer",
        name: "测试客户",
        remark: "重点跟进客户",
        subtitle: "",
        tags: [],
      },
    });

    expect(model.remark).toBe("重点跟进客户");
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
});
