import { FileText, StickyNote } from "lucide-react";

import { PanelState } from "../../components/PanelState";
import type { CustomerServiceThreadType } from "../../data/api/types";
import { useI18n } from "../../i18n/useI18n";
import { CustomerServiceSessionNotesPanel } from "./CustomerServiceSessionNotesPanel";

export function CustomerServiceSessionInfoPanel({
  threadId,
  threadTitle,
  threadType,
}: {
  threadId?: string;
  threadTitle?: string;
  threadType?: CustomerServiceThreadType | string | null;
}) {
  const { t } = useI18n();
  const canUseTempSessionNotes = Boolean(threadId) && threadType === "temp_session";
  return (
    <div className="cs-session-info-panel">
      <section className="cs-session-info-section">
        <header>
          <FileText size={16} />
          <div>
            <h3>{t("customerService.contextPanel.sessionSummary")}</h3>
            {threadTitle && <p>{threadTitle}</p>}
          </div>
        </header>
        <PanelState
          text={t("customerService.contextPanel.sessionSummaryEmpty")}
          tone="muted"
        />
      </section>
      <section className="cs-session-info-section">
        <header>
          <StickyNote size={16} />
          <div>
            <h3>{t("customerService.sessionNotes.title")}</h3>
          </div>
        </header>
        {canUseTempSessionNotes ? (
          <CustomerServiceSessionNotesPanel sessionId={threadId!} embedded />
        ) : (
          <PanelState
            text={t("customerService.contextPanel.sessionNotesUnavailable")}
            tone="muted"
          />
        )}
      </section>
    </div>
  );
}
