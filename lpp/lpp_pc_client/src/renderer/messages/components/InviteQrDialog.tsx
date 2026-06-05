import { QrCode, X } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { PanelState } from "../../components/PanelState";
import type { FriendInviteQrDto } from "../../data/api-client";
import { useI18n } from "../../i18n/useI18n";
import { formatError } from "../../lib/format";

export function InviteQrDialog({
  creating,
  error,
  loading,
  onClose,
  onCreate,
  qrs,
}: {
  creating: boolean;
  error: unknown;
  loading: boolean;
  onClose: () => void;
  onCreate: () => void;
  qrs: FriendInviteQrDto[];
}) {
  const { t } = useI18n();
  const activeQr = qrs.find((item) => item.qrPayload) ?? qrs[0];
  const qrPayload = activeQr?.qrPayload ?? "";
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [qrRenderError, setQrRenderError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let canceled = false;
    setCopied(false);
    setQrImageUrl(null);
    setQrRenderError(null);
    if (!qrPayload) return undefined;

    void QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 220,
      color: {
        dark: "#111827",
        light: "#ffffff",
      },
    })
      .then((url) => {
        if (!canceled) setQrImageUrl(url);
      })
      .catch((nextError: unknown) => {
        if (!canceled) setQrRenderError(formatError(nextError));
      });

    return () => {
      canceled = true;
    };
  }, [qrPayload]);

  const copyQrPayload = async () => {
    if (!qrPayload) return;
    await navigator.clipboard.writeText(qrPayload);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="pc-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="pc-forward-dialog message-qr-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t("messages.inviteQr.title")}
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <h3>{t("messages.inviteQr.title")}</h3>
            <p>{t("messages.inviteQr.subtitle")}</p>
          </div>
          <button type="button" aria-label={t("common.close")} onClick={onClose}>
            <X size={16} />
          </button>
        </header>
        {loading && <PanelState text={t("messages.inviteQr.loading")} />}
        {Boolean(error) && (
          <PanelState text={t("messages.inviteQr.loadFailed", { error: formatError(error) })} />
        )}
        {!loading && !error && qrPayload && (
          <div className="message-qr-card">
            <div className="message-qr-image" aria-label={t("messages.inviteQr.qrAria")}>
              {qrImageUrl ? (
                <img alt={t("messages.inviteQr.qrAlt")} src={qrImageUrl} />
              ) : qrRenderError ? (
                <QrCode size={54} />
              ) : (
                <span>{t("messages.inviteQr.generating")}</span>
              )}
            </div>
            {qrRenderError && (
              <small>{t("messages.inviteQr.renderFailed", { error: qrRenderError })}</small>
            )}
            <strong>{qrPayload}</strong>
            <button type="button" onClick={() => void copyQrPayload()}>
              {copied ? t("common.copied") : t("messages.inviteQr.copyPayload")}
            </button>
          </div>
        )}
        {!loading && !error && !qrPayload && (
          <PanelState text={t("messages.inviteQr.empty")} />
        )}
        <footer className="message-start-footer">
          <button type="button" onClick={onClose}>{t("common.close")}</button>
          <button className="primary" type="button" disabled={creating} onClick={onCreate}>
            {creating ? t("messages.inviteQr.creating") : t("messages.inviteQr.create")}
          </button>
        </footer>
      </section>
    </div>
  );
}
