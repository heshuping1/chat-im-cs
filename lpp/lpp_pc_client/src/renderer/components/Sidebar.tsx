import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  Building2,
  Check,
  ChartSpline,
  ClipboardCheck,
  Bot,
  BookOpenText,
  Headset,
  LogOut,
  LayoutDashboard,
  Menu,
  MessageCircleMore,
  MonitorCog,
  Plus,
  QrCode,
  ShieldCheck,
  Star,
  Settings,
  UsersRound,
} from "lucide-react";
import type { TrayStatus } from "../../shared/desktop-api";
import type { ConversationListItem } from "../data/api-client";
import { normalizeCustomerServiceThreadType } from "../data/api-client";
import {
  effectiveConversationUnreadCount,
  isImConversation,
} from "../data/message-display";
import { isQueuedCustomerServiceThread } from "../data/customer-service-display";
import {
  useImReadStateByConversation,
  useLocalImConversationReads,
} from "../data/im-read/im-read-store";
import { mergeUnifiedReadStateForIdentity } from "../data/im-read/im-read-view-model";
import {
  notifyDesktopOrBrowser,
  shouldPushRealtimeReminder,
  shouldShowDesktopNotification,
} from "../data/reminder/reminder-service";
import {
  usePushRealtimeReminder,
  useRealtimeReminders,
} from "../data/reminder/reminder-store";
import { pcQueryKeys } from "../data/query-keys";
import {
  formatAppInstanceLabel,
  getAppInstanceProfile,
  openAppProfile,
} from "../data/app-instance/app-instance";
import {
  useAuthSession,
  useClearAuthSession,
} from "../data/auth/auth-store";
import { usePcSettings } from "../data/settings/settings-store";
import {
  useActiveModule,
  useImPresenceStatus,
  useSetActiveModule,
  useSetImPresenceStatus,
} from "../data/workspace-ui/workspace-ui-store";
import { requireApiClient } from "../data/runtime";
import { imPresenceStatuses } from "../data/static-config";
import type { ModuleKey } from "../data/types";
import { formatBadgeCount, formatError } from "../lib/format";
import { PcAvatar } from "./PcAvatar";
import {
  AccountAction,
  AccountDetailPanel,
  copyToClipboard,
  type AccountPanel,
} from "./SidebarAccountPanels";

const primaryNavItems = [
  { key: "messages", label: "消息", icon: MessageCircleMore },
  { key: "onlineService", label: "在线客服", icon: Headset },
  { key: "contacts", label: "通讯录", icon: UsersRound },
  { key: "workbench", label: "工作台", icon: LayoutDashboard },
  { key: "ticketCenter", label: "工单中心", icon: ClipboardCheck },
  { key: "dataCenter", label: "数据中心", icon: ChartSpline },
  { key: "knowledgeBase", label: "知识库", icon: BookOpenText },
  { key: "aiAssistant", label: "AI 助手", icon: Bot },
] satisfies Array<{ key: ModuleKey; label: string; icon: typeof MessageCircleMore }>;

const settingsNavItem = { key: "settings", label: "设置", icon: Settings } satisfies {
  key: ModuleKey;
  label: string;
  icon: typeof Settings;
};

const accountNavItems = [
  { key: "enterpriseSwitch", label: "空间切换", icon: Building2 },
  { key: "favorites", label: "收藏", icon: Star },
] satisfies Array<{
  key: ModuleKey;
  label: string;
  icon: typeof Building2;
}>;

