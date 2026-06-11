import { GripVertical, SmilePlus, TrendingUp, UsersRound } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CSSProperties, DragEvent, ReactNode } from "react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ChatWorkspace } from "./ChatWorkspace";
import { AiReplySuggestionPanel } from "./AiReplySuggestionDrawer";
import { CustomerContextPanel, CustomerContextRail } from "./CustomerContextPanel";
import { isRiskyThread, ThreadList } from "./ThreadList";
import { CustomerServiceKnowledgePanel } from "../customer-service/components/CustomerServiceKnowledgeDrawer";
import { CustomerServiceQuickReplyPanel } from "../customer-service/components/CustomerServiceQuickReplyDrawer";
import { ServiceReceptionControl } from "../customer-service/components/ServiceReceptionControl";
import {
  createServiceCommandMetrics,
  type ServiceCommandMetrics,
} from "../customer-service/models/serviceWorkbenchModel";
import {
  getReceptionControlLayout,
  resolveReceptionQueueModePatch,
  type ReceptionQueueMode,
} from "../customer-service/models/serviceReceptionControlModel";
import { emitCustomerServiceAssistantInsert } from "../customer-service/runtime/customer-service-assistant-events";
import {
  aiReplyTargetForServiceThread,
  type AiReplyThreadTarget,
} from "../data/ai/ai-reply-thread-target";
import { useAuthSession } from "../data/auth/auth-store";
import {
  customerServiceReceptionPollIntervalMs,
  customerServiceReceptionRefetchInBackground,
  customerServiceRealtimePollIntervalMs,
  customerServiceRealtimeRefetchInBackground,
} from "../data/customer-service/cs-realtime-config";
import { pcQueryKeys } from "../data/query-keys";
import { createApiClient } from "../data/runtime";
import { canControlCustomerServiceReception } from "../data/customer-service/cs-role-capabilities";
import type { CustomerServiceStatus } from "../data/types";
import { useI18n } from "../i18n/useI18n";
import {
  type ServiceAssistantPane,
  type ServiceLayoutMode,
  useActiveThreadId,
  useActiveThreadOpenSource,
  useServiceAssistantPane,
  useServiceAssistantPaneWidth,
  useServiceCustomerPaneCollapsed,
  useServiceListPaneCollapsed,
  useServiceListPaneWidth,
  useServiceLayoutMode,
  useServiceProfilePaneWidth,
  useSetServiceAssistantPane,
  useSetServiceAssistantPaneWidth,
  useSetServiceCustomerPaneCollapsed,
  useSetCustomerServiceStatus,
  useSetActiveThread,
  useSetServiceLayoutMode,
  useSetServiceListPaneCollapsed,
  useSetServiceListPaneWidth,
  useSetServiceProfilePaneWidth,
  useSetServiceThreadFilter,
  useSidebarCollapsed,
} from "../data/workspace-ui/workspace-ui-store";
import { startHorizontalPaneResize } from "../lib/paneResize";

export const serviceLayoutMetrics = {
  chatMin: 420,
  customerRail: 56,
  listRail: 64,
  resizer: 3,
  sidebarCollapsed: 76,
  sidebarExpanded: 156,
  sidebarHidden: 0,
};

type ServiceResizablePane = "assistant" | "customer" | "list";

type ServiceLayoutSnapshot = {
  serviceAssistantPane: ServiceAssistantPane;
  serviceAssistantPaneWidth: number;
  serviceCustomerPaneCollapsed: boolean;
  serviceListPaneCollapsed: boolean;
  serviceListPaneWidth: number;
  serviceProfilePaneWidth: number;
  sidebarCollapsed: boolean;
};
type ServiceContextPaneOrder = "assistant" | "customer";
const serviceCustomerPinStorageKey = "lpp_pc_service_customer_pinned";
const serviceContextOrderStorageKey = "lpp_pc_service_context_order";

function readServiceContextOrder(): ServiceContextPaneOrder[] {
  if (typeof window === "undefined") return ["assistant", "customer"];
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(serviceContextOrderStorageKey) ?? "[]",
    );
    if (
      Array.isArray(parsed) &&
      parsed.length === 2 &&
      parsed.includes("assistant") &&
      parsed.includes("customer")
    ) {
      return parsed as ServiceContextPaneOrder[];
    }
  } catch {
    // Ignore invalid persisted layout and fall back to default order.
  }
  return ["assistant", "customer"];
}

