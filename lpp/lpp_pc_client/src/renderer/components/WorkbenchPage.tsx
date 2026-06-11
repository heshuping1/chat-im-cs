import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BarChart3,
  BookOpenText,
  CheckCircle2,
  Headphones,
  LockKeyhole,
  Megaphone,
  MessageSquareText,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuthSession } from "../data/auth/auth-store";
import { pcQueryKeys } from "../data/query-keys";
import { normalizeKnowledgeBasesResponse } from "../data/api/knowledge-normalizers";
import { createApiClient } from "../data/runtime";
import { CustomerServiceMonitorPanel } from "../customer-service/components/CustomerServiceMonitorPanel";
import {
  canViewTeamServicePerformance,
  createServicePerformanceModel,
  type ServicePerformanceModel,
} from "../customer-service/models/servicePerformanceModel";
import {
  roleFromSession,
  workbenchShortcuts,
} from "../data/static-config";
import type {
  EnterpriseAnnouncementDto,
  CustomerServiceThreadsResponse,
  KnowledgeBaseDto,
  StaffReceptionStatusDto,
} from "../data/api-client";
import type { ModuleKey, WorkbenchShortcut } from "../data/types";
import { useSetActiveModule } from "../data/workspace-ui/workspace-ui-store";
import { useI18n } from "../i18n/useI18n";
import { formatError, formatMonthDayTime } from "../lib/format";

const shortcutIcons: Record<string, LucideIcon> = {
  "wb-cs-notices": Megaphone,
  "wb-cs-quick-replies": BookOpenText,
  "wb-cs-performance": BarChart3,
  "wb-admin-service-center": Headphones,
};

export function WorkbenchPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const authSession = useAuthSession();
  const setActiveModule = useSetActiveModule();
  const currentWorkspaceRole = roleFromSession(authSession);
  const [selectedShortcutId, setSelectedShortcutId] = useState(() =>
    defaultWorkbenchShortcutId(currentWorkspaceRole),
  );
  const [notice, setNotice] = useState<string | null>(null);

  const client = useMemo(
    () => (authSession ? createApiClient(authSession) : null),
    [authSession],
  );
  const queryBaseKey = [authSession?.apiBaseUrl, authSession?.tenantToken];

  const visibleItems = useMemo(
    () =>
      workbenchShortcuts.filter((item) =>
        item.roles.includes(currentWorkspaceRole),
      ),
    [currentWorkspaceRole],
  );
  const selectedShortcut =
    visibleItems.find((item) => item.id === selectedShortcutId) ??
    visibleItems[0];

  useEffect(() => {
    const nextDefault = defaultWorkbenchShortcutId(currentWorkspaceRole);
    setSelectedShortcutId((current) =>
      visibleItems.some((item) => item.id === current) ? current : nextDefault,
    );
  }, [currentWorkspaceRole, visibleItems]);

  const announcementsQuery = useQuery({
    queryKey: pcQueryKeys.workbenchAnnouncements(...queryBaseKey),
    enabled: Boolean(client),
    queryFn: async () => client!.getEnterpriseAnnouncements(),
  });

  const threadsQuery = useQuery({
    queryKey: pcQueryKeys.customerServiceThreads(...queryBaseKey),
    enabled: Boolean(client),
    queryFn: async () => client!.getWorkbenchThreads(),
  });

  const receptionQuery = useQuery({
    queryKey: pcQueryKeys.customerServiceReception(...queryBaseKey),
    enabled: Boolean(client),
    queryFn: async () => client!.getReceptionStatus(),
  });
  const knowledgeBasesQuery = useQuery({
    queryKey: pcQueryKeys.knowledgeBases(...queryBaseKey),
    enabled: Boolean(client),
    queryFn: async () => client!.getKnowledgeBases(),
  });

  const readMutation = useMutation({
    mutationFn: async (announcementId: string) =>
      client!.markEnterpriseAnnouncementRead(announcementId),
    onSuccess: async () => {
      setNotice(t("workbench.notice.readSuccess"));
      await queryClient.invalidateQueries({
        queryKey: ["pc-workbench-announcements"],
      });
    },
    onError: (error) => setNotice(t("workbench.notice.readFailed", { error: formatError(error) })),
  });

  const knowledgeBases = normalizeKnowledgeBasesResponse(knowledgeBasesQuery.data);
  const canViewTeamPerformance = canViewTeamServicePerformance(authSession);
  const performanceQuery = useQuery({
    queryKey: pcQueryKeys.customerServiceTempSessionStats(...queryBaseKey),
    enabled: Boolean(client && canViewTeamPerformance),
    queryFn: async () => client!.getTempSessionStats(),
  });
  const performanceModel = useMemo(
    () =>
      createServicePerformanceModel({
        stats: performanceQuery.data,
        translate: t,
      }),
    [performanceQuery.data, t],
  );

  return (
    <main className="module-page workbench-page">
      {notice && (
        <p className="workbench-notice" role="status">
          {notice}
        </p>
      )}

      <section className="workbench-main-grid">
        <nav
          aria-label={t("workbench.capabilityNavAria")}
          className="workbench-tabs"
          role="tablist"
        >
          {visibleItems.map((item) => (
            <WorkbenchTab
              item={item}
              key={item.id}
              selected={item.id === selectedShortcut?.id}
              onClick={() => {
                setSelectedShortcutId(item.id);
                setNotice(null);
              }}
              t={t}
            />
          ))}
        </nav>

        <aside className="workbench-detail" aria-label={t("workbench.detailAria")}>
          {selectedShortcut ? (
            <WorkbenchDetail
              announcements={announcementsQuery.data ?? []}
              announcementsError={
                announcementsQuery.isError
                  ? formatError(announcementsQuery.error)
                  : ""
              }
              item={selectedShortcut}
              markRead={(id) => readMutation.mutate(id)}
              knowledgeBases={knowledgeBases}
              knowledgeError={
                knowledgeBasesQuery.isError
                  ? formatError(knowledgeBasesQuery.error)
                  : ""
              }
              onOpenModule={setActiveModule}
              canViewTeamPerformance={canViewTeamPerformance}
              client={client}
              performanceError={
                performanceQuery.isError ? formatError(performanceQuery.error) : ""
              }
              performanceLoading={performanceQuery.isLoading}
              performanceModel={performanceModel}
              retryPerformance={() => void performanceQuery.refetch()}
              reception={receptionQuery.data}
              sessionBaseUrl={authSession?.apiBaseUrl}
              sessionTenantToken={authSession?.tenantToken}
              threads={threadsQuery.data}
              threadsError={
                threadsQuery.isError ? formatError(threadsQuery.error) : ""
              }
              t={t}
            />
          ) : (
            <EmptyBlock
              icon={LockKeyhole}
              title={t("workbench.emptyNoEntryTitle")}
              text={t("workbench.emptyNoEntryText")}
            />
          )}
        </aside>
      </section>
    </main>
  );
}

