import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CustomerServiceStatus } from "../../data/types";
import { useI18n } from "../../i18n/useI18n";
import {
  getQueueAutoDisabledReasonKey,
  getReceptionControlSummary,
  getReceptionQueueModeDescriptionKey,
  getReceptionQueueModeLabelKey,
  receptionControlStatusOptions,
  type ReceptionControlLayout,
  type ReceptionQueueMode,
} from "../models/serviceReceptionControlModel";

type ServiceReceptionControlProps = {
  activeSessions?: number | null;
  disabled?: boolean;
  layout: ReceptionControlLayout;
  maxSessions?: number | null;
  onSetQueueMode: (mode: ReceptionQueueMode) => void;
  onSetStatus: (status: CustomerServiceStatus) => void;
  pending?: boolean;
  queuedCount: number;
  queueAcceptEnabled?: boolean | null;
  serviceStatus?: string | null;
  slaRiskCount?: number | string | null;
};

export function ServiceReceptionControl({
  activeSessions,
  disabled = false,
  layout,
  maxSessions,
  onSetQueueMode,
  onSetStatus,
  pending = false,
  queueAcceptEnabled,
  serviceStatus,
}: ServiceReceptionControlProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const summary = getReceptionControlSummary({
    activeSessions,
    maxSessions,
    queueAcceptEnabled,
    serviceStatus,
  });
  const autoDisabledReasonKey = getQueueAutoDisabledReasonKey(serviceStatus);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const setStatus = (status: CustomerServiceStatus) => {
    onSetStatus(status);
    setOpen(false);
  };

  const setQueueMode = (mode: ReceptionQueueMode) => {
    onSetQueueMode(mode);
    setOpen(false);
  };

  return (
    <div
      className={`service-reception-control service-reception-control-${layout}`}
      ref={rootRef}
    >
      <button
        className="service-reception-pill"
        type="button"
        aria-expanded={open}
        disabled={disabled || pending}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={`service-reception-dot ${summary.status.tone}`} />
        <strong>{t(summary.status.labelKey)}</strong>
        <em>{t(summary.queueModeLabelKey)}</em>
        <b>{summary.sessionText}</b>
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className="service-reception-popover" role="dialog" aria-label={t("customerService.reception.control")}>
          <section>
            <strong>{t("customerService.reception.status")}</strong>
            <div className="service-reception-options">
              {receptionControlStatusOptions.map((item) => (
                <button
                    className={
                      summary.statusSynced && summary.status.value === item.value
                        ? "selected"
                        : ""
                    }
                  type="button"
                  key={item.value}
                  disabled={disabled || pending}
                  onClick={() => setStatus(item.value)}
                >
                  <span className={`service-reception-dot ${item.tone}`} />
                  <span>
                    <b>{t(item.labelKey)}</b>
                    <em>{t(item.descriptionKey)}</em>
                  </span>
                  {summary.statusSynced && summary.status.value === item.value && (
                    <Check size={15} />
                  )}
                </button>
              ))}
            </div>
          </section>

          <section>
            <strong>{t("customerService.reception.mode")}</strong>
            <div className="service-reception-options">
              {(["manual", "auto"] as ReceptionQueueMode[]).map((mode) => {
                const selected = summary.queueMode === mode;
                const modeDescription =
                  mode === "auto" && autoDisabledReasonKey
                    ? t("customerService.reception.autoEnableHint")
                    : t(getReceptionQueueModeDescriptionKey(mode));
                return (
                  <button
                    className={selected ? "selected" : ""}
                    type="button"
                    key={mode}
                    disabled={disabled || pending}
                    title={modeDescription}
                    onClick={() => setQueueMode(mode)}
                  >
                    <span>
                      <b>{t(getReceptionQueueModeLabelKey(mode))}</b>
                      <em>{modeDescription}</em>
                    </span>
                    {selected && <Check size={15} />}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
