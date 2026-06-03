import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  Building2,
  Check,
  ChartSpline,
  ChevronRight,
  ClipboardCheck,
  BookOpenText,
  Headset,
  Info,
  LogOut,
  LayoutDashboard,
  Menu,
  MessageCircleMore,
  MonitorCog,
  Plus,
  QrCode,
  Radio,
  ShieldCheck,
  Star,
  Settings,
  UsersRound,
} from "lucide-react";
import type { TrayStatus } from "../../shared/desktop-api";
import type { AuthSession } from "../data/auth/auth-session";
import { currentSpaceSidebarBadgeCount } from "../spaces/models/spaceRadarModel";
import {
  type CustomerServiceThread,
  type MessageItemDto,
} from "../data/api-client";
import { imConversationEffectiveUnreadCount } from "../data/im-read/im-conversation-read-view";
import { isImConversation } from "../data/message-display";
import { resolveCustomerServiceBadgeView } from "../data/customer-service/customer-service-badge-view";
import { customerServiceRealtimePollIntervalMs } from "../data/customer-service/cs-realtime-config";
import { consumeCustomerServiceMessageReminder } from "../data/customer-service/cs-reminder-model";
import { isExplicitCustomerServiceThreadOpenSource } from "../data/customer-service/customer-service-read-visibility";
import { canUseCustomerServiceStaffEndpoints } from "../data/customer-service/cs-role-capabilities";
import { recordMessageReminderDiagnostic } from "../data/diagnostics/message-reminder-diagnostics";
import {
  useImReadStateByConversation,
  useLocalImConversationReads,
} from "../data/im-read/im-read-store";
import { mergeUnifiedReadStateForIdentity } from "../data/im-read/im-read-view-model";
import {
  applyTaskbarBadge,
  isRendererWindowFocused,
  notifyDesktopOrBrowser,
  shouldPushCustomerServiceQueueReminder,
  shouldPushCustomerServiceThreadMessageReminder,
  shouldShowCustomerServiceThreadMessageDesktopNotificationForTarget,
  shouldShowDesktopNotification,
} from "../data/reminder/reminder-service";
import type { PcRealtimeReminderInput } from "../data/reminder/reminder-types";
import { usePushRealtimeReminder } from "../data/reminder/reminder-store";
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
import type { PcSettings } from "../data/settings/pc-settings";
import { usePcSettings } from "../data/settings/settings-store";
import {
  useActiveThreadId,
  useActiveThreadOpenSource,
  useActiveImConversationId,
  useActiveModule,
  useImPresenceStatus,
  useSetSidebarCollapsed,
  useSidebarCollapsed,
  useSetActiveModule,
  useSetActiveThread,
  useSetCustomerServiceStatus,
  useGatewayRealtimeState,
  useSetImPresenceStatus,
  type CustomerServiceThreadOpenSource,
  type GatewayRealtimeStatus,
} from "../data/workspace-ui/workspace-ui-store";
import { appIconSrc, appProductName } from "../app/appMetadata";
import { requireApiClient } from "../data/runtime";
import { imPresenceStatuses } from "../data/static-config";
import type { CustomerServiceStatus, ModuleKey } from "../data/types";
import {
  getReceptionControlSummary,
  getReceptionStatusOption,
  normalizeReceptionStatus,
  receptionControlStatusOptions,
} from "../customer-service/models/serviceReceptionControlModel";
import { isRiskyCustomerServiceThread } from "../customer-service/models/serviceWorkbenchModel";
import { derivePcWorkspaceAccess } from "../data/workspace-access";
import { formatBadgeCount, formatError } from "../lib/format";
import { useFriendRequestReminderController } from "../contacts/hooks/useFriendRequestReminderController";
import { SpaceRadarPopover } from "../spaces/components/SpaceRadarPopover";
import { useSpaceRadarController } from "../spaces/hooks/useSpaceRadarController";
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

const sidebarReceptionStatusLabels: Record<CustomerServiceStatus, string> = {
  online: "客服在线",
  busy: "客服忙碌",
  break: "短暂离开",
  offline: "客服离线",
};

function accountAvatarDisplayUrl(value?: string | null, version?: number) {
  const trimmed = value?.trim();
  if (!trimmed || !version || /^(blob:|data:)/i.test(trimmed)) return trimmed;
  if (/[?&]t=/.test(trimmed)) return trimmed;
  return `${trimmed}${trimmed.includes("?") ? "&" : "?"}t=${version}`;
}

type SidebarServiceCounter = {
  label: string;
  name: string;
  value: number | string;
  tone: "active" | "warning" | "muted" | "danger";
};

