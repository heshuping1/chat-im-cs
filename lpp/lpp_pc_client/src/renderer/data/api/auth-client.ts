import { ApiBaseClient } from "./base";
import { endpointPlan } from "./endpoints";
import { getAppInstanceProfile } from "../app-instance/app-instance";
import type {
  CaptchaChallenge,
  PlatformLoginResult,
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
