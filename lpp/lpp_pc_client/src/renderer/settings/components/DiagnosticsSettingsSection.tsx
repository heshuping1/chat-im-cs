import { Bug, Download, HardDrive } from "lucide-react";
import { ActionRow } from "./SettingsRows";
import { settingRowProps } from "../models/settingsCatalog";

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
        {...settingRowProps("diagnosticsExport")}
        action="导出"
        icon={<Download size={15} />}
        onClick={() => void exportDiagnostics()}
      />
      <ActionRow
        {...settingRowProps("feedback")}
        action="待接入"
        icon={<Bug size={15} />}
        onClick={() => setNotice("反馈接口待接入")}
      />
      <ActionRow
        {...settingRowProps("aboutClient")}
        action="查看"
        icon={<HardDrive size={15} />}
        onClick={() => setNotice("LPP PC 客服客户端 v0.1.0")}
      />
    </>
  );
}
