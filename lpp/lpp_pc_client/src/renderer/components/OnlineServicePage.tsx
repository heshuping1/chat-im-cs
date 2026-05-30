import {
  ChevronDown,
  Gauge,
  Route,
  SmilePlus,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { CSSProperties } from "react";
import { useMemo } from "react";
import { ChatWorkspace } from "./ChatWorkspace";
import { CustomerContextPanel } from "./CustomerContextPanel";
import { ThreadList } from "./ThreadList";
import { useAuthSession } from "../data/auth/auth-store";
import { pcQueryKeys } from "../data/query-keys";
import { createApiClient } from "../data/runtime";
import {
  useServiceListPaneWidth,
  useServiceProfilePaneWidth,
  useSetServiceListPaneWidth,
  useSetServiceProfilePaneWidth,
} from "../data/workspace-ui/workspace-ui-store";
import { startHorizontalPaneResize } from "../lib/paneResize";

export function OnlineServicePage() {
  const session = useAuthSession();
  const serviceListPaneWidth = useServiceListPaneWidth();
  const serviceProfilePaneWidth = useServiceProfilePaneWidth();
  const setServiceListPaneWidth = useSetServiceListPaneWidth();
  const setServiceProfilePaneWidth = useSetServiceProfilePaneWidth();
  const client = useMemo(
    () => (session ? createApiClient(session) : null),
    [session],
  );
  const queryBaseKey = [session?.apiBaseUrl, session?.tenantToken];
  const threadsQuery = useQuery({
    queryKey: pcQueryKeys.customerServiceThreads(...queryBaseKey),
    enabled: Boolean(client),
    queryFn: async () => client!.getWorkbenchThreads(),
    refetchInterval: 4_000,
    refetchIntervalInBackground: true,
  });
  const receptionStatusQuery = useQuery({
    queryKey: pcQueryKeys.customerServiceReception(...queryBaseKey),
    enabled: Boolean(client),
    queryFn: async () => client!.getReceptionStatus(),
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
  });

  const summary = threadsQuery.data?.summary;
  const queuedCount =
    summary?.queuedCount ?? threadsQuery.data?.queueItems?.length ?? 0;
  const activeCount =
    summary?.activeCount ?? threadsQuery.data?.activeItems?.length ?? 0;
  const totalCount =
    summary?.allCount ?? queuedCount + activeCount;
  const vipCount = summary?.vipCount ?? "--";
  const receptionStatus = receptionStatusQuery.data;
  const maxSessions = receptionStatus?.maxConcurrentSessions;
  const activeSessions = receptionStatus?.activeSessionCount ?? activeCount;
  const queueEnabled = receptionStatus?.queueAcceptEnabled;
  const metrics: Array<{ label: string; value: string; trend?: string }> = [
    { label: "会话总量", value: String(totalCount) },
    { label: "排队中", value: String(queuedCount) },
    { label: "进行中", value: String(activeCount) },
    { label: "VIP", value: String(vipCount) },
    { label: "SLA 风险", value: "--" },
  ];

  return (
    <section
      className="h-flagship-shell"
      style={
        {
          "--service-list-pane-width": `${serviceListPaneWidth}px`,
          "--service-profile-pane-width": `${serviceProfilePaneWidth}px`,
        } as CSSProperties
      }
    >
      <header className="h-flagship-topbar">
        <div className="h-metric-strip">
          {metrics.map((item) => (
            <div className="h-metric-item" key={item.label}>
              <span>{item.label}</span>
              <div className="h-metric-value">
                <strong>{item.value}</strong>
                {item.trend && <em>{item.trend}</em>}
              </div>
            </div>
          ))}
        </div>

        <div className="h-top-actions">
          <button type="button" disabled>
            <Route size={16} />
            接入模式：{queueEnabled === undefined ? "--" : queueEnabled ? "自动分配" : "手动接入"}
            <ChevronDown size={14} />
          </button>
          <button type="button" disabled>
            <Gauge size={16} />
            接入上限：{activeSessions}/{maxSessions ?? "--"}
          </button>
        </div>
      </header>

      <div className="h-flagship-grid">
        <ThreadList />
        <div
          className="resizer service-list-resizer"
          role="separator"
          aria-label="调整在线客服列表宽度"
          onPointerDown={(event) =>
            startHorizontalPaneResize(event, {
              initialWidth: serviceListPaneWidth,
              onResize: setServiceListPaneWidth,
            })
          }
        />
        <ChatWorkspace />
        <div
          className="resizer service-profile-resizer"
          role="separator"
          aria-label="调整客户资料宽度"
          onPointerDown={(event) =>
            startHorizontalPaneResize(event, {
              initialWidth: serviceProfilePaneWidth,
              onResize: setServiceProfilePaneWidth,
              direction: -1,
            })
          }
        />
        <CustomerContextPanel />
      </div>

      <div className="h-flagship-corner" aria-hidden="true">
        <UsersRound size={16} />
        <TrendingUp size={16} />
        <SmilePlus size={16} />
      </div>
    </section>
  );
}
