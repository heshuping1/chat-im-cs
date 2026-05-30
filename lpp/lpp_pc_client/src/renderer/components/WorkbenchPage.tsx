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
import { createApiClient } from "../data/runtime";
import { customerServiceReceptionStatusLabel } from "../data/customer-service-display";
import {
  roleFromSession,
  roleLabels,
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
import { formatError, formatMonthDayTime } from "../lib/format";

const groupIcons: Record<string, LucideIcon> = {
  客服工作台: MessageSquareText,
  管理工作台: ShieldCheck,
  所有者工作台: Building2,
};

const shortcutIcons: Record<string, LucideIcon> = {
  "wb-cs-notices": Megaphone,
  "wb-cs-quick-replies": BookOpenText,
  "wb-cs-performance": BarChart3,
  "wb-admin-customers": UsersRound,
  "wb-admin-service-center": Headphones,
  "wb-admin-groups": ShieldCheck,
  "wb-owner-broadcast": Radio,
};

const stateLabels: Record<WorkbenchShortcut["state"], string> = {
  available: "可用",
  readonly: "只读",
  no_permission: "无权限",
  pending_api: "待接入",
};

const stateHints: Record<WorkbenchShortcut["state"], string> = {
  available: "可以进入或查看",
  readonly: "只读查看",
  no_permission: "当前角色不可用",
  pending_api: "入口已保留，等待页面或接口接入",
};

const shortcutRoutes: Partial<Record<string, ModuleKey>> = {
  "wb-cs-quick-replies": "knowledgeBase",
};

export function WorkbenchPage() {
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
      result[item.group] = [...(result[item.group] ?? []), item];
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
      setNotice("公告已标记为已读");
      await queryClient.invalidateQueries({
        queryKey: ["pc-workbench-announcements"],
      });
    },
    onError: (error) => setNotice(`已读上报失败：${formatError(error)}`),
  });

  const roleLabel = roleLabels[currentWorkspaceRole];
  const summary = threadsQuery.data?.summary;
  const announcementCount = announcementsQuery.data?.length;
  const receptionStatus = receptionQuery.data?.serviceStatus;

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
          <h1>{roleLabel}工作台</h1>
          <p>
            {authSession?.tenantName ?? "当前企业"} · {roleLabel}入口。消息、通讯录和在线客服保持独立，工作台只放角色任务和管理入口。
          </p>
        </div>
        <div className="role-card" aria-label="当前角色">
          <UsersRound size={20} />
          <span>当前角色</span>
          <strong>{roleLabel}</strong>
        </div>
      </header>

      {notice && (
        <p className="workbench-notice" role="status">
          {notice}
        </p>
      )}

      <section className="workbench-summary" aria-label="工作台摘要">
        <MetricCard
          icon={Megaphone}
          label="企业公告"
          value={formatMetric(announcementCount)}
          hint={announcementsQuery.isError ? "公告加载失败" : "已发布且未过期"}
        />
        <MetricCard
          icon={BookOpenText}
          label="常用话术"
          value="入口"
          hint="复用知识库与话术能力"
        />
        <MetricCard
          icon={Headphones}
          label="接待状态"
          value={customerServiceReceptionStatusLabel(receptionStatus)}
          hint="进入工作台不会自动改变状态"
        />
        <MetricCard
          icon={BarChart3}
          label="当前会话"
          value={formatMetric(summary?.allCount)}
          hint={
            threadsQuery.isError
              ? "效能数据加载失败"
              : `排队 ${formatMetric(summary?.queuedCount)} · 进行中 ${formatMetric(summary?.activeCount)}`
          }
        />
      </section>

      <section className="workbench-main-grid">
        <div className="workbench-left">
          {Object.entries(grouped).map(([group, items]) => {
            const Icon = groupIcons[group] ?? MessageSquareText;
            return (
              <section className="workbench-section" key={group}>
                <h2>
                  <Icon size={17} />
                  {group}
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
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <aside className="workbench-detail" aria-label="工作台详情">
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
              knowledgeBases={knowledgeBasesQuery.data ?? []}
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
            />
          ) : (
            <EmptyBlock
              icon={LockKeyhole}
              title="暂无可用工作台入口"
              text="当前角色没有配置工作台能力。"
            />
          )}
        </aside>
      </section>
    </main>
  );
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
}: {
  item: WorkbenchShortcut;
  selected: boolean;
  onClick: () => void;
  onAction: () => void;
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
          {stateLabels[item.state]}
        </span>
      </div>
      <strong>{item.title}</strong>
      <p>{item.description}</p>
      <footer>
        <em>{item.metric ?? stateHints[item.state]}</em>
        <button
          aria-label={`打开${item.title}`}
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
  threads?: CustomerServiceThreadsResponse;
  threadsError: string;
}) {
  if (item.id === "wb-cs-notices") {
    return (
      <>
        <DetailHeader icon={Megaphone} item={item} />
        {announcementsError ? (
          <EmptyBlock
            icon={TriangleAlert}
            title="公告加载失败"
            text={announcementsError}
          />
        ) : announcements.length > 0 ? (
          <div className="workbench-list">
            {announcements.slice(0, 6).map((announcement) => (
              <article className="workbench-list-item" key={announcement.announcementId}>
                <div>
                  <span className={`priority ${announcement.priority ?? "normal"}`}>
                    {announcement.priority === "important" ? "重要" : "普通"}
                  </span>
                  <strong>{announcement.title}</strong>
                  <p>{announcement.content}</p>
                  <small>{formatMonthDayTime(announcement.publishedAt)}</small>
                </div>
                <button
                  onClick={() => markRead(announcement.announcementId)}
                  type="button"
                >
                  已读
                </button>
              </article>
            ))}
          </div>
        ) : (
          <EmptyBlock
            icon={Megaphone}
            title="暂无企业公告"
            text="当前企业没有已发布且未过期的公告。"
          />
        )}
      </>
    );
  }

  if (item.id === "wb-cs-quick-replies") {
    return (
      <>
        <DetailHeader icon={BookOpenText} item={item} />
        {knowledgeError ? (
          <EmptyBlock icon={TriangleAlert} title="话术加载失败" text={knowledgeError} />
        ) : knowledgeBases.length ? (
          <div className="workbench-list">
            {knowledgeBases.slice(0, 5).map((base) => (
              <article
                className="workbench-list-item"
                key={base.knowledgeBaseId || base.id || base.name}
              >
                <div>
                  <span className="priority normal">知识库</span>
                  <strong>{base.name || base.title || "未命名知识库"}</strong>
                  <p>{base.description || base.summary || "暂无摘要"}</p>
                  <small>
                    {base.documentCount != null
                      ? `${base.documentCount} 篇内容`
                      : "内容数 --"}
                  </small>
                </div>
                <button onClick={() => onOpenModule("knowledgeBase")} type="button">
                  打开
                </button>
              </article>
            ))}
          </div>
        ) : (
          <EmptyBlock
            icon={BookOpenText}
            title="暂无常用话术"
            text="服务端未返回可用知识库或话术内容。"
          />
        )}
        <button
          className="workbench-detail-link"
          onClick={() => onOpenModule("knowledgeBase")}
          type="button"
        >
          打开知识库
          <ArrowRight size={15} />
        </button>
      </>
    );
  }

  if (item.id === "wb-cs-performance") {
    return (
      <>
        <DetailHeader icon={BarChart3} item={item} />
        {threadsError ? (
          <EmptyBlock icon={TriangleAlert} title="效能数据加载失败" text={threadsError} />
        ) : (
          <div className="workbench-detail-grid">
            <InfoRow
              label="我的在线客服状态"
              value={customerServiceReceptionStatusLabel(reception?.serviceStatus)}
            />
            <InfoRow
              label="接入模式"
              value={reception?.queueAcceptEnabled ? "自动分配" : "手动接入"}
            />
            <InfoRow label="当前全部会话" value={formatMetric(threads?.summary?.allCount)} />
            <InfoRow label="排队" value={formatMetric(threads?.summary?.queuedCount)} />
            <InfoRow label="进行中" value={formatMetric(threads?.summary?.activeCount)} />
            <InfoRow label="VIP" value={formatMetric(threads?.summary?.vipCount)} />
          </div>
        )}
        <button
          className="workbench-detail-link"
          onClick={() => onOpenModule("onlineService")}
          type="button"
        >
          打开在线客服
          <ArrowRight size={15} />
        </button>
      </>
    );
  }

  return (
    <>
      <DetailHeader icon={shortcutIcons[item.id] ?? ClipboardList} item={item} />
      <EmptyBlock
        icon={CheckCircle2}
        title="入口已放好"
        text="这里先保留角色化入口和权限边界；后续接入对应页面或接口后再填充真实数据。"
      />
      <div className="workbench-detail-grid">
        <InfoRow label="角色范围" value={item.roles.map((role) => roleLabels[role]).join("、")} />
        <InfoRow label="当前状态" value={stateLabels[item.state]} />
        <InfoRow label="数据口径" value="不造假；无接口时显示空态" />
      </div>
    </>
  );
}

function DetailHeader({
  icon: Icon,
  item,
}: {
  icon: LucideIcon;
  item: WorkbenchShortcut;
}) {
  return (
    <header className="workbench-detail-head">
      <div>
        <span>
          <Icon size={17} />
          {item.group}
        </span>
        <h2>{item.title}</h2>
      </div>
      <em>{stateLabels[item.state]}</em>
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
