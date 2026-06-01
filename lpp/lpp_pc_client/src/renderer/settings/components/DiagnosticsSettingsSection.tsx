import { Download } from "lucide-react";
import { ActionRow } from "./SettingsRows";
import { settingRowProps } from "../models/settingsCatalog";

export function DiagnosticsSettingsSection({
  exportDiagnostics,
}: {
  exportDiagnostics: () => Promise<void>;
}) {
  return (
    <>
      <ActionRow
        {...settingRowProps("diagnosticsExport")}
        action="导出"
        icon={<Download size={15} />}
        onClick={() => void exportDiagnostics()}
      />
    </>
  );
}
