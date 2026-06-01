export type ModuleKey =
  | "messages"
  | "onlineService"
  | "knowledgeBase"
  | "aiAssistant"
  | "contacts"
  | "ticketCenter"
  | "dataCenter"
  | "workbench"
  | "enterpriseSwitch"
  | "favorites"
  | "settings";

export type ContactKind = "friend" | "group" | "customer" | "staff";
export type ContactFilter = "all" | "organization" | "requests" | ContactKind;
export type WorkspaceRole = "customer_service" | "admin" | "owner";
export type CustomerServiceStatus =
  | "online"
  | "busy"
  | "break"
  | "offline";

export interface ContactItem {
  id: string;
  kind: ContactKind;
  directoryFilters?: Array<Exclude<ContactFilter, "all" | "requests" | "staff">>;
  name: string;
  subtitle: string;
  remark: string;
  tags: string[];
  userId?: string;
  lppId?: string;
  conversationId?: string;
  avatarUrl?: string | null;
  online?: boolean;
  members?: number;
  departmentId?: string;
  departmentName?: string;
  position?: string | null;
  source?: string;
  groupName?: string | null;
  roleLabel?: string;
  roleRank?: number;
  joinedAt?: string | null;
  createdAt?: string | null;
  lastMessagePreview?: string | null;
  lastMessageAt?: string | null;
  muted?: boolean;
}

export interface OrgUnit {
  id: string;
  name: string;
  subtitle: string;
  owner: string;
  memberContactIds: string[];
  childCount: number;
}

export interface CustomerProfile {
  id: string;
  name: string;
  avatarUrl?: string | null;
  level: string;
  kyc: string;
  risk: string;
  balance: string;
  deposit: string;
  netDeposit: string;
  language: string;
  source: string;
  tags: string[];
  phoneMasked?: string;
  emailMasked?: string;
  country?: string;
  lastActive?: string;
  assignedAgent?: string;
  conversationCount?: number;
  ticketCount?: number;
  registeredAt?: string;
  ib?: string;
  accountStatus?: string;
  tradingSummary?: {
    totalOrders?: string;
    product?: string;
    winRate?: string;
    recentTradeTime?: string;
    accountStatus?: string;
    registeredAt?: string;
    ib?: string;
  };
  orders: Array<{
    id: string;
    product: string;
    status: string;
    amount: string;
    createdAt?: string;
    riskHint?: string;
  }>;
  tickets: Array<{
    id: string;
    title: string;
    status: string;
    priority?: string;
    updatedAt?: string;
  }>;
  externalSections?: Array<{
    type: string;
    title: string;
    fields?: Array<{ label: string; value?: string }>;
    items?: Array<Record<string, string>>;
  }>;
}

export interface WorkbenchShortcut {
  id: string;
  roles: WorkspaceRole[];
  group: string;
  title: string;
  description: string;
  state: "available" | "readonly" | "no_permission" | "pending_api";
  metric?: string;
}
