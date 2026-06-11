import type { TrayStatus } from "../../shared/desktop-api";
import type {
  CustomerServiceStatus,
  WorkbenchShortcut,
  WorkspaceRole,
} from "./types";
import type { AuthSession } from "./auth/auth-session";

export const imPresenceStatuses: Array<{ value: TrayStatus; labelKey: string }> = [
  { value: "online", labelKey: "sidebar.presence.online" },
  { value: "busy", labelKey: "sidebar.presence.busy" },
  { value: "away", labelKey: "sidebar.presence.away" },
  { value: "invisible", labelKey: "sidebar.presence.invisible" },
];

export const customerServiceStatuses: Array<{
  value: CustomerServiceStatus;
  labelKey: string;
  hintKey: string;
}> = [
  {
    value: "online",
    labelKey: "sidebar.service.status.online",
    hintKey: "sidebar.service.statusHint.online",
  },
  {
    value: "busy",
    labelKey: "sidebar.service.status.busy",
    hintKey: "sidebar.service.statusHint.busy",
  },
  {
    value: "break",
    labelKey: "sidebar.service.status.break",
    hintKey: "sidebar.service.statusHint.break",
  },
  {
    value: "offline",
    labelKey: "sidebar.service.status.offline",
    hintKey: "sidebar.service.statusHint.offline",
  },
];

export const roleLabels: Record<WorkspaceRole, string> = {
  customer_service: "workbench.role.customer_service",
  admin: "workbench.role.admin",
  owner: "workbench.role.owner",
};

export const workbenchShortcuts: WorkbenchShortcut[] = [
  {
    id: "wb-cs-notices",
    roles: ["customer_service", "admin", "owner"],
    groupKey: "customerService",
    titleKey: "workbench.shortcut.wb-cs-notices.title",
    descriptionKey: "workbench.shortcut.wb-cs-notices.description",
    state: "readonly",
  },
  {
    id: "wb-admin-service-center",
    roles: ["admin", "owner"],
    groupKey: "admin",
    titleKey: "workbench.shortcut.wb-admin-service-center.title",
    descriptionKey: "workbench.shortcut.wb-admin-service-center.description",
    state: "available",
  },
  {
    id: "wb-cs-performance",
    roles: ["customer_service", "admin", "owner"],
    groupKey: "customerService",
    titleKey: "workbench.shortcut.wb-cs-performance.title",
    descriptionKey: "workbench.shortcut.wb-cs-performance.description",
    state: "available",
  },
  {
    id: "wb-cs-quick-replies",
    roles: ["customer_service", "admin", "owner"],
    groupKey: "customerService",
    titleKey: "workbench.shortcut.wb-cs-quick-replies.title",
    descriptionKey: "workbench.shortcut.wb-cs-quick-replies.description",
    state: "available",
  },
];

export function roleFromSession(session: AuthSession | null): WorkspaceRole {
  const label = `${session?.roleLabel ?? ""}`.toLowerCase();
  if (label.includes("owner") || label.includes("\u6240\u6709\u8005")) return "owner";
  if (label.includes("admin") || label.includes("\u7ba1\u7406\u5458")) return "admin";
  return "customer_service";
}
