import type { ContractIssue, ContractStatus } from "./contract-result";

export type ApiContractDiagnosticPhase =
  | "normalize"
  | "validate"
  | "view-model";

export type ApiContractDiagnosticResult =
  | "failed"
  | "invalid"
  | "ok"
  | "degraded";

export interface ApiContractDiagnosticRecord {
  traceId: string;
  module: "api-contract";
  taskId: "P3-API-001C";
  api: string;
  phase: ApiContractDiagnosticPhase;
  result: ApiContractDiagnosticResult;
  timestamp: number;
  issues: Array<Pick<ContractIssue, "code" | "field" | "level">>;
  context?: {
    queryKey?: string;
    conversationId?: string;
    messageId?: string;
    threadId?: string;
    itemCount?: number;
  };
  error?: {
    message: string;
    name?: string;
    code?: string;
  };
}

export interface ApiContractDiagnosticInput {
  api: string;
  phase: ApiContractDiagnosticPhase;
  status: ContractStatus;
  issues?: ContractIssue[];
  context?: ApiContractDiagnosticRecord["context"];
  error?: unknown;
}

const apiContractDiagnosticsFlag = "lpp.apiContractDiagnostics";
const apiContractDiagnosticsMaxRecords = 160;

export function logApiContractDiagnostic(input: ApiContractDiagnosticInput) {
  const record = createApiContractDiagnosticRecord(input);
  const target = apiContractDiagnosticTarget();

  if (target) {
    const current = target.__lppApiContractDiagnostics ?? [];
    target.__lppApiContractDiagnostics = [...current, record].slice(
      -apiContractDiagnosticsMaxRecords,
    );
    if (shouldPrintApiContractDiagnostics(target, record)) {
      console.info("[lpp:api-contract]", record);
    }
  }

  return record;
}

export function createApiContractDiagnosticRecord(
  input: ApiContractDiagnosticInput,
): ApiContractDiagnosticRecord {
  return {
    traceId: createApiContractTraceId(input.phase),
    module: "api-contract",
    taskId: "P3-API-001C",
    api: input.api,
    phase: input.phase,
    result: input.status,
    timestamp: Date.now(),
    issues: summarizeContractIssues(input.issues ?? []),
    context: input.context,
    error: normalizeApiContractDiagnosticError(input.error),
  };
}

export function summarizeContractIssues(issues: ContractIssue[]) {
  return issues.map((issue) => ({
    code: issue.code,
    field: issue.field,
    level: issue.level,
  }));
}

function normalizeApiContractDiagnosticError(
  error: unknown,
): ApiContractDiagnosticRecord["error"] {
  if (!error) return undefined;
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
    };
  }
  return {
    message: String(error),
  };
}

function createApiContractTraceId(phase: ApiContractDiagnosticPhase) {
  return `api-contract-${phase}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function shouldPrintApiContractDiagnostics(
  target: Window,
  record: ApiContractDiagnosticRecord,
) {
  try {
    return (
      record.result === "failed" ||
      record.result === "invalid" ||
      target.localStorage?.getItem(apiContractDiagnosticsFlag) === "1"
    );
  } catch {
    return record.result === "failed" || record.result === "invalid";
  }
}

function apiContractDiagnosticTarget() {
  return typeof window === "undefined" ? null : window;
}
