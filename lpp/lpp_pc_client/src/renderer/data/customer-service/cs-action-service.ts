import type { CustomerServiceThread, CustomerServiceThreadType } from "../api/types";

export type CustomerServiceThreadAction = "claim" | "takeover" | "close";

export interface CustomerServiceThreadTransferPayload {
  reason?: string;
  toStaffUserId: string;
}

export interface CustomerServiceThreadActionClient {
  claimCustomerServiceThread: (
    threadType: CustomerServiceThreadType,
    threadId: string,
  ) => Promise<{ status?: string; closed?: boolean }>;
  claimCustomerServiceThreadAsManager: (
    threadType: CustomerServiceThreadType,
    threadId: string,
  ) => Promise<{ status?: string; closed?: boolean }>;
  takeoverCustomerServiceThread: (
    threadType: CustomerServiceThreadType,
    threadId: string,
  ) => Promise<{ status?: string; closed?: boolean }>;
  takeoverCustomerServiceThreadAsManager: (
    threadType: CustomerServiceThreadType,
    threadId: string,
  ) => Promise<{ status?: string; closed?: boolean }>;
  closeCustomerServiceThread: (
    threadType: CustomerServiceThreadType,
    threadId: string,
  ) => Promise<{ status?: string; closed?: boolean }>;
  forceCloseCustomerServiceThread: (
    threadType: CustomerServiceThreadType,
    threadId: string,
  ) => Promise<{ status?: string; closed?: boolean }>;
  freezeCustomerServiceThread?: (
    threadType: CustomerServiceThreadType,
    threadId: string,
  ) => Promise<{ status?: string; frozen?: boolean; isFrozen?: boolean }>;
  unfreezeCustomerServiceThread?: (
    threadType: CustomerServiceThreadType,
    threadId: string,
  ) => Promise<{ status?: string; frozen?: boolean; isFrozen?: boolean }>;
  transferCustomerServiceThread: (
    threadType: CustomerServiceThreadType,
    threadId: string,
    payload: CustomerServiceThreadTransferPayload,
  ) => Promise<{ status?: string; transferred?: boolean }>;
  assignCustomerServiceThread: (
    threadType: CustomerServiceThreadType,
    threadId: string,
    payload: { staffUserId: string },
  ) => Promise<{ status?: string; assignedStaffUserId?: string | null }>;
}

export interface ExecuteCustomerServiceThreadActionInput {
  action: CustomerServiceThreadAction;
  client: CustomerServiceThreadActionClient;
  mode?: "staff" | "management";
  thread: Pick<CustomerServiceThread, "threadId" | "threadType">;
}

export async function executeCustomerServiceThreadAction({
  action,
  client,
  mode = "staff",
  thread,
}: ExecuteCustomerServiceThreadActionInput) {
  if (action === "claim") {
    if (mode === "management") {
      throw new Error("Management claim is not supported. Assign the conversation to an agent instead.");
    }
    return client.claimCustomerServiceThread(thread.threadType, thread.threadId);
  }
  if (action === "takeover") {
    if (mode === "management") {
      throw new Error("Management takeover is not supported. Assign the conversation to an agent instead.");
    }
    return client.takeoverCustomerServiceThread(thread.threadType, thread.threadId);
  }
  if (mode === "management") {
    return client.forceCloseCustomerServiceThread(thread.threadType, thread.threadId);
  }
  return client.closeCustomerServiceThread(thread.threadType, thread.threadId);
}

export async function executeCustomerServiceThreadTransfer({
  client,
  mode = "staff",
  payload,
  thread,
}: {
  client: CustomerServiceThreadActionClient;
  mode?: "staff" | "management";
  payload: CustomerServiceThreadTransferPayload;
  thread: Pick<CustomerServiceThread, "threadId" | "threadType">;
}) {
  if (mode === "management") {
    return client.assignCustomerServiceThread(thread.threadType, thread.threadId, {
      staffUserId: payload.toStaffUserId,
    });
  }
  return client.transferCustomerServiceThread(thread.threadType, thread.threadId, payload);
}
