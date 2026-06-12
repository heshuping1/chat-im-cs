import type { QueryClient } from "@tanstack/react-query";

import { invalidateCustomerServiceQueries } from "../../data/customer-service/cs-cache-adapter";
import { pcQueryKeys } from "../../data/query-keys";

export async function refreshCustomerServiceSessionNoteQueries(
  queryClient: QueryClient,
  queryBaseKey: readonly [string | undefined, string | undefined],
  sessionId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: pcQueryKeys.customerServiceTempSessionNotes(...queryBaseKey, sessionId),
    }),
    queryClient.invalidateQueries({
      queryKey: pcQueryKeys.customerServiceThreadDetail(
        ...queryBaseKey,
        "temp_session",
        sessionId,
      ),
    }),
    invalidateCustomerServiceQueries(queryClient),
  ]);
}