export function Sidebar() {
  const queryClient = useQueryClient();
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountNotice, setAccountNotice] = useState<string | null>(null);
  const [accountPanel, setAccountPanel] = useState<AccountPanel>(null);
  const [collapsed, setCollapsed] = useState(false);
  const activeModule = useActiveModule();
  const locallyReadConversationReads = useLocalImConversationReads();
  const imReadStateByConversation = useImReadStateByConversation();
  const authSession = useAuthSession();
  const clearAuthSession = useClearAuthSession();
  const setActiveModule = useSetActiveModule();
  const imPresenceStatus = useImPresenceStatus();
  const setImPresenceStatus = useSetImPresenceStatus();
  const pcSettings = usePcSettings();
  const pushRealtimeReminder = usePushRealtimeReminder();
  const realtimeReminders = useRealtimeReminders();
  const queueReminderReadyRef = useRef(false);
  const queueReminderSessionRef = useRef("");
  const previousQueuedThreadIdsRef = useRef<Set<string>>(new Set());
  const previousQueuedCountRef = useRef(0);
  const previousServiceUnreadRef = useRef<Map<string, number>>(new Map());
  const previousServiceMessageRef = useRef<Map<string, string>>(new Map());
  const conversationsQuery = useQuery({
    queryKey: pcQueryKeys.imConversations(
      authSession?.apiBaseUrl,
      authSession?.tenantToken,
    ),
    enabled: Boolean(authSession),
    refetchInterval: 5_000,
    refetchIntervalInBackground: true,
    queryFn: async () => requireApiClient(authSession).getConversations({ limit: 100 }),
  });
  const serviceQuery = useQuery({
    queryKey: pcQueryKeys.customerServiceThreads(
      authSession?.apiBaseUrl,
      authSession?.tenantToken,
    ),
    enabled: Boolean(authSession),
    refetchInterval: 5_000,
    refetchIntervalInBackground: true,
    queryFn: async () => requireApiClient(authSession).getWorkbenchThreads(),
  });
  const profileQuery = useQuery({
    queryKey: pcQueryKeys.accountProfile(authSession?.apiBaseUrl, authSession?.tenantToken),
    enabled: Boolean(authSession && accountOpen),
    staleTime: 60_000,
    queryFn: async () => requireApiClient(authSession).getMyProfile(),
  });
  const tenantInfoQuery = useQuery({
    queryKey: pcQueryKeys.accountTenant(authSession?.apiBaseUrl, authSession?.tenantToken),
    enabled: Boolean(authSession && accountOpen),
    staleTime: 60_000,
    queryFn: async () => requireApiClient(authSession).getTenantInfo(),
  });
  const appInstanceQuery = useQuery({
    queryKey: ["pc-app-instance-profile"],
    enabled: accountOpen,
    staleTime: Infinity,
    queryFn: getAppInstanceProfile,
  });
  const openAppProfileMutation = useMutation({
    mutationFn: async () => {
      await openAppProfile();
    },
    onSuccess: () => setAccountNotice("已打开新的 PC 客户端"),
    onError: (error) => setAccountNotice(`打开新客户端失败：${formatError(error)}`),
  });
  const inviteQrsQuery = useQuery({
    queryKey: pcQueryKeys.accountInviteQrs(
      authSession?.apiBaseUrl,
      authSession?.tenantToken,
    ),
    enabled: Boolean(authSession && accountOpen && accountPanel === "qrcode"),
    staleTime: 60_000,
    queryFn: async () => requireApiClient(authSession).getFriendInviteQrs(),
  });
  const createInviteQrMutation = useMutation({
    mutationFn: async () =>
      requireApiClient(authSession).createFriendInviteQr({
        ttlHours: 720,
        maxUses: 0,
        message: "扫码加我",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["pc-account-invite-qrs"] });
    },
    onError: (error) => setAccountNotice(`生成二维码失败：${formatError(error)}`),
  });
  const unifiedReadStateForIdentity = mergeUnifiedReadStateForIdentity(
    locallyReadConversationReads,
    imReadStateByConversation,
  );
  const unreadCount = (conversationsQuery.data?.items ?? [])
    .filter((item) => isImConversation(item))
    .reduce(
      (sum, item) =>
        sum +
        effectiveConversationUnreadCount(
          item,
          authSession
            ? { ...authSession, locallyReadConversationReads: unifiedReadStateForIdentity }
            : null,
        ),
      0,
    );
  const queuedTempSessions = [
    ...(serviceQuery.data?.queueItems ?? []),
    ...(serviceQuery.data?.activeItems ?? []),
  ].filter(
    (item) =>
      normalizeCustomerServiceThreadType(item.threadType) === "temp_session" &&
      isQueuedCustomerServiceThread(item),
  );
  const activeTempSessions = (serviceQuery.data?.activeItems ?? []).filter(
    (item) => normalizeCustomerServiceThreadType(item.threadType) === "temp_session",
  );
  const queuedServiceCount = Math.max(
    serviceQuery.data?.summary?.queuedCount ?? 0,
    queuedTempSessions.length,
  );
  const activeServiceUnreadCount = (serviceQuery.data?.activeItems ?? [])
    .filter((item) => normalizeCustomerServiceThreadType(item.threadType) === "temp_session")
    .reduce((sum, item) => sum + Math.max(0, item.unreadCount ?? 0), 0);
  const serviceAlertCount = queuedServiceCount + activeServiceUnreadCount;
  const realtimeServiceAlertCount = realtimeReminders.filter(
    (item) => item.targetModule === "onlineService",
  ).length;
  const imStatusLabel =
    imPresenceStatuses.find((item) => item.value === imPresenceStatus)?.label ??
    "在线";
  const profile = profileQuery.data;
  const tenantInfo = tenantInfoQuery.data;
  const displayName = profile?.displayName || authSession?.displayName || "PC 用户";
  const avatarUrl = profile?.avatarUrl ?? authSession?.avatarUrl;
  const shortName = displayName.slice(0, 1).toUpperCase();
  const tenantCode =
    tenantInfo?.tenantCode ||
    authSession?.tenantCode ||
    authSession?.tenantName ||
    authSession?.tenantId ||
    "--";
  const roleLabel = authSession?.roleLabel ?? "成员";
  const signature = profile?.signature || profile?.bio || "暂无签名";
  const appInstance = appInstanceQuery.data;
  const appInstanceLabel = appInstance
    ? formatAppInstanceLabel(appInstance)
    : "正在识别客户端";
  const appInstanceShortId = appInstance?.clientInstanceId.slice(0, 8) ?? "--";
  const queueReminderSessionKey = authSession
    ? `${authSession.apiBaseUrl}|${authSession.tenantToken}`
    : "";

  useEffect(() => {
    if (!queueReminderSessionKey) {
      queueReminderReadyRef.current = false;
      queueReminderSessionRef.current = "";
      previousQueuedThreadIdsRef.current = new Set();
      previousQueuedCountRef.current = 0;
      previousServiceUnreadRef.current = new Map();
      previousServiceMessageRef.current = new Map();
      return;
    }
    if (queueReminderSessionRef.current !== queueReminderSessionKey) {
      queueReminderSessionRef.current = queueReminderSessionKey;
      queueReminderReadyRef.current = false;
      previousQueuedThreadIdsRef.current = new Set();
      previousQueuedCountRef.current = 0;
      previousServiceUnreadRef.current = new Map();
      previousServiceMessageRef.current = new Map();
    }
    if (!serviceQuery.data) return;

    const allTempSessions = [...queuedTempSessions, ...activeTempSessions];
    const currentIds = new Set(
      queuedTempSessions.map((item) => item.threadId || item.conversationId).filter(Boolean),
    );
    const currentUnread = new Map(
      activeTempSessions
        .map((item) => [
          item.threadId || item.conversationId,
          Math.max(0, Number(item.unreadCount ?? 0)),
        ] as const)
        .filter(([id]) => Boolean(id)),
    );
    const currentMessageStamps = new Map(
      allTempSessions
        .map((item) => {
          const id = item.threadId || item.conversationId;
          const stamp = [
            item.lastMessageAt ?? "",
            item.lastMessagePreview ?? "",
            item.unreadCount ?? 0,
            item.status ?? "",
          ].join("|");
          return [id, stamp] as const;
        })
        .filter(([id]) => Boolean(id)),
    );
    if (!queueReminderReadyRef.current) {
      queueReminderReadyRef.current = true;
      if (queuedServiceCount === 0 && activeServiceUnreadCount === 0) {
        previousQueuedThreadIdsRef.current = currentIds;
        previousQueuedCountRef.current = queuedServiceCount;
        previousServiceUnreadRef.current = currentUnread;
        previousServiceMessageRef.current = currentMessageStamps;
        return;
      }
    }

    const newQueuedThreads = queuedTempSessions.filter((item) => {
      const id = item.threadId || item.conversationId;
      return id && !previousQueuedThreadIdsRef.current.has(id);
    });
    const activeUnreadThreads = activeTempSessions.filter((item) => {
      const id = item.threadId || item.conversationId;
      if (!id) return false;
      const previous = previousServiceUnreadRef.current.get(id) ?? 0;
      return Math.max(0, Number(item.unreadCount ?? 0)) > previous;
    });
    const changedMessageThreads = allTempSessions.filter((item) => {
      const id = item.threadId || item.conversationId;
      if (!id || !item.lastMessagePreview) return false;
      const previous = previousServiceMessageRef.current.get(id);
      return previous !== undefined && previous !== currentMessageStamps.get(id);
    });
    const queuedCountIncreased =
      queuedServiceCount > previousQueuedCountRef.current && newQueuedThreads.length === 0;
    previousQueuedThreadIdsRef.current = currentIds;
    previousQueuedCountRef.current = queuedServiceCount;
    previousServiceUnreadRef.current = currentUnread;
    previousServiceMessageRef.current = currentMessageStamps;
    if (
      newQueuedThreads.length === 0 &&
        activeUnreadThreads.length === 0 &&
        changedMessageThreads.length === 0 &&
        !queuedCountIncreased
    ) {
      return;
    }
    if (!shouldPushRealtimeReminder(pcSettings, "serviceQueue")) return;

    const notifyThread = (
      thread: (typeof queuedTempSessions)[number],
      fallbackBody: string,
      reminderKind: "queue" | "message",
    ) => {
      const id = thread.threadId || thread.conversationId;
      const title = thread.title || "新的在线客服会话";
      const source =
        thread.source ||
        thread.channel ||
        thread.sourceChannel ||
        thread.entryChannel ||
        thread.platform ||
        thread.provider;
      const body = source
        ? `来自 ${source} 的访客正在排队，等待接入`
        : "有访客正在排队，等待接入";
      pushRealtimeReminder({
        id:
          reminderKind === "message"
            ? `cs-service-message-${id}-${Math.max(0, Number(thread.unreadCount ?? 0))}`
            : `cs-queue-${id}`,
        title,
        body: fallbackBody || body,
        targetModule: "onlineService",
        targetId: id,
        severity: "warning",
        icon: "service",
      });
      if (shouldShowDesktopNotification(pcSettings, "serviceQueue")) {
        void notifyDesktopOrBrowser(
          { title, body: fallbackBody || body, conversationId: id },
          { channel: "serviceQueue" },
        );
      }
    };

    newQueuedThreads.forEach((thread) => notifyThread(thread, "", "queue"));
    activeUnreadThreads.forEach((thread) =>
      notifyThread(
        thread,
        thread.lastMessagePreview || "在线客服会话有新消息",
        "message",
      ),
    );
    changedMessageThreads.forEach((thread) => {
      if (
        newQueuedThreads.some(
          (item) =>
            (item.threadId || item.conversationId) ===
            (thread.threadId || thread.conversationId),
        ) ||
        activeUnreadThreads.some(
          (item) =>
            (item.threadId || item.conversationId) ===
            (thread.threadId || thread.conversationId),
        )
      ) {
        return;
      }
      notifyThread(thread, thread.lastMessagePreview || "在线客服会话有新消息", "message");
    });
    if (queuedCountIncreased) {
      const title = "新的在线客服会话";
      const body = "有新的访客正在排队，等待接入";
      pushRealtimeReminder({
        id: `cs-queue-count-${queueReminderSessionKey}-${queuedServiceCount}-${Date.now()}`,
        title,
        body,
        targetModule: "onlineService",
        severity: "warning",
        icon: "service",
      });
      if (shouldShowDesktopNotification(pcSettings, "serviceQueue")) {
        void notifyDesktopOrBrowser({ title, body }, { channel: "serviceQueue" });
      }
    }
  }, [
    activeModule,
    activeTempSessions,
    pcSettings.desktopNotifications,
    pcSettings.serviceQueueNotifications,
    pushRealtimeReminder,
    activeServiceUnreadCount,
    serviceQuery.data,
    queuedServiceCount,
    queuedTempSessions,
    queueReminderSessionKey,
  ]);

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="account-entry">
        <button
          className="account-button"
          type="button"
          aria-expanded={accountOpen}
          aria-label={`${displayName}，企业${tenantCode}，IM状态${imStatusLabel}`}
          data-sidebar-tooltip="我的账号"
          data-testid="account-entry-button"
          title="打开我的账号"
          onClick={() => {
            setAccountOpen((opened) => !opened);
            setAccountNotice(null);
            setAccountPanel(null);
          }}
        >
          <PcAvatar
            avatarUrl={avatarUrl}
            className="account-avatar"
            name={displayName}
            data-testid="account-entry-avatar"
          >
            <span className={`status-dot account-status-dot ${imPresenceStatus}`} />
          </PcAvatar>
          <span className="account-identity">
            <strong>{shortName.length > 0 ? displayName : "PC 用户"}</strong>
            <em>{tenantCode}</em>
          </span>
        </button>
        {accountOpen && (
          <div className="account-popover" role="dialog" aria-label="我的账号">
            <div className="account-profile-card">
              <PcAvatar
                avatarUrl={avatarUrl}
                className="account-popover-avatar"
                name={displayName}
              >
                <span className={`status-dot account-status-dot ${imPresenceStatus}`} />
              </PcAvatar>
              <div>
                <strong>{displayName}</strong>
                <span>{profile?.lppId ?? authSession?.lppId ?? authSession?.userId ?? "--"}</span>
                <span className="account-profile-meta">
                  <b>{roleLabel}</b>
                  <em>{tenantCode}</em>
                </span>
                <small className="account-profile-signature">{signature}</small>
              </div>
            </div>

            <section className="account-popover-section">
              <span className="account-section-label">账号与客户端</span>
              <div className="account-client-card">
                <span>
                  <MonitorCog size={15} />
                  <strong>{appInstanceLabel}</strong>
                </span>
                <em>实例 {appInstanceShortId}</em>
              </div>
              <div className="account-action-list">
                <AccountAction
                  icon={<Plus size={15} />}
                  label={openAppProfileMutation.isPending ? "正在打开" : "打开新客户端"}
                  onClick={() => openAppProfileMutation.mutate()}
                />
                <AccountAction
                  icon={<ShieldCheck size={15} />}
                  label="管理登录设备"
                  onClick={() => {
                    setActiveModule("settings");
                    setAccountOpen(false);
                    setAccountPanel(null);
                  }}
                />
              </div>
            </section>

            <section className="account-popover-section">
              <span className="account-section-label">IM 在线状态</span>
              <div className="presence-options">
                {imPresenceStatuses.map((item) => (
                  <button
                    className={`presence-option ${
                      imPresenceStatus === item.value ? "selected" : ""
                    }`}
                    type="button"
                    key={item.value}
                    aria-label={`设置 IM 状态为${item.label}`}
                    onClick={() => {
                      setImPresenceStatus(item.value as TrayStatus);
                      setAccountOpen(false);
                      setAccountNotice(null);
                    }}
                  >
                    <span className={`status-dot ${item.value}`} />
                    <span>{item.label}</span>
                    {imPresenceStatus === item.value && <Check size={14} />}
                  </button>
                ))}
              </div>
            </section>

            <section className="account-popover-section">
              <span className="account-section-label">我的入口</span>
              <div className="account-action-list">
                <AccountAction
                  icon={<QrCode size={15} />}
                  label="我的二维码"
                  onClick={() => setAccountPanel("qrcode")}
                />
              </div>
            </section>

            {accountPanel && (
              <AccountDetailPanel
                panel={accountPanel}
                inviteQrs={inviteQrsQuery.data ?? []}
                inviteQrsLoading={inviteQrsQuery.isLoading}
                inviteQrsError={inviteQrsQuery.error}
                onCreateInviteQr={() => createInviteQrMutation.mutate()}
                creatingInviteQr={createInviteQrMutation.isPending}
                onCopy={(text) => {
                  void copyToClipboard(text);
                  setAccountNotice("已复制");
                }}
                onClose={() => setAccountPanel(null)}
              />
            )}

            <div className="account-actions">
              <button type="button" onClick={() => clearAuthSession()}>
                <LogOut size={14} />
                退出登录
              </button>
            </div>

            {accountNotice && (
              <p className="account-notice" role="status">
                {accountNotice}
              </p>
            )}
          </div>
        )}
      </div>
      <nav className="nav-list" aria-label="主导航">
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const badgeCount =
            item.key === "messages"
              ? unreadCount
              : item.key === "onlineService"
                ? Math.max(serviceAlertCount, realtimeServiceAlertCount)
                : 0;
          const badgeLabel = badgeCount > 0 ? `，${badgeCount} 条提醒` : "";
          return (
            <button
              className={`nav-item ${activeModule === item.key ? "active" : ""}`}
              key={item.label}
              aria-label={`${item.label}${badgeLabel}`}
              data-sidebar-tooltip={item.label}
              onClick={() => setActiveModule(item.key)}
            >
              <span className="nav-icon">
                <Icon size={19} />
                {badgeCount > 0 && (
                  <span className="nav-badge" aria-hidden="true">
                    {formatBadgeCount(badgeCount)}
                  </span>
                )}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
        {accountNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={`nav-item account-nav-item ${activeModule === item.key ? "active" : ""}`}
              key={item.label}
              aria-label={item.label}
              data-sidebar-tooltip={item.label}
              onClick={() => {
                setActiveModule(item.key);
                setAccountOpen(false);
                setAccountPanel(null);
                setAccountNotice(null);
              }}
            >
              <span className="nav-icon">
                <Icon size={19} />
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
        <button
          className={`nav-item ${activeModule === settingsNavItem.key ? "active" : ""}`}
          aria-label={settingsNavItem.label}
          data-sidebar-tooltip={settingsNavItem.label}
          onClick={() => setActiveModule(settingsNavItem.key)}
        >
          <span className="nav-icon">
            <Settings size={19} />
          </span>
          <span>{settingsNavItem.label}</span>
        </button>
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-footer-control">
          <button
            className="footer-menu-button"
            type="button"
            aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
            data-sidebar-tooltip={collapsed ? "展开侧边栏" : "收起侧边栏"}
            title={collapsed ? "展开" : "收起"}
            onClick={() => setCollapsed((value) => !value)}
          >
            <Menu size={19} />
          </button>
        </div>
      </div>
    </aside>
  );
}
