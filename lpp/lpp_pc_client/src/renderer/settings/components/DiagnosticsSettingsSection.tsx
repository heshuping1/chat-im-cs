import { Bug, Download, HardDrive } from "lucide-react";
import { ActionRow } from "./SettingsRows";

export function DiagnosticsSettingsSection({
  exportDiagnostics,
  setNotice,
}: {
  exportDiagnostics: () => Promise<void>;
  setNotice: (notice: string) => void;
}) {
  return (
    <>
      <ActionRow
        label="导出诊断包"
        desc="导出本地日志、traceId、接口错误和关键操作轨迹。"
        action="导出"
        icon={<Download size={15} />}
        onClick={() => void exportDiagnostics()}
      />
      <ActionRow
        label="用户反馈"
        desc="提交问题、截图和诊断线索给服务端。"
        action="反馈"
        icon={<Bug size={15} />}
        onClick={() => setNotice("反馈接口待接入")}
      />
      <ActionRow
        label="关于客户端"
        desc="查看版本号、构建信息和运行环境。"
        action="查看"
        icon={<HardDrive size={15} />}
        onClick={() => setNotice("LPP PC 客服客户端 v0.1.0")}
      />
    </>
  );
}
