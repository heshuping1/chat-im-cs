import type { ReactNode } from "react";
import { ChevronRight, Copy, QrCode } from "lucide-react";
import type { FriendInviteQrDto } from "../data/api-client";
import { useI18n } from "../i18n/useI18n";
import { formatError, formatShortDate } from "../lib/format";

export type AccountPanel = "qrcode" | null;

export function AccountAction({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className="account-action-row" type="button" onClick={onClick}>
      {icon}
      <span>{label}</span>
      <ChevronRight size={14} />
    </button>
  );
}

export function AccountDetailPanel({
  panel,
  inviteQrs,
  inviteQrsLoading,
  inviteQrsError,
  onCreateInviteQr,
  creatingInviteQr,
  onCopy,
  onClose,
}: {
  panel: Exclude<AccountPanel, null>;
  inviteQrs: FriendInviteQrDto[];
  inviteQrsLoading: boolean;
  inviteQrsError: unknown;
  onCreateInviteQr: () => void;
  creatingInviteQr: boolean;
  onCopy: (text: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const titleMap = {
    qrcode: t("account.qrcode.title"),
  } satisfies Record<Exclude<AccountPanel, null>, string>;

  return (
    <section className="account-detail-panel" aria-label={titleMap[panel]}>
      <div className="account-detail-head">
        <strong>{titleMap[panel]}</strong>
        <button type="button" onClick={onClose}>
          {t("common.collapse")}
        </button>
      </div>
      {panel === "qrcode" && (
        <div className="account-detail-body">
          {inviteQrsLoading && <AccountInlineState text={t("account.qrcode.loading")} />}
          {Boolean(inviteQrsError) && (
            <AccountInlineState
              tone="error"
              text={t("account.qrcode.loadFailed", { error: formatError(inviteQrsError) })}
            />
          )}
          {inviteQrs.length > 0 ? (
            inviteQrs.map((item) => (
              <div className="account-real-card" key={item.tokenId || item.token}>
                <InfoLine label={t("account.qrcode.status")} value={item.status ?? "--"} />
                <InfoLine label={t("account.qrcode.expiresAt")} value={formatShortDate(item.expiresAt)} />
                <InfoLine
                  label={t("account.qrcode.usageCount")}
                  value={`${item.usedCount ?? 0}/${item.maxUses ?? 0}`}
                />
                <InfoLine
                  label={t("account.qrcode.payload")}
                  value={item.qrPayload ?? "--"}
                  action={item.qrPayload ? () => onCopy(item.qrPayload!) : undefined}
                />
              </div>
            ))
          ) : (
            !inviteQrsLoading &&
            !Boolean(inviteQrsError) && (
              <div className="account-detail-empty">
                <QrCode size={18} />
                <strong>{t("account.qrcode.emptyTitle")}</strong>
                <span>{t("account.qrcode.emptyText")}</span>
              </div>
            )
          )}
          <button
            type="button"
            className="account-inline-action"
            disabled={creatingInviteQr}
            onClick={onCreateInviteQr}
          >
            <QrCode size={14} />
            {creatingInviteQr ? t("account.qrcode.creating") : t("account.qrcode.create")}
          </button>
        </div>
      )}
    </section>
  );
}

export async function copyToClipboard(text: string) {
  if (!text || text === "--") return;
  await navigator.clipboard?.writeText(text).catch(() => undefined);
}

function AccountInlineState({
  text,
  tone = "muted",
}: {
  text: string;
  tone?: "muted" | "error";
}) {
  return <p className={`account-inline-state ${tone}`}>{text}</p>;
}

function InfoLine({
  label,
  value,
  action,
}: {
  label: string;
  value: string;
  action?: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="account-info-line">
      <span>{label}</span>
      <strong>{value || "--"}</strong>
      {action && (
        <button type="button" onClick={action} aria-label={t("common.copyNamed", { name: label })}>
          <Copy size={13} />
        </button>
      )}
    </div>
  );
}