export function calculateServiceRequiredWidth({
  serviceAssistantPane,
  serviceAssistantPaneWidth,
  serviceCustomerPaneCollapsed,
  serviceListPaneCollapsed,
  serviceListPaneWidth,
  serviceProfilePaneWidth,
  sidebarCollapsed,
}: ServiceLayoutSnapshot, mode: ServiceLayoutMode = "full") {
  const sidebarSegment =
    mode === "compact-sidebar"
      ? serviceLayoutMetrics.sidebarCollapsed
      : mode === "no-sidebar" ||
          mode === "queue-focus" ||
          mode === "chat-focus"
        ? serviceLayoutMetrics.sidebarHidden
        : sidebarCollapsed
          ? serviceLayoutMetrics.sidebarCollapsed
          : serviceLayoutMetrics.sidebarExpanded;
  const listSegment =
    mode === "chat-focus"
      ? 0
      : serviceListPaneCollapsed || mode === "queue-focus"
        ? serviceLayoutMetrics.listRail
        : serviceListPaneWidth + serviceLayoutMetrics.resizer;
  const assistantSegment = isServiceAssistantPaneVisible(mode, serviceAssistantPane)
    ? serviceLayoutMetrics.resizer + serviceAssistantPaneWidth
    : 0;
  const customerSegment =
    serviceCustomerPaneCollapsed ||
    mode === "no-customer" ||
    mode === "compact-sidebar" ||
    mode === "no-sidebar" ||
    mode === "queue-focus" ||
    mode === "chat-focus"
    ? serviceLayoutMetrics.customerRail
    : serviceLayoutMetrics.resizer +
      serviceProfilePaneWidth +
      serviceLayoutMetrics.customerRail;

  return (
    sidebarSegment +
    listSegment +
    serviceLayoutMetrics.chatMin +
    assistantSegment +
    customerSegment
  );
}

export function isServiceAssistantPaneVisible(
  mode: ServiceLayoutMode,
  pane: ServiceAssistantPane,
) {
  return Boolean(pane && (mode === "full" || mode === "no-customer"));
}

function clampServicePaneWidth(pane: ServiceResizablePane, width: number) {
  const [min, max] =
    pane === "list" ? [260, 420] : pane === "assistant" ? [320, 960] : [300, 440];
  return Math.min(max, Math.max(min, Math.round(width)));
}

export function calculateServiceResizeWidth({
  mode,
  pane,
  requestedWidth,
  shellWidth,
  snapshot,
}: {
  mode: ServiceLayoutMode;
  pane: ServiceResizablePane;
  requestedWidth: number;
  shellWidth: number;
  snapshot: ServiceLayoutSnapshot;
}) {
  const nextWidth = clampServicePaneWidth(pane, requestedWidth);
  const nextSnapshot: ServiceLayoutSnapshot = {
    ...snapshot,
    serviceAssistantPaneWidth:
      pane === "assistant" ? nextWidth : snapshot.serviceAssistantPaneWidth,
    serviceListPaneWidth: pane === "list" ? nextWidth : snapshot.serviceListPaneWidth,
    serviceProfilePaneWidth:
      pane === "customer" ? nextWidth : snapshot.serviceProfilePaneWidth,
  };
  const overflow = calculateServiceRequiredWidth(nextSnapshot, mode) - shellWidth;
  if (overflow <= 0) return nextWidth;
  return clampServicePaneWidth(pane, nextWidth - overflow);
}

function serviceAssistantPaneLabel(
  pane: Exclude<ServiceAssistantPane, null>,
  t: (key: string) => string,
) {
  if (pane === "quickReply") return t("composer.quickReply");
  if (pane === "aiDraft") return t("composer.aiDraft");
  return t("knowledge.title");
}

export function calculateServiceResponsiveLayout(
  snapshot: ServiceLayoutSnapshot & { width: number },
): ServiceLayoutMode {
  const modes: ServiceLayoutMode[] = snapshot.serviceAssistantPane
    ? [
        "full",
        "no-customer",
        "no-assistant",
        "compact-sidebar",
        "no-sidebar",
        "queue-focus",
        "chat-focus",
      ]
    : [
        "full",
        "no-assistant",
        "no-customer",
        "compact-sidebar",
        "no-sidebar",
        "queue-focus",
        "chat-focus",
      ];
  for (const mode of modes) {
    if (snapshot.sidebarCollapsed && mode === "compact-sidebar") continue;
    if (snapshot.width >= calculateServiceRequiredWidth(snapshot, mode)) {
      return mode;
    }
  }
  return "chat-focus";
}

