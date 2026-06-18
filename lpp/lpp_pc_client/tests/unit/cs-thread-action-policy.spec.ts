import { describe, expect, it } from "vitest";

import { resolveCustomerServiceThreadActionPolicy } from "../../src/renderer/data/customer-service/cs-thread-action-policy";
import { createCustomerServiceThreadState } from "../../src/renderer/data/customer-service/cs-thread-state";

describe("customer-service thread action policy", () => {
  it("allows customer-service staff to claim queued conversations", () => {
    const policy = resolveCustomerServiceThreadActionPolicy({
      hasThread: true,
      session: { membershipRole: 2 },
      state: createCustomerServiceThreadState("queued"),
    });

    expect(policy.claim).toMatchObject({
      enabled: true,
      mode: "staff",
      visible: true,
    });
    expect(policy.assign.enabled).toBe(false);
  });

  it("allows managers to assign and close live conversations without claim access", () => {
    const queuedPolicy = resolveCustomerServiceThreadActionPolicy({
      hasThread: true,
      session: { membershipRole: 3 },
      state: createCustomerServiceThreadState("queued"),
    });
    const servingPolicy = resolveCustomerServiceThreadActionPolicy({
      hasThread: true,
      session: { membershipRole: 3 },
      state: createCustomerServiceThreadState("serving"),
    });

    expect(queuedPolicy.claim).toMatchObject({
      enabled: false,
      reason: "requires_staff",
      visible: false,
    });
    expect(queuedPolicy.assign).toMatchObject({
      enabled: true,
      mode: "management",
      visible: true,
    });
    expect(servingPolicy.close).toMatchObject({
      enabled: true,
      mode: "management",
      visible: true,
    });
    expect(servingPolicy.transferDialog).toMatchObject({
      enabled: true,
      mode: "assign",
    });
  });

  it("does not allow staff or managers to mutate readonly history conversations", () => {
    const policy = resolveCustomerServiceThreadActionPolicy({
      hasThread: true,
      session: { membershipRole: 4 },
      state: createCustomerServiceThreadState("closed"),
    });

    expect(policy.assign.enabled).toBe(false);
    expect(policy.close.enabled).toBe(false);
    expect(policy.transferDialog.enabled).toBe(false);
  });
});
