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

export function CustomerProfileTagList({ tags }: { tags: string[] }) {
  return (
    <div className="customer-info-tags">
      {tags.length > 0 ? tags.map((tag) => <span key={tag}>{tag}</span>) : <span>暂无标签</span>}
      <button type="button">+ 添加</button>
    </div>
  );
}