export function OnlineServicePage() {
  const { t } = useI18n();
  const session = useAuthSession();
  const queryClient = useQueryClient();
  const shellRef = useRef<HTMLElement | null>(null);
  const layoutSnapshotRef = useRef<ServiceLayoutSnapshot | null>(null);
  const lastObservedShellWidthRef = useRef<string | null>(null);
  const activeThreadId = useActiveThreadId();
  const activeThreadOpenSource = useActiveThreadOpenSource();
  const serviceAssistantPane = useServiceAssistantPane();
  const serviceAssistantPaneWidth = useServiceAssistantPaneWidth();
  const serviceCustomerPaneCollapsed = useServiceCustomerPaneCollapsed();
  const serviceListPaneCollapsed = useServiceListPaneCollapsed();
  const serviceListPaneWidth = useServiceListPaneWidth();
  const serviceLayoutMode = useServiceLayoutMode();
  const serviceProfilePaneWidth = useServiceProfilePaneWidth();
  const sidebarCollapsed = useSidebarCollapsed();
  const [confirmedServiceStatus, setConfirmedServiceStatus] =
    useState<CustomerServiceStatus | null>(null);
  const [confirmedQueueAcceptEnabled, setConfirmedQueueAcceptEnabled] =
    useState<boolean | null>(null);
  const [queueRadarHint, setQueueRadarHint] = useState<string | null>(null);
  const [serviceCustomerPinned, setServiceCustomerPinned] = useState(
    () =>
      typeof window !== "undefined" &&
      window.localStorage.getItem(serviceCustomerPinStorageKey) === "1",
  );
  const [serviceContextPaneOrder, setServiceContextPaneOrder] = useState<
    ServiceContextPaneOrder[]
  >(readServiceContextOrder);
  const setCustomerServiceStatus = useSetCustomerServiceStatus();
  const setActiveThread = useSetActiveThread();
  const setServiceAssistantPane = useSetServiceAssistantPane();
  const setServiceAssistantPaneWidth = useSetServiceAssistantPaneWidth();
  const setServiceCustomerPaneCollapsed = useSetServiceCustomerPaneCollapsed();
  const setServiceLayoutMode = useSetServiceLayoutMode();
  const setServiceListPaneCollapsed = useSetServiceListPaneCollapsed();
  const setServiceListPaneWidth = useSetServiceListPaneWidth();
  const setServiceProfilePaneWidth = useSetServiceProfilePaneWidth();
  const setServiceThreadFilter = useSetServiceThreadFilter();
  const client = useMemo(
    () => (session ? createApiClient(session) : null),
    [session],
  );
  const queryBaseKey = [session?.apiBaseUrl, session?.tenantToken];
  const canControlReception = canControlCustomerServiceReception(session);
  const threadsQuery = useQuery({
    queryKey: pcQueryKeys.customerServiceThreads(...queryBaseKey),
    enabled: Boolean(client),
    queryFn: async () => client!.getWorkbenchThreads(),
    refetchInterval: customerServiceRealtimePollIntervalMs,
    refetchIntervalInBackground: customerServiceRealtimeRefetchInBackground,
  });
  const receptionStatusQuery = useQuery({
    queryKey: pcQueryKeys.customerServiceReception(...queryBaseKey),
    enabled: Boolean(client && canControlReception),
    queryFn: async () => client!.getReceptionStatus(),
    refetchInterval: customerServiceReceptionPollIntervalMs,
    refetchIntervalInBackground: customerServiceReceptionRefetchInBackground,
  });

  const selectableThreads = useMemo(
    () => [
      ...(threadsQuery.data?.activeItems ?? []),
      ...(threadsQuery.data?.queueItems ?? []),
    ],
    [threadsQuery.data?.activeItems, threadsQuery.data?.queueItems],
  );
  const selectedThread = selectableThreads.find((thread) => thread.threadId === activeThreadId);
  const aiReplyTarget = aiReplyTargetForServiceThread(selectedThread);
  const receptionStatus = receptionStatusQuery.data;
  const optimisticReceptionStatus = useMemo(
    () =>
      receptionStatus
        ? {
            ...receptionStatus,
            queueAcceptEnabled:
              confirmedQueueAcceptEnabled ?? receptionStatus.queueAcceptEnabled,
            serviceStatus: confirmedServiceStatus ?? receptionStatus.serviceStatus,
          }
        : receptionStatus,
    [confirmedQueueAcceptEnabled, confirmedServiceStatus, receptionStatus],
  );
  const commandMetrics = useMemo(
    () =>
      createServiceCommandMetrics({
        isRiskyThread,
        lastKnownStatus: confirmedServiceStatus,
        receptionStatus: optimisticReceptionStatus,
        threads: threadsQuery.data,
      }),
    [confirmedServiceStatus, optimisticReceptionStatus, threadsQuery.data],
  );
  const {
    activeCount,
    activeUnreadCount,
    queuedCount,
    slaRiskCount,
  } = commandMetrics;
  useEffect(() => {
    if (activeThreadOpenSource !== "auto") return;
    setActiveThread("");
  }, [activeThreadOpenSource, setActiveThread]);
  useEffect(() => {
    window.localStorage.setItem(
      serviceCustomerPinStorageKey,
      serviceCustomerPinned ? "1" : "0",
    );
  }, [serviceCustomerPinned]);
  useEffect(() => {
    window.localStorage.setItem(
      serviceContextOrderStorageKey,
      JSON.stringify(serviceContextPaneOrder),
    );
  }, [serviceContextPaneOrder]);

  useEffect(() => {
    const serverStatus = receptionStatus?.serviceStatus;
    if (
      serverStatus === "online" ||
      serverStatus === "busy" ||
      serverStatus === "break" ||
      serverStatus === "offline"
    ) {
      setConfirmedServiceStatus(serverStatus);
      setCustomerServiceStatus(serverStatus);
    }
  }, [receptionStatus?.serviceStatus, setCustomerServiceStatus]);
  useEffect(() => {
    if (typeof receptionStatus?.queueAcceptEnabled === "boolean") {
      setConfirmedQueueAcceptEnabled(receptionStatus.queueAcceptEnabled);
    }
  }, [receptionStatus?.queueAcceptEnabled]);
  const receptionStatusMutation = useMutation({
    mutationFn: async (serviceStatus: CustomerServiceStatus) => {
      if (!client) throw new Error("Customer service API is not ready");
      if (!canControlReception) {
        throw new Error(t("customerService.online.receptionNotSynced"));
      }
      return client.updateReceptionStatus({
        serviceStatus,
        queueAcceptEnabled:
          serviceStatus === "online"
            ? (confirmedQueueAcceptEnabled ?? receptionStatus?.queueAcceptEnabled ?? false)
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
          ? (confirmedQueueAcceptEnabled ?? receptionStatus?.queueAcceptEnabled ?? false)
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
    onSuccess: (status) => {
      if (
        status.serviceStatus === "online" ||
        status.serviceStatus === "busy" ||
        status.serviceStatus === "break" ||
        status.serviceStatus === "offline"
      ) {
        setConfirmedServiceStatus(status.serviceStatus);
        setConfirmedQueueAcceptEnabled(Boolean(status.queueAcceptEnabled));
        setCustomerServiceStatus(status.serviceStatus);
      }
      void queryClient.invalidateQueries({
        queryKey: pcQueryKeys.customerServiceReception(...queryBaseKey),
      });
      void queryClient.invalidateQueries({
        queryKey: pcQueryKeys.customerServiceThreads(...queryBaseKey),
      });
    },
  });
  const queueAcceptMutation = useMutation({
    mutationFn: async (mode: ReceptionQueueMode) => {
      if (!client) throw new Error("Customer service API is not ready");
      if (!canControlReception) {
        throw new Error(t("customerService.online.receptionNotSynced"));
      }
      const serviceStatus = receptionStatus?.serviceStatus ?? confirmedServiceStatus;
      const patch = resolveReceptionQueueModePatch(mode, serviceStatus);
      if (!patch) throw new Error(t("customerService.online.receptionNotSynced"));
      return client.updateReceptionStatus(patch);
    },
    onMutate: (mode) => {
      const serviceStatus = confirmedServiceStatus ?? receptionStatus?.serviceStatus;
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
    onSuccess: (status) => {
      if (
        status.serviceStatus === "online" ||
        status.serviceStatus === "busy" ||
        status.serviceStatus === "break" ||
        status.serviceStatus === "offline"
      ) {
        setConfirmedServiceStatus(status.serviceStatus);
        setConfirmedQueueAcceptEnabled(Boolean(status.queueAcceptEnabled));
        setCustomerServiceStatus(status.serviceStatus);
      }
      void queryClient.invalidateQueries({
        queryKey: pcQueryKeys.customerServiceReception(...queryBaseKey),
      });
      void queryClient.invalidateQueries({
        queryKey: pcQueryKeys.customerServiceThreads(...queryBaseKey),
      });
    },
  });
  const handleServiceContextDragStart = (
    event: DragEvent<HTMLElement>,
    pane: ServiceContextPaneOrder,
  ) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-lpp-context-pane", pane);
  };
  const handleServiceContextDragOver = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };
  const handleServiceContextDrop = (
    event: DragEvent<HTMLElement>,
    targetPane: ServiceContextPaneOrder,
  ) => {
    event.preventDefault();
    const draggedPane = event.dataTransfer.getData("application/x-lpp-context-pane");
    if (
      draggedPane !== "assistant" &&
      draggedPane !== "customer"
    ) {
      return;
    }
    if (draggedPane === targetPane) return;
    setServiceContextPaneOrder([
      draggedPane,
      draggedPane === "assistant" ? "customer" : "assistant",
    ]);
  };
  const toggleAssistantPane = (pane: Exclude<ServiceAssistantPane, null>) => {
    const nextPane = serviceAssistantPane === pane ? null : pane;
    setServiceAssistantPane(nextPane);
    if (nextPane) {
      if (serviceCustomerPinned) {
        setServiceCustomerPaneCollapsed(false);
      } else {
        setServiceCustomerPaneCollapsed(true);
      }
    }
    if (
      !nextPane ||
      serviceCustomerPinned ||
      !shellRef.current ||
      serviceCustomerPaneCollapsed
    ) {
      return;
    }

    const appShell = shellRef.current.closest(".app-shell") as HTMLElement | null;
    const width = Math.round(
      (appShell ?? shellRef.current).getBoundingClientRect().width,
    );
    const fullWidthWithAssistant = calculateServiceRequiredWidth(
      {
        serviceAssistantPane: nextPane,
        serviceAssistantPaneWidth,
        serviceCustomerPaneCollapsed: false,
        serviceListPaneCollapsed,
        serviceListPaneWidth,
        serviceProfilePaneWidth,
        sidebarCollapsed,
      },
      "full",
    );
    if (width < fullWidthWithAssistant) {
      setServiceCustomerPaneCollapsed(true);
    }
  };

  layoutSnapshotRef.current = {
    serviceAssistantPane,
    serviceAssistantPaneWidth,
    serviceCustomerPaneCollapsed,
    serviceListPaneCollapsed,
    serviceListPaneWidth,
    serviceProfilePaneWidth,
    sidebarCollapsed,
  };
  const effectiveServiceAssistantPane = isServiceAssistantPaneVisible(
    serviceLayoutMode,
    serviceAssistantPane,
  )
    ? serviceAssistantPane
    : null;
  const hiddenAssistantHint =
    serviceAssistantPane && !effectiveServiceAssistantPane
      ? t("customerService.online.assistantNeedsWidth", {
          pane: serviceAssistantPaneLabel(serviceAssistantPane, t),
        })
      : null;
  const effectiveServiceCustomerPaneCollapsed =
    serviceCustomerPaneCollapsed ||
    serviceLayoutMode === "no-customer" ||
    serviceLayoutMode === "compact-sidebar" ||
    serviceLayoutMode === "no-sidebar" ||
    serviceLayoutMode === "queue-focus" ||
    serviceLayoutMode === "chat-focus";
  const effectiveServiceListPaneHidden = serviceLayoutMode === "chat-focus";
  const effectiveServiceListPaneCollapsed =
    !effectiveServiceListPaneHidden &&
    (serviceListPaneCollapsed || serviceLayoutMode === "queue-focus");
  const serviceCustomerFirst =
    Boolean(effectiveServiceAssistantPane) &&
    !effectiveServiceCustomerPaneCollapsed &&
    serviceContextPaneOrder[0] === "customer";
  const resizeServicePane = (pane: ServiceResizablePane, requestedWidth: number) => {
    const snapshot = layoutSnapshotRef.current;
    const measuredShell =
      shellRef.current?.closest(".app-shell") ?? shellRef.current;
    if (!snapshot || !measuredShell) return requestedWidth;
    return calculateServiceResizeWidth({
      mode: serviceLayoutMode,
      pane,
      requestedWidth,
      shellWidth: Math.round(measuredShell.getBoundingClientRect().width),
      snapshot,
    });
  };

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return undefined;
    const appShell = shell.closest(".app-shell") as HTMLElement | null;

    const updateServiceLayout = (force = false) => {
      const measuredShell = appShell ?? shell;
      const width = Math.round(measuredShell.getBoundingClientRect().width);
      const snapshot = layoutSnapshotRef.current;
      const signature = snapshot
        ? [
            width,
            snapshot.serviceAssistantPane,
            snapshot.serviceAssistantPaneWidth,
            snapshot.serviceCustomerPaneCollapsed,
            snapshot.serviceListPaneCollapsed,
            snapshot.serviceListPaneWidth,
            snapshot.serviceProfilePaneWidth,
            snapshot.sidebarCollapsed,
          ].join("|")
        : String(width);
      if (!force && lastObservedShellWidthRef.current === signature) return;
      lastObservedShellWidthRef.current = signature;

      if (!snapshot) return;
      const next = calculateServiceResponsiveLayout({ ...snapshot, width });
      setServiceLayoutMode(next);
    };

    updateServiceLayout(true);
    const handleShellResize = () => updateServiceLayout();
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(handleShellResize);
    resizeObserver?.observe(appShell ?? shell);
    window.addEventListener("resize", handleShellResize);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", handleShellResize);
    };
  }, [
    serviceAssistantPane,
    serviceAssistantPaneWidth,
    serviceCustomerPaneCollapsed,
    serviceListPaneCollapsed,
    serviceListPaneWidth,
    serviceProfilePaneWidth,
    sidebarCollapsed,
    setServiceLayoutMode,
  ]);

  const serviceAssistantBlock: ReactNode = effectiveServiceAssistantPane ? (
    <>
      <div
        className="resizer service-assistant-resizer"
        role="separator"
        aria-label={t("customerService.online.resizeAssistant")}
        onPointerDown={(event) =>
          startHorizontalPaneResize(event, {
            initialWidth: serviceAssistantPaneWidth,
            onResize: (width) =>
              setServiceAssistantPaneWidth(resizeServicePane("assistant", width)),
            direction: -1,
          })
        }
      />
      <ServiceAssistantShell
        aiReplyTarget={aiReplyTarget}
        pane={effectiveServiceAssistantPane}
        onClose={() => setServiceAssistantPane(null)}
        onDragOverContextPane={handleServiceContextDragOver}
        onDragStartContextPane={handleServiceContextDragStart}
        onDropContextPane={handleServiceContextDrop}
      />
    </>
  ) : null;
  const serviceCustomerBlock: ReactNode = effectiveServiceCustomerPaneCollapsed ? null : (
    <>
      <div
        className="resizer service-profile-resizer"
        role="separator"
        aria-label={t("customerService.online.resizeCustomer")}
        onPointerDown={(event) =>
          startHorizontalPaneResize(event, {
            initialWidth: serviceProfilePaneWidth,
            onResize: (width) =>
              setServiceProfilePaneWidth(resizeServicePane("customer", width)),
            direction: -1,
          })
        }
      />
      <section className="service-customer-pane">
        <CustomerContextPanel
          pinned={serviceCustomerPinned}
          onDragOverContextPane={handleServiceContextDragOver}
          onDragStartContextPane={handleServiceContextDragStart}
          onDropContextPane={handleServiceContextDrop}
          onTogglePin={() => setServiceCustomerPinned((current) => !current)}
        />
      </section>
    </>
  );
  const serviceContextBlocks = serviceContextPaneOrder.map((pane) => (
    <Fragment key={pane}>
      {pane === "assistant" ? serviceAssistantBlock : serviceCustomerBlock}
    </Fragment>
  ));

  return (
    <section
      ref={shellRef}
      className={[
        "h-flagship-shell",
        `layout-${serviceLayoutMode}`,
        effectiveServiceAssistantPane ? "service-assistant-open" : "",
        effectiveServiceCustomerPaneCollapsed ? "service-customer-collapsed" : "",
        effectiveServiceListPaneCollapsed ? "service-list-collapsed" : "",
        serviceCustomerFirst ? "service-context-order-customer-first" : "",
      ].filter(Boolean).join(" ")}
      style={
        {
          "--service-assistant-pane-width": `${serviceAssistantPaneWidth}px`,
          "--service-customer-rail-width": `${serviceLayoutMetrics.customerRail}px`,
          "--service-queue-rail-width": `${serviceLayoutMetrics.listRail}px`,
          "--service-list-pane-width": `${serviceListPaneWidth}px`,
          "--service-profile-pane-width": `${serviceProfilePaneWidth}px`,
        } as CSSProperties
      }
    >
      <ServiceCommandBar
        disabled={!client || !canControlReception}
        layoutMode={serviceLayoutMode}
        metrics={commandMetrics}
        onSetQueueMode={(mode) => queueAcceptMutation.mutate(mode)}
        onSetStatus={(status) => receptionStatusMutation.mutate(status)}
        pending={receptionStatusMutation.isPending || queueAcceptMutation.isPending}
      />

      <div className="h-flagship-grid">
        {effectiveServiceListPaneHidden ? null : effectiveServiceListPaneCollapsed ? (
          <ServiceQueueRail
            activeCount={activeCount}
            onFilter={(filter) => {
              setServiceListPaneCollapsed(false);
              if (filter) {
                setServiceThreadFilter(filter);
                setQueueRadarHint(null);
              } else {
                setQueueRadarHint(t("customerService.online.unreadHint"));
              }
            }}
            queuedCount={queuedCount}
            slaRiskCount={slaRiskCount}
            unreadCount={activeUnreadCount}
            onExpand={() => setServiceListPaneCollapsed(false)}
          />
        ) : (
          <ThreadList />
        )}
        {!effectiveServiceListPaneHidden && !effectiveServiceListPaneCollapsed && (
          <div
            className="resizer service-list-resizer"
            role="separator"
            aria-label={t("customerService.online.resizeList")}
            onPointerDown={(event) =>
              startHorizontalPaneResize(event, {
                initialWidth: serviceListPaneWidth,
                onResize: (width) =>
                  setServiceListPaneWidth(resizeServicePane("list", width)),
              })
            }
          />
        )}
        <ChatWorkspace
          onOpenCustomerContext={() => setServiceCustomerPaneCollapsed(false)}
          onToggleAssistantPane={toggleAssistantPane}
        />
        {serviceContextBlocks}
        <CustomerContextRail
          activeAssistantPane={serviceAssistantPane}
          customerPaneCollapsed={effectiveServiceCustomerPaneCollapsed}
          onToggleCustomerPane={() =>
            setServiceCustomerPaneCollapsed(!effectiveServiceCustomerPaneCollapsed)
          }
          onToggleAssistantPane={toggleAssistantPane}
        />
      </div>

      {(queueRadarHint || hiddenAssistantHint) && (
        <div className="service-queue-radar-hint" role="status">
          {queueRadarHint ?? hiddenAssistantHint}
        </div>
      )}

      <div className="h-flagship-corner" aria-hidden="true">
        <UsersRound size={16} />
        <TrendingUp size={16} />
        <SmilePlus size={16} />
      </div>
    </section>
  );
}

