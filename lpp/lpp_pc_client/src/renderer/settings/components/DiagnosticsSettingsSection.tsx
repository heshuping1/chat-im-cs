import { Download } from "lucide-react";
import { useI18n } from "../../i18n/useI18n";
import { ActionRow } from "./SettingsRows";
import { settingRowProps } from "../models/settingsCatalog";

export function DiagnosticsSettingsSection({
  exportDiagnostics,
}: {
  exportDiagnostics: () => Promise<void>;
}) {
  const { t } = useI18n();
  return (
    <>
      <ActionRow
        {...settingRowProps("diagnosticsExport")}
        action={t("settings.actions.export")}
        icon={<Download size={15} />}
        onClick={() => void exportDiagnostics()}
      />
    </>
  );
}
