import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import {
  type SettingCapability,
  type SettingSource,
  settingsRowDescription,
  settingsRowLabel,
} from "../models/settingsCatalog";
import { useI18n } from "../../i18n/useI18n";

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
  capability,
  desc,
  disabledReason,
  enabled = true,
  label,
  onChange,
  source,
  stateText,
  visibleInMainList = true,
}: {
  checked: boolean;
  capability?: SettingCapability;
  source?: SettingSource;
  desc: string;
  disabledReason?: string;
  enabled?: boolean;
  label: string;
  onChange: (value: boolean) => void;
  stateText?: string;
  statusLabel?: string;
  visibleInMainList?: boolean;
}) {
  const disabled = !enabled;
  const localizedLabel = useSettingsRowLabel(label);
  if (!visibleInMainList) return null;
  return (
    <button
      className={`setting-detail-row ${disabled ? "disabled" : ""}`}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={localizedLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <SettingsRowCopy
        desc={desc}
        disabledReason={disabledReason}
        label={label}
        capability={capability}
        source={source}
        stateText={stateText}
      />
      <span className={`setting-switch ${checked ? "on" : ""}`} aria-hidden="true">
        <i />
      </span>
    </button>
  );
}

export function SelectRow<T extends string>({
  capability,
  desc,
  disabledReason,
  enabled = true,
  label,
  onChange,
  optionLabels,
  options,
  source,
  stateText,
  value,
  visibleInMainList = true,
}: {
  capability?: SettingCapability;
  source?: SettingSource;
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
  const localizedLabel = useSettingsRowLabel(label);
  if (!visibleInMainList) return null;
  return (
    <label className={`setting-detail-row select ${enabled ? "" : "disabled"}`}>
      <SettingsRowCopy
        desc={desc}
        disabledReason={disabledReason}
        label={label}
        capability={capability}
        source={source}
        stateText={stateText}
      />
      <select
        aria-label={localizedLabel}
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
  capability,
  desc,
  disabledReason,
  enabled = true,
  icon,
  label,
  onClick,
  source,
  stateText,
  visibleInMainList = true,
}: {
  action: string;
  capability?: SettingCapability;
  source?: SettingSource;
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
        capability={capability}
        source={source}
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
  capability,
  desc,
  disabledReason,
  label,
  source,
  stateText,
  visibleInMainList = true,
}: {
  capability?: SettingCapability;
  source?: SettingSource;
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
        capability={capability}
        source={source}
        stateText={stateText}
      />
    </div>
  );
}

function SettingsRowCopy({
  capability,
  desc,
  disabledReason,
  label,
  source,
  stateText,
}: {
  capability?: SettingCapability;
  desc: string;
  disabledReason?: string;
  label: string;
  source?: SettingSource;
  stateText?: string;
}) {
  const { t } = useI18n();
  const localizedLabel = localizeSettingsRowLabel(label, t);
  const localizedDesc = localizeSettingsRowDesc({ capability, desc, source }, t);
  const localizedDisabledReason = disabledReason
    ? localizeMaybeKey(disabledReason, t)
    : undefined;
  return (
    <span className="setting-row-copy">
      <span className="setting-row-title">
        <strong>{localizedLabel}</strong>
        {stateText && <small className="settings-state-pill">{stateText}</small>}
      </span>
      <em>{localizedDisabledReason ? `${localizedDesc} ${localizedDisabledReason}` : localizedDesc}</em>
    </span>
  );
}

function localizeSettingsRowLabel(label: string, t: (key: string) => string) {
  if (!label.startsWith("me.row.")) return localizeMaybeKey(label, t);
  const localized = settingsRowLabel({ id: "", label }, t);
  return localized === label ? humanizeSettingsRowKey(label) : localized;
}

function useSettingsRowLabel(label: string) {
  const { t } = useI18n();
  return localizeSettingsRowLabel(label, t);
}

function localizeSettingsRowDesc(
  row: {
    capability?: SettingCapability;
    desc: string;
    source?: SettingSource;
  },
  t: (key: string) => string,
) {
  if (row.desc.startsWith("me.row.") && row.source && row.capability) {
    const localized = settingsRowDescription(
      {
        id: "",
        desc: row.desc,
        source: row.source,
        capability: row.capability,
      },
      t,
    );
    return localized.startsWith(row.desc)
      ? humanizeSettingsRowKey(row.desc)
      : localized;
  }
  return localizeMaybeKey(row.desc, t);
}

function localizeMaybeKey(value: string, t: (key: string) => string) {
  if (value.startsWith("me.")) return t(value);
  return value;
}

function humanizeSettingsRowKey(key: string) {
  const id = key.match(/^me\.row\.([^.]+)\./)?.[1] ?? key;
  return id
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^[a-z]/, (value) => value.toUpperCase());
}
