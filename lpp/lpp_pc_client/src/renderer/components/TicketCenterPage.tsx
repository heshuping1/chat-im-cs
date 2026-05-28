import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ClipboardList,
  Search,
  SlidersHorizontal,
} from "lucide-react";

const ticketLanes = [
  {
    title: "待处理",
    description: "客户投诉、资料补充、出入金异常等待客服跟进。",
    icon: Clock3,
  },
  {
    title: "升级中",
    description: "需要主管、合规、财务或技术协同处理的工单。",
    icon: AlertTriangle,
  },
  {
    title: "已解决",
    description: "沉淀处理结果、客户确认和知识库候选内容。",
    icon: CheckCircle2,
  },
];

export function TicketCenterPage() {
  return (
    <main className="module-page skeleton-page ticket-center-page">
      <header className="skeleton-hero">
        <div>
          <span className="eyebrow">TICKET CENTER</span>
          <h1>工单中心</h1>
          <p>
            承接在线客服升级、客户投诉、资料补充和跨团队协同，保证复杂问题有明确负责人和处理记录。
          </p>
        </div>
        <button className="skeleton-primary-action" type="button" disabled>
          <ClipboardList size={16} />
          新建工单
        </button>
      </header>

      <section className="skeleton-toolbar" aria-label="工单筛选">
        <label className="skeleton-search">
          <Search size={16} />
          <input placeholder="搜索工单编号、客户、标题" />
        </label>
        <button type="button">
          <SlidersHorizontal size={15} />
          筛选
        </button>
      </section>

      <section className="skeleton-lane-grid">
        {ticketLanes.map((lane) => {
          const Icon = lane.icon;
          return (
            <article className="skeleton-lane-card" key={lane.title}>
              <span className="skeleton-lane-icon">
                <Icon size={18} />
              </span>
              <strong>{lane.title}</strong>
              <p>{lane.description}</p>
              <em>暂无数据</em>
            </article>
          );
        })}
      </section>

      <section className="skeleton-empty-panel">
        <ClipboardList size={28} />
        <h2>暂无工单</h2>
        <p>
          功能接入后，这里会展示工单列表、优先级、SLA、负责人、状态流转和处理记录。
        </p>
      </section>
    </main>
  );
}
