import { describe, expect, it } from "vitest";

import { buildCustomerModel } from "../../src/renderer/components/CustomerProfileModel";

describe("customer profile model business ownership", () => {
  it("does not treat contact group name as channel application", () => {
    const model = buildCustomerModel({
      contact: {
        id: "contact-1",
        kind: "customer",
        name: "测试客户",
        groupName: "默认分组",
      },
    });

    expect(model.appName).toBe("--");
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
