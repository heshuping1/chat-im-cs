import type { TrayStatus } from "../../shared/desktop-api";
import type {
  CustomerServiceStatus,
  WorkbenchShortcut,
  WorkspaceRole,
} from "./types";
import type { AuthSession } from "./store";

export const imPresenceStatuses: Array<{ value: TrayStatus; label: string }> = [
  { value: "online", label: "在线" },
  { value: "busy", label: "忙碌" },
  { value: "away", label: "离开" },
  { value: "invisible", label: "隐身" },
];

export const customerServiceStatuses: Array<{
  value: CustomerServiceStatus;
  label: string;
  hint: string;
}> = [
  { value: "online", label: "在线", hint: "可手动接入排队会话" },
  { value: "busy", label: "忙碌", hint: "不自动接入，仍可手动处理" },
  { value: "break", label: "短暂离开", hint: "暂不接收新的排队会话" },
  { value: "offline", label: "离线", hint: "不参与接待" },
];

export const roleLabels: Record<WorkspaceRole, string> = {
  customer_service: "客服",
  admin: "管理员",
  owner: "所有者",
};

export const workbenchShortcuts: WorkbenchShortcut[] = [
  {
    id: "wb-cs-notices",
    roles: ["customer_service", "admin", "owner"],
    group: "客服工作台",
    title: "企业公告",
    description: "查看企业通知、制度公告和已读状态。",
    state: "readonly",
  },
  {
    id: "wb-cs-quick-replies",
    roles: ["customer_service", "admin", "owner"],
    group: "客服工作台",
    title: "常用话术",
    description: "维护常用回复、知识库引用和多语言话术。",
    state: "available",
  },
  {
    id: "wb-cs-performance",
    roles: ["customer_service", "admin", "owner"],
    group: "客服工作台",
    title: "效能",
    description: "查看个人接待量、平均响应和满意度摘要。",
    state: "available",
  },
  {
    id: "wb-admin-customers",
    roles: ["admin", "owner"],
    group: "管理工作台",
    title: "客户管理",
    description: "客户统计、已分配/未分配客户、分页查询和分配客服。",
    state: "pending_api",
  },
  {
    id: "wb-admin-service-center",
    roles: ["admin", "owner"],
    group: "管理工作台",
    title: "客服中心",
    description: "客服人员、客户会话、在线客服会话的监管视图。",
    state: "pending_api",
  },
  {
    id: "wb-admin-groups",
    roles: ["admin", "owner"],
    group: "管理工作台",
    title: "群组监管",
    description: "群组列表、冻结/解冻和后续治理接口入口。",
    state: "pending_api",
  },
  {
    id: "wb-owner-broadcast",
    roles: ["admin", "owner"],
    group: "管理工作台",
    title: "企业群发",
    description: "以官方账号向全体人员、员工、客户或官方群发送企业通知。",
    state: "pending_api",
  },
];

export function roleFromSession(session: AuthSession | null): WorkspaceRole {
  const label = `${session?.roleLabel ?? ""}`.toLowerCase();
  if (label.includes("owner") || label.includes("所有者")) return "owner";
  if (label.includes("admin") || label.includes("管理员")) return "admin";
  return "customer_service";
}
