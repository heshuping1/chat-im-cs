import { ApiBaseClient } from "./base";
import { endpointPlan } from "./endpoints";
import { getAppInstanceProfile } from "../app-instance/app-instance";
import type {
  CaptchaChallenge,
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
