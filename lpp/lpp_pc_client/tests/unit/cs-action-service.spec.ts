import { describe, expect, it, vi } from "vitest";

import {
  executeCustomerServiceThreadAction,
  executeCustomerServiceThreadTransfer,
  type CustomerServiceThreadActionClient,
} from "../../src/renderer/data/customer-service/cs-action-service";

describe("executeCustomerServiceThreadAction", () => {
  it("routes claim, takeover and close to the customer service client", async () => {
    const client: CustomerServiceThreadActionClient = {
      claimCustomerServiceThread: vi.fn(async () => ({ status: "serving" })),
      takeoverCustomerServiceThread: vi.fn(async () => ({ status: "serving" })),
      closeCustomerServiceThread: vi.fn(async () => ({ closed: true })),
      transferCustomerServiceThread: vi.fn(async () => ({ transferred: true })),
    };
    const thread = { threadId: "thread-1", threadType: "temp_session" as const };

    await executeCustomerServiceThreadAction({ action: "claim", client, thread });
    await executeCustomerServiceThreadAction({ action: "takeover", client, thread });
    await executeCustomerServiceThreadAction({ action: "close", client, thread });

    expect(client.claimCustomerServiceThread).toHaveBeenCalledWith("temp_session", "thread-1");
    expect(client.takeoverCustomerServiceThread).toHaveBeenCalledWith("temp_session", "thread-1");
    expect(client.closeCustomerServiceThread).toHaveBeenCalledWith("temp_session", "thread-1");
  });

  it("routes transfer payload to the customer service client", async () => {
    const client: CustomerServiceThreadActionClient = {
      claimCustomerServiceThread: vi.fn(async () => ({ status: "serving" })),
      takeoverCustomerServiceThread: vi.fn(async () => ({ status: "serving" })),
      closeCustomerServiceThread: vi.fn(async () => ({ closed: true })),
      transferCustomerServiceThread: vi.fn(async () => ({ transferred: true })),
    };
    const thread = { threadId: "thread-1", threadType: "im_direct" as const };
    const payload = { reason: "needs specialist", toStaffUserId: "staff-2" };

    await executeCustomerServiceThreadTransfer({ client, payload, thread });

    expect(client.transferCustomerServiceThread).toHaveBeenCalledWith(
      "im_direct",
      "thread-1",
      payload,
    );
  });
});