function ServiceCommandBar({
  disabled,
  layoutMode,
  metrics,
  onSetQueueMode,
  onSetStatus,
  pending,
}: {
  disabled: boolean;
  layoutMode: ServiceLayoutMode;
  metrics: ServiceCommandMetrics;
  onSetQueueMode: (mode: ReceptionQueueMode) => void;
  onSetStatus: (status: CustomerServiceStatus) => void;
  pending: boolean;
}) {
  const { t } = useI18n();
  return (
    <header className="h-flagship-topbar service-command-bar">
      <div className="h-topbar-summary service-command-summary">
        <span className={`service-command-status ${metrics.serviceStatus}`}>
          {t(metrics.serviceStatusLabelKey)}
        </span>
        <span className="service-command-copy">
          <strong>{t("customerService.online.commandTitle")}</strong>
          <span>
            {t("customerService.online.commandSummary", {
              capacity: metrics.capacityText,
              mode:
                typeof metrics.queueEnabled === "boolean"
                  ? metrics.queueEnabled
                    ? t("customerService.online.autoAccess")
                    : t("customerService.online.manualAccess")
                  : t("customerService.online.accessModeUnsynced"),
              total: metrics.hasThreadData ? metrics.totalCount : "--",
            })}
          </span>
        </span>
      </div>

      <div className="h-metric-strip service-command-metrics">
        {metrics.metrics.map((item) => (
          <div className={`h-metric-item tone-${item.tone ?? "normal"}`} key={item.labelKey}>
            <span>{t(item.labelKey)}</span>
            <div className="h-metric-value">
              <strong>{item.value}</strong>
            </div>
          </div>
        ))}
      </div>

      <div className="h-top-actions service-command-actions">
        <ServiceReceptionControl
          activeSessions={metrics.activeSessions}
          disabled={disabled}
          layout={getReceptionControlLayout(layoutMode)}
          maxSessions={metrics.maxSessions}
          onSetQueueMode={onSetQueueMode}
          onSetStatus={onSetStatus}
          pending={pending}
          queuedCount={metrics.queuedCount}
          queueAcceptEnabled={metrics.queueEnabled}
          serviceStatus={metrics.serviceStatus}
          slaRiskCount={metrics.slaRiskCount}
        />
      </div>
    </header>
  );
}

