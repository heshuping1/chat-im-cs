import { Forward, Reply, Trash2, X } from "lucide-react";

import { useI18n } from "../../i18n/useI18n";
import type { ReplyTarget } from "../models/messageComposerModel";

export function ReplyPreviewBar({
  onCancel,
  reply,
}: {
  onCancel: () => void;
  reply: Exclude<ReplyTarget, null>;
}) {
  const { t } = useI18n();

  return (
    <div className="composer-reply-preview" role="status">
      <Reply size={15} />
      <span>{t("composer.replyTo", { sender: reply.sender, preview: reply.preview })}</span>
      <button type="button" aria-label={t("composer.cancelReply")} onClick={onCancel}>
        <X size={14} />
      </button>
    </div>
  );
}

export function MultiSelectActionBar({
  onCancel,
  onDelete,
  onForward,
  selectedCount,
}: {
  onCancel: () => void;
  onDelete: () => void;
  onForward: () => void;
  selectedCount: number;
}) {
  const { t } = useI18n();

  return (
    <div className="pc-multi-select-bar" role="status">
      <span>{t("composer.selectedCount", { count: selectedCount })}</span>
      <button type="button" onClick={onForward} disabled={selectedCount === 0}>
        <Forward size={15} />
        {t("messages.contextMenu.action.forward")}
      </button>
      <button type="button" onClick={onDelete} disabled={selectedCount === 0}>
        <Trash2 size={15} />
        {t("messages.contextMenu.action.delete")}
      </button>
      <button type="button" onClick={onCancel}>
        <X size={15} />
        {t("common.cancel")}
      </button>
    </div>
  );
}
