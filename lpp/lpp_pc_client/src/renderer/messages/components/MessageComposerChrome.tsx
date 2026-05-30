import { Forward, Reply, Trash2, X } from "lucide-react";

import type { ReplyTarget } from "../models/messageComposerModel";

export function ReplyPreviewBar({
  onCancel,
  reply,
}: {
  onCancel: () => void;
  reply: Exclude<ReplyTarget, null>;
}) {
  return (
    <div className="composer-reply-preview" role="status">
      <Reply size={15} />
      <span>
        Reply to {reply.sender}: {reply.preview}
      </span>
      <button
        type="button"
        aria-label="取消回复"
        onClick={onCancel}
      >
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
  return (
    <div className="pc-multi-select-bar" role="status">
      <span>Selected {selectedCount}</span>
      <button
        type="button"
        onClick={onForward}
        disabled={selectedCount === 0}
      >
        <Forward size={15} />
        转发
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={selectedCount === 0}
      >
        <Trash2 size={15} />
        删除
      </button>
      <button type="button" onClick={onCancel}>
        <X size={15} />
        取消
      </button>
    </div>
  );
}