type WorkbenchTranslate = (key: string, params?: Record<string, string | number>) => string;

function defaultWorkbenchShortcutId(role: ReturnType<typeof roleFromSession>) {
  return role === "admin" || role === "owner" ? "wb-admin-service-center" : "wb-cs-notices";
}

function workbenchStateLabel(state: WorkbenchShortcut["state"], t: WorkbenchTranslate) {
  return t(`workbench.state.${state}.label`);
}

function workbenchShortcutTitle(item: WorkbenchShortcut, t: WorkbenchTranslate) {
  return t(item.titleKey);
}

function workbenchReceptionStatusLabel(value: unknown, t: WorkbenchTranslate) {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized === "online" || normalized === "1") return t("sidebar.service.status.online");
  if (normalized === "busy" || normalized === "2") return t("sidebar.service.status.busy");
  if (normalized === "break" || normalized === "away" || normalized === "3") {
    return t("sidebar.service.status.break");
  }
  return t("sidebar.service.status.offline");
}

function WorkbenchTab({
  item,
  selected,
  onClick,
  t,
}: {
  item: WorkbenchShortcut;
  selected: boolean;
  onClick: () => void;
  t: WorkbenchTranslate;
}) {
  const Icon = shortcutIcons[item.id] ?? MessageSquareText;
  const disabled = item.state === "no_permission";
  return (
    <button
      aria-selected={selected}
      className={`workbench-tab ${item.state} ${selected ? "active" : ""}`}
      disabled={disabled}
      onClick={onClick}
      role="tab"
      type="button"
    >
      <span className="workbench-tab-icon">
        <Icon size={16} />
      </span>
      <strong>{workbenchShortcutTitle(item, t)}</strong>
    </button>
  );
}

