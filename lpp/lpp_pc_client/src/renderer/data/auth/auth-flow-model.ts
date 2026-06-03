import { ApiError, type PlatformLoginResult } from "../api-client";

export type AuthMode = "login" | "register";

export type AuthSpaceChoice = {
  code: string;
  id: string;
  kind: "tenant";
  name: string;
  roleLabel: string;
};

export type RegisterFormDraft = {
  confirmPassword: string;
  contact: string;
  displayName: string;
  password: string;
};

export function inferLoginType(identifier: string) {
  const value = identifier.trim();
  if (/^lpp_/i.test(value)) return "lpp_id";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "email";
  if (/^\+?\d[\d\s-]{5,}$/.test(value)) return "mobile";
  return "auto";
}

export function selectAutoTenantId(login: PlatformLoginResult) {
  const tenants = login.tenants?.filter((tenant) => tenant.tenantId) ?? [];
  if (tenants.length === 1) return tenants[0].tenantId;
  if (tenants.length === 0 && login.spaceContext?.spaceType === 2) {
    return login.spaceContext.tenantId ?? null;
  }
  return null;
}

export function createAuthSpaceChoices(login: PlatformLoginResult): AuthSpaceChoice[] {
  return (login.tenants ?? [])
    .filter((tenant) => Boolean(tenant.tenantId))
    .map((tenant) => ({
      id: tenant.tenantId,
      kind: "tenant" as const,
      name: tenant.tenantName || tenant.tenantCode || "企业空间",
      code: tenant.tenantCode || tenant.tenantId,
      roleLabel: getAuthTenantRoleLabel(tenant.membershipRole),
    }));
}

export function validateRegisterForm(draft: RegisterFormDraft) {
  if (!draft.displayName.trim()) return "请输入昵称";
  if (!isRegisterContact(draft.contact)) return "请输入有效的邮箱或手机号";
  if (draft.password.length < 8) return "密码至少需要 8 位";
  if (draft.password !== draft.confirmPassword) return "两次输入的密码不一致";
  return null;
}

export function createRegisterContactPayload(contact: string) {
  const value = contact.trim();
  if (isEmail(value)) return { email: value, mobile: null };
  if (isMobile(value)) return { email: null, mobile: value };
  return { email: null, mobile: null };
}

export function isCaptchaRequired(error: unknown) {
  if (error instanceof ApiError) {
    return (
      error.code === "AUTH_CAPTCHA_REQUIRED" ||
      error.code === "AUTH_CAPTCHA_INVALID" ||
      error.message.toLowerCase().includes("captcha")
    );
  }
  const text = String(error).toLowerCase();
  return (
    text.includes("auth_captcha_required") ||
    text.includes("auth_captcha_invalid") ||
    text.includes("captcha")
  );
}

export function mapAuthErrorMessage(error: unknown, mode: AuthMode = "login") {
  const code = error instanceof ApiError ? error.code : undefined;
  const text = `${code ?? ""} ${error instanceof Error ? error.message : String(error)}`.toLowerCase();
  if (code === "AUTH_CAPTCHA_REQUIRED" || code === "AUTH_CAPTCHA_INVALID" || text.includes("captcha")) {
    return "需要完成安全验证";
  }
  if (
    code === "AUTH_INVALID_CREDENTIALS" ||
    code === "AUTH_PASSWORD_INVALID" ||
    text.includes("invalid credentials") ||
    text.includes("bad password") ||
    text.includes("密码错误")
  ) {
    return "账号或密码不正确";
  }
  if (
    code === "AUTH_EMAIL_EXISTS" ||
    text.includes("email already registered") ||
    text.includes("邮箱已注册")
  ) {
    return "该邮箱已注册，请直接登录";
  }
  if (
    code === "AUTH_MOBILE_EXISTS" ||
    text.includes("mobile already registered") ||
    text.includes("手机号已注册")
  ) {
    return "该手机号已注册，请直接登录";
  }
  if (
    text.includes("verification") ||
    text.includes("验证码") ||
    text.includes("短信") ||
    text.includes("邮箱")
  ) {
    return "当前环境需要验证码，请按提示完成验证后再继续";
  }
  if (text.includes("not found") || text.includes("不存在")) {
    return mode === "register" ? "注册失败，请检查账号信息" : "账号或密码不正确";
  }
  return mode === "register" ? "注册失败，请稍后重试" : "登录失败，请稍后重试";
}

export function getAuthTenantRoleLabel(role?: number | null) {
  if (role === 4) return "所有者";
  if (role === 3) return "管理员";
  if (role === 2) return "客服";
  if (role === 1) return "技术支持";
  if (role === 0) return "成员";
  return "成员";
}

function isRegisterContact(value: string) {
  return isEmail(value.trim()) || isMobile(value.trim());
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isMobile(value: string) {
  return /^\+?\d[\d\s-]{5,}$/.test(value);
}
