import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpenText,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Headphones,
  LockKeyhole,
  Megaphone,
  MessageSquareText,
  Radio,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuthSession } from "../data/auth/auth-store";
import { pcQueryKeys } from "../data/query-keys";
import { normalizeKnowledgeBasesResponse } from "../data/api/knowledge-normalizers";
import { createApiClient } from "../data/runtime";
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
  "wb-admin-customers": UsersRound,
  "wb-admin-service-center": Headphones,
  "wb-admin-groups": ShieldCheck,
  "wb-owner-broadcast": Radio,
};

const shortcutRoutes: Partial<Record<string, ModuleKey>> = {
  "wb-cs-quick-replies": "knowledgeBase",
};

export function WorkbenchPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const authSession = useAuthSession();
  const setActiveModule = useSetActiveModule();
  const currentWorkspaceRole = roleFromSession(authSession);
  const [selectedShortcutId, setSelectedShortcutId] = useState("wb-cs-notices");
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

  const grouped = visibleItems.reduce<Record<string, WorkbenchShortcut[]>>(
    (result, item) => {
      result[item.groupKey] = [...(result[item.groupKey] ?? []), item];
      return result;
    },
    {},
  );

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

  const roleLabel = t(`workbench.role.${currentWorkspaceRole}`);
  const summary = threadsQuery.data?.summary;
  const announcementCount = announcementsQuery.data?.length;
  const receptionStatus = receptionQuery.data?.serviceStatus;
  const knowledgeBases = normalizeKnowledgeBasesResponse(knowledgeBasesQuery.data);

  function handleShortcutAction(item: WorkbenchShortcut) {
    setSelectedShortcutId(item.id);
    setNotice(null);
    if (item.state === "no_permission") return;
    const target = shortcutRoutes[item.id];
    if (target) {
      setActiveModule(target);
    }
  }

  return (
    <main className="module-page workbench-page">
      <header className="workbench-hero">
        <div>
          <span className="eyebrow">ROLE WORKBENCH</span>
          <h1>{t("workbench.heroTitle", { role: roleLabel })}</h1>
          <p>
            {t("workbench.heroSubtitle", {
              role: roleLabel,
              tenant: authSession?.tenantName ?? t("workbench.currentEnterprise"),
            })}
          </p>
        </div>
        <div className="role-card" aria-label={t("workbench.currentRole")}>
          <UsersRound size={20} />
          <span>{t("workbench.currentRole")}</span>
          <strong>{roleLabel}</strong>
        </div>
      </header>

      {notice && (
        <p className="workbench-notice" role="status">
          {notice}
        </p>
      )}

      <section className="workbench-summary" aria-label={t("workbench.summaryAria")}>
        <MetricCard
          icon={Megaphone}
          label={t("workbench.summary.announcements")}
          value={formatMetric(announcementCount)}
          hint={announcementsQuery.isError ? t("workbench.announcementLoadFailed") : t("workbench.summary.announcementsHint")}
        />
        <MetricCard
          icon={BookOpenText}
          label={t("workbench.summary.quickReplies")}
          value={t("workbench.entry")}
          hint={t("workbench.summary.quickRepliesHint")}
        />
        <MetricCard
          icon={Headphones}
          label={t("workbench.summary.receptionStatus")}
          value={workbenchReceptionStatusLabel(receptionStatus, t)}
          hint={t("workbench.summary.receptionStatusHint")}
        />
        <MetricCard
          icon={BarChart3}
          label={t("workbench.summary.currentConversations")}
          value={formatMetric(summary?.allCount)}
          hint={
            threadsQuery.isError
              ? t("workbench.performanceLoadFailed")
              : t("workbench.summary.threadHint", {
                  active: formatMetric(summary?.activeCount),
                  queue: formatMetric(summary?.queuedCount),
                })
          }
        />
      </section>

      <section className="workbench-main-grid">
        <div className="workbench-left">
          {Object.entries(grouped).map(([group, items]) => {
            const groupKey = group as WorkbenchShortcut["groupKey"];
            const Icon = workbenchGroupIcon(groupKey);
            return (
              <section className="workbench-section" key={group}>
                <h2>
                  <Icon size={17} />
                  {workbenchGroupLabel(groupKey, t)}
                </h2>
                <div className="workbench-grid">
                  {items.map((item) => (
                    <ShortcutCard
                      item={item}
                      key={item.id}
                      selected={item.id === selectedShortcut?.id}
                      onClick={() => {
                        setSelectedShortcutId(item.id);
                        setNotice(null);
                      }}
                      onAction={() => handleShortcutAction(item)}
                      t={t}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>

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
              reception={receptionQuery.data}
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

function workbenchGroupIcon(group: WorkbenchShortcut["groupKey"]) {
  switch (group) {
    case "customerService":
      return MessageSquareText;
    case "admin":
      return ShieldCheck;
    case "owner":
      return Building2;
    default:
      return MessageSquareText;
  }
}

function workbenchGroupLabel(group: WorkbenchShortcut["groupKey"], t: WorkbenchTranslate) {
  return t(`workbench.group.${group}`);
}

function workbenchStateLabel(state: WorkbenchShortcut["state"], t: WorkbenchTranslate) {
  return t(`workbench.state.${state}.label`);
}

function workbenchStateHint(state: WorkbenchShortcut["state"], t: WorkbenchTranslate) {
  return t(`workbench.state.${state}.hint`);
}

function workbenchShortcutTitle(item: WorkbenchShortcut, t: WorkbenchTranslate) {
  return t(item.titleKey);
}

function workbenchShortcutDescription(item: WorkbenchShortcut, t: WorkbenchTranslate) {
  return t(item.descriptionKey);
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

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="workbench-metric-card">
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </div>
  );
}

function ShortcutCard({
  item,
  selected,
  onClick,
  onAction,
  t,
}: {
  item: WorkbenchShortcut;
  selected: boolean;
  onClick: () => void;
  onAction: () => void;
  t: WorkbenchTranslate;
}) {
  const Icon = shortcutIcons[item.id] ?? MessageSquareText;
  const disabled = item.state === "no_permission";
  return (
    <article
      className={`workbench-card ${item.state} ${selected ? "active" : ""}`}
      onClick={onClick}
    >
      <div className="workbench-card-head">
        <span className="workbench-card-icon">
          <Icon size={18} />
        </span>
        <span className="card-state">
          {item.state === "no_permission" && <LockKeyhole size={13} />}
          {workbenchStateLabel(item.state, t)}
        </span>
      </div>
      <strong>{workbenchShortcutTitle(item, t)}</strong>
      <p>{workbenchShortcutDescription(item, t)}</p>
      <footer>
        <em>{item.metric ?? workbenchStateHint(item.state, t)}</em>
        <button
          aria-label={t("workbench.openShortcut", { title: workbenchShortcutTitle(item, t) })}
          disabled={disabled}
          onClick={(event) => {
            event.stopPropagation();
            onAction();
          }}
          type="button"
        >
          <ChevronRight size={16} />
        </button>
      </footer>
    </article>
  );
}

function WorkbenchDetail({
  announcements,
  announcementsError,
  item,
  markRead,
  knowledgeBases,
  knowledgeError,
  onOpenModule,
  reception,
  t,
  threads,
  threadsError,
}: {
  announcements: EnterpriseAnnouncementDto[];
  announcementsError: string;
  item: WorkbenchShortcut;
  markRead: (id: string) => void;
  knowledgeBases: KnowledgeBaseDto[];
  knowledgeError: string;
  onOpenModule: (module: ModuleKey) => void;
  reception?: StaffReceptionStatusDto;
  t: WorkbenchTranslate;
  threads?: CustomerServiceThreadsResponse;
  threadsError: string;
}) {
  if (item.id === "wb-cs-notices") {
    return (
      <>
        <DetailHeader icon={Megaphone} item={item} t={t} />
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
        <DetailHeader icon={BookOpenText} item={item} t={t} />
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
    return (
      <>
        <DetailHeader icon={BarChart3} item={item} t={t} />
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

  return (
    <>
      <DetailHeader icon={shortcutIcons[item.id] ?? ClipboardList} item={item} t={t} />
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

function DetailHeader({
  icon: Icon,
  item,
  t,
}: {
  icon: LucideIcon;
  item: WorkbenchShortcut;
  t: WorkbenchTranslate;
}) {
  return (
    <header className="workbench-detail-head">
      <div>
        <span>
          <Icon size={17} />
          {workbenchGroupLabel(item.groupKey, t)}
        </span>
        <h2>{workbenchShortcutTitle(item, t)}</h2>
      </div>
      <em>{workbenchStateLabel(item.state, t)}</em>
    </header>
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

function formatMetric(value?: number | null) {
  return typeof value === "number" ? String(value) : "--";
}
