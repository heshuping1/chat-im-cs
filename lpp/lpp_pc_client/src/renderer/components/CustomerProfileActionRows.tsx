import {
  CalendarClock,
  Check,
  ClipboardList,
  PencilLine,
  Tags,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import {
  isKnown,
  type CustomerModel,
} from "./CustomerProfileModel";
import { CustomerProfileTagList } from "./CustomerProfileBits";

export function CustomerProfileActionRows({
  model,
  notice,
  onOpenTickets,
  onPendingAction,
  onUpdateRemark,
  onUpdateTags,
  pending = false,
}: {
  model: CustomerModel;
  notice: string;
  onOpenTickets: () => void;
  onPendingAction: (notice: string) => void;
  onUpdateRemark?: (remarkName: string) => Promise<void> | void;
  onUpdateTags?: (tags: string[]) => Promise<void> | void;
  pending?: boolean;
}) {
  const ticketCount = model.tickets.length;
  const [editingRemark, setEditingRemark] = useState(false);
  const [remarkDraft, setRemarkDraft] = useState("");
  const [editingTags, setEditingTags] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const editable = isKnown(model.friendUserId);

  useEffect(() => {
    if (!editingRemark) setRemarkDraft(isKnown(model.remark) ? model.remark : "");
  }, [editingRemark, model.remark]);

  useEffect(() => {
    if (!editingTags) setTagDraft(model.tags.join("，"));
  }, [editingTags, model.tags]);

  const saveRemark = async () => {
    if (!editable || !onUpdateRemark) {
      onPendingAction("当前客户缺少好友 ID，无法编辑备注");
      return;
    }
    try {
      await onUpdateRemark(remarkDraft.trim());
      setEditingRemark(false);
      onPendingAction("备注已更新");
    } catch (error) {
      onPendingAction(error instanceof Error ? `备注更新失败：${error.message}` : "备注更新失败");
    }
  };

  const saveTags = async () => {
    if (!editable || !onUpdateTags) {
      onPendingAction("当前客户缺少好友 ID，无法编辑标签");
      return;
    }
    try {
      await onUpdateTags(parseTagDraft(tagDraft));
      setEditingTags(false);
      onPendingAction("标签已更新");
    } catch (error) {
      onPendingAction(error instanceof Error ? `标签更新失败：${error.message}` : "标签更新失败");
    }
  };

  return (
    <section className="customer-profile-actions" aria-label="客户处理">
      {editingRemark ? (
        <CustomerProfileInlineEditor
          icon={<PencilLine size={15} />}
          label="备注"
          pending={pending}
          value={remarkDraft}
          onCancel={() => setEditingRemark(false)}
          onChange={setRemarkDraft}
          onSave={saveRemark}
        />
      ) : (
        <CustomerProfileActionRow
          actionLabel="编辑"
          icon={<PencilLine size={15} />}
          label="备注"
          onAction={() => {
            setRemarkDraft(isKnown(model.remark) ? model.remark : "");
            setEditingRemark(true);
            onPendingAction("");
          }}
          value={isKnown(model.remark) ? model.remark : "暂无备注"}
        />
      )}
      <div className="customer-profile-action-row">
        <span className="customer-profile-action-label">
          <Tags size={15} />
          标签
        </span>
        <div className="customer-profile-action-value">
          {editingTags ? (
            <input
              aria-label="编辑标签"
              className="customer-profile-action-input"
              disabled={pending}
              value={tagDraft}
              onChange={(event) => setTagDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void saveTags();
                if (event.key === "Escape") setEditingTags(false);
              }}
            />
          ) : (
            <CustomerProfileTagList
              tags={model.tags}
              onAdd={() => {
                setTagDraft(model.tags.join("，"));
                setEditingTags(true);
                onPendingAction("");
              }}
            />
          )}
        </div>
        {editingTags && (
          <span className="customer-profile-editor-actions">
            <button
              type="button"
              aria-label="保存标签"
              disabled={pending}
              onClick={() => void saveTags()}
            >
              <Check size={14} />
            </button>
            <button
              type="button"
              aria-label="取消标签编辑"
              disabled={pending}
              onClick={() => setEditingTags(false)}
            >
              <X size={14} />
            </button>
          </span>
        )}
      </div>
      <CustomerProfileActionRow
        actionLabel="设置"
        icon={<CalendarClock size={15} />}
        label="跟进"
        onAction={() => onPendingAction("跟进接口待接入")}
        value={isKnown(model.nextFollowUp) ? model.nextFollowUp : "未设置跟进"}
      />
      <CustomerProfileActionRow
        actionLabel="查看"
        icon={<ClipboardList size={15} />}
        label="工单"
        onAction={onOpenTickets}
        value={ticketCount > 0 ? `待处理 ${ticketCount}` : "暂无工单"}
      />
      {notice && (
        <p className="customer-profile-action-notice" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}

function CustomerProfileInlineEditor({
  icon,
  label,
  onCancel,
  onChange,
  onSave,
  pending,
  value,
}: {
  icon: ReactNode;
  label: string;
  onCancel: () => void;
  onChange: (value: string) => void;
  onSave: () => Promise<void> | void;
  pending: boolean;
  value: string;
}) {
  return (
    <div className="customer-profile-action-row editing">
      <span className="customer-profile-action-label">
        {icon}
        {label}
      </span>
      <input
        aria-label={`编辑${label}`}
        className="customer-profile-action-input"
        disabled={pending}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") void onSave();
          if (event.key === "Escape") onCancel();
        }}
      />
      <span className="customer-profile-editor-actions">
        <button
          type="button"
          aria-label={`保存${label}`}
          disabled={pending}
          onClick={() => void onSave()}
        >
          <Check size={14} />
        </button>
        <button
          type="button"
          aria-label={`取消${label}编辑`}
          disabled={pending}
          onClick={onCancel}
        >
          <X size={14} />
        </button>
      </span>
    </div>
  );
}

function CustomerProfileActionRow({
  actionLabel,
  icon,
  label,
  onAction,
  value,
}: {
  actionLabel: string;
  icon: ReactNode;
  label: string;
  onAction: () => void;
  value: string;
}) {
  return (
    <div className="customer-profile-action-row">
      <span className="customer-profile-action-label">
        {icon}
        {label}
      </span>
      <strong className="customer-profile-action-value">{value}</strong>
      <button className="customer-profile-action-control" type="button" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
}

function parseTagDraft(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,，\n]/g)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}