export function Sidebar() {
  const queryClient = useQueryClient();
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountNotice, setAccountNotice] = useState<string | null>(null);
  const [accountPanel, setAccountPanel] = useState<AccountPanel>(null);
  const [brandInfoOpen, setBrandInfoOpen] = useState(false);
  const [serviceStatusOpen, setServiceStatusOpen] = useState(false);
  const [spaceStatusOpen, setSpaceStatusOpen] = useState(false);
  const [appVersion, setAppVersion] = useState("0.1.0");
  const [confirmedServiceStatus, setConfirmedServiceStatus] =
    useState<CustomerServiceStatus | null>(null);
  const activeModule = useActiveModule();
  const gatewayRealtime = useGatewayRealtimeState();
  const activeImConversationId = useActiveImConversationId();
  const sidebarCollapsed = useSidebarCollapsed();
  const setSidebarCollapsed = useSetSidebarCollapsed();
  const setActiveThread = useSetActiveThread();
  const locallyReadConversationReads = useLocalImConversationReads();
  const imReadStateByConversation = useImReadStateByConversation();
  const authSession = useAuthSession();
  const workspaceAccess = derivePcWorkspaceAccess(authSession);
  const clearAuthSession = useClearAuthSession();
  const setActiveModule = useSetActiveModule();
  const imPresenceStatus = useImPresenceStatus();
  const setCustomerServiceStatus = useSetCustomerServiceStatus();
  const setImPresenceStatus = useSetImPresenceStatus();
  const pcSettings = usePcSettings();
  const pushRealtimeReminder = usePushRealtimeReminder();
  const { pendingIncomingRequestCount } = useFriendRequestReminderController();
  const queueReminderReadyRef = useRef(false);
  const queueReminderSessionRef = useRef("");
  const previousQueuedThreadIdsRef = useRef<Set<string>>(new Set());
  const previousSlaRiskThreadIdsRef = useRef<Set<string>>(new Set());
  const previousQueuedCountRef = useRef(0);
  const previousServiceUnreadRef = useRef<Map<string, number>>(new Map());
  const conversationsQuery = useQuery({
    queryKey: pcQueryKeys.imConversationsForSession(authSession),
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
    enabled: Boolean(authSession && workspaceAccess.canReadServiceWorkbench),
    refetchInterval: customerServiceRealtimePollIntervalMs,
    refetchIntervalInBackground: true,
    queryFn: async () => requireApiClient(authSession).getWorkbenchThreads(),
  });
  const canUseStaffEndpoints = canUseCustomerServiceStaffEndpoints(authSession);
  const receptionStatusQuery = useQuery({
    queryKey: pcQueryKeys.customerServiceReception(
      authSession?.apiBaseUrl,
      authSession?.tenantToken,
    ),
    enabled: Boolean(
      authSession &&
        workspaceAccess.canReadServiceWorkbench &&
        canUseStaffEndpoints,
    ),
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
    queryFn: async () => requireApiClient(authSession).getReceptionStatus(),
  });
  const profileQuery = useQuery({
    queryKey: pcQueryKeys.accountProfile(authSession?.apiBaseUrl, authSession?.tenantToken),
    enabled: Boolean(authSession),
    staleTime: 60_000,
    queryFn: async () => requireApiClient(authSession).getMyProfile(),
  });
  const tenantInfoQuery = useQuery({
    queryKey: pcQueryKeys.accountTenant(authSession?.apiBaseUrl, authSession?.tenantToken),
    enabled: Boolean(authSession),
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
  const receptionStatusMutation = useMutation({
    mutationFn: async (serviceStatus: CustomerServiceStatus) => {
      const currentReception = receptionStatusQuery.data;
      return requireApiClient(authSession).updateReceptionStatus({
        serviceStatus,
        queueAcceptEnabled:
          serviceStatus === "online"
            ? (currentReception?.queueAcceptEnabled ?? false)
            : false,
      });
    },
    onSuccess: async (status) => {
      const nextStatus = normalizeReceptionStatus(status.serviceStatus);
      setConfirmedServiceStatus(nextStatus);
      setCustomerServiceStatus(nextStatus);
      await queryClient.invalidateQueries({
        queryKey: pcQueryKeys.customerServiceReception(
          authSession?.apiBaseUrl,
          authSession?.tenantToken,
        ),
      });
      await queryClient.invalidateQueries({
        queryKey: pcQueryKeys.customerServiceThreads(
          authSession?.apiBaseUrl,
          authSession?.tenantToken,
        ),
      });
    },
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
         imConversationEffectiveUnreadCount(
           item,
           authSession
             ? { ...authSession, locallyReadConversationReads: unifiedReadStateForIdentity }
             : null,
           { activeConversationId: activeImConversationId, visibility: "hidden" },
         ),
      0,
    );
  const hasServiceThreadData = Boolean(serviceQuery.data);
  const serviceBadgeView = resolveCustomerServiceBadgeView({
    activeItems: serviceQuery.data?.activeItems,
    queueItems: serviceQuery.data?.queueItems,
    summaryQueuedCount: serviceQuery.data?.summary?.queuedCount,
    threadDataLoaded: hasServiceThreadData,
  });
  const {
    activeServiceUnreadCount,
    activeTempSessions,
    queuedServiceCount,
    queuedTempSessions,
    serviceAlertCount,
    taskbarServiceUnreadCount,
  } = serviceBadgeView;
  const imStatusLabel =
    imPresenceStatuses.find((item) => item.value === imPresenceStatus)?.label ??
    "在线";
  const gatewayStatusNotice = gatewayRealtimeStatusNotice(gatewayRealtime.status);
  const profile = profileQuery.data;
  const tenantInfo = tenantInfoQuery.data;
  const displayName = profile?.displayName || authSession?.displayName || "PC 用户";
  const avatarUrl = accountAvatarDisplayUrl(
    profile?.avatarUrl ?? authSession?.avatarUrl,
    profile?.avatarUrl ? profileQuery.dataUpdatedAt : undefined,
  );
  const shortName = displayName.slice(0, 1).toUpperCase();
  const tenantCode =
    tenantInfo?.tenantCode ||
    authSession?.tenantCode ||
    authSession?.tenantName ||
    authSession?.tenantId ||
    "--";
  const roleLabel = authSession?.roleLabel ?? "成员";
  const signature = profile?.signature || profile?.bio || "暂无签名";
  const spaceCode =
    tenantInfo?.tenantCode || authSession?.tenantCode || authSession?.tenantId || "--";
  const spaceName = tenantInfo?.tenantName || authSession?.tenantName || spaceCode;
  const spaceMeta = "企业空间";
  const tenantLogoUrl = tenantInfo?.logoUrl ?? authSession?.tenantLogoUrl ?? null;
  const spaceRadar = useSpaceRadarController({
    currentTenant: tenantInfo,
    enabled: spaceStatusOpen,
    onSwitchSuccess: () => setSpaceStatusOpen(false),
  });
  const currentSpaceBadgeCount = currentSpaceSidebarBadgeCount({
    contactRequestCount: pendingIncomingRequestCount,
    imUnreadCount: unreadCount,
    serviceAlertCount,
  });
  const accountMeta = profile?.lppId ?? authSession?.lppId ?? spaceCode;
  const appInstance = appInstanceQuery.data;
  const appInstanceLabel = appInstance
    ? formatAppInstanceLabel(appInstance)
    : "正在识别客户端";
  const appInstanceShortId = appInstance?.clientInstanceId.slice(0, 8) ?? "--";
  const productVersionLabel = `专业版 · v${appVersion}`;
  const receptionStatus = receptionStatusQuery.data;
  const effectiveReceptionStatus = confirmedServiceStatus;
  const receptionSummary = getReceptionControlSummary({
    activeSessions: receptionStatus?.activeSessionCount ?? null,
    maxSessions: receptionStatus?.maxConcurrentSessions,
    queueAcceptEnabled: receptionStatus?.queueAcceptEnabled,
    serviceStatus: effectiveReceptionStatus ?? undefined,
  });
  const serviceStatusOption = effectiveReceptionStatus
    ? getReceptionStatusOption(effectiveReceptionStatus)
    : null;
  const serviceStatusTone = serviceStatusOption?.tone ?? "offline";
  const serviceStatusLabel = effectiveReceptionStatus
    ? sidebarReceptionStatusLabels[effectiveReceptionStatus]
    : "状态未同步";
  const activeReceptionCount = receptionStatus?.activeSessionCount ?? null;
  const serviceStatusCounters: SidebarServiceCounter[] = [
    {
      label: "接",
      name: "接待中",
      value: activeReceptionCount ?? "--",
      tone: "active",
    },
    {
      label: "排",
      name: "排队",
      value: hasServiceThreadData ? queuedServiceCount : "--",
      tone: queuedServiceCount > 0 ? "warning" : "muted",
    },
    activeServiceUnreadCount > 0
      ? {
          label: "未",
          name: "未读",
          value: activeServiceUnreadCount,
          tone: "danger",
        }
      : null,
  ].filter((item): item is SidebarServiceCounter => item !== null);
  const serviceStatusCompactDetail = serviceStatusCounters
    .map((item) => `${item.name} ${item.value}`)
    .join(" · ");
  const serviceStatusFullDetail = `${
    typeof receptionStatus?.queueAcceptEnabled === "boolean"
      ? receptionSummary.queueModeLabel
      : "接入模式未同步"
  } · 接待 ${receptionSummary.sessionText} · 排队 ${
    hasServiceThreadData ? queuedServiceCount : "--"
  } · 未读 ${hasServiceThreadData ? activeServiceUnreadCount : "--"}`;
  const collapsed = sidebarCollapsed;
  const activeThreadId = useActiveThreadId();
  const activeThreadOpenSource = useActiveThreadOpenSource();
  const visiblePrimaryNavItems = primaryNavItems.filter((item) =>
    workspaceAccess.visibleModules.includes(item.key),
  );
  const visibleAccountNavItems = accountNavItems.filter((item) =>
    workspaceAccess.visibleModules.includes(item.key),
  );
  const queueReminderSessionKey = authSession
    ? `${authSession.apiBaseUrl}|${authSession.tenantToken}`
    : "";

  useEffect(() => {
    let mounted = true;
    void window.desktopApi?.getAppVersion?.()
      .then((version) => {
        if (mounted && version) setAppVersion(version);
      })
      .catch(() => {
        if (mounted) setAppVersion("0.1.0");
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    void applyTaskbarBadge({
      contactRequestCount: pendingIncomingRequestCount,
      imUnreadCount: unreadCount,
      serviceQueueCount: queuedServiceCount,
      serviceUnreadCount: taskbarServiceUnreadCount,
    });
  }, [
    pendingIncomingRequestCount,
    queuedServiceCount,
    taskbarServiceUnreadCount,
    unreadCount,
  ]);

  useEffect(() => {
    recordMessageReminderDiagnostic({
      event: "cs.sidebar.badge",
      source: "sidebar",
      phase: "badge",
      route: "onlineService",
      classification: {
        activeModule,
        activeThreadId,
        activeThreadOpenSource,
        activeServiceUnreadCount,
        queuedServiceCount,
        serviceAlertCount,
        taskbarServiceUnreadCount,
        resolvedAtMs: Date.now(),
      },
      summary: {
        activeItems: activeTempSessions.slice(0, 10),
        queueItems: queuedTempSessions.slice(0, 10),
      },
    });
  }, [
    activeServiceUnreadCount,
    activeModule,
    activeTempSessions,
    activeThreadId,
    activeThreadOpenSource,
    queuedServiceCount,
    queuedTempSessions,
    serviceAlertCount,
    taskbarServiceUnreadCount,
  ]);

  useEffect(() => {
    const nextStatus = receptionStatus?.serviceStatus;
    if (
      nextStatus === "online" ||
      nextStatus === "busy" ||
      nextStatus === "break" ||
      nextStatus === "offline"
    ) {
      setConfirmedServiceStatus(nextStatus);
      setCustomerServiceStatus(nextStatus);
    }
  }, [receptionStatus?.serviceStatus, setCustomerServiceStatus]);

  useEffect(() => {
    const hasOpenPopover =
      brandInfoOpen || accountOpen || serviceStatusOpen || spaceStatusOpen;
    if (!hasOpenPopover) return;

    const closePopovers = () => {
      setBrandInfoOpen(false);
      setAccountOpen(false);
      setServiceStatusOpen(false);
      setSpaceStatusOpen(false);
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-sidebar-popover-trigger]")) return;
      if (
        target.closest(
          ".sidebar-brand-popover, .account-popover, .sidebar-status-popover",
        )
      ) {
        return;
      }
      closePopovers();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePopovers();
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountOpen, brandInfoOpen, serviceStatusOpen, spaceStatusOpen]);

  useEffect(() => {
    if (!queueReminderSessionKey || !workspaceAccess.canReadServiceWorkbench) {
      queueReminderReadyRef.current = false;
      queueReminderSessionRef.current = "";
      previousQueuedThreadIdsRef.current = new Set();
      previousSlaRiskThreadIdsRef.current = new Set();
      previousQueuedCountRef.current = 0;
      previousServiceUnreadRef.current = new Map();
      return;
    }
    if (queueReminderSessionRef.current !== queueReminderSessionKey) {
      queueReminderSessionRef.current = queueReminderSessionKey;
      queueReminderReadyRef.current = false;
      previousQueuedThreadIdsRef.current = new Set();
      previousSlaRiskThreadIdsRef.current = new Set();
      previousQueuedCountRef.current = 0;
      previousServiceUnreadRef.current = new Map();
    }
    if (!serviceQuery.data) return;

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
    const customerServiceThreads = [...queuedTempSessions, ...activeTempSessions];
    const currentSlaRiskIds = new Set(
      customerServiceThreads
        .filter(isRiskyCustomerServiceThread)
        .map((item) => item.threadId || item.conversationId)
        .filter(Boolean),
    );
    if (!queueReminderReadyRef.current) {
      queueReminderReadyRef.current = true;
      previousQueuedThreadIdsRef.current = currentIds;
      previousSlaRiskThreadIdsRef.current = currentSlaRiskIds;
      previousQueuedCountRef.current = queuedServiceCount;
      previousServiceUnreadRef.current = currentUnread;
      return;
    }

    const newQueuedThreads = queuedTempSessions.filter((item) => {
      const id = item.threadId || item.conversationId;
      return id && !previousQueuedThreadIdsRef.current.has(id);
    });
    const activeUnreadThreads = activeTempSessions.filter((item) => {
      const id = item.threadId || item.conversationId;
      if (!id) return false;
      const current = Math.max(0, Number(item.unreadCount ?? 0));
      const previous = previousServiceUnreadRef.current.get(id) ?? 0;
      return current > 0 && current > previous;
    });
    const queuedCountIncreased =
      queuedServiceCount > previousQueuedCountRef.current && newQueuedThreads.length === 0;
    const newSlaRiskThreads = customerServiceThreads.filter((item) => {
      const id = item.threadId || item.conversationId;
      return (
        id &&
        isRiskyCustomerServiceThread(item) &&
        !previousSlaRiskThreadIdsRef.current.has(id)
      );
    });
    previousQueuedThreadIdsRef.current = currentIds;
    previousSlaRiskThreadIdsRef.current = currentSlaRiskIds;
    previousQueuedCountRef.current = queuedServiceCount;
    previousServiceUnreadRef.current = currentUnread;
    if (
      newQueuedThreads.length === 0 &&
        activeUnreadThreads.length === 0 &&
        newSlaRiskThreads.length === 0 &&
        !queuedCountIncreased
    ) {
      return;
    }
    const shouldPushQueueReminder = shouldPushCustomerServiceQueueReminder(pcSettings);

    const notifyThread = (
      thread: (typeof queuedTempSessions)[number],
      fallbackBody: string,
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
        id: `cs-queue-${id}`,
        title,
        body: fallbackBody || body,
        targetModule: "onlineService",
        targetId: id,
        severity: "warning",
        icon: "service",
      });
      if (shouldShowDesktopNotification(pcSettings, "serviceQueue")) {
        void notifyDesktopOrBrowser(
          {
            title,
            body: fallbackBody || body,
            conversationId: id,
            targetId: id,
            targetModule: "onlineService",
          },
          { channel: "serviceQueue", settings: pcSettings },
        );
      }
    };

    if (shouldPushQueueReminder) {
      newQueuedThreads.forEach((thread) => notifyThread(thread, ""));
    }
    activeUnreadThreads.forEach((thread) =>
      notifyActiveCustomerServiceThreadMessage({
        activeModule,
        activeThreadId,
        activeThreadOpenSource,
        authSession,
        pcSettings,
        pushRealtimeReminder,
        thread,
      }),
    );
    newSlaRiskThreads.forEach((thread) =>
      notifyCustomerServiceSlaRiskThread({
        pcSettings,
        pushRealtimeReminder,
        thread,
      }),
    );
    if (queuedCountIncreased && shouldPushQueueReminder) {
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
        void notifyDesktopOrBrowser(
          { title, body, targetModule: "onlineService" },
          { channel: "serviceQueue", settings: pcSettings },
        );
      }
    }
  }, [
    activeModule,
    activeThreadId,
    activeThreadOpenSource,
    activeTempSessions,
    authSession,
    pcSettings.desktopNotifications,
    pcSettings.customerServiceMessageNotifications,
    pcSettings.notificationPreview,
    pcSettings.notificationSound,
    pcSettings.serviceQueueNotifications,
    pcSettings.slaTimeoutNotifications,
    pushRealtimeReminder,
    activeServiceUnreadCount,
    serviceQuery.data,
    queuedServiceCount,
    queuedTempSessions,
    queueReminderSessionKey,
    workspaceAccess.canReadServiceWorkbench,
  ]);

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-brand">
        <button
          className="sidebar-brand-button"
          type="button"
          aria-expanded={brandInfoOpen}
          aria-label={`${appProductName}，${productVersionLabel}`}
          data-sidebar-popover-trigger="brand"
          data-sidebar-tooltip={`${appProductName} ${productVersionLabel}`}
          onClick={() => {
            setBrandInfoOpen((opened) => !opened);
            setAccountOpen(false);
            setServiceStatusOpen(false);
            setSpaceStatusOpen(false);
          }}
        >
          <span className="sidebar-brand-logo" aria-hidden="true">
            <img alt="" src={appIconSrc} />
          </span>
          <span className="sidebar-brand-copy">
            <strong>LPP</strong>
            <em>{productVersionLabel}</em>
          </span>
        </button>
        {brandInfoOpen && (
          <div className="sidebar-brand-popover" role="dialog" aria-label="关于 LPP">
            <div className="sidebar-brand-popover-title">
              <span className="sidebar-brand-logo small" aria-hidden="true">
                <img alt="" src={appIconSrc} />
              </span>
              <span>
                <strong>{appProductName}</strong>
                <em>{productVersionLabel}</em>
              </span>
            </div>
            <button
              className="sidebar-status-action"
              type="button"
              onClick={() => {
                setActiveModule("settings");
                setBrandInfoOpen(false);
              }}
            >
              <Info size={15} />
              帮助 / 关于 / 检查更新
            </button>
          </div>
        )}
      </div>
      <nav className="nav-list" aria-label="主导航">
        {visiblePrimaryNavItems.map((item) => {
          const Icon = item.icon;
          const badgeCount =
            item.key === "messages"
              ? unreadCount
              : item.key === "onlineService"
                ? serviceAlertCount
                : item.key === "contacts"
                  ? pendingIncomingRequestCount
                : 0;
          const badgeLabel =
            badgeCount > 0
              ? item.key === "contacts"
                ? `，${badgeCount} 条好友申请`
                : `，${badgeCount} 条提醒`
              : "";
          return (
            <button
              className={`nav-item ${activeModule === item.key ? "active" : ""}`}
              key={item.label}
              aria-label={`${item.label}${badgeLabel}`}
              data-sidebar-tooltip={item.label}
              onClick={() => {
                if (item.key === "onlineService") {
                  setActiveThread("");
                }
                setActiveModule(item.key);
                setBrandInfoOpen(false);
                setAccountOpen(false);
                setServiceStatusOpen(false);
                setSpaceStatusOpen(false);
              }}
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
        {visibleAccountNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={`nav-item account-nav-item ${activeModule === item.key ? "active" : ""}`}
              key={item.label}
              aria-label={item.label}
              data-sidebar-tooltip={item.label}
              onClick={() => {
                setActiveModule(item.key);
                setBrandInfoOpen(false);
                setAccountOpen(false);
                setServiceStatusOpen(false);
                setSpaceStatusOpen(false);
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
          onClick={() => {
            setActiveModule(settingsNavItem.key);
            setBrandInfoOpen(false);
            setAccountOpen(false);
            setServiceStatusOpen(false);
            setSpaceStatusOpen(false);
          }}
        >
          <span className="nav-icon">
            <Settings size={19} />
          </span>
          <span>{settingsNavItem.label}</span>
        </button>
      </nav>
      <div className="sidebar-footer">
        {gatewayStatusNotice && (
          <div
            className={`sidebar-realtime-status ${gatewayStatusNotice.kind}`}
            title={gatewayStatusNotice.title}
          >
            <Radio size={13} aria-hidden="true" />
            <span>{gatewayStatusNotice.label}</span>
          </div>
        )}
        <div className="sidebar-status-center" aria-label="状态中心">
          <div className="account-entry sidebar-footer-account-entry">
            <button
              className="account-button"
              type="button"
              aria-expanded={accountOpen}
              aria-label={`${displayName}，${accountMeta}，状态：${imStatusLabel}`}
              data-sidebar-popover-trigger="account"
              data-sidebar-tooltip={`${displayName} · ${accountMeta}`}
              data-testid="account-entry-button"
              title="打开账号资料"
              onClick={() => {
                setAccountOpen((opened) => !opened);
                setBrandInfoOpen(false);
                setServiceStatusOpen(false);
                setSpaceStatusOpen(false);
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
                <em>
                  <span
                    className={`sidebar-status-dot ${imPresenceStatus}`}
                    aria-hidden="true"
                  />
                  {imStatusLabel}
                </em>
              </span>
              <ChevronRight className="account-chevron" size={15} aria-hidden="true" />
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
                    <span>
                      {profile?.lppId ?? authSession?.lppId ?? authSession?.userId ?? "--"}
                    </span>
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
                  <span className="account-section-label">IM 状态</span>
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
          {workspaceAccess.canReadServiceWorkbench && (
            <div className="sidebar-status-row-wrap">
              <button
                className={`sidebar-status-row sidebar-service-status-row ${serviceStatusTone}`}
                type="button"
                aria-expanded={serviceStatusOpen}
                aria-label={`在线客服：${serviceStatusLabel}`}
                data-sidebar-popover-trigger="service"
                data-sidebar-tooltip={`在线客服 · ${serviceStatusLabel}`}
                onClick={() => {
                  setServiceStatusOpen((opened) => !opened);
                  setBrandInfoOpen(false);
                  setAccountOpen(false);
                  setSpaceStatusOpen(false);
                }}
              >
                <Headset size={16} aria-hidden="true" />
                <span className="sidebar-status-copy">
                  <strong>{serviceStatusLabel}</strong>
                  <span
                    className="sidebar-service-counters"
                    aria-label={serviceStatusCompactDetail}
                    title={serviceStatusCompactDetail}
                  >
                    {serviceStatusCounters.map((item) => (
                      <span
                        className={`sidebar-service-counter ${item.tone}`}
                        key={item.label}
                      >
                        <span>{item.label}</span>
                        <b>{item.value}</b>
                      </span>
                    ))}
                  </span>
                </span>
                <ChevronRight size={14} aria-hidden="true" />
              </button>
              {serviceStatusOpen && (
                <div
                  className="sidebar-status-popover sidebar-service-status-popover"
                  role="dialog"
                  aria-label="在线客服状态"
                >
                  <strong>{serviceStatusLabel}</strong>
                  <span>{serviceStatusFullDetail}</span>
                  {receptionStatusQuery.error && (
                    <span className="sidebar-status-error">
                      接待状态同步失败：{formatError(receptionStatusQuery.error)}
                    </span>
                  )}
                  <div
                    className="sidebar-service-status-options"
                    role="radiogroup"
                    aria-label="客服接待状态"
                  >
                    {receptionControlStatusOptions.map((item) => (
                      <button
                        className={`sidebar-status-option service-${item.tone} ${
                          effectiveReceptionStatus === item.value ? "selected" : ""
                        }`}
                        type="button"
                        role="radio"
                        aria-checked={effectiveReceptionStatus === item.value}
                        disabled={receptionStatusMutation.isPending}
                        key={item.value}
                        onClick={() => receptionStatusMutation.mutate(item.value)}
                      >
                        <span
                          className={`sidebar-status-dot service-${item.tone}`}
                          aria-hidden="true"
                        />
                        <span>{sidebarReceptionStatusLabels[item.value]}</span>
                        {effectiveReceptionStatus === item.value && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                  <div className="sidebar-service-metrics">
                    <b>接待 {receptionSummary.sessionText}</b>
                    <b>{receptionSummary.queueModeLabel}</b>
                    <b>排队 {hasServiceThreadData ? queuedServiceCount : "--"}</b>
                    <b>未读 {hasServiceThreadData ? activeServiceUnreadCount : "--"}</b>
                  </div>
                  <button
                    className="sidebar-status-action"
                    type="button"
                    onClick={() => {
                      setActiveThread("");
                      setActiveModule("onlineService");
                      setServiceStatusOpen(false);
                    }}
                  >
                    <Headset size={15} />
                    进入在线客服
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="sidebar-status-row-wrap">
            <button
              className={`sidebar-status-row sidebar-space-status-row ${
                currentSpaceBadgeCount > 0 ? "has-space-alert" : ""
              }`}
              type="button"
              aria-expanded={spaceStatusOpen}
              aria-label={`当前空间：${spaceName}，企业码 ${spaceCode}`}
              data-sidebar-popover-trigger="space"
              data-sidebar-tooltip={`空间 · ${spaceName} · ${spaceCode}${
                currentSpaceBadgeCount > 0
                  ? ` · ${formatBadgeCount(currentSpaceBadgeCount)} 条未处理`
                  : ""
              }`}
              onClick={() => {
                setSpaceStatusOpen((opened) => !opened);
                setBrandInfoOpen(false);
                setAccountOpen(false);
                setServiceStatusOpen(false);
              }}
            >
              {tenantLogoUrl || spaceCode !== "--" ? (
                <PcAvatar
                  avatarUrl={tenantLogoUrl}
                  className="sidebar-space-logo"
                  iconSize={16}
                  kind="tenant"
                  name={spaceCode !== "--" ? spaceCode : spaceName}
                />
              ) : (
                <span className="sidebar-space-logo sidebar-space-logo-empty" aria-hidden="true">
                  <Building2 size={16} />
                </span>
              )}
              <span className="sidebar-status-copy">
                <strong>{spaceCode}</strong>
                <em>{spaceMeta}</em>
              </span>
              {currentSpaceBadgeCount > 0 && (
                <span className="sidebar-space-unread-badge" aria-hidden="true">
                  {formatBadgeCount(currentSpaceBadgeCount)}
                </span>
              )}
              <ChevronRight size={14} aria-hidden="true" />
            </button>
            {spaceStatusOpen && (
              <SpaceRadarPopover
                canSwitch={Boolean(authSession?.platformToken)}
                onManageSpaces={() => {
                  setActiveModule("enterpriseSwitch");
                  setSpaceStatusOpen(false);
                }}
                onSwitchSpace={spaceRadar.switchSpace}
                spacesError={spaceRadar.spacesError}
                spacesLoading={spaceRadar.spacesLoading}
                switchError={spaceRadar.switchSpaceMutation.error}
                switchingIdentityKey={spaceRadar.switchingIdentityKey}
                unreadSummaryError={spaceRadar.unreadSummaryError}
                unreadSummaryLoading={spaceRadar.unreadSummaryLoading}
                viewModel={spaceRadar.viewModel}
              />
            )}
          </div>

          <button
            className="sidebar-collapse-button"
            type="button"
            aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
            data-sidebar-tooltip={collapsed ? "展开侧边栏" : "收起侧边栏"}
            title={collapsed ? "展开" : "收起"}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <Menu size={19} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function notifyActiveCustomerServiceThreadMessage({
  activeModule,
  activeThreadId,
  activeThreadOpenSource,
  authSession,
  pcSettings,
  pushRealtimeReminder,
  thread,
}: {
  activeModule: ModuleKey;
  activeThreadId?: string | null;
  activeThreadOpenSource?: CustomerServiceThreadOpenSource;
  authSession: AuthSession | null;
  pcSettings: PcSettings;
  pushRealtimeReminder: (reminder: PcRealtimeReminderInput) => void;
  thread: CustomerServiceThread;
}) {
  if (!shouldPushCustomerServiceThreadMessageReminder(pcSettings)) return;
  const targetId = thread.threadId || thread.conversationId;
  if (!targetId) return;
  const message = customerServiceThreadReminderMessage(thread);
  const reminderDecision = consumeCustomerServiceMessageReminder({
    identity: authSession,
    message,
    source: "thread",
    targetId,
  });
  recordMessageReminderDiagnostic({
    event: "cs.sidebar.message-reminder",
    source: "sidebar",
    phase: "thread-unread",
    route: "onlineService",
    classification: {
      activeModule,
      activeThreadId,
      messageId: message.messageId,
      shouldNotify: reminderDecision.shouldNotify,
      skippedReason: reminderDecision.skippedReason,
      targetId,
      threadId: thread.threadId,
      unreadCount: thread.unreadCount,
    },
    summary: {
      thread,
    },
  });
  if (!reminderDecision.shouldNotify) return;

  const title = thread.title || "在线客服新消息";
  const body = thread.lastMessagePreview || "在线客服会话有新消息";
  pushRealtimeReminder({
    id: reminderDecision.reminderId,
    title,
    body,
    targetModule: "onlineService",
    targetId,
    severity: "warning",
    icon: "service",
  });
  const shouldShowDesktop = shouldShowCustomerServiceThreadMessageDesktopNotificationForTarget(
    pcSettings,
    {
      activeModule,
      activeTargetId: isExplicitCustomerServiceThreadOpenSource(activeThreadOpenSource)
        ? (activeThreadId ?? undefined)
        : undefined,
      targetId,
      targetModule: "onlineService",
      windowFocused: isRendererWindowFocused(),
    },
  );
  recordMessageReminderDiagnostic({
    event: "cs.sidebar.desktop-decision",
    source: "sidebar",
    phase: "thread-unread",
    route: "onlineService",
    classification: {
      activeModule,
      activeThreadId,
      shouldShowDesktop,
      targetId,
      windowFocused: isRendererWindowFocused(),
    },
  });
  if (!shouldShowDesktop) return;
  void notifyDesktopOrBrowser(
    {
      title,
      body,
      conversationId: targetId,
      targetId,
      targetModule: "onlineService",
    },
    {
      authToken: authSession?.tenantToken,
      channel: "serviceQueue",
      settings: pcSettings,
    },
  );
}

function notifyCustomerServiceSlaRiskThread({
  pcSettings,
  pushRealtimeReminder,
  thread,
}: {
  pcSettings: PcSettings;
  pushRealtimeReminder: (reminder: PcRealtimeReminderInput) => void;
  thread: CustomerServiceThread;
}) {
  const targetId = thread.threadId || thread.conversationId;
  if (!targetId || !pcSettings.slaTimeoutNotifications) return;
  const title = "SLA 超时提醒";
  const body = thread.title
    ? `${thread.title} 接近超时或已经超时`
    : "在线客服会话接近超时或已经超时";

  pushRealtimeReminder({
    id: `cs-sla-${targetId}`,
    title,
    body,
    targetModule: "onlineService",
    targetId,
    severity: "critical",
    icon: "sla",
  });
  if (!shouldShowDesktopNotification(pcSettings, "sla")) return;
  void notifyDesktopOrBrowser(
    {
      title,
      body,
      conversationId: targetId,
      targetId,
      targetModule: "onlineService",
    },
    {
      channel: "sla",
      settings: pcSettings,
    },
  );
}

function customerServiceThreadReminderMessage(thread: CustomerServiceThread): MessageItemDto {
  const record = thread as unknown as Record<string, unknown>;
  const messageId =
    stringValue(record.lastMessageId) ||
    stringValue(record.messageId) ||
    [
      thread.threadId || thread.conversationId,
      thread.lastMessageAt ?? "",
      thread.lastMessagePreview ?? "",
      thread.unreadCount ?? 0,
    ].join("|");
  return {
    body: { text: thread.lastMessagePreview ?? "" },
    conversationId: thread.conversationId || thread.threadId,
    messageId,
    messageType: "text",
    preview: thread.lastMessagePreview || "在线客服会话有新消息",
    sentAt: thread.lastMessageAt ?? thread.updatedAt ?? new Date().toISOString(),
  };
}

function gatewayRealtimeStatusNotice(status: GatewayRealtimeStatus) {
  if (status === "connected" || status === "idle") return null;
  if (status === "connecting") {
    return {
      kind: "syncing",
      label: "实时连接中",
      title: "正在建立消息长连接",
    };
  }
  if (status === "reconnecting" || status === "retrying") {
    return {
      kind: "syncing",
      label: "实时同步中",
      title: "消息长连接正在恢复，恢复后会补齐缺失消息",
    };
  }
  return {
    kind: "offline",
    label: "实时连接异常",
    title: "消息长连接不可用，客户端会持续重连",
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}
