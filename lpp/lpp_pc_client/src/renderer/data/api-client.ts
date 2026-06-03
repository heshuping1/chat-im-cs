import { AdminApiClient } from "./api/admin-client";

export {
  ApiBaseClient,
  ApiError,
  type ApiClientOptions,
  type ApiEnvelope,
  type PagedResult,
} from "./api/base";
export { endpointPlan } from "./api/endpoints";
export * from "./api/types";
export { AuthApiClient } from "./api/auth-client";
export { ProfileApiClient } from "./api/profile-client";
export { ContactsApiClient } from "./api/contacts-client";
export { MessagesApiClient } from "./api/messages-client";
export { CustomerServiceApiClient } from "./api/customer-service-client";
export { AdminApiClient } from "./api/admin-client";
export { staffServiceHistoryItemToThread } from "./customer-service/cs-history-model";
export { isTerminalCustomerServiceThreadStatus } from "./customer-service/cs-thread-state";

export class ApiClient extends AdminApiClient {}
