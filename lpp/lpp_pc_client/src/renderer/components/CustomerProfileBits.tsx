import { useI18n } from "../i18n/useI18n";

export function CustomerProfileMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="customer-profile-metric">
      <span>{label}</span>
      <strong>{value || "--"}</strong>
    </div>
  );
}

export function CustomerProfileTagList({
  onAdd,
  tags,
}: {
  onAdd?: () => void;
  tags: string[];
}) {
  const { t } = useI18n();

  return (
    <div className="customer-info-tags">
      {tags.length > 0 ? tags.map((tag) => <span key={tag}>{tag}</span>) : <span>{t("customerProfile.noTags")}</span>}
      <button aria-label={t("customerProfile.addTag")} title={t("customerProfile.addTag")} type="button" onClick={onAdd}>
        +
      </button>
    </div>
  );
}
