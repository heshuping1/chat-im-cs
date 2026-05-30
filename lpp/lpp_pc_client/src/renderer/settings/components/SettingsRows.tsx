import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

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
  label,
  onChange,
}: {
  checked: boolean;
  desc: string;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      className="setting-detail-row"
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span>
        <strong>{label}</strong>
        <em>{desc}</em>
      </span>
      <span className={`setting-switch ${checked ? "on" : ""}`} aria-hidden="true">
        <i />
      </span>
    </button>
  );
}

export function SelectRow<T extends string>({
  desc,
  label,
  onChange,
  optionLabels,
  options,
  value,
}: {
  desc: string;
  label: string;
  onChange: (value: T) => void;
  optionLabels?: Partial<Record<T, string>>;
  options: T[];
  value: T;
}) {
  return (
    <label className="setting-detail-row select">
      <span>
        <strong>{label}</strong>
        <em>{desc}</em>
      </span>
      <select
        aria-label={label}
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
  icon,
  label,
  onClick,
}: {
  action: string;
  desc: string;
  icon?: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className="setting-detail-row action" type="button" onClick={onClick}>
      <span>
        <strong>{label}</strong>
        <em>{desc}</em>
      </span>
      <b>
        {icon}
        {action}
        <ChevronRight size={15} />
      </b>
    </button>
  );
}

export function InfoRow({ desc, label }: { desc: string; label: string }) {
  return (
    <div className="setting-detail-row info">
      <span>
        <strong>{label}</strong>
        <em>{desc}</em>
      </span>
    </div>
  );
}
