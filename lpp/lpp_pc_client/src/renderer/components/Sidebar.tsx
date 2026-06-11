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
import { gatewayRealtimeStatusNotice } from "../shell/models/gatewayRealtimeNoticeModel";
import { currentSpaceSidebarBadgeCount } from "../spaces/models/spaceRadarModel";
import {
  type CustomerServiceThread,
  type MessageItemDto,
} from "../data/api-client";
import { imConversationEffectiveUnreadCount } from "../data/im-read/im-conversation-read-view";
import { isImConversation } from "../data/message-display";
import { resolveCustomerServiceBadgeView } from "../data/customer-service/customer-service-badge-view";
import {
  customerServiceRealtimePollIntervalMs,
  customerServiceReceptionPollIntervalMs,
  customerServiceRealtimeRefetchInBackground,
  customerServiceReceptionRefetchInBackground,
} from "../data/customer-service/cs-realtime-config";
import { consumeCustomerServiceMessageReminder } from "../data/customer-service/cs-reminder-model";
import { isExplicitCustomerServiceThreadOpenSource } from "../data/customer-service/customer-service-read-visibility";
import { canControlCustomerServiceReception } from "../data/customer-service/cs-role-capabilities";
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
  shouldPushCustomerServiceThreadMessageInAppReminder,
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
} from "../data/workspace-ui/workspace-ui-store";
import { appIconSrc, appProductName } from "../app/appMetadata";
import { requireApiClient } from "../data/runtime";
import { imPresenceStatuses } from "../data/static-config";
import type { CustomerServiceStatus, ModuleKey } from "../data/types";
import {
  getQueueAutoDisabledReasonKey,
  getReceptionControlSummary,
  getReceptionQueueModeDescriptionKey,
  getReceptionQueueModeLabelKey,
  getReceptionStatusOption,
  normalizeReceptionStatus,
  receptionControlStatusOptions,
  resolveReceptionQueueModePatch,
  type ReceptionQueueMode,
} from "../customer-service/models/serviceReceptionControlModel";
import { isRiskyCustomerServiceThread } from "../customer-service/models/serviceWorkbenchModel";
import { derivePcWorkspaceAccess } from "../data/workspace-access";
import { useI18n } from "../i18n/useI18n";
import { formatBadgeCount, formatError } from "../lib/format";
import { useFriendRequestReminderController } from "../contacts/hooks/useFriendRequestReminderController";
import { SpaceRadarPopover } from "../spaces/components/SpaceRadarPopover";
import { useSpaceRadarController } from "../spaces/hooks/useSpaceRadarController";
import { useImConversationsQuery } from "../messages/hooks/useImConversationsQuery";
import { useTenantJoinReminderController } from "../spaces/hooks/useTenantJoinReminderController";
import { PcAvatar } from "./PcAvatar";
import {
  AccountAction,
  AccountDetailPanel,
  copyToClipboard,
  type AccountPanel,
} from "./SidebarAccountPanels";

const primaryNavItems = [
  { key: "messages", label: "Messages", icon: MessageCircleMore },
  { key: "onlineService", label: "Customer Service", icon: Headset },
  { key: "contacts", label: "Contacts", icon: UsersRound },
  { key: "workbench", label: "Workbench", icon: LayoutDashboard },
  { key: "ticketCenter", label: "Tickets", icon: ClipboardCheck },
  { key: "dataCenter", label: "Data Center", icon: ChartSpline },
  { key: "knowledgeBase", label: "Knowledge Base", icon: BookOpenText },
] satisfies Array<{ key: ModuleKey; label: string; icon: typeof MessageCircleMore }>;

const settingsNavItem = { key: "settings", label: "Settings", icon: Settings } satisfies {
  key: ModuleKey;
  label: string;
  icon: typeof Settings;
};

const accountNavItems = [
  { key: "enterpriseSwitch", label: "Spaces", icon: Building2 },
  { key: "favorites", label: "Favorites", icon: Star },
] satisfies Array<{
  key: ModuleKey;
  label: string;
  icon: typeof Building2;
}>;

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