function WorkbenchDetail({
  announcements,
  announcementsError,
  canViewTeamPerformance,
  client,
  item,
  markRead,
  knowledgeBases,
  knowledgeError,
  onOpenModule,
  performanceError,
  performanceLoading,
  performanceModel,
  retryPerformance,
  reception,
  sessionBaseUrl,
  sessionTenantToken,
  t,
  threads,
  threadsError,
}: {
  announcements: EnterpriseAnnouncementDto[];
  announcementsError: string;
  canViewTeamPerformance: boolean;
  client: ReturnType<typeof createApiClient> | null;
  item: WorkbenchShortcut;
  markRead: (id: string) => void;
  knowledgeBases: KnowledgeBaseDto[];
  knowledgeError: string;
  onOpenModule: (module: ModuleKey) => void;
  performanceError: string;
  performanceLoading: boolean;
  performanceModel: ServicePerformanceModel;
  retryPerformance: () => void;
  reception?: StaffReceptionStatusDto;
  sessionBaseUrl?: string;
  sessionTenantToken?: string;
  t: WorkbenchTranslate;
  threads?: CustomerServiceThreadsResponse;
  threadsError: string;
}) {
  if (item.id === "wb-cs-notices") {
    return (
      <>
        {announcementsError ? (
          <EmptyBlock
            icon={TriangleAlert}
            title={t("workbench.announcementLoadFailed")}
            text={announcementsError}
          />
        ) : announcements.length > 0 ? (
          <div className="workbench-list">
            {announcements.slice(0, 6).map((announcement) => (
              <article className="workbench-list-item" key={announcement.announcementId}>
                <div>
                  <span className={`priority ${announcement.priority ?? "normal"}`}>
                    {announcement.priority === "important" ? t("workbench.priority.important") : t("workbench.priority.normal")}
                  </span>
                  <strong>{announcement.title}</strong>
                  <p>{announcement.content}</p>
                  <small>{formatMonthDayTime(announcement.publishedAt)}</small>
                </div>
                <button
                  onClick={() => markRead(announcement.announcementId)}
                  type="button"
                >
                  {t("workbench.markRead")}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <EmptyBlock
            icon={Megaphone}
            title={t("workbench.emptyAnnouncementsTitle")}
            text={t("workbench.emptyAnnouncementsText")}
          />
        )}
      </>
    );
  }

  if (item.id === "wb-cs-quick-replies") {
    return (
      <>
        {knowledgeError ? (
          <EmptyBlock icon={TriangleAlert} title={t("workbench.knowledgeLoadFailed")} text={knowledgeError} />
        ) : knowledgeBases.length ? (
          <div className="workbench-list">
            {knowledgeBases.slice(0, 5).map((base) => (
              <article
                className="workbench-list-item"
                key={base.knowledgeBaseId || base.id || base.name}
              >
                <div>
                  <span className="priority normal">{t("workbench.knowledgeBase")}</span>
                  <strong>{base.name || base.title || t("workbench.unnamedKnowledgeBase")}</strong>
                  <p>{base.description || base.summary || t("workbench.noSummary")}</p>
                  <small>
                    {base.documentCount != null
                      ? t("workbench.documentCount", { count: base.documentCount })
                      : t("workbench.documentCountEmpty")}
                  </small>
                </div>
                <button onClick={() => onOpenModule("knowledgeBase")} type="button">
                  {t("common.open")}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <EmptyBlock
            icon={BookOpenText}
            title={t("workbench.emptyQuickRepliesTitle")}
            text={t("workbench.emptyQuickRepliesText")}
          />
        )}
        <button
          className="workbench-detail-link"
          onClick={() => onOpenModule("knowledgeBase")}
          type="button"
        >
          {t("workbench.openKnowledgeBase")}
          <ArrowRight size={15} />
        </button>
      </>
    );
  }

  if (item.id === "wb-cs-performance") {
    if (canViewTeamPerformance) {
      return (
        <>
          <TeamPerformancePanel
            error={performanceError}
            loading={performanceLoading}
            model={performanceModel}
            retry={retryPerformance}
            t={t}
          />
        </>
      );
    }
    return (
      <>
        {threadsError ? (
          <EmptyBlock icon={TriangleAlert} title={t("workbench.performanceLoadFailed")} text={threadsError} />
        ) : (
          <div className="workbench-detail-grid">
            <InfoRow
              label={t("workbench.myServiceStatus")}
              value={workbenchReceptionStatusLabel(reception?.serviceStatus, t)}
            />
            <InfoRow
              label={t("workbench.accessMode")}
              value={reception?.queueAcceptEnabled ? t("workbench.autoAssign") : t("workbench.manualAccess")}
            />
            <InfoRow label={t("workbench.allConversations")} value={formatMetric(threads?.summary?.allCount)} />
            <InfoRow label={t("workbench.queued")} value={formatMetric(threads?.summary?.queuedCount)} />
            <InfoRow label={t("workbench.active")} value={formatMetric(threads?.summary?.activeCount)} />
            <InfoRow label="VIP" value={formatMetric(threads?.summary?.vipCount)} />
          </div>
        )}
        <button
          className="workbench-detail-link"
          onClick={() => onOpenModule("onlineService")}
          type="button"
        >
          {t("workbench.openOnlineService")}
          <ArrowRight size={15} />
        </button>
      </>
    );
  }

  if (item.id === "wb-admin-service-center") {
    return (
      <>
        <CustomerServiceMonitorPanel
          apiBaseUrl={sessionBaseUrl}
          client={client}
          onOpenOnlineService={() => onOpenModule("onlineService")}
          t={t}
          tenantToken={sessionTenantToken}
        />
      </>
    );
  }

  return (
    <>
      <EmptyBlock
        icon={CheckCircle2}
        title={t("workbench.entryReservedTitle")}
        text={t("workbench.entryReservedText")}
      />
      <div className="workbench-detail-grid">
        <InfoRow label={t("workbench.roleScope")} value={item.roles.map((role) => t(`workbench.role.${role}`)).join(t("workbench.listSeparator"))} />
        <InfoRow label={t("workbench.currentState")} value={workbenchStateLabel(item.state, t)} />
        <InfoRow label={t("workbench.dataScope")} value={t("workbench.dataScopeValue")} />
      </div>
    </>
  );
}

function TeamPerformancePanel({
  error,
  loading,
  model,
  retry,
  t,
}: {
  error: string;
  loading: boolean;
  model: ServicePerformanceModel;
  retry: () => void;
  t: WorkbenchTranslate;
}) {
  if (loading) {
    return (
      <EmptyBlock
        icon={Sparkles}
        title={t("workbench.performance.loadingTitle")}
        text={t("workbench.performance.loadingText")}
      />
    );
  }

  if (error) {
    return (
      <div className="workbench-performance-panel">
        <EmptyBlock
          icon={TriangleAlert}
          title={t("workbench.performance.errorTitle")}
          text={error}
        />
        <button className="workbench-detail-link" onClick={retry} type="button">
          {t("workbench.performance.retry")}
        </button>
      </div>
    );
  }

  if (model.isEmpty) {
    return (
      <EmptyBlock
        icon={BarChart3}
        title={t("workbench.performance.emptyTitle")}
        text={t("workbench.performance.emptyText")}
      />
    );
  }

  return (
    <div className="workbench-performance-panel">
      <div className="workbench-performance-kpis">
        {model.kpis.map((item) => (
          <div className="workbench-performance-kpi" key={item.key}>
            <span>{t(item.labelKey)}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      <section className="workbench-performance-section">
        <header>
          <strong>{t("workbench.performance.sourcePlatformTitle")}</strong>
          <p>{model.channelDistributionHint}</p>
        </header>
        <div className="workbench-performance-distribution">
          {model.channelDistribution.length ? (
            model.channelDistribution.map((item) => (
              <div className="workbench-performance-distribution-row" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))
          ) : (
            <p className="workbench-performance-muted">
              {t("workbench.performance.emptyDistribution")}
            </p>
          )}
        </div>
      </section>

      <section className="workbench-performance-section">
        <header>
          <strong>{t("workbench.performance.staffRankTitle")}</strong>
          <p>{t("workbench.performance.staffRankHint")}</p>
        </header>
        <div className="workbench-performance-staff-list">
          {model.staffRows.map((row) => (
            <article className="performance-staff-row" key={row.staffUserId}>
              <div className="performance-staff-head">
                <strong>{row.displayName}</strong>
                <span>{t("workbench.performance.sessionsServed", { count: row.sessionsServed })}</span>
              </div>
              <div className="performance-staff-metrics">
                <InfoRow
                  label={t("workbench.performance.avgFirstResponse")}
                  value={row.avgFirstResponse}
                />
                <InfoRow
                  label={t("workbench.performance.avgDuration")}
                  value={row.avgDuration}
                />
                <InfoRow label={t("workbench.performance.avgRating")} value={row.avgRating} />
                <InfoRow
                  label={t("workbench.performance.excellentRate")}
                  value={row.excellentRate}
                />
              </div>
              <div className="performance-channel-breakdown">
                {row.channelBreakdown.map((channel) => (
                  <div className="performance-channel-card" key={channel.channel}>
                    <span>{t(channel.labelKey)}</span>
                    <strong>{channel.sessionsServed}</strong>
                    <small>
                      {t("workbench.performance.channelMeta", {
                        first: channel.avgFirstResponse,
                        rating: channel.avgRating,
                      })}
                    </small>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function EmptyBlock({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="workbench-empty">
      <Icon size={24} />
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="workbench-info-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatMetric(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return value.toLocaleString();
}
