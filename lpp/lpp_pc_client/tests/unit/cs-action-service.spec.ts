import { describe, expect, it, vi } from "vitest";

import {
  executeCustomerServiceThreadAction,
  executeCustomerServiceThreadTransfer,
  type CustomerServiceThreadActionClient,
} from "../../src/renderer/data/customer-service/cs-action-service";

describe("executeCustomerServiceThreadAction", () => {
  it("routes claim, takeover and close to the customer service client", async () => {
    const client: CustomerServiceThreadActionClient = {
      assignCustomerServiceThread: vi.fn(async () => ({ assignedStaffUserId: "staff-2" })),
      claimCustomerServiceThread: vi.fn(async () => ({ status: "serving" })),
      claimCustomerServiceThreadAsManager: vi.fn(async () => ({ status: "serving" })),
      takeoverCustomerServiceThread: vi.fn(async () => ({ status: "serving" })),
      takeoverCustomerServiceThreadAsManager: vi.fn(async () => ({ status: "serving" })),
      closeCustomerServiceThread: vi.fn(async () => ({ closed: true })),
      forceCloseCustomerServiceThread: vi.fn(async () => ({ closed: true })),
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

  it("routes management close to the admin force close client", async () => {
    const client: CustomerServiceThreadActionClient = {
      assignCustomerServiceThread: vi.fn(async () => ({ assignedStaffUserId: "staff-2" })),
      claimCustomerServiceThread: vi.fn(async () => ({ status: "serving" })),
      claimCustomerServiceThreadAsManager: vi.fn(async () => ({ status: "serving" })),
      takeoverCustomerServiceThread: vi.fn(async () => ({ status: "serving" })),
      takeoverCustomerServiceThreadAsManager: vi.fn(async () => ({ status: "serving" })),
      closeCustomerServiceThread: vi.fn(async () => ({ closed: true })),
      forceCloseCustomerServiceThread: vi.fn(async () => ({ closed: true })),
      transferCustomerServiceThread: vi.fn(async () => ({ transferred: true })),
    };
    const thread = { threadId: "thread-1", threadType: "temp_session" as const };

    await executeCustomerServiceThreadAction({ action: "close", client, mode: "management", thread });

    expect(client.forceCloseCustomerServiceThread).toHaveBeenCalledWith("temp_session", "thread-1");
    expect(client.closeCustomerServiceThread).not.toHaveBeenCalled();
  });

  it("rejects management claim and takeover because managers should assign instead", async () => {
    const client: CustomerServiceThreadActionClient = {
      assignCustomerServiceThread: vi.fn(async () => ({ assignedStaffUserId: "staff-2" })),
      claimCustomerServiceThread: vi.fn(async () => ({ status: "serving" })),
      claimCustomerServiceThreadAsManager: vi.fn(async () => ({ status: "serving" })),
      takeoverCustomerServiceThread: vi.fn(async () => ({ status: "serving" })),
      takeoverCustomerServiceThreadAsManager: vi.fn(async () => ({ status: "serving" })),
      closeCustomerServiceThread: vi.fn(async () => ({ closed: true })),
      forceCloseCustomerServiceThread: vi.fn(async () => ({ closed: true })),
      transferCustomerServiceThread: vi.fn(async () => ({ transferred: true })),
    };
    const thread = { threadId: "thread-1", threadType: "temp_session" as const };

    await expect(
      executeCustomerServiceThreadAction({ action: "claim", client, mode: "management", thread }),
    ).rejects.toThrow("Management claim is not supported");
    await expect(
      executeCustomerServiceThreadAction({ action: "takeover", client, mode: "management", thread }),
    ).rejects.toThrow("Management takeover is not supported");

    expect(client.claimCustomerServiceThreadAsManager).not.toHaveBeenCalled();
    expect(client.takeoverCustomerServiceThreadAsManager).not.toHaveBeenCalled();
    expect(client.assignCustomerServiceThread).not.toHaveBeenCalled();
    expect(client.claimCustomerServiceThread).not.toHaveBeenCalled();
    expect(client.takeoverCustomerServiceThread).not.toHaveBeenCalled();
  });

  it("routes transfer payload to the customer service client", async () => {
    const client: CustomerServiceThreadActionClient = {
      assignCustomerServiceThread: vi.fn(async () => ({ assignedStaffUserId: "staff-2" })),
      claimCustomerServiceThread: vi.fn(async () => ({ status: "serving" })),
      claimCustomerServiceThreadAsManager: vi.fn(async () => ({ status: "serving" })),
      takeoverCustomerServiceThread: vi.fn(async () => ({ status: "serving" })),
      takeoverCustomerServiceThreadAsManager: vi.fn(async () => ({ status: "serving" })),
      closeCustomerServiceThread: vi.fn(async () => ({ closed: true })),
      forceCloseCustomerServiceThread: vi.fn(async () => ({ closed: true })),
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

  it("routes management transfer to the admin assign client", async () => {
    const client: CustomerServiceThreadActionClient = {
      assignCustomerServiceThread: vi.fn(async () => ({ assignedStaffUserId: "staff-2" })),
      claimCustomerServiceThread: vi.fn(async () => ({ status: "serving" })),
      claimCustomerServiceThreadAsManager: vi.fn(async () => ({ status: "serving" })),
      takeoverCustomerServiceThread: vi.fn(async () => ({ status: "serving" })),
      takeoverCustomerServiceThreadAsManager: vi.fn(async () => ({ status: "serving" })),
      closeCustomerServiceThread: vi.fn(async () => ({ closed: true })),
      forceCloseCustomerServiceThread: vi.fn(async () => ({ closed: true })),
      transferCustomerServiceThread: vi.fn(async () => ({ transferred: true })),
    };
    const thread = { threadId: "thread-1", threadType: "im_direct" as const };
    const payload = { reason: "needs specialist", toStaffUserId: "staff-2" };

    await executeCustomerServiceThreadTransfer({ client, mode: "management", payload, thread });

    expect(client.assignCustomerServiceThread).toHaveBeenCalledWith(
      "im_direct",
      "thread-1",
      { staffUserId: "staff-2" },
    );
    expect(client.transferCustomerServiceThread).not.toHaveBeenCalled();
  });
});
