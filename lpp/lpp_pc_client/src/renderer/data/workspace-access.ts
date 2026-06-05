import type { AuthSession } from "./auth/auth-session";
import { writeRendererAppLog } from "./logging/app-log";
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
  "customerDetail",
  "dataCenter",
  "knowledgeBase",
  "enterpriseSwitch",
  "favorites",
  "settings",
];

let lastWorkspaceAccessLogKey = "";

export function derivePcWorkspaceAccess(
  session: AuthSession | null | undefined,
): PcWorkspaceAccess {
  if (!session) {
    const access = legacyAccess();
    logWorkspaceAccess(session, undefined, undefined, access, "missing_session");
    return access;
  }

  const userType = finiteNumber(session.userType);
  const sessionMembershipRole = finiteNumber(session.membershipRole);
  const tenantMembershipRole = currentTenantMembershipRole(session);
  const membershipRole =
    sessionMembershipRole ?? tenantMembershipRole;
  const roleLabel = `${session.roleLabel ?? ""}`.trim().toLowerCase();
  const isCustomer = userType === 1 || membershipRole === 0;
  if (isCustomer) {
    const access: PcWorkspaceAccess = {
      canReadServiceWorkbench: false,
      dataCenterView: undefined,
      identityKind: "customer",
      roleKind: "customer",
      settingsProfile: "customer",
      visibleModules: defaultChatModules,
    };
    logWorkspaceAccess(session, tenantMembershipRole, membershipRole, access, "customer_role");
    return access;
  }

  const identityKind: PcIdentityKind =
    userType === 2 || isKnownEmployeeRole(membershipRole)
      ? "employee"
      : "legacy";
  const roleKind = employeeRoleKind(roleLabel, membershipRole);

  if (roleKind === "customer_service") {
    const access = employeeBusinessAccess(roleKind, "self-service");
    logWorkspaceAccess(session, tenantMembershipRole, membershipRole, access, "service_role");
    return access;
  }
  if (roleKind === "admin") {
    const access = employeeBusinessAccess(roleKind, "team-admin");
    logWorkspaceAccess(session, tenantMembershipRole, membershipRole, access, "admin_role");
    return access;
  }
  if (roleKind === "owner") {
    const access = employeeBusinessAccess(roleKind, "enterprise-owner");
    logWorkspaceAccess(session, tenantMembershipRole, membershipRole, access, "owner_role");
    return access;
  }

  const access: PcWorkspaceAccess = {
    canReadServiceWorkbench: false,
    dataCenterView: undefined,
    identityKind,
    roleKind: "basic_employee",
    settingsProfile: "employee",
    visibleModules: defaultChatModules,
  };
  logWorkspaceAccess(session, tenantMembershipRole, membershipRole, access, "basic_employee_role");
  return access;
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
  if (membershipRole === 4 || includesAny(roleLabel, ["\u6240\u6709\u8005", "owner"])) {
    return "owner";
  }
  if (membershipRole === 3 || includesAny(roleLabel, ["\u7ba1\u7406\u5458", "admin"])) {
    return "admin";
  }
  if (membershipRole === 2 || includesAny(roleLabel, ["\u5ba2\u670d", "customer_service"])) {
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

function isKnownEmployeeRole(role: number | undefined) {
  return role === 1 || role === 2 || role === 3 || role === 4;
}

function includesAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle));
}

function logWorkspaceAccess(
  session: AuthSession | null | undefined,
  tenantMembershipRole: number | undefined,
  membershipRole: number | undefined,
  access: PcWorkspaceAccess,
  reason: string,
) {
  const key = JSON.stringify({
    tenantId: session?.tenantId,
    userType: session?.userType,
    sessionMembershipRole: session?.membershipRole,
    tenantMembershipRole,
    membershipRole,
    roleKind: access.roleKind,
    canReadServiceWorkbench: access.canReadServiceWorkbench,
  });
  if (key === lastWorkspaceAccessLogKey) return;
  lastWorkspaceAccessLogKey = key;
  writeRendererAppLog({
    module: "auth",
    event: "workspace.access.resolve",
    phase: "derive",
    result: "ok",
    reason,
    context: {
      tenantId: session?.tenantId ?? null,
      spaceType: session?.spaceType ?? null,
      userType: session?.userType ?? null,
      sessionRole: session?.membershipRole ?? null,
      tenantRole: tenantMembershipRole ?? null,
      membershipRole: membershipRole ?? null,
      roleLabel: session?.roleLabel ?? null,
      identityKind: access.identityKind,
      roleKind: access.roleKind,
      canReadServiceWorkbench: access.canReadServiceWorkbench,
    },
  });
}
