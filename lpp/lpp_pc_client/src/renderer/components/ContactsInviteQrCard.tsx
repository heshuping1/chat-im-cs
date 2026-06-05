import { UserPlus } from "lucide-react";

import type { FriendInviteQrDto } from "../data/api-client";
import { useI18n } from "../i18n/useI18n";
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
  const { t } = useI18n();
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
        {t("contacts.inviteQr.title")}
      </h3>
      {loading && <PanelState text={t("contacts.inviteQr.loading")} />}
      {Boolean(error) && (
        <PanelState tone="error" text={t("contacts.inviteQr.loadFailed", { error: formatError(error) })} />
      )}
      {!loading && !error && qrPayload && (
        <div className="contacts-mini-rows">
          <div>
            <span>{t("contacts.inviteQr.content")}</span>
            <strong>{qrPayload}</strong>
          </div>
          <button type="button" onClick={copyPayload}>
            {t("contacts.inviteQr.copy")}
          </button>
        </div>
      )}
      {!loading && !error && !qrPayload && (
        <p className="contacts-request-message">
          {t("contacts.inviteQr.empty")}
        </p>
      )}
      <div className="contacts-actions compact">
        <button disabled={creating} onClick={onCreate} type="button">
          {creating ? t("contacts.inviteQr.creating") : qrPayload ? t("contacts.inviteQr.refresh") : t("contacts.inviteQr.create")}
        </button>
      </div>
    </section>
  );
}
