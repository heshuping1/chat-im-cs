import { describe, expect, it, vi } from "vitest";

import {
  executeCustomerServiceThreadAction,
  type CustomerServiceThreadActionClient,
} from "../../src/renderer/data/customer-service/cs-action-service";

describe("executeCustomerServiceThreadAction", () => {
  it("routes claim, takeover and close to the customer service client", async () => {
    const client: CustomerServiceThreadActionClient = {
      claimCustomerServiceThread: vi.fn(async () => ({ status: "serving" })),
      takeoverCustomerServiceThread: vi.fn(async () => ({ status: "serving" })),
      closeCustomerServiceThread: vi.fn(async () => ({ closed: true })),
    };
    const thread = { threadId: "thread-1", threadType: "temp_session" as const };

    await executeCustomerServiceThreadAction({ action: "claim", client, thread });
    await executeCustomerServiceThreadAction({ action: "takeover", client, thread });
    await executeCustomerServiceThreadAction({ action: "close", client, thread });

    expect(client.claimCustomerServiceThread).toHaveBeenCalledWith("temp_session", "thread-1");
    expect(client.takeoverCustomerServiceThread).toHaveBeenCalledWith("temp_session", "thread-1");
    expect(client.closeCustomerServiceThread).toHaveBeenCalledWith("temp_session", "thread-1");
  });
});
