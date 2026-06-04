import { ApiError, type PlatformInvitationPreviewDto, type PlatformLoginResult } from "../api-client";

export type AuthMode = "login" | "register";
export type RegisterContactType = "email" | "mobile";

export type RegisterPhoneCountryOption = {
  country: string;
  dialCode: string;
  label: string;
};

export type AuthSpaceChoice = {
  code: string;
  id: string;
  kind: "tenant";
  name: string;
  roleLabel: string;
};

export type InvitationPreviewView =
  | {
      alreadyMember?: boolean;
      badges: string[];
      codeText: string;
      description: string;
      identityMatched?: boolean;
      kind: "ready";
      logoUrl?: string | null;
      name: string;
      title: "将加入企业";
    }
  | {
      kind: "loading";
      message: string;
      title: "正在确认邀请";
    }
  | {
      kind: "error";
      message: string;
      title: "无法确认邀请码";
    };

export type RegisterFormDraft = {
  confirmPassword: string;
  contact: string;
  contactType?: RegisterContactType;
  countryDialCode?: string;
  displayName: string;
  password: string;
};

export const registerPhoneCountryOptions: RegisterPhoneCountryOption[] = [
  { country: "CN", dialCode: "+86", label: "中国 +86" },
  { country: "US", dialCode: "+1", label: "美国/加拿大 +1" },
  { country: "JP", dialCode: "+81", label: "日本 +81" },
  { country: "KR", dialCode: "+82", label: "韩国 +82" },
  { country: "SG", dialCode: "+65", label: "新加坡 +65" },
  { country: "GB", dialCode: "+44", label: "英国 +44" },
  { country: "AU", dialCode: "+61", label: "澳大利亚 +61" },
  { country: "HK", dialCode: "+852", label: "中国香港 +852" },
  { country: "MO", dialCode: "+853", label: "中国澳门 +853" },
  { country: "TW", dialCode: "+886", label: "中国台湾 +886" },
];

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
  if (draft.contactType === "email" && !isEmail(draft.contact.trim())) return "请输入有效的邮箱地址";
  if (
    draft.contactType === "mobile" &&
    !normalizeMobileNumber(draft.contact, draft.countryDialCode)
  ) {
    return "请输入有效的手机号";
  }
  if (!draft.contactType && !isRegisterContact(draft.contact)) return "请输入有效的邮箱或手机号";
  if (draft.password.length < 8) return "密码至少需要 8 位";
  if (draft.password !== draft.confirmPassword) return "两次输入的密码不一致";
  return null;
}

export function createRegisterContactPayload(
  contact: string,
  options: { countryDialCode?: string; type?: RegisterContactType } = {},
) {
  const value = contact.trim();
  if (options.type === "email") return { email: value, mobile: null };
  if (options.type === "mobile") {
    return { email: null, mobile: normalizeMobileNumber(value, options.countryDialCode) };
  }
  if (isEmail(value)) return { email: value, mobile: null };
  if (isMobile(value)) return { email: null, mobile: value };
  return { email: null, mobile: null };
}

export function normalizeInvitationCode(code: string) {
  const value = code.trim();
  return value || null;
}

export function createInvitationPreviewView(
  preview: PlatformInvitationPreviewDto,
): InvitationPreviewView {
  const name = preview.tenantName?.trim() || "企业邀请";
  const badges = [
    preview.alreadyMember ? "已在企业中" : undefined,
    preview.identityMatched ? "定向匹配" : preview.identityMatched === false ? "定向不匹配" : undefined,
    preview.expiresAt ? `有效至 ${formatInvitationDate(preview.expiresAt)}` : undefined,
  ].filter(Boolean) as string[];
  return {
    kind: "ready",
    alreadyMember: preview.alreadyMember,
    badges,
    codeText: preview.tenantCode || preview.tenantId || "--",
    description: preview.tenantDescription?.trim() || "登录或注册后将加入该企业空间。",
    identityMatched: preview.identityMatched,
    logoUrl: preview.logoUrl,
    name,
    title: "将加入企业",
  };
}

export function createInvitationPreviewLoadingView(): InvitationPreviewView {
  return {
    kind: "loading",
    message: "正在读取邀请码对应的企业信息",
    title: "正在确认邀请",
  };
}

export function createInvitationPreviewErrorView(error: unknown): InvitationPreviewView {
  return {
    kind: "error",
    message: mapAuthErrorMessage(error, "login"),
    title: "无法确认邀请码",
  };
}

export function shouldContinueAfterInvitationPreviewError(_error: unknown) {
  return true;
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
  if (code === "INVITATION_INVALID") return "邀请码无效，请确认后重试";
  if (code === "INVITATION_EXPIRED") return "邀请码已过期，请联系邀请人重新生成";
  if (code === "INVITATION_TARGET_MISMATCH") return "该邀请码仅限指定账号使用";
  if (code === "TENANT_ALREADY_MEMBER") return "你已在该企业中，角色不会因邀请码变更";
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

function normalizeMobileNumber(value: string, countryDialCode = "+86") {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/[^\d+]/g, "");
  const localDigits = digits.replace(/\D/g, "").replace(/^0+/, "");
  const normalized = digits.startsWith("+")
    ? `+${digits.slice(1).replace(/\D/g, "")}`
    : `${countryDialCode}${localDigits}`;
  const numeric = normalized.slice(1);
  if (!/^\+\d{7,15}$/.test(normalized)) return null;
  if (/^0+$/.test(numeric)) return null;
  return normalized;
}

function formatInvitationDate(value: string) {
  const normalized = value.trim();
  if (!normalized) return "--";
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return normalized.slice(0, 10) || normalized;
  return parsed.toISOString().slice(0, 10);
}
