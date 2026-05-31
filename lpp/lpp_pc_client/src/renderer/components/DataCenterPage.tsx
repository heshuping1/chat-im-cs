import {
  Activity,
  ChartNoAxesCombined,
  Gauge,
  LineChart,
  RefreshCw,
  UsersRound,
} from "lucide-react";
import type { PcDataCenterView } from "../data/workspace-access";

const defaultDataCards = [
  {
    title: "客服效能",
    description: "接待量、首次响应、解决率、满意度和 SLA 达成。",
    icon: Gauge,
  },
  {
    title: "客户增长",
    description: "新增客户、活跃客户、VIP 客户和流失风险。",
    icon: UsersRound,
  },
  {
    title: "服务趋势",
    description: "排队、超时、投诉、转人工和渠道来源趋势。",
    icon: LineChart,
  },
  {
    title: "实时状态",
    description: "在线客服状态、队列压力和异常提醒。",
    icon: Activity,
  },
];

export function DataCenterPage({
  dataCenterView = "team-admin",
}: {
  dataCenterView?: PcDataCenterView;
}) {
  const dataCards = dataCardsForView(dataCenterView);
  const pageTitle =
    dataCenterView === "self-service"
      ? "我的服务数据"
      : dataCenterView === "enterprise-owner"
        ? "企业数据中心"
        : "数据中心";
  const pageDescription =
    dataCenterView === "self-service"
      ? "聚焦我的接待量、首次响应、解决率、满意度和工单处理。"
      : "承载服务运营、客户增长和客服效能指标。这里不是单张报表，而是指标、趋势、洞察和导出的统一入口。";
  return (
    <main className="module-page skeleton-page data-center-page">
      <header className="skeleton-hero">
        <div>
          <span className="eyebrow">DATA CENTER</span>
          <h1>{pageTitle}</h1>
          <p>{pageDescription}</p>
        </div>
        <button className="skeleton-primary-action" type="button" disabled>
          <RefreshCw size={16} />
          刷新指标
        </button>
      </header>

      <section className="skeleton-metric-strip">
        <div>
          <span>今日会话</span>
          <strong>--</strong>
        </div>
        <div>
          <span>SLA 风险</span>
          <strong>--</strong>
        </div>
        <div>
          <span>客户满意度</span>
          <strong>--</strong>
        </div>
        <div>
          <span>待处理工单</span>
          <strong>--</strong>
        </div>
      </section>

      <section className="skeleton-lane-grid four">
        {dataCards.map((card) => {
          const Icon = card.icon;
          return (
            <article className="skeleton-lane-card" key={card.title}>
              <span className="skeleton-lane-icon">
                <Icon size={18} />
              </span>
              <strong>{card.title}</strong>
              <p>{card.description}</p>
              <em>暂无数据</em>
            </article>
          );
        })}
      </section>

      <section className="skeleton-empty-panel wide">
        <ChartNoAxesCombined size={30} />
        <h2>暂无数据洞察</h2>
        <p>
          功能接入后，将按角色权限展示客服个人数据、团队数据、客户趋势、渠道表现和导出能力。
        </p>
      </section>
    </main>
  );
}

function dataCardsForView(dataCenterView: PcDataCenterView) {
  if (dataCenterView === "self-service") {
    return [
      {
        title: "我的接待效能",
        description: "我的接待量、首次响应、解决率、满意度和 SLA 达成。",
        icon: Gauge,
      },
      {
        title: "我的客户跟进",
        description: "今日联系客户、待跟进客户和重点客户提醒。",
        icon: UsersRound,
      },
      {
        title: "我的服务趋势",
        description: "个人排队接入、超时、转接和处理趋势。",
        icon: LineChart,
      },
      {
        title: "我的实时状态",
        description: "在线状态、当前会话压力和异常提醒。",
        icon: Activity,
      },
    ];
  }
  return defaultDataCards;
}
