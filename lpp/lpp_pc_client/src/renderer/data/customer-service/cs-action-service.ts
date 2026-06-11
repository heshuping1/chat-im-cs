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
  takeoverCustomerServiceThread: (
    threadType: CustomerServiceThreadType,
    threadId: string,
  ) => Promise<{ status?: string; closed?: boolean }>;
  closeCustomerServiceThread: (
    threadType: CustomerServiceThreadType,
    threadId: string,
  ) => Promise<{ status?: string; closed?: boolean }>;
  transferCustomerServiceThread: (
    threadType: CustomerServiceThreadType,
    threadId: string,
    payload: CustomerServiceThreadTransferPayload,
  ) => Promise<{ status?: string; transferred?: boolean }>;
}

export interface ExecuteCustomerServiceThreadActionInput {
  action: CustomerServiceThreadAction;
  client: CustomerServiceThreadActionClient;
  thread: Pick<CustomerServiceThread, "threadId" | "threadType">;
}

export async function executeCustomerServiceThreadAction({
  action,
  client,
  thread,
}: ExecuteCustomerServiceThreadActionInput) {
  if (action === "claim") {
    return client.claimCustomerServiceThread(thread.threadType, thread.threadId);
  }
  if (action === "takeover") {
    return client.takeoverCustomerServiceThread(thread.threadType, thread.threadId);
  }
  return client.closeCustomerServiceThread(thread.threadType, thread.threadId);
}

export async function executeCustomerServiceThreadTransfer({
  client,
  payload,
  thread,
}: {
  client: CustomerServiceThreadActionClient;
  payload: CustomerServiceThreadTransferPayload;
  thread: Pick<CustomerServiceThread, "threadId" | "threadType">;
}) {
  return client.transferCustomerServiceThread(thread.threadType, thread.threadId, payload);
}
