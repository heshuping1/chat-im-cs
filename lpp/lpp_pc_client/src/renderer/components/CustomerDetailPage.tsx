import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  ClipboardList,
  MessageCircleMore,
  PencilLine,
  Radio,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Tags,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { buildCustomerModel, isKnown, type CustomerModel } from "./CustomerProfileModel";
import { useCustomerContextPanelModel } from "./CustomerContextPanel";
import { PanelState } from "./PanelState";
import { PcAvatar } from "./PcAvatar";
import { useSetActiveModule } from "../data/workspace-ui/workspace-ui-store";

type DetailTab =
  | "overview"
  | "trading"
  | "funds"
  | "tickets"
  | "sessions"
  | "touch"
  | "compliance"
  | "agentDevice";

const detailTabs: Array<{ key: DetailTab; label: string }> = [
  { key: "overview", label: "总览" },
  { key: "trading", label: "交易" },
  { key: "funds", label: "资金" },
  { key: "tickets", label: "工单" },
  { key: "sessions", label: "会话" },
  { key: "touch", label: "触达" },
  { key: "compliance", label: "KYC/合规" },
  { key: "agentDevice", label: "IB/设备" },
];

export function CustomerDetailPage() {
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const setActiveModule = useSetActiveModule();
  const { profileForPanel, profileLoading, selectedThread } = useCustomerContextPanelModel();
  const model = useMemo(
    () =>
      buildCustomerModel({
        avatarUrl: selectedThread?.customerAvatarUrl || selectedThread?.avatarUrl,
        profile: profileForPanel,
      }),
    [profileForPanel, selectedThread],
  );

  if (!selectedThread && !profileForPanel) {
    return (
      <main className="module-page customer-detail-page">
        <PanelState text="请选择在线客服会话后查看完整客户档案。" />
      </main>
    );
  }

  return (
    <main className="module-page customer-detail-page">
      <header className="customer-detail-hero">
        <button type="button" onClick={() => setActiveModule("onlineService")}>
          <ArrowLeft size={16} />
          返回会话
        </button>
        <PcAvatar avatarUrl={model.avatarUrl} className="e-avatar" name={model.name} />
        <div className="customer-detail-identity">
          <h1>{model.name}</h1>
          <p>
            {[model.lppId, model.customerId].filter(isKnown).join(" · ") ||
              "暂无客户识别信息"}
          </p>
          <div>
            {isKnown(model.vipLevel) && <span data-tone="vip">{model.vipLevel}</span>}
            {isKnown(model.risk) && <span data-tone="risk">{model.risk}</span>}
            {isKnown(model.verificationStatus) && <span>{model.verificationStatus}</span>}
            {isKnown(model.kyc) && <span>{model.kyc}</span>}
            {isKnown(model.source) && <span>来源 {model.source}</span>}
            {isKnown(model.channelApp) && <span>渠道应用 {model.channelApp}</span>}
          </div>
        </div>
        <div className="customer-detail-actions">
          <button type="button">
            <ClipboardList size={15} />
            创建工单
          </button>
          <button type="button">
            <Tags size={15} />
            编辑标签
          </button>
          <button type="button">
            <PencilLine size={15} />
            添加备注
          </button>
        </div>
      </header>

      {profileLoading && <PanelState text="正在加载完整客户档案..." />}

      <nav className="customer-detail-tabs" aria-label="完整客户档案页签">
        {detailTabs.map((tab) => (
          <button
            className={activeTab === tab.key ? "active" : ""}
            type="button"
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section className="customer-detail-content">
        {renderDetailTab(activeTab, model)}
      </section>
    </main>
  );
}

function renderDetailTab(tab: DetailTab, model: CustomerModel) {
  if (tab === "overview") {
    return (
      <div className="customer-detail-grid">
        <DetailCard title="账户总览" icon={<WalletCards size={17} />}>
          <DetailRows
            rows={[
              ["账户余额", model.accountBalance],
              ["净入金", model.netDeposit],
              ["累计入金", model.totalDeposit],
              ["激活状态", model.activationStatus],
            ]}
          />
        </DetailCard>
        <DetailCard title="服务上下文" icon={<CalendarClock size={17} />}>
          <DetailRows
            rows={[
              ["标签", model.tags.join(" / ") || "--"],
              ["跟进", model.nextFollowUp],
              ["工单", model.tickets.length > 0 ? `${model.tickets.length} 个` : "--"],
              ["备注", model.remark],
            ]}
          />
        </DetailCard>
        <DetailCard title="语言桥" icon={<BadgeCheck size={17} />}>
          <DetailRows
            rows={[
              ["客户接收", model.customerLanguage],
              ["客服查看", model.staffLanguage],
              ["翻译模式", model.translateMode],
              ["来源渠道", model.source],
            ]}
          />
        </DetailCard>
      </div>
    );
  }
  const config = {
    agentDevice: ["IB/设备", <Smartphone size={17} />],
    compliance: ["KYC/合规", <ShieldCheck size={17} />],
    funds: ["资金流水", <WalletCards size={17} />],
    sessions: ["会话", <MessageCircleMore size={17} />],
    tickets: ["工单", <ClipboardList size={17} />],
    touch: ["触达", <Radio size={17} />],
    trading: ["交易记录", <ReceiptText size={17} />],
  }[tab] as [string, ReactNode];
  return (
    <DetailCard title={config[0]} icon={config[1]}>
      <PanelState text="完整表格与处理记录将复用当前客户画像数据源按接口成熟度补齐。" />
    </DetailCard>
  );
}

function DetailCard({
  children,
  icon,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <article className="customer-detail-card">
      <h2>
        {icon}
        {title}
      </h2>
      {children}
    </article>
  );
}

function DetailRows({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="customer-detail-rows">
      {rows.map(([label, value]) => (
        <p key={label}>
          <span>{label}</span>
          <strong>{isKnown(value) ? value : "--"}</strong>
        </p>
      ))}
    </div>
  );
}
