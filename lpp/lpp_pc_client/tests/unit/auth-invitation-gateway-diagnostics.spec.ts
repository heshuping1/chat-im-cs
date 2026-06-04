import { describe, expect, it } from "vitest";

import { ApiError } from "../../src/renderer/data/api-client";
import {
  createAuthInvitationGatewayDiagnostic,
  invitationCodeFingerprint,
} from "../../src/renderer/data/api/auth-invitation-gateway-diagnostics";

describe("auth invitation API gateway diagnostics", () => {
  it("records invitation preview requests without leaking the raw code", () => {
    const record = createAuthInvitationGatewayDiagnostic({
      code: "5BC4B6A19CF80546",
      endpointTemplate: "/api/platform/v1/invitations/{code}",
      hasPlatformToken: false,
      method: "GET",
      phase: "request",
      route: "platform-invitation",
    });

    expect(record).toMatchObject({
      event: "auth.invitation.preview",
      source: "auth-api-gateway",
      phase: "request",
      result: "request",
      route: "platform-invitation",
      classification: {
        codeFingerprint: expect.stringMatching(/^\[invitation-code len=16 hash=[a-f0-9]{12}\]$/),
        endpoint: "/api/platform/v1/invitations/{code}",
        method: "GET",
        platformSessionPresent: false,
      },
    });
    expect(JSON.stringify(record)).not.toContain("5BC4B6A19CF80546");
  });

  it("records invitation accept failures with status, error code and request id", () => {
    const record = createAuthInvitationGatewayDiagnostic({
      code: "5BC4B6A19CF80546",
      endpointTemplate: "/api/platform/v1/invitations/{code}/accept",
      error: new ApiError("邀请码无效，请确认后重试", "INVITATION_INVALID", "req-123", 422),
      hasPlatformToken: true,
      method: "POST",
      phase: "response",
      route: "platform-invitation-accept",
    });

    expect(invitationCodeFingerprint("5BC4B6A19CF80546")).toMatch(
      /^\[invitation-code len=16 hash=[a-f0-9]{12}\]$/,
    );
    expect(record).toMatchObject({
      event: "auth.invitation.accept",
      phase: "response",
      result: "failed",
      classification: {
        endpoint: "/api/platform/v1/invitations/{code}/accept",
        errorCode: "INVITATION_INVALID",
        requestId: "req-123",
        status: 422,
      },
      summary: {
        response: {
          errorCode: "INVITATION_INVALID",
          message: "邀请码无效，请确认后重试",
          requestId: "req-123",
          status: 422,
        },
      },
    });
    expect(JSON.stringify(record)).not.toContain("5BC4B6A19CF80546");
  });
});
