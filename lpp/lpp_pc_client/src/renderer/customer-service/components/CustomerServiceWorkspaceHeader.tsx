import { Languages, Mail, ShieldAlert } from "lucide-react";
import { ChannelBadge } from "../../components/ChannelBadge";
import { PcAvatar } from "../../components/PcAvatar";
import type { CustomerServiceIdentityViewModel } from "../../data/customer-service/cs-identity-view-model";
import type { CustomerServiceReplyGate } from "../../data/customer-service/cs-thread-state";
import type { AutoTranslateConversationMode } from "../../translation/models/autoTranslatePreferences";

export function CustomerServiceWorkspaceHeader({
  identity,
  modeLabel,
  readOnly,
  replyGate,
  risky,
  source,
  title,
  autoTranslateEffective,
  autoTranslateMode,
  unreadCount = 0,
  onCycleAutoTranslateMode,
  onOpenCustomerContext,
}: {
  identity: CustomerServiceIdentityViewModel;
  modeLabel: string;
  readOnly?: boolean;
  replyGate: CustomerServiceReplyGate;
  risky?: boolean;
  source?: string;
  title: string;
  autoTranslateEffective: boolean;
  autoTranslateMode: AutoTranslateConversationMode;
  unreadCount?: number;
  onCycleAutoTranslateMode: () => void;
  onOpenCustomerContext?: () => void;
}) {
  return (
    <header className="h-chat-head">
      <div className="h-customer-title">
        <button
          className="h-customer-avatar-button"
          type="button"
          aria-label="打开客户信息"
          title="打开客户信息"
          onClick={onOpenCustomerContext}
        >
          <PcAvatar
            avatarUrl={identity.avatarUrl}
            className={`e-avatar ${identity.avatarTone}`}
            name={identity.avatarName}
          />
        </button>
        <div>
          <h2>{title}</h2>
          <div className="chat-header-meta-chips" aria-label="客服会话状态">
            <span>在线客服</span>
            <ChannelBadge source={source} compact />
            <span>{identity.isVip ? "VIP 客户" : "普通客户"}</span>
            <span>{modeLabel}</span>
            <button
              className={`chat-meta-action ${autoTranslateEffective ? "active" : ""}`}
              type="button"
              aria-label={`自动翻译：${autoTranslateModeLabel(autoTranslateMode, autoTranslateEffective)}`}
              title={`自动翻译：${autoTranslateModeLabel(autoTranslateMode, autoTranslateEffective)}`}
              aria-pressed={autoTranslateEffective}
              onClick={onCycleAutoTranslateMode}
            >
              <Languages size={12} />
              翻译
            </button>
            <span className={`reply-gate-${replyGate}`}>
              {replyGateLabel(replyGate, readOnly)}
            </span>
            {unreadCount > 0 && (
              <span className="attention">
                <Mail size={12} />
                未读 {unreadCount}
              </span>
            )}
            {risky && (
              <span className="danger">
                <ShieldAlert size={12} />
                SLA 风险
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function autoTranslateModeLabel(
  mode: AutoTranslateConversationMode,
  effective: boolean,
) {
  if (mode === "enabled") return "本会话开启";
  if (mode === "disabled") return "本会话关闭";
  return effective ? "跟随全局，已开启" : "跟随全局，已关闭";
}

function replyGateLabel(replyGate: CustomerServiceReplyGate, readOnly?: boolean) {
  if (readOnly || replyGate === "readonly") return "只读";
  if (replyGate === "claim") return "待接入";
  if (replyGate === "takeover") return "待接管";
  return "可回复";
}
