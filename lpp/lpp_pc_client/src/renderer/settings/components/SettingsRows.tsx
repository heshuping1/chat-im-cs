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
  desc,
  disabledReason,
  enabled = true,
  label,
  onChange,
  stateText,
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
        desc={desc}
        disabledReason={disabledReason}
        label={label}
        stateText={stateText}
      />
      <span className={`setting-switch ${checked ? "on" : ""}`} aria-hidden="true">
        <i />
      </span>
    </button>
  );
}

export function SelectRow<T extends string>({
  desc,
  disabledReason,
  enabled = true,
  label,
  onChange,
  optionLabels,
  options,
  stateText,
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
        desc={desc}
        disabledReason={disabledReason}
        label={label}
        stateText={stateText}
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
  desc,
  disabledReason,
  enabled = true,
  icon,
  label,
  onClick,
  stateText,
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
        desc={desc}
        disabledReason={disabledReason}
        label={label}
        stateText={stateText}
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
  desc,
  disabledReason,
  label,
  stateText,
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
        desc={desc}
        disabledReason={disabledReason}
        label={label}
        stateText={stateText}
      />
    </div>
  );
}

function SettingsRowCopy({
  desc,
  disabledReason,
  label,
  stateText,
}: {
  desc: string;
  disabledReason?: string;
  label: string;
  stateText?: string;
}) {
  return (
    <span className="setting-row-copy">
      <span className="setting-row-title">
        <strong>{label}</strong>
        {stateText && <small className="settings-state-pill">{stateText}</small>}
      </span>
      <em>{disabledReason ? `${desc} ${disabledReason}` : desc}</em>
    </span>
  );
}
