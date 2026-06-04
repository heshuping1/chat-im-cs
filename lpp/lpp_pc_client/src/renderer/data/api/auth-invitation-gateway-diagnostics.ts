import type { DiagnosticsJsonValue, MessageReminderDiagnosticPayload } from "../../../shared/desktop-api";
import { recordMessageReminderDiagnostic } from "../diagnostics/message-reminder-diagnostics";
import { normalizeApiError } from "./api-error-model";
import type { PlatformInvitationPreviewDto, TenantAuthResult } from "./types";

export type AuthInvitationGatewayRoute =
  | "platform-invitation"
  | "platform-invitation-accept";

export type AuthInvitationGatewayPhase = "request" | "response";

export interface AuthInvitationGatewayDiagnosticInput {
  code: string;
  endpointTemplate: string;
  error?: unknown;
  hasPlatformToken: boolean;
  method: "GET" | "POST";
  phase: AuthInvitationGatewayPhase;
  response?: PlatformInvitationPreviewDto | TenantAuthResult;
  route: AuthInvitationGatewayRoute;
}

export function recordAuthInvitationGatewayDiagnostic(
  input: AuthInvitationGatewayDiagnosticInput,
) {
  recordMessageReminderDiagnostic(createAuthInvitationGatewayDiagnostic(input));
}

export function createAuthInvitationGatewayDiagnostic(
  input: AuthInvitationGatewayDiagnosticInput,
): Omit<MessageReminderDiagnosticPayload, "at" | "classification" | "summary"> & {
  classification: Record<string, DiagnosticsJsonValue>;
  result: "failed" | "request" | "success";
  summary: Record<string, DiagnosticsJsonValue>;
} {
  const error = input.error ? normalizeApiError(input.error) : undefined;
  const result = error ? "failed" : input.phase === "request" ? "request" : "success";
  const codeFingerprint = invitationCodeFingerprint(input.code);
  const responseSummary = error
    ? compactDiagnosticRecord({
        errorCode: error.code,
        message: error.message,
        requestId: error.requestId,
        status: error.status,
        userMessage: error.userMessage,
      })
    : summarizeInvitationResponse(input.response);

  return {
    event: input.route === "platform-invitation-accept"
      ? "auth.invitation.accept"
      : "auth.invitation.preview",
    source: "auth-api-gateway",
    phase: input.phase,
    result,
    route: input.route,
    classification: compactDiagnosticRecord({
      codeFingerprint,
      endpoint: input.endpointTemplate,
      errorCode: error?.code,
      method: input.method,
      platformSessionPresent: input.hasPlatformToken,
      requestId: error?.requestId,
      result,
      status: error?.status,
    }),
    summary: compactDiagnosticRecord({
      request: compactDiagnosticRecord({
        bodyShape: input.method === "POST" ? "empty-object" : undefined,
        codeFingerprint,
        endpoint: input.endpointTemplate,
        method: input.method,
      }),
      response: responseSummary,
    }),
  };
}

export function invitationCodeFingerprint(code: string) {
  const normalized = code.trim();
  return `[invitation-code len=${normalized.length} hash=${fnv1a32(normalized)}]`;
}

function summarizeInvitationResponse(response: PlatformInvitationPreviewDto | TenantAuthResult | undefined) {
  if (!response || typeof response !== "object") return undefined;
  return compactDiagnosticRecord({
    alreadyMember: "alreadyMember" in response ? response.alreadyMember : undefined,
    displayNamePresent: "displayName" in response ? Boolean(response.displayName) : undefined,
    hasAccessToken: "accessToken" in response ? Boolean(response.accessToken) : undefined,
    hasTenantCode: "tenantCode" in response ? Boolean(response.tenantCode) : undefined,
    hasTenantName: "tenantName" in response ? Boolean(response.tenantName) : undefined,
    identityMatched: "identityMatched" in response ? response.identityMatched : undefined,
    lppIdPresent: "lppId" in response ? Boolean(response.lppId) : undefined,
    membershipRole: "membershipRole" in response ? response.membershipRole : undefined,
    platformUserIdPresent: "platformUserId" in response ? Boolean(response.platformUserId) : undefined,
    spaceType: "spaceContext" in response ? response.spaceContext?.spaceType : undefined,
    targetMembershipRole: "targetMembershipRole" in response ? response.targetMembershipRole : undefined,
    tenantIdPresent: Boolean(response.tenantId),
    userIdPresent: "userId" in response ? Boolean(response.userId) : undefined,
  });
}

function compactDiagnosticRecord(record: Record<string, unknown>): Record<string, DiagnosticsJsonValue> {
  return Object.fromEntries(
    Object.entries(record)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [
        key,
        isDiagnosticsJsonValue(value) ? value : String(value),
      ]),
  );
}

function isDiagnosticsJsonValue(value: unknown): value is DiagnosticsJsonValue {
  if (value === null) return true;
  if (["string", "number", "boolean"].includes(typeof value)) return true;
  if (Array.isArray(value)) return value.every(isDiagnosticsJsonValue);
  if (!value || typeof value !== "object") return false;
  return Object.values(value).every(isDiagnosticsJsonValue);
}

function fnv1a32(value: string) {
  let hash = 0x811c9dc5;
  let reverseHash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
    reverseHash ^= value.charCodeAt(value.length - index - 1);
    reverseHash = Math.imul(reverseHash, 0x01000193);
  }
  return `${(hash >>> 0).toString(16).padStart(8, "0")}${(reverseHash >>> 0)
    .toString(16)
    .padStart(8, "0")}`.slice(0, 12);
}
