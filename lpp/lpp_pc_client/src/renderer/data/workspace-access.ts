import type { AuthSession } from "./auth/auth-session";
import type { ModuleKey } from "./types";

export type PcIdentityKind = "customer" | "employee" | "legacy";
export type PcRoleKind =
  | "customer"
  | "basic_employee"
  | "customer_service"
  | "admin"
  | "owner";
export type PcSettingsProfile = "customer" | "employee";
export type PcDataCenterView = "self-service" | "team-admin" | "enterprise-owner";

export interface PcWorkspaceAccess {
  identityKind: PcIdentityKind;
  roleKind: PcRoleKind;
  visibleModules: ModuleKey[];
  settingsProfile: PcSettingsProfile;
  canReadServiceWorkbench: boolean;
  dataCenterView?: PcDataCenterView;
}

export const defaultChatModules: ModuleKey[] = [
  "messages",
  "contacts",
  "enterpriseSwitch",
  "favorites",
  "settings",
];

export const fullBusinessModules: ModuleKey[] = [
  "messages",
  "onlineService",
  "contacts",
  "workbench",
  "ticketCenter",
  "dataCenter",
  "knowledgeBase",
  "enterpriseSwitch",
  "favorites",
  "settings",
];

export function derivePcWorkspaceAccess(
  session: AuthSession | null | undefined,
): PcWorkspaceAccess {
  if (!session) return legacyAccess();

  const userType = finiteNumber(session.userType);
  const membershipRole =
    finiteNumber(session.membershipRole) ?? currentTenantMembershipRole(session);
  const roleLabel = `${session.roleLabel ?? ""}`.trim().toLowerCase();
  const isCustomer = userType === 1 || membershipRole === 0;
  if (isCustomer) {
    return {
      canReadServiceWorkbench: false,
      dataCenterView: undefined,
      identityKind: "customer",
      roleKind: "customer",
      settingsProfile: "customer",
      visibleModules: defaultChatModules,
    };
  }

  const identityKind: PcIdentityKind =
    userType === 2 || (membershipRole !== undefined && membershipRole >= 1)
      ? "employee"
      : "legacy";
  const roleKind = employeeRoleKind(roleLabel, membershipRole);

  if (roleKind === "customer_service") {
    return employeeBusinessAccess(roleKind, "self-service");
  }
  if (roleKind === "admin") {
    return employeeBusinessAccess(roleKind, "team-admin");
  }
  if (roleKind === "owner") {
    return employeeBusinessAccess(roleKind, "enterprise-owner");
  }

  return {
    canReadServiceWorkbench: false,
    dataCenterView: undefined,
    identityKind,
    roleKind: "basic_employee",
    settingsProfile: "employee",
    visibleModules: defaultChatModules,
  };
}

export function isModuleVisibleForAccess(
  module: ModuleKey,
  access: PcWorkspaceAccess,
) {
  return access.visibleModules.includes(module);
}

export function normalizeActiveModuleForAccess(
  activeModule: ModuleKey,
  access: PcWorkspaceAccess,
): ModuleKey {
  return isModuleVisibleForAccess(activeModule, access) ? activeModule : "messages";
}

function employeeBusinessAccess(
  roleKind: Extract<PcRoleKind, "customer_service" | "admin" | "owner">,
  dataCenterView: PcDataCenterView,
): PcWorkspaceAccess {
  return {
    canReadServiceWorkbench: true,
    dataCenterView,
    identityKind: "employee",
    roleKind,
    settingsProfile: "employee",
    visibleModules: fullBusinessModules,
  };
}

function legacyAccess(): PcWorkspaceAccess {
  return {
    canReadServiceWorkbench: false,
    dataCenterView: undefined,
    identityKind: "legacy",
    roleKind: "basic_employee",
    settingsProfile: "employee",
    visibleModules: defaultChatModules,
  };
}

function employeeRoleKind(roleLabel: string, membershipRole?: number): PcRoleKind {
  if (membershipRole === 4 || includesAny(roleLabel, ["所有者", "owner"])) {
    return "owner";
  }
  if (membershipRole === 3 || includesAny(roleLabel, ["管理员", "admin"])) {
    return "admin";
  }
  if (membershipRole === 2 || includesAny(roleLabel, ["客服", "customer_service"])) {
    return "customer_service";
  }
  return "basic_employee";
}

function currentTenantMembershipRole(session: AuthSession) {
  const tenantId = session.tenantId;
  if (!tenantId) return undefined;
  const tenant = session.tenants?.find((item) => item.tenantId === tenantId);
  return finiteNumber(tenant?.membershipRole);
}

function finiteNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function includesAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle));
}
