import { UserPlus } from "lucide-react";

import type { FriendInviteQrDto } from "../data/api-client";
import { formatError } from "../lib/format";
import { PanelState } from "./PanelState";

export function ContactsInviteQrCard({
  creating,
  error,
  loading,
  qrs,
  onCreate,
}: {
  creating: boolean;
  error: unknown;
  loading: boolean;
  qrs: FriendInviteQrDto[];
  onCreate: () => void;
}) {
  const activeQr = qrs.find((item) => item.qrPayload) ?? qrs[0];
  const qrPayload = activeQr?.qrPayload;
  const copyPayload = () => {
    if (!qrPayload || !navigator.clipboard) return;
    void navigator.clipboard.writeText(qrPayload).catch(() => undefined);
  };

  return (
    <section className="contacts-section-card contacts-invite-card">
      <h3>
        <UserPlus size={16} />
        添加联系人
      </h3>
      {loading && <PanelState text="正在读取好友二维码..." />}
      {Boolean(error) && (
        <PanelState tone="error" text={`二维码加载失败：${formatError(error)}`} />
      )}
      {!loading && !error && qrPayload && (
        <div className="contacts-mini-rows">
          <div>
            <span>好友二维码内容</span>
            <strong>{qrPayload}</strong>
          </div>
          <button type="button" onClick={copyPayload}>
            复制二维码内容
          </button>
        </div>
      )}
      {!loading && !error && !qrPayload && (
        <p className="contacts-request-message">
          暂无可用好友二维码，可生成后发给对方添加。
        </p>
      )}
      <div className="contacts-actions compact">
        <button disabled={creating} onClick={onCreate} type="button">
          {creating ? "生成中..." : qrPayload ? "刷新二维码" : "生成二维码"}
        </button>
      </div>
    </section>
  );
}
