import { ArrowRightLeft, Languages, Mail, NotebookText, Search, ShieldAlert, XCircle } from "lucide-react";
import { ChannelBadge } from "../../components/ChannelBadge";
import { PcAvatar } from "../../components/PcAvatar";
import type { CustomerServiceIdentityViewModel } from "../../data/customer-service/cs-identity-view-model";
import type { CustomerServiceReplyGate } from "../../data/customer-service/cs-thread-state";
import { useI18n } from "../../i18n/useI18n";
import type { AutoTranslateConversationMode } from "../../translation/models/autoTranslatePreferences";

export function CustomerServiceWorkspaceHeader({
  identity,
  closureReason,
  modeLabel,
  readOnly,
  replyGate,
  risky,
  source,
  title,
  autoTranslateEffective,
  autoTranslateMode,
  canClose,
  canTransfer,
  transferMode = "transfer",
  unreadCount = 0,
  onCycleAutoTranslateMode,
  onCloseThread,
  onOpenLookup,
  onOpenTransfer,
  onOpenTransferRemarks,
  onOpenCustomerContext,
}: {
  identity: CustomerServiceIdentityViewModel;
  closureReason?: string;
  modeLabel: string;
  readOnly?: boolean;
  replyGate: CustomerServiceReplyGate;
  risky?: boolean;
  source?: string;
  title: string;
  autoTranslateEffective: boolean;
  autoTranslateMode: AutoTranslateConversationMode;
  canClose?: boolean;
  unreadCount?: number;
  canTransfer?: boolean;
  transferMode?: "assign" | "transfer";
  onCycleAutoTranslateMode: () => void;
  onCloseThread?: () => void;
  onOpenLookup: () => void;
  onOpenTransfer?: () => void;
  onOpenTransferRemarks?: () => void;
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
            {closureReason && <span className="attention">{closureReason}</span>}
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
      <div className="h-chat-head-actions" aria-label={t("customerService.header.actionsAria")}>
        <button
          className={autoTranslateEffective ? "active" : ""}
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
          <Languages size={14} />
          {t("composer.translate")}
        </button>
        <button
          type="button"
          disabled={!canTransfer || !onOpenTransfer}
          aria-label={t(transferMode === "assign" ? "customerService.transfer.assign.open" : "customerService.transfer.open")}
          title={t(transferMode === "assign" ? "customerService.transfer.assign.open" : "customerService.transfer.open")}
          onClick={onOpenTransfer}
        >
          <ArrowRightLeft size={14} />
          {t(transferMode === "assign" ? "customerService.transfer.assignShort" : "customerService.transfer.openShort")}
        </button>
        <button
          type="button"
          disabled={!canClose || !onCloseThread}
          aria-label={t("customerService.action.closeThread")}
          title={t("customerService.action.closeThread")}
          onClick={onCloseThread}
        >
          <XCircle size={14} />
          {t("common.close")}
        </button>
        <button
          type="button"
          disabled={!onOpenTransferRemarks}
          aria-label={t("customerService.transferRemarks.open")}
          title={t("customerService.transferRemarks.open")}
          onClick={onOpenTransferRemarks}
        >
          <NotebookText size={14} />
          {t("customerService.transferRemarks.openShort")}
        </button>
        <button
          type="button"
          aria-label={t("messages.chatHeader.searchMessages")}
          title={t("messages.chatHeader.searchMessages")}
          onClick={onOpenLookup}
        >
          <Search size={14} />
          {t("messages.chatHeader.searchMessages")}
        </button>
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
