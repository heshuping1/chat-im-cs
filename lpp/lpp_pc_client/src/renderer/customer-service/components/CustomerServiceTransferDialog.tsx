import { Search, UserRoundCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { PcAvatar } from "../../components/PcAvatar";
import type { CustomerServiceTransferTarget } from "../../data/customer-service/cs-transfer-targets";
import { useI18n } from "../../i18n/useI18n";

export function CustomerServiceTransferDialog({
  currentStaffName,
  disabled,
  errorText,
  loading,
  mode = "transfer",
  reason,
  selectedTargetId,
  targets,
  threadTitle,
  onCancel,
  onConfirm,
  onReasonChange,
  onTargetChange,
}: {
  currentStaffName?: string;
  disabled?: boolean;
  errorText?: string | null;
  loading?: boolean;
  mode?: "assign" | "transfer";
  reason: string;
  selectedTargetId: string;
  targets: CustomerServiceTransferTarget[];
  threadTitle: string;
  onCancel: () => void;
  onConfirm: () => void;
  onReasonChange: (reason: string) => void;
  onTargetChange: (targetId: string) => void;
}) {
  const { t } = useI18n();
  const [keyword, setKeyword] = useState("");
  const copyPrefix = mode === "assign" ? "customerService.transfer.assign" : "customerService.transfer";
  const filteredTargets = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) return targets;
    return targets.filter((target) =>
      [target.displayName, target.userId, target.roleLabel]
        .some((value) => value.toLowerCase().includes(normalized)),
    );
  }, [keyword, targets]);

  return (
    <div
      className="pc-modal-backdrop cs-transfer-backdrop"
      role="presentation"
      onClick={onCancel}
    >
      <section
        aria-labelledby="cs-transfer-title"
        aria-modal="true"
        className="cs-transfer-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <span className="cs-transfer-mark" aria-hidden="true">
            <UserRoundCheck size={22} />
          </span>
          <div>
            <h3 id="cs-transfer-title">{t(`${copyPrefix}.title`)}</h3>
            <p>{t(`${copyPrefix}.detail`, { customer: threadTitle })}</p>
            {currentStaffName && (
              <div className="cs-transfer-current-staff">
                <span>{t("customerService.transfer.currentStaff")}</span>
                <strong>{currentStaffName}</strong>
              </div>
            )}
          </div>
        </header>

        <label className="cs-transfer-search">
          <Search size={16} />
          <input
            value={keyword}
            placeholder={t(`${copyPrefix}.searchPlaceholder`)}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </label>

        <div className="cs-transfer-target-list" role="listbox">
          {loading && (
            <p className="cs-transfer-empty">{t(`${copyPrefix}.loading`)}</p>
          )}
          {!loading && errorText && (
            <p className="cs-transfer-empty error">{errorText}</p>
          )}
          {!loading && !errorText && filteredTargets.length === 0 && (
            <p className="cs-transfer-empty">{t(`${copyPrefix}.empty`)}</p>
          )}
          {!loading && !errorText && filteredTargets.map((target) => (
            <button
              key={target.userId}
              className={target.userId === selectedTargetId ? "selected" : ""}
              type="button"
              role="option"
              aria-selected={target.userId === selectedTargetId}
              onClick={() => onTargetChange(target.userId)}
            >
              <PcAvatar
                avatarUrl={target.avatarUrl}
                className="e-avatar"
                name={target.displayName}
              />
              <span>
                <strong>{target.displayName}</strong>
                <em>{t(`customerService.transfer.role.${target.roleLabel}`)}</em>
              </span>
            </button>
          ))}
        </div>

        <label className="cs-transfer-reason">
          <span>{t(`${copyPrefix}.reasonLabel`)}</span>
          <textarea
            value={reason}
            maxLength={120}
            placeholder={t(`${copyPrefix}.reasonPlaceholder`)}
            onChange={(event) => onReasonChange(event.target.value)}
          />
        </label>

        <footer>
          <button type="button" disabled={disabled} onClick={onCancel}>
            {t("common.cancel")}
          </button>
          <button
            className="primary"
            type="button"
            disabled={disabled || !selectedTargetId}
            onClick={onConfirm}
          >
            {disabled
              ? t(`${copyPrefix}.transferring`)
              : t(`${copyPrefix}.confirm`)}
          </button>
        </footer>
      </section>
    </div>
  );
}
