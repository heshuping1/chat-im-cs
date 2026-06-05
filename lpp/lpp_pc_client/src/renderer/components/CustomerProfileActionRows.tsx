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
import type { TranslationParams } from "../i18n/dictionary";
import { useI18n } from "../i18n/useI18n";

import {
  isKnown,
  type CustomerModel,
} from "./CustomerProfileModel";
import { CustomerProfileTagList } from "./CustomerProfileBits";

type Translate = (key: string, params?: TranslationParams) => string;

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
  const { t } = useI18n();
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
      onPendingAction(t("customerProfile.notice.missingFriendForRemark"));
      return;
    }
    try {
      await onUpdateRemark(remarkDraft.trim());
      setEditingRemark(false);
      onPendingAction(t("customerProfile.notice.remarkUpdated"));
    } catch (error) {
      onPendingAction(
        error instanceof Error
          ? t("customerProfile.notice.remarkUpdateFailedWithError", { error: error.message })
          : t("customerProfile.notice.remarkUpdateFailed"),
      );
    }
  };

  const saveTags = async () => {
    if (!editable || !onUpdateTags) {
      onPendingAction(t("customerProfile.notice.missingFriendForTags"));
      return;
    }
    try {
      await onUpdateTags(parseTagDraft(tagDraft));
      setEditingTags(false);
      onPendingAction(t("customerProfile.notice.tagsUpdated"));
    } catch (error) {
      onPendingAction(
        error instanceof Error
          ? t("customerProfile.notice.tagsUpdateFailedWithError", { error: error.message })
          : t("customerProfile.notice.tagsUpdateFailed"),
      );
    }
  };

  return (
    <section
      className="customer-profile-actions"
      aria-label={t("customerProfile.actionAria")}
      data-testid="customer-profile-actions"
    >
      {editingRemark ? (
        <CustomerProfileInlineEditor
          actionKey="remark"
          icon={<PencilLine size={15} />}
          label={t("customerProfile.fields.remark")}
          pending={pending}
          t={t}
          value={remarkDraft}
          onCancel={() => setEditingRemark(false)}
          onChange={setRemarkDraft}
          onSave={saveRemark}
        />
      ) : (
        <CustomerProfileActionRow
          actionLabel={t("customerProfile.actions.edit")}
          actionKey="remark"
          icon={<PencilLine size={15} />}
          label={t("customerProfile.fields.remark")}
          onAction={() => {
            setRemarkDraft(isKnown(model.remark) ? model.remark : "");
            setEditingRemark(true);
            onPendingAction("");
          }}
          value={isKnown(model.remark) ? model.remark : t("customerProfile.empty.remark")}
        />
      )}
      <div className="customer-profile-action-row" data-action-row="tags">
        <span className="customer-profile-action-label">
          <Tags size={15} />
          {t("customerProfile.fields.tags")}
        </span>
        <div className="customer-profile-action-value">
          {editingTags ? (
            <input
              aria-label={t("customerProfile.actions.editField", { field: t("customerProfile.fields.tags") })}
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
              aria-label={t("customerProfile.actions.saveField", { field: t("customerProfile.fields.tags") })}
              disabled={pending}
              onClick={() => void saveTags()}
            >
              <Check size={14} />
            </button>
            <button
              type="button"
              aria-label={t("customerProfile.actions.cancelFieldEdit", { field: t("customerProfile.fields.tags") })}
              disabled={pending}
              onClick={() => setEditingTags(false)}
            >
              <X size={14} />
            </button>
          </span>
        )}
      </div>
      <CustomerProfileActionRow
        actionLabel={t("customerProfile.actions.set")}
        actionKey="follow-up"
        icon={<CalendarClock size={15} />}
        label={t("customerProfile.fields.followUp")}
        onAction={() => onPendingAction(t("customerProfile.notice.followUpPending"))}
        value={isKnown(model.nextFollowUp) ? model.nextFollowUp : t("customerProfile.empty.followUp")}
      />
      <CustomerProfileActionRow
        actionLabel={t("customerProfile.actions.view")}
        actionKey="tickets"
        icon={<ClipboardList size={15} />}
        label={t("customerProfile.fields.ticket")}
        onAction={onOpenTickets}
        value={
          ticketCount > 0
            ? t("customerProfile.pendingTickets", { count: ticketCount })
            : t("customerProfile.empty.tickets")
        }
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
  actionKey,
  icon,
  label,
  onCancel,
  onChange,
  onSave,
  pending,
  t,
  value,
}: {
  actionKey: string;
  icon: ReactNode;
  label: string;
  onCancel: () => void;
  onChange: (value: string) => void;
  onSave: () => Promise<void> | void;
  pending: boolean;
  t: Translate;
  value: string;
}) {
  return (
    <div className="customer-profile-action-row editing" data-action-row={actionKey}>
      <span className="customer-profile-action-label">
        {icon}
        {label}
      </span>
      <input
        aria-label={t("customerProfile.actions.editField", { field: label })}
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
          aria-label={t("customerProfile.actions.saveField", { field: label })}
          disabled={pending}
          onClick={() => void onSave()}
        >
          <Check size={14} />
        </button>
        <button
          type="button"
          aria-label={t("customerProfile.actions.cancelFieldEdit", { field: label })}
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
  actionKey,
  icon,
  label,
  onAction,
  value,
}: {
  actionLabel: string;
  actionKey: string;
  icon: ReactNode;
  label: string;
  onAction: () => void;
  value: string;
}) {
  return (
    <div className="customer-profile-action-row" data-action-row={actionKey}>
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
