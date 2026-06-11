import { describe, expect, it } from "vitest";

import {
  getCustomerServiceActionPermission,
} from "../../src/renderer/data/customer-service/cs-action-permissions";
import { createCustomerServiceThreadState } from "../../src/renderer/data/customer-service/cs-thread-state";

describe("customer service action permissions", () => {
  it("requires claim before replying to queued threads", () => {
    const state = createCustomerServiceThreadState("queued");

    expect(
      getCustomerServiceActionPermission("claim", { hasThread: true, state }),
    ).toMatchObject({ enabled: true, visible: true, reason: "ok" });
    expect(
      getCustomerServiceActionPermission("send_text", { hasThread: true, state }),
    ).toMatchObject({ enabled: false, visible: true, reason: "requires_claim" });
  });

  it("requires takeover before replying to AI threads", () => {
    const state = createCustomerServiceThreadState("ai_assist");

    expect(
      getCustomerServiceActionPermission("takeover", { hasThread: true, state }),
    ).toMatchObject({ enabled: true, visible: true, reason: "ok" });
    expect(
      getCustomerServiceActionPermission("send_media", { hasThread: true, state }),
    ).toMatchObject({ enabled: false, visible: true, reason: "requires_takeover" });
  });

  it("allows reply and close for serving threads", () => {
    const state = createCustomerServiceThreadState("serving");

    expect(
      getCustomerServiceActionPermission("reply", { hasThread: true, state }),
    ).toMatchObject({ enabled: true, visible: true, reason: "ok" });
    expect(
      getCustomerServiceActionPermission("close", { hasThread: true, state }),
    ).toMatchObject({ enabled: true, visible: true, reason: "ok" });
  });

  it("keeps timeout-closed conversations read-only until explicitly reopened", () => {
    const state = createCustomerServiceThreadState("closed_timeout");

    expect(
      getCustomerServiceActionPermission("send_text", { hasThread: true, state }),
    ).toMatchObject({ enabled: false, visible: false, reason: "readonly" });
    expect(
      getCustomerServiceActionPermission("close", { hasThread: true, state }),
    ).toMatchObject({ enabled: false, visible: false, reason: "readonly" });
  });

  it("allows transfer only for open serving threads", () => {
    const serving = createCustomerServiceThreadState("serving");
    const queued = createCustomerServiceThreadState("queued");

    expect(
      getCustomerServiceActionPermission("transfer", { hasThread: true, state: serving }),
    ).toMatchObject({ enabled: true, visible: true, reason: "ok" });
    expect(
      getCustomerServiceActionPermission("transfer", { hasThread: true, state: queued }),
    ).toMatchObject({ enabled: false, visible: false, reason: "unsupported" });
  });

  it("hides active actions for readonly threads and unsupported actions", () => {
    const state = createCustomerServiceThreadState("closed_by_staff");

    expect(
      getCustomerServiceActionPermission("reply", { hasThread: true, state }),
    ).toMatchObject({ enabled: false, visible: false, reason: "readonly" });
    expect(
      getCustomerServiceActionPermission("transfer", { hasThread: true, state }),
    ).toMatchObject({ enabled: false, visible: false, reason: "readonly" });
  });
});
