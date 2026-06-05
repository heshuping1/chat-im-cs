import { Languages, Mail, ShieldAlert } from "lucide-react";
import { ChannelBadge } from "../../components/ChannelBadge";
import { PcAvatar } from "../../components/PcAvatar";
import type { CustomerServiceIdentityViewModel } from "../../data/customer-service/cs-identity-view-model";
import type { CustomerServiceReplyGate } from "../../data/customer-service/cs-thread-state";
import { useI18n } from "../../i18n/useI18n";
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
  const { t } = useI18n();
  return (
    <header className="h-chat-head">
      <div className="h-customer-title">
        <button
          className="h-customer-avatar-button"
          type="button"
          aria-label={t("customerService.header.openCustomerInfo")}
          title={t("customerService.header.openCustomerInfo")}
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
          <div className="chat-header-meta-chips" aria-label={t("customerService.header.statusAria")}>
            <span>{t("nav.onlineService")}</span>
            <ChannelBadge source={source} compact />
            <span>{identity.isVip ? t("customerService.header.vipCustomer") : t("customerService.header.normalCustomer")}</span>
            <span>{modeLabel}</span>
            <button
              className={`chat-meta-action ${autoTranslateEffective ? "active" : ""}`}
              type="button"
              aria-label={t("customerService.header.autoTranslateNamed", {
                state: autoTranslateModeLabel(autoTranslateMode, autoTranslateEffective, t),
              })}
              title={t("customerService.header.autoTranslateNamed", {
                state: autoTranslateModeLabel(autoTranslateMode, autoTranslateEffective, t),
              })}
              aria-pressed={autoTranslateEffective}
              onClick={onCycleAutoTranslateMode}
            >
              <Languages size={12} />
              {t("composer.translate")}
            </button>
            <span className={`reply-gate-${replyGate}`}>
              {replyGateLabel(replyGate, readOnly, t)}
            </span>
            {unreadCount > 0 && (
              <span className="attention">
                <Mail size={12} />
                {t("customerService.header.unread", { count: unreadCount })}
              </span>
            )}
            {risky && (
              <span className="danger">
                <ShieldAlert size={12} />
                {t("customerService.header.slaRisk")}
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
  t: (key: string) => string,
) {
  if (mode === "enabled") return t("customerService.header.autoTranslateEnabled");
  if (mode === "disabled") return t("customerService.header.autoTranslateDisabled");
  return effective
    ? t("customerService.header.autoTranslateGlobalEnabled")
    : t("customerService.header.autoTranslateGlobalDisabled");
}

function replyGateLabel(
  replyGate: CustomerServiceReplyGate,
  readOnly: boolean | undefined,
  t: (key: string) => string,
) {
  if (readOnly || replyGate === "readonly") return t("customerService.header.readonly");
  if (replyGate === "claim") return t("customerService.header.pendingClaim");
  if (replyGate === "takeover") return t("customerService.header.pendingTakeover");
  return t("customerService.header.replyable");
}
