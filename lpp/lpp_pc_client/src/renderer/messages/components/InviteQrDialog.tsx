import { QrCode, X } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { PanelState } from "../../components/PanelState";
import type { FriendInviteQrDto } from "../../data/api-client";
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
        aria-label="我的二维码"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <h3>我的二维码</h3>
            <p>让对方扫码或复制内容添加好友</p>
          </div>
          <button type="button" aria-label="关闭" onClick={onClose}>
            <X size={16} />
          </button>
        </header>
        {loading && <PanelState text="正在读取二维码..." />}
        {Boolean(error) && (
          <PanelState text={`二维码加载失败：${formatError(error)}`} />
        )}
        {!loading && !error && qrPayload && (
          <div className="message-qr-card">
            <div className="message-qr-image" aria-label="好友二维码">
              {qrImageUrl ? (
                <img alt="我的好友二维码" src={qrImageUrl} />
              ) : qrRenderError ? (
                <QrCode size={54} />
              ) : (
                <span>生成中</span>
              )}
            </div>
            {qrRenderError && <small>二维码生成失败：{qrRenderError}</small>}
            <strong>{qrPayload}</strong>
            <button type="button" onClick={() => void copyQrPayload()}>
              {copied ? "已复制" : "复制内容"}
            </button>
          </div>
        )}
        {!loading && !error && !qrPayload && (
          <PanelState text="暂无可用二维码，点击生成后即可使用。" />
        )}
        <footer className="message-start-footer">
          <button type="button" onClick={onClose}>关闭</button>
          <button className="primary" type="button" disabled={creating} onClick={onCreate}>
            {creating ? "生成中..." : "生成二维码"}
          </button>
        </footer>
      </section>
    </div>
  );
}
