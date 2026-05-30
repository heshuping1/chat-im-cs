export type ContractStatus = "ok" | "degraded" | "invalid" | "failed";

export type ContractIssueLevel = "info" | "warning" | "error";

export interface ContractIssue {
  code: string;
  level: ContractIssueLevel;
  field?: string;
  message?: string;
}

export interface ContractError {
  name?: string;
  message: string;
  code?: string;
}

export interface ContractResult<T> {
  status: ContractStatus;
  data?: T;
  issues: ContractIssue[];
  error?: ContractError;
}

export function okContract<T>(
  data: T,
  issues: ContractIssue[] = [],
): ContractResult<T> {
  return {
    status: issues.length ? "degraded" : "ok",
    data,
    issues: uniqueContractIssues(issues),
  };
}

export function degradedContract<T>(
  data: T,
  issues: ContractIssue[],
): ContractResult<T> {
  return {
    status: "degraded",
    data,
    issues: uniqueContractIssues(issues),
  };
}

export function invalidContract<T = never>(
  issues: ContractIssue[],
): ContractResult<T> {
  return {
    status: "invalid",
    issues: uniqueContractIssues(issues),
  };
}

export function failedContract<T = never>(
  error: unknown,
  issues: ContractIssue[] = [],
): ContractResult<T> {
  return {
    status: "failed",
    issues: uniqueContractIssues(issues),
    error: normalizeContractError(error),
  };
}

export function createContractIssue(
  code: string,
  level: ContractIssueLevel,
  options: Omit<ContractIssue, "code" | "level"> = {},
): ContractIssue {
  return {
    code,
    level,
    ...options,
  };
}

export function hasContractErrorIssue(issues: ContractIssue[]) {
  return issues.some((issue) => issue.level === "error");
}

export function uniqueContractIssues(issues: ContractIssue[]) {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.level}|${issue.code}|${issue.field ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeContractError(error: unknown): ContractError {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }
  return {
    message: String(error),
  };
}
