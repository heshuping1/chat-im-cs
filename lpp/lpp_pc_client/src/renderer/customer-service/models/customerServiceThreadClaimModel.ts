import type { QueryClient } from "@tanstack/react-query";

import type { CustomerServiceThread } from "../../data/api-client";
import { markCustomerServiceThreadClaimed } from "../../data/customer-service/cs-cache-adapter";

export function applyClaimedCustomerServiceThread(
  queryClient: QueryClient,
  thread: CustomerServiceThread,
  result: { status?: string },
) {
  markCustomerServiceThreadClaimed(queryClient, thread, result);
}
