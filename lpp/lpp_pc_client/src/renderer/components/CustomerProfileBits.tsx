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
  return (
    <div className="customer-info-tags">
      {tags.length > 0 ? tags.map((tag) => <span key={tag}>{tag}</span>) : <span>暂无标签</span>}
      <button aria-label="添加标签" title="添加标签" type="button" onClick={onAdd}>
        +
      </button>
    </div>
  );
}