function ServiceQueueRail({
  activeCount,
  onFilter,
  onExpand,
  queuedCount,
  slaRiskCount,
  unreadCount,
}: {
  activeCount: number;
  onFilter: (filter: "queued" | "serving" | "sla" | null) => void;
  onExpand: () => void;
  queuedCount: number;
  slaRiskCount: number;
  unreadCount: number;
}) {
  const { t } = useI18n();
  return renderServiceQueueRail({
    activeCount,
    onExpand,
    onFilter,
    queuedCount,
    slaRiskCount,
    t,
    unreadCount,
  });

}

function renderServiceQueueRail({
  activeCount,
  onExpand,
  onFilter,
  queuedCount,
  slaRiskCount,
  t,
  unreadCount,
}: {
  activeCount: number;
  onExpand: () => void;
  onFilter: (filter: "queued" | "serving" | "sla" | null) => void;
  queuedCount: number;
  slaRiskCount: number;
  t: (key: string, params?: Record<string, string | number>) => string;
  unreadCount: number;
}) {
  return (
    <aside className="service-queue-rail" aria-label={t("customerService.online.queueRailAria")}>
      <button type="button" aria-label={t("customerService.online.expandQueue")} onClick={onExpand}>
        <UsersRound size={18} />
      </button>
      <button
        className="service-queue-rail-metric"
        type="button"
        title={t("customerService.online.expandQueuedTitle", { count: queuedCount })}
        onClick={() => onFilter("queued")}
      >
        <span>
          <b>Q</b>
          <small>{t("customerService.threadList.filterQueued")}</small>
          <em>{queuedCount}</em>
        </span>
      </button>
      <button
        className="service-queue-rail-metric"
        type="button"
        title={t("customerService.online.expandActiveTitle", { count: activeCount })}
        onClick={() => onFilter("serving")}
      >
        <span>
          <b>A</b>
          <small>{t("customerService.threadList.filterServing")}</small>
          <em>{activeCount}</em>
        </span>
      </button>
      <button
        className="service-queue-rail-metric"
        type="button"
        title={t("customerService.online.expandUnreadTitle", { count: unreadCount })}
        onClick={() => onFilter(null)}
      >
        <span>
          <b>{t("customerService.online.unread")}</b>
          <em>{unreadCount}</em>
        </span>
      </button>
      <button
        className="service-queue-rail-metric danger"
        type="button"
        title={t("customerService.online.expandSlaTitle", { count: slaRiskCount })}
        onClick={() => onFilter("sla")}
      >
        <span>
          <b>SLA</b>
          <em>{slaRiskCount}</em>
        </span>
      </button>
    </aside>
  );
}

