import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import {
  type SettingCapability,
} from "../models/settingsCatalog";

export function InlineSettingsState({
  text,
  tone = "muted",
}: {
  text: string;
  tone?: "muted" | "error";
}) {
  return <p className={`utility-inline-state ${tone}`}>{text}</p>;
}

export function SwitchRow({
  checked,
  capability = "available",
  desc,
  disabledReason,
  enabled = true,
  label,
  onChange,
  stateText,
  statusLabel,
  visibleInMainList = true,
}: {
  checked: boolean;
  capability?: SettingCapability;
  desc: string;
  disabledReason?: string;
  enabled?: boolean;
  label: string;
  onChange: (value: boolean) => void;
  stateText?: string;
  statusLabel?: string;
  visibleInMainList?: boolean;
}) {
  if (!visibleInMainList) return null;
  const disabled = !enabled;
  return (
    <button
      className={`setting-detail-row ${disabled ? "disabled" : ""}`}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <SettingsRowCopy
        capability={capability}
        desc={desc}
        disabledReason={disabledReason}
        label={label}
        stateText={stateText}
        statusLabel={statusLabel}
      />
      <span className={`setting-switch ${checked ? "on" : ""}`} aria-hidden="true">
        <i />
      </span>
    </button>
  );
}

export function SelectRow<T extends string>({
  capability = "available",
  desc,
  disabledReason,
  enabled = true,
  label,
  onChange,
  optionLabels,
  options,
  stateText,
  statusLabel,
  value,
  visibleInMainList = true,
}: {
  capability?: SettingCapability;
  desc: string;
  disabledReason?: string;
  enabled?: boolean;
  label: string;
  onChange: (value: T) => void;
  optionLabels?: Partial<Record<T, string>>;
  options: T[];
  stateText?: string;
  statusLabel?: string;
  value: T;
  visibleInMainList?: boolean;
}) {
  if (!visibleInMainList) return null;
  return (
    <label className={`setting-detail-row select ${enabled ? "" : "disabled"}`}>
      <SettingsRowCopy
        capability={capability}
        desc={desc}
        disabledReason={disabledReason}
        label={label}
        stateText={stateText}
        statusLabel={statusLabel}
      />
      <select
        aria-label={label}
        disabled={!enabled}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {optionLabels?.[option] ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ActionRow({
  action,
  capability = "available",
  desc,
  disabledReason,
  enabled = true,
  icon,
  label,
  onClick,
  stateText,
  statusLabel,
  visibleInMainList = true,
}: {
  action: string;
  capability?: SettingCapability;
  desc: string;
  disabledReason?: string;
  enabled?: boolean;
  icon?: ReactNode;
  label: string;
  onClick?: () => void;
  stateText?: string;
  statusLabel?: string;
  visibleInMainList?: boolean;
}) {
  if (!visibleInMainList) return null;
  return (
    <button
      className={`setting-detail-row action ${enabled ? "" : "disabled"}`}
      type="button"
      disabled={!enabled}
      onClick={onClick}
    >
      <SettingsRowCopy
        capability={capability}
        desc={desc}
        disabledReason={disabledReason}
        label={label}
        stateText={stateText}
        statusLabel={statusLabel}
      />
      <b>
        {icon}
        {action}
        {enabled && <ChevronRight size={15} />}
      </b>
    </button>
  );
}

export function InfoRow({
  capability = "available",
  desc,
  disabledReason,
  label,
  stateText,
  statusLabel,
  visibleInMainList = true,
}: {
  capability?: SettingCapability;
  desc: string;
  disabledReason?: string;
  label: string;
  stateText?: string;
  statusLabel?: string;
  visibleInMainList?: boolean;
}) {
  if (!visibleInMainList) return null;
  return (
    <div className="setting-detail-row info">
      <SettingsRowCopy
        capability={capability}
        desc={desc}
        disabledReason={disabledReason}
        label={label}
        stateText={stateText}
        statusLabel={statusLabel}
      />
    </div>
  );
}

function SettingsRowCopy({
  capability,
  desc,
  disabledReason,
  label,
  stateText,
  statusLabel,
}: {
  capability: SettingCapability;
  desc: string;
  disabledReason?: string;
  label: string;
  stateText?: string;
  statusLabel?: string;
}) {
  const effectiveStatusLabel = statusLabel ?? statusText(capability);
  return (
    <span className="setting-row-copy">
      <span className="setting-row-title">
        <strong>{label}</strong>
        {effectiveStatusLabel && (
          <small className={`settings-status-pill ${capability}`}>
            {effectiveStatusLabel}
          </small>
        )}
        {stateText && <small className="settings-state-pill">{stateText}</small>}
      </span>
      <em>{disabledReason ? `${desc} ${disabledReason}` : desc}</em>
    </span>
  );
}

function statusText(capability: SettingCapability) {
  if (capability === "localEffective") return "本机生效";
  if (capability === "recordOnly") return "状态展示";
  if (capability === "missingBackendApi") return "缺少接口";
  if (capability === "missingDesktopApi") return "缺少桌面能力";
  if (capability === "missingRuntimeWiring") return "待接入流程";
  return "";
}
