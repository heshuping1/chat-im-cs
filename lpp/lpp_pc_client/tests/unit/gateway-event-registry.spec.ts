import { describe, expect, it } from "vitest";

import {
  customerServiceThreadEventKinds,
  gatewayEvents,
  isCustomerServiceLifecycleEventName,
  isCustomerServiceMessageEventName,
  isCustomerServiceQueueEventName,
  isForceLogoutEventName,
  isImMessageEventName,
  isImReadEventName,
} from "../../src/renderer/data/gateway/gateway-event-registry";

describe("gateway event registry", () => {
  it("keeps gateway subscriptions unique", () => {
    expect(new Set(gatewayEvents).size).toBe(gatewayEvents.length);
  });

  it("classifies IM and auth events", () => {
    expect(isImMessageEventName("msg.new")).toBe(true);
    expect(isImMessageEventName("customer_service.message")).toBe(false);
    expect(isImReadEventName("msg.read")).toBe(true);
    expect(isForceLogoutEventName("auth.device.kicked")).toBe(true);
  });

  it("classifies customer service event groups", () => {
    expect(isCustomerServiceMessageEventName("customer_service.thread.message")).toBe(true);
    expect(isCustomerServiceQueueEventName("customer_service.queue.created")).toBe(true);
    expect(isCustomerServiceLifecycleEventName("customer_service.staff.status_changed")).toBe(true);
    expect(customerServiceThreadEventKinds.get("customer_service.queue.created")).toBe(
      "queue_created",
    );
  });
});
