/// <reference types="vite/client" />

declare const __LPP_PC_PRODUCT_NAME__: string | undefined;

interface Window {
  __lppTestPushImMessage?: (payload: Record<string, unknown>) => void;
  __lppGatewayDiagnostics?: import("./data/gateway/gateway-diagnostics").GatewayDiagnosticRecord[];
  __lppAuthDiagnostics?: import("./data/auth/auth-diagnostics").AuthDiagnosticRecord[];
  __lppSettingsDiagnostics?: import("./data/settings/settings-diagnostics").SettingsDiagnosticRecord[];
  __lppImReadDiagnostics?: import("./data/im-read/im-read-diagnostics").ImReadDiagnosticRecord[];
  __lppReminderDiagnostics?: import("./data/reminder/reminder-diagnostics").ReminderDiagnosticRecord[];
  __lppApiContractDiagnostics?: import("./data/api-contract/contract-diagnostics").ApiContractDiagnosticRecord[];
  __lppApiErrorDiagnostics?: import("./data/api/api-error-diagnostics").ApiErrorDiagnosticRecord[];
  __lppSendDiagnostics?: import("./data/send/send-state-machine").ChatSendDiagnosticRecord[];
  __lppMessageCenterDiagnostics?: import("./messages/diagnostics/message-center-diagnostics").MessageCenterDiagnosticRecord[];
  __lppCustomerServiceStateDiagnostics?: import("./data/customer-service/cs-thread-state").CustomerServiceThreadStateDiagnosticRecord[];
  __lppCustomerServiceCacheDiagnostics?: import("./data/customer-service/cs-cache-adapter").CustomerServiceCacheDiagnosticRecord[];
  __lppCsRoutingDiagnostics?: import("../shared/desktop-api").CsRoutingDiagnosticPayload[];
  __lppStartupDiagnostics?: import("./data/performance/startup-performance").StartupDiagnosticRecord[];
  __lppRuntimeErrorDiagnostics?: import("./data/diagnostics/runtime-error-diagnostics").RuntimeErrorDiagnosticRecord[];
}
