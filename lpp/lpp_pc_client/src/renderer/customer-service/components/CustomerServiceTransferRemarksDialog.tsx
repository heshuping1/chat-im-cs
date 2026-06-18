import { X } from "lucide-react";
import type { CustomerServiceTransferRecordViewModel } from "../../data/customer-service/cs-transfer-records";
import { useI18n } from "../../i18n/useI18n";

export function CustomerServiceTransferRemarksDialog({
  records,
  onClose,
}: {
  records: CustomerServiceTransferRecordViewModel[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      className="pc-modal-backdrop cs-transfer-remarks-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <section
        aria-labelledby="cs-transfer-remarks-title"
        aria-modal="true"
        className="cs-transfer-remarks-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <h3 id="cs-transfer-remarks-title">
              {t("customerService.transferRemarks.title")}
            </h3>
            <p>{t("customerService.transferRemarks.internalOnly")}</p>
          </div>
          <button
            type="button"
            aria-label={t("customerService.transferRemarks.closeAria")}
            title={t("customerService.transferRemarks.closeAria")}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>
        {records.length === 0 ? (
          <p className="cs-transfer-remarks-empty">
            {t("customerService.transferRemarks.empty")}
          </p>
        ) : (
          <ol className="cs-transfer-remarks-list">
            {records.map((record) => (
              <li key={record.recordId} className="cs-transfer-remarks-item">
                <header>
                  <strong>
                    {record.transferredAtText ||
                      t("customerService.transferRemarks.unknownTime")}
                  </strong>
                  <span>
                    {t("customerService.transferRemarks.fromTo", {
                      from: record.fromStaffDisplayName ||
                        record.fromStaffUserId ||
                        t("customerService.transferRemarks.unknownStaff"),
                      to: record.toStaffDisplayName ||
                        record.toStaffUserId ||
                        t("customerService.transferRemarks.unknownStaff"),
                    })}
                  </span>
                </header>
                {record.reason ? (
                  <p>{record.reason}</p>
                ) : (
                  <p className="muted">
                    {t("customerService.transferRemarks.noReason")}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