function ServiceAssistantShell({
  aiReplyTarget,
  onDragOverContextPane,
  onDragStartContextPane,
  onDropContextPane,
  onClose,
  pane,
}: {
  aiReplyTarget: AiReplyThreadTarget;
  onDragOverContextPane: (event: DragEvent<HTMLElement>) => void;
  onDragStartContextPane: (
    event: DragEvent<HTMLElement>,
    pane: ServiceContextPaneOrder,
  ) => void;
  onDropContextPane: (
    event: DragEvent<HTMLElement>,
    pane: ServiceContextPaneOrder,
  ) => void;
  onClose: () => void;
  pane: Exclude<ServiceAssistantPane, null>;
}) {
  const { t } = useI18n();
  const isAiDraft = pane === "aiDraft";
  const isQuickReply = pane === "quickReply";
  const session = useAuthSession();
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <aside
      className="service-assistant-pane"
      aria-label={serviceAssistantPaneLabel(pane, t)}
      onDragOver={onDragOverContextPane}
      onDrop={(event) => onDropContextPane(event, "assistant")}
    >
      <header className="context-pane-controlbar service-context-pane-controlbar">
        <button
          className="context-pane-drag"
          type="button"
          draggable
          title={t("customerService.online.dragSort")}
          aria-label={t("customerService.online.dragSort")}
          onDragStart={(event) => onDragStartContextPane(event, "assistant")}
        >
          <GripVertical size={15} />
        </button>
        <strong>{serviceAssistantPaneLabel(pane, t)}</strong>
      </header>
      {notice && <div className="service-assistant-notice">{notice}</div>}
      <div className="context-pane-body">
        {isAiDraft ? (
          <AiReplySuggestionPanel
            disabledReason={aiReplyTarget.disabledReason}
            session={session}
            subtitle={t("customerService.workspace.serviceConversation")}
            threadId={aiReplyTarget.threadId}
            threadTitle={aiReplyTarget.threadTitle}
            threadType={aiReplyTarget.threadType}
            variant="panel"
            onClose={onClose}
            onInsert={(text) => {
              emitCustomerServiceAssistantInsert(text);
              onClose();
            }}
            onNotice={setNotice}
          />
        ) : isQuickReply ? (
          <CustomerServiceQuickReplyPanel
            session={session}
            threadType={aiReplyTarget.threadType}
            variant="panel"
            onClose={onClose}
            onInsert={(payload) => {
              emitCustomerServiceAssistantInsert(payload.text);
            }}
            onNotice={setNotice}
          />
        ) : (
          <CustomerServiceKnowledgePanel
            session={session}
            variant="panel"
            onClose={onClose}
            onInsert={(payload) => {
              emitCustomerServiceAssistantInsert(payload.text);
              onClose();
            }}
            onNotice={setNotice}
          />
        )}
      </div>
    </aside>
  );
}
