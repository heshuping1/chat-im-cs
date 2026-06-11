import { BarChart3 } from "lucide-react";

import type { DataCenterReportComponentProps } from "./dataCenterReportTypes";

export function DataCenterPlaceholderReport({
  dataCenterView,
  report,
}: DataCenterReportComponentProps) {
  return (
    <section className="data-center-placeholder-report">
      <div className="data-center-placeholder-icon">
        <BarChart3 size={20} />
      </div>
      <div>
        <span className="eyebrow">COMING NEXT</span>
        <h2>{report.title}</h2>
        <p>{report.description}</p>
        <dl>
          <div>
            <dt>权限</dt>
            <dd>{report.requiredPermission}</dd>
          </div>
          <div>
            <dt>导出类型</dt>
            <dd>{report.exportTypes.length ? report.exportTypes.join(", ") : "暂无"}</dd>
          </div>
          <div>
            <dt>当前视角</dt>
            <dd>{dataCenterView}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