function navLabelKey(moduleKey: ModuleKey) {
  switch (moduleKey) {
    case "contacts":
      return "nav.contacts";
    case "dataCenter":
      return "nav.dataCenter";
    case "enterpriseSwitch":
      return "nav.enterpriseSwitch";
    case "favorites":
      return "nav.favorites";
    case "knowledgeBase":
      return "nav.knowledgeBase";
    case "messages":
      return "nav.messages";
    case "onlineService":
      return "nav.onlineService";
    case "settings":
      return "nav.settings";
    case "ticketCenter":
      return "nav.ticketCenter";
    case "workbench":
      return "nav.workbench";
    default:
      return "nav.messages";
  }
}

export function Sidebar() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountNotice, setAccountNotice] = useState<string | null>(null);
  const [accountPanel, setAccountPanel] = useState<AccountPanel>(null);
  const [brandInfoOpen, setBrandInfoOpen] = useState(false);
  const [serviceStatusOpen, setServiceStatusOpen] = useState(false);
  const [spaceStatusOpen, setSpaceStatusOpen] = useState(false);
  const [appVersion, setAppVersion] = useState("0.1.0");
  const [confirmedServiceStatus, setConfirmedServiceStatus] =
    useState<CustomerServiceStatus | null>(null);
  const [confirmedQueueAcceptEnabled, setConfirmedQueueAcceptEnabled] =
    useState<boolean | null>(null);
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
  useTenantJoinReminderController();
  const queueReminderReadyRef = useRef(false);
  const queueReminderSessionRef = useRef("");
  const previousQueuedThreadIdsRef = useRef<Set<string>>(new Set());
  const previousSlaRiskThreadIdsRef = useRef<Set<string>>(new Set());
  const previousQueuedCountRef = useRef(0);
  const previousServiceUnreadRef = useRef<Map<string, number>>(new Map());
  const conversationsQuery = useImConversationsQuery(authSession);
  const serviceQuery = useQuery({
    queryKey: pcQueryKeys.customerServiceThreads(
      authSession?.apiBaseUrl,
      authSession?.tenantToken,
    ),
    enabled: Boolean(authSession && workspaceAccess.canReadServiceWorkbench),
    refetchInterval: customerServiceRealtimePollIntervalMs,
    refetchIntervalInBackground: customerServiceRealtimeRefetchInBackground,
    queryFn: async () => requireApiClient(authSession).getWorkbenchThreads(),
  });
  const canControlReception = canControlCustomerServiceReception(authSession);
  const receptionStatusQuery = useQuery({
    queryKey: pcQueryKeys.customerServiceReception(
      authSession?.apiBaseUrl,
      authSession?.tenantToken,
    ),
    enabled: Boolean(
      authSession &&
        workspaceAccess.canReadServiceWorkbench &&
        canControlReception,
    ),
    refetchInterval: customerServiceReceptionPollIntervalMs,
    refetchIntervalInBackground: customerServiceReceptionRefetchInBackground,
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
    onSuccess: () => setAccountNotice(t("sidebar.account.openedNewClient")),
    onError: (error) => setAccountNotice(t("sidebar.account.openClientFailed", { error: formatError(error) })),
  });
  const invalidateReceptionAndThreads = async () => {
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
  };
  const receptionStatusMutation = useMutation({
    mutationFn: async (serviceStatus: CustomerServiceStatus) => {
      if (!canControlReception) throw new Error(t("sidebar.service.receptionNotSynced"));
      const currentReception = receptionStatusQuery.data;
      return requireApiClient(authSession).updateReceptionStatus({
        serviceStatus,
        queueAcceptEnabled:
          serviceStatus === "online"
            ? (confirmedQueueAcceptEnabled ?? currentReception?.queueAcceptEnabled ?? false)
            : false,
      });
    },
    onMutate: (serviceStatus) => {
      const previous = {
        queueAcceptEnabled: confirmedQueueAcceptEnabled,
        serviceStatus: confirmedServiceStatus,
      };
      const nextQueueAcceptEnabled =
        serviceStatus === "online"
          ? (confirmedQueueAcceptEnabled ??
            receptionStatusQuery.data?.queueAcceptEnabled ??
            false)
          : false;
      setConfirmedServiceStatus(serviceStatus);
      setConfirmedQueueAcceptEnabled(nextQueueAcceptEnabled);
      setCustomerServiceStatus(serviceStatus);
      return previous;
    },
    onError: (_error, _serviceStatus, previous) => {
      if (!previous) return;
      setConfirmedServiceStatus(previous.serviceStatus);
      setConfirmedQueueAcceptEnabled(previous.queueAcceptEnabled);
      if (previous.serviceStatus) setCustomerServiceStatus(previous.serviceStatus);
    },
    onSuccess: async (status) => {
      const nextStatus = normalizeReceptionStatus(status.serviceStatus);
      setConfirmedServiceStatus(nextStatus);
      setConfirmedQueueAcceptEnabled(Boolean(status.queueAcceptEnabled));
      setCustomerServiceStatus(nextStatus);
      await invalidateReceptionAndThreads();
    },
  });
  const queueAcceptMutation = useMutation({
    mutationFn: async (mode: ReceptionQueueMode) => {
      if (!canControlReception) throw new Error(t("sidebar.service.receptionNotSynced"));
      const serviceStatus = receptionStatusQuery.data?.serviceStatus ?? confirmedServiceStatus;
      const patch = resolveReceptionQueueModePatch(mode, serviceStatus);
      if (!patch) throw new Error(t("sidebar.service.receptionNotSynced"));
      return requireApiClient(authSession).updateReceptionStatus(patch);
    },
    onMutate: (mode) => {
      const serviceStatus = confirmedServiceStatus ?? receptionStatusQuery.data?.serviceStatus;
      const patch = resolveReceptionQueueModePatch(mode, serviceStatus);
      const previous = {
        queueAcceptEnabled: confirmedQueueAcceptEnabled,
        serviceStatus: confirmedServiceStatus,
      };
      if (!patch) return previous;
      setConfirmedServiceStatus(patch.serviceStatus);
      setConfirmedQueueAcceptEnabled(patch.queueAcceptEnabled);
      setCustomerServiceStatus(patch.serviceStatus);
      return previous;
    },
    onError: (_error, _mode, previous) => {
      if (!previous) return;
      setConfirmedServiceStatus(previous.serviceStatus);
      setConfirmedQueueAcceptEnabled(previous.queueAcceptEnabled);
      if (previous.serviceStatus) setCustomerServiceStatus(previous.serviceStatus);
    },
    onSuccess: async (status) => {
      const nextStatus = normalizeReceptionStatus(status.serviceStatus);
      setConfirmedServiceStatus(nextStatus);
      setConfirmedQueueAcceptEnabled(Boolean(status.queueAcceptEnabled));
      setCustomerServiceStatus(nextStatus);
      await invalidateReceptionAndThreads();
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
        message: t("sidebar.account.inviteQrMessage"),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["pc-account-invite-qrs"] });
    },
    onError: (error) => setAccountNotice(t("sidebar.account.createQrFailed", { error: formatError(error) })),
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
    t(imPresenceStatuses.find((item) => item.value === imPresenceStatus)?.labelKey ?? "sidebar.presence.online");
  const gatewayStatusNotice = gatewayRealtimeStatusNotice(gatewayRealtime.status);
  const profile = profileQuery.data;
  const tenantInfo = tenantInfoQuery.data;
  const displayName = profile?.displayName || authSession?.displayName || t("sidebar.account.pcUser");
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
  const roleLabel = authSession?.roleLabel ?? t("sidebar.account.member");
  const signature = profile?.signature || profile?.bio || t("sidebar.account.noSignature");
  const isPersonalSpace =
    authSession?.spaceType === 1 || authSession?.roleLabel === t("sidebar.space.personal");
  const spaceCode =
    tenantInfo?.tenantCode || authSession?.tenantCode || authSession?.tenantId || "--";
  const spaceName = isPersonalSpace
    ? t("sidebar.space.personal")
    : tenantInfo?.tenantName || authSession?.tenantName || t("sidebar.space.enterprise");
  const spaceMeta = isPersonalSpace
    ? (profile?.lppId ?? authSession?.lppId ?? t("sidebar.space.personalAccount"))
    : spaceCode !== "--"
      ? t("sidebar.space.enterpriseCode", { code: spaceCode })
      : t("sidebar.space.enterprise");
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
    : t("sidebar.account.identifyingClient");
  const appInstanceShortId = appInstance?.clientInstanceId.slice(0, 8) ?? "--";
  const productVersionLabel = t("sidebar.productVersion", { version: appVersion });
  const receptionStatus = receptionStatusQuery.data;
  const effectiveReceptionStatus = confirmedServiceStatus;
  const activeServiceCount = hasServiceThreadData ? activeTempSessions.length : null;
  const receptionSummary = getReceptionControlSummary({
    activeSessions: activeServiceCount,
    maxSessions: receptionStatus?.maxConcurrentSessions,
    queueAcceptEnabled: confirmedQueueAcceptEnabled ?? receptionStatus?.queueAcceptEnabled,
    serviceStatus: effectiveReceptionStatus ?? undefined,
  });
  const queueAutoDisabledReasonKey = getQueueAutoDisabledReasonKey(effectiveReceptionStatus);
  const serviceStatusOption = effectiveReceptionStatus
    ? getReceptionStatusOption(effectiveReceptionStatus)
    : null;
  const serviceStatusTone = serviceStatusOption?.tone ?? "offline";
  const serviceStatusLabel = effectiveReceptionStatus
    ? t(`sidebar.service.status.${effectiveReceptionStatus}`)
    : t("sidebar.service.statusUnsynced");
  const serviceStatusCounters: SidebarServiceCounter[] = [
    {
      label: t("sidebar.service.counterReceptionShort"),
      name: t("sidebar.service.counterReception"),
      value: activeServiceCount ?? "--",
      tone: "active",
    },
    {
      label: t("sidebar.service.counterQueueShort"),
      name: t("sidebar.service.counterQueue"),
      value: hasServiceThreadData ? queuedServiceCount : "--",
      tone: queuedServiceCount > 0 ? "warning" : "muted",
    },
    activeServiceUnreadCount > 0
      ? {
          label: t("sidebar.service.counterUnreadShort"),
          name: t("sidebar.service.counterUnread"),
          value: activeServiceUnreadCount,
          tone: "danger",
        }
      : null,
  ].filter((item): item is SidebarServiceCounter => item !== null);
  const serviceStatusCompactDetail = serviceStatusCounters
    .map((item) => `${item.name} ${item.value}`)
    .join(" · ");
  const serviceStatusFullDetail = t("sidebar.service.fullDetail", {
    reception: receptionSummary.sessionText,
    queue: hasServiceThreadData ? queuedServiceCount : "--",
    unread: hasServiceThreadData ? activeServiceUnreadCount : "--",
  });
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
    if (typeof receptionStatus?.queueAcceptEnabled === "boolean") {
      setConfirmedQueueAcceptEnabled(receptionStatus.queueAcceptEnabled);
    }
  }, [receptionStatus?.queueAcceptEnabled]);

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
      const title = thread.title || t("sidebar.notification.newServiceThread");
      const source =
        thread.source ||
        thread.channel ||
        thread.sourceChannel ||
        thread.entryChannel ||
        thread.platform ||
        thread.provider;
      const body = source
        ? t("sidebar.notification.queueFromSource", { source: String(source) })
        : t("sidebar.notification.queueBody");
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
        text: {
          messageBody: t("sidebar.notification.serviceMessageBody"),
          messageTitle: t("sidebar.notification.serviceMessageTitle"),
        },
        thread,
      }),
    );
    newSlaRiskThreads.forEach((thread) =>
      notifyCustomerServiceSlaRiskThread({
        pcSettings,
        pushRealtimeReminder,
        text: {
          body: t("sidebar.notification.slaBody"),
          bodyNamedTemplate: t("sidebar.notification.slaBodyNamed", {
            title: "{title}",
          }),
          title: t("sidebar.notification.slaTitle"),
        },
        thread,
      }),
    );
    if (queuedCountIncreased && shouldPushQueueReminder) {
      const title = t("sidebar.notification.newServiceThread");
      const body = t("sidebar.notification.queueCountBody");
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
    pcSettings.foregroundInAppCustomerServiceReminders,
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
    t,
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
          <div className="sidebar-brand-popover" role="dialog" aria-label={t("sidebar.brand.about")}>
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
              {t("sidebar.brand.helpAboutUpdate")}
            </button>
          </div>
        )}
      </div>
      <nav className="nav-list" aria-label={t("sidebar.navAria")}>
        {visiblePrimaryNavItems.map((item) => {
          const Icon = item.icon;
          const itemLabel = t(navLabelKey(item.key));
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
                ? t("sidebar.badge.friendRequestsSuffix", { count: badgeCount })
                : t("sidebar.badge.remindersSuffix", { count: badgeCount })
              : "";
          return (
            <button
              className={`nav-item ${activeModule === item.key ? "active" : ""}`}
              key={item.key}
              aria-label={`${itemLabel}${badgeLabel}`}
              data-sidebar-tooltip={itemLabel}
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
              <span>{itemLabel}</span>
            </button>
          );
        })}
        {visibleAccountNavItems.map((item) => {
          const Icon = item.icon;
          const itemLabel = t(navLabelKey(item.key));
          return (
            <button
              className={`nav-item account-nav-item ${activeModule === item.key ? "active" : ""}`}
              key={item.key}
              aria-label={itemLabel}
              data-sidebar-tooltip={itemLabel}
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
              <span>{itemLabel}</span>
            </button>
          );
        })}
        {(() => {
          const itemLabel = t(navLabelKey(settingsNavItem.key));
          return (
        <button
          className={`nav-item ${activeModule === settingsNavItem.key ? "active" : ""}`}
          aria-label={itemLabel}
          data-sidebar-tooltip={itemLabel}
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
          <span>{itemLabel}</span>
        </button>
          );
        })()}
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
        <div className="sidebar-status-center" aria-label={t("sidebar.statusCenter")}>
          <div className="account-entry sidebar-footer-account-entry">
            <button
              className="account-button"
              type="button"
              aria-expanded={accountOpen}
              aria-label={t("sidebar.account.entryAria", {
                account: accountMeta,
                name: displayName,
                status: imStatusLabel,
              })}
              data-sidebar-popover-trigger="account"
              data-sidebar-tooltip={`${displayName} · ${accountMeta}`}
              data-testid="account-entry-button"
              title={t("sidebar.account.openProfile")}
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
                <strong>{shortName.length > 0 ? displayName : t("sidebar.account.pcUser")}</strong>
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
              <div className="account-popover" role="dialog" aria-label={t("sidebar.account.myAccount")}>
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
                  <span className="account-section-label">{t("sidebar.account.accountAndClient")}</span>
                  <div className="account-client-card">
                    <span>
                      <MonitorCog size={15} />
                      <strong>{appInstanceLabel}</strong>
                    </span>
                    <em>{t("sidebar.account.instance", { id: appInstanceShortId })}</em>
                  </div>
                  <div className="account-action-list">
                    <AccountAction
                      icon={<Plus size={15} />}
                      label={openAppProfileMutation.isPending ? t("sidebar.account.opening") : t("sidebar.account.openNewClient")}
                      onClick={() => openAppProfileMutation.mutate()}
                    />
                    <AccountAction
                      icon={<ShieldCheck size={15} />}
                      label={t("sidebar.account.manageDevices")}
                      onClick={() => {
                        setActiveModule("settings");
                        setAccountOpen(false);
                        setAccountPanel(null);
                      }}
                    />
                  </div>
                </section>

                <section className="account-popover-section">
                  <span className="account-section-label">{t("sidebar.account.imStatus")}</span>
                  <div className="presence-options">
                    {imPresenceStatuses.map((item) => {
                      const label = t(item.labelKey);
                      return (
                        <button
                          className={`presence-option ${
                            imPresenceStatus === item.value ? "selected" : ""
                          }`}
                          type="button"
                          key={item.value}
                          aria-label={t("sidebar.account.setImStatus", { status: label })}
                          onClick={() => {
                            setImPresenceStatus(item.value as TrayStatus);
                            setAccountNotice(null);
                          }}
                        >
                          <span className={`status-dot ${item.value}`} />
                          <span>{label}</span>
                          {imPresenceStatus === item.value && <Check size={14} />}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="account-popover-section">
                  <span className="account-section-label">{t("sidebar.account.myEntrances")}</span>
                  <div className="account-action-list">
                    <AccountAction
                      icon={<QrCode size={15} />}
                      label={t("account.qrcode.title")}
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
                      setAccountNotice(t("common.copied"));
                    }}
                    onClose={() => setAccountPanel(null)}
                  />
                )}

                <div className="account-actions">
                  <button type="button" onClick={() => clearAuthSession()}>
                    <LogOut size={14} />
                    {t("sidebar.account.logout")}
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
                aria-label={t("sidebar.service.entryAria", { status: serviceStatusLabel })}
                data-sidebar-popover-trigger="service"
                data-sidebar-tooltip={t("sidebar.service.tooltip", { status: serviceStatusLabel })}
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
                  aria-label={t("sidebar.service.statusAria")}
                >
                  <strong>{serviceStatusLabel}</strong>
                  <span>{serviceStatusFullDetail}</span>
                  {receptionStatusQuery.error && (
                    <span className="sidebar-status-error">
                      {t("sidebar.service.syncFailed", { error: formatError(receptionStatusQuery.error) })}
                    </span>
                  )}
                  <div
                    className="sidebar-service-status-options"
                    role="radiogroup"
                    aria-label={t("sidebar.service.receptionStatusAria")}
                  >
                    {receptionControlStatusOptions.map((item) => (
                      <button
                        className={`sidebar-status-option service-${item.tone} ${
                          effectiveReceptionStatus === item.value ? "selected" : ""
                        }`}
                        type="button"
                        role="radio"
                        aria-checked={effectiveReceptionStatus === item.value}
                        disabled={
                          !canControlReception ||
                          receptionStatusMutation.isPending ||
                          queueAcceptMutation.isPending
                        }
                        key={item.value}
                        onClick={() => receptionStatusMutation.mutate(item.value)}
                      >
                        <span
                          className={`sidebar-status-dot service-${item.tone}`}
                          aria-hidden="true"
                        />
                        <span>{t(item.labelKey)}</span>
                        {effectiveReceptionStatus === item.value && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                  <span className="account-section-label">{t("customerService.reception.mode")}</span>
                  <div
                    className="sidebar-service-status-options"
                    role="radiogroup"
                    aria-label={t("sidebar.service.accessModeAria")}
                  >
                    {(["manual", "auto"] as ReceptionQueueMode[]).map((mode) => {
                      const selected = receptionSummary.queueMode === mode;
                      const modeDescription =
                        mode === "auto" && queueAutoDisabledReasonKey
                          ? t("sidebar.service.autoEnableHint")
                          : t(getReceptionQueueModeDescriptionKey(mode));
                      return (
                        <button
                          className={`sidebar-status-option sidebar-queue-mode-option ${
                            selected ? "selected" : ""
                          }`}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          disabled={
                            !canControlReception ||
                            receptionStatusMutation.isPending ||
                            queueAcceptMutation.isPending
                          }
                          title={modeDescription}
                          key={mode}
                          onClick={() => queueAcceptMutation.mutate(mode)}
                        >
                          <span>
                            <strong>{t(getReceptionQueueModeLabelKey(mode))}</strong>
                            <small>{modeDescription}</small>
                          </span>
                          {selected && <Check size={14} />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="sidebar-service-metrics">
                    <b>{t("sidebar.service.metricReception", { value: receptionSummary.sessionText })}</b>
                    <b>{t("sidebar.service.metricQueue", { value: hasServiceThreadData ? queuedServiceCount : "--" })}</b>
                    <b>{t("sidebar.service.metricUnread", { value: hasServiceThreadData ? activeServiceUnreadCount : "--" })}</b>
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
                    {t("sidebar.service.enter")}
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
              aria-label={t("sidebar.space.entryAria", { meta: spaceMeta, name: spaceName })}
              data-sidebar-popover-trigger="space"
              data-sidebar-tooltip={`${t("sidebar.space.tooltip", { meta: spaceMeta, name: spaceName })}${
                currentSpaceBadgeCount > 0
                  ? t("sidebar.space.pendingSuffix", { count: formatBadgeCount(currentSpaceBadgeCount) })
                  : ""
              }`}
              onClick={() => {
                setSpaceStatusOpen((opened) => !opened);
                setBrandInfoOpen(false);
                setAccountOpen(false);
                setServiceStatusOpen(false);
              }}
            >
              {tenantLogoUrl || isPersonalSpace || spaceCode !== "--" ? (
                <PcAvatar
                  avatarUrl={tenantLogoUrl}
                  className="sidebar-space-logo"
                  iconSize={16}
                  kind={isPersonalSpace ? "person" : "tenant"}
                  name={spaceName}
                />
              ) : (
                <span className="sidebar-space-logo sidebar-space-logo-empty" aria-hidden="true">
                  <Building2 size={16} />
                </span>
              )}
              <span className="sidebar-status-copy">
                <strong>{spaceName}</strong>
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
                currentSpaceBadgeCount={currentSpaceBadgeCount}
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
            aria-label={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
            data-sidebar-tooltip={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
            title={collapsed ? t("common.expand") : t("common.collapse")}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <Menu size={19} />
          </button>
        </div>
      </div>
    </aside>
  );
}

type SidebarServiceMessageReminderText = {
  messageBody: string;
  messageTitle: string;
};

type SidebarSlaReminderText = {
  body: string;
  bodyNamedTemplate: string;
  title: string;
};

function notifyActiveCustomerServiceThreadMessage({
  activeModule,
  activeThreadId,
  activeThreadOpenSource,
  authSession,
  pcSettings,
  pushRealtimeReminder,
  text,
  thread,
}: {
  activeModule: ModuleKey;
  activeThreadId?: string | null;
  activeThreadOpenSource?: CustomerServiceThreadOpenSource;
  authSession: AuthSession | null;
  pcSettings: PcSettings;
  pushRealtimeReminder: (reminder: PcRealtimeReminderInput) => void;
  text: SidebarServiceMessageReminderText;
  thread: CustomerServiceThread;
}) {
  if (!shouldPushCustomerServiceThreadMessageReminder(pcSettings)) return;
  const targetId = thread.threadId || thread.conversationId;
  if (!targetId) return;
  const message = customerServiceThreadReminderMessage(thread, text.messageBody);
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

  const title = thread.title || text.messageTitle;
  const body = thread.lastMessagePreview || text.messageBody;
  const windowFocused = isRendererWindowFocused();
  if (
    shouldPushCustomerServiceThreadMessageInAppReminder(pcSettings, {
      windowFocused,
    })
  ) {
    pushRealtimeReminder({
      id: reminderDecision.reminderId,
      title,
      body,
      targetModule: "onlineService",
      targetId,
      severity: "warning",
      icon: "service",
    });
  }
  const shouldShowDesktop = shouldShowCustomerServiceThreadMessageDesktopNotificationForTarget(
    pcSettings,
    {
      activeModule,
      activeTargetId: isExplicitCustomerServiceThreadOpenSource(activeThreadOpenSource)
        ? (activeThreadId ?? undefined)
        : undefined,
      targetId,
      targetModule: "onlineService",
      windowFocused,
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
      windowFocused,
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
  text,
  thread,
}: {
  pcSettings: PcSettings;
  pushRealtimeReminder: (reminder: PcRealtimeReminderInput) => void;
  text: SidebarSlaReminderText;
  thread: CustomerServiceThread;
}) {
  const targetId = thread.threadId || thread.conversationId;
  if (!targetId || !pcSettings.slaTimeoutNotifications) return;
  const title = text.title;
  const body = thread.title
    ? text.bodyNamedTemplate.replace("{title}", thread.title)
    : text.body;

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

function customerServiceThreadReminderMessage(
  thread: CustomerServiceThread,
  fallbackPreview: string,
): MessageItemDto {
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
    preview: thread.lastMessagePreview || fallbackPreview,
    sentAt: thread.lastMessageAt ?? thread.updatedAt ?? new Date().toISOString(),
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}
