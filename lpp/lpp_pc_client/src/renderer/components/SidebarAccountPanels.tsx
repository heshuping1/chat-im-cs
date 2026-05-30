import type { ReactNode } from "react";
import { ChevronRight, Copy, QrCode } from "lucide-react";
import type { FriendInviteQrDto } from "../data/api-client";
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
  const titleMap = {
    qrcode: "我的二维码",
  } satisfies Record<Exclude<AccountPanel, null>, string>;

  return (
    <section className="account-detail-panel" aria-label={titleMap[panel]}>
      <div className="account-detail-head">
        <strong>{titleMap[panel]}</strong>
        <button type="button" onClick={onClose}>
          收起
        </button>
      </div>
      {panel === "qrcode" && (
        <div className="account-detail-body">
          {inviteQrsLoading && <AccountInlineState text="正在读取二维码..." />}
          {Boolean(inviteQrsError) && (
            <AccountInlineState
              tone="error"
              text={`二维码加载失败：${formatError(inviteQrsError)}`}
            />
          )}
          {inviteQrs.length > 0 ? (
            inviteQrs.map((item) => (
              <div className="account-real-card" key={item.tokenId || item.token}>
                <InfoLine label="状态" value={item.status ?? "--"} />
                <InfoLine label="有效期" value={formatShortDate(item.expiresAt)} />
                <InfoLine
                  label="使用次数"
                  value={`${item.usedCount ?? 0}/${item.maxUses ?? 0}`}
                />
                <InfoLine
                  label="二维码内容"
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
                <strong>暂无有效二维码</strong>
                <span>可以通过接口生成一个新的加好友二维码。</span>
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
            {creatingInviteQr ? "生成中..." : "生成二维码"}
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
  return (
    <div className="account-info-line">
      <span>{label}</span>
      <strong>{value || "--"}</strong>
      {action && (
        <button type="button" onClick={action} aria-label={`复制${label}`}>
          <Copy size={13} />
        </button>
      )}
    </div>
  );
}
