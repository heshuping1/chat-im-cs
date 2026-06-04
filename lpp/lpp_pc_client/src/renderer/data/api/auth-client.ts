import { ApiBaseClient } from "./base";
import { recordAuthInvitationGatewayDiagnostic } from "./auth-invitation-gateway-diagnostics";
import { endpointPlan } from "./endpoints";
import { getAppInstanceProfile } from "../app-instance/app-instance";
import type {
  CaptchaChallenge,
  PlatformInvitationPreviewDto,
  PlatformLoginResult,
  PlatformRegisterRequest,
  PlatformRegisterResult,
  TenantAuthResult,
} from "./types";

export class AuthApiClient extends ApiBaseClient {
  async platformLogin(body: {
    identifier: string;
    password: string;
    loginType?: string;
    captchaToken?: string;
    captchaAnswer?: string;
  }) {
    const instance = await getAppInstanceProfile();
    return this.platformRequest<PlatformLoginResult>(endpointPlan.platformLogin, {
      method: "POST",
      body: JSON.stringify({
        ...body,
        loginType: body.loginType ?? "auto",
        captchaToken: body.captchaToken ?? null,
        captchaAnswer: body.captchaAnswer ?? null,
        issueRefreshToken: true,
        deviceId: instance.deviceId,
        devicePlatform: "pc",
        deviceName: `LPP PC Client (${instance.profileName})`,
        appVersion: "0.1.0",
        clientInstanceId: instance.clientInstanceId,
        profileName: instance.profileName,
      }),
    });
  }

  platformRegister(body: PlatformRegisterRequest) {
    return this.platformRequest<PlatformRegisterResult>(endpointPlan.platformRegister, {
      method: "POST",
      body: JSON.stringify({
        displayName: body.displayName.trim(),
        avatarUrl: optionalText(body.avatarUrl),
        email: optionalText(body.email),
        mobile: optionalText(body.mobile),
        password: body.password,
        captchaToken: optionalText(body.captchaToken),
        captchaAnswer: optionalText(body.captchaAnswer),
        verificationCode: optionalText(body.verificationCode),
        tenantId: optionalText(body.tenantId),
      }),
    });
  }

  async getPlatformInvitationPreview(code: string) {
    const normalizedCode = normalizeCode(code);
    const endpoint = endpointPlan.platformInvitation;
    recordAuthInvitationGatewayDiagnostic({
      code: normalizedCode,
      endpointTemplate: endpoint,
      hasPlatformToken: Boolean(this.options.platformToken),
      method: "GET",
      phase: "request",
      route: "platform-invitation",
    });
    try {
      const response = await this.platformRequest<PlatformInvitationPreviewDto>(
        endpoint.replace("{code}", encodeURIComponent(normalizedCode)),
      );
      recordAuthInvitationGatewayDiagnostic({
        code: normalizedCode,
        endpointTemplate: endpoint,
        hasPlatformToken: Boolean(this.options.platformToken),
        method: "GET",
        phase: "response",
        response,
        route: "platform-invitation",
      });
      return response;
    } catch (error) {
      recordAuthInvitationGatewayDiagnostic({
        code: normalizedCode,
        endpointTemplate: endpoint,
        error,
        hasPlatformToken: Boolean(this.options.platformToken),
        method: "GET",
        phase: "response",
        route: "platform-invitation",
      });
      throw error;
    }
  }

  async acceptPlatformInvitation(code: string) {
    const normalizedCode = normalizeCode(code);
    const endpoint = endpointPlan.platformInvitationAccept;
    recordAuthInvitationGatewayDiagnostic({
      code: normalizedCode,
      endpointTemplate: endpoint,
      hasPlatformToken: Boolean(this.options.platformToken),
      method: "POST",
      phase: "request",
      route: "platform-invitation-accept",
    });
    try {
      const response = await this.platformRequest<TenantAuthResult>(
        endpoint.replace("{code}", encodeURIComponent(normalizedCode)),
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );
      recordAuthInvitationGatewayDiagnostic({
        code: normalizedCode,
        endpointTemplate: endpoint,
        hasPlatformToken: Boolean(this.options.platformToken),
        method: "POST",
        phase: "response",
        response,
        route: "platform-invitation-accept",
      });
      return response;
    } catch (error) {
      recordAuthInvitationGatewayDiagnostic({
        code: normalizedCode,
        endpointTemplate: endpoint,
        error,
        hasPlatformToken: Boolean(this.options.platformToken),
        method: "POST",
        phase: "response",
        route: "platform-invitation-accept",
      });
      throw error;
    }
  }

  generateCaptcha() {
    return this.request<CaptchaChallenge>(endpointPlan.captchaGenerate, {
      method: "POST",
      body: JSON.stringify({}),
    });
  }

  selectTenant(tenantId: string) {
    return this.platformRequest<TenantAuthResult>(endpointPlan.selectTenant, {
      method: "POST",
      body: JSON.stringify({ tenantId }),
    });
  }

  selectPersonalSpace() {
    return this.platformRequest<TenantAuthResult>(
      endpointPlan.selectPersonalSpace,
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    );
  }
}

function optionalText(value: string | null | undefined) {
  return value?.trim() || null;
}

function normalizeCode(code: string) {
  return code.trim();
}
