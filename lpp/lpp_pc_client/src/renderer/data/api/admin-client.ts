import type { EnterpriseBroadcastPreview } from "./types";
import { CustomerServiceApiClient } from "./customer-service-client";
import { endpointPlan } from "./endpoints";

export class AdminApiClient extends CustomerServiceApiClient {
  reportClientError(body: Record<string, unknown>) {
    return this.request<{ errorId: string }>(endpointPlan.clientErrors, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  previewEnterpriseBroadcast(body: Record<string, unknown>) {
    return this.request<EnterpriseBroadcastPreview>(
      endpointPlan.enterpriseBroadcastPreview,
      { method: "POST", body: JSON.stringify(body) },
      true,
    );
  }
}
