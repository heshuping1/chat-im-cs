import { ActionRow } from "./SettingsRows";
import type { PcSettings } from "../../data/settings/pc-settings";
import { settingRowProps } from "../models/settingsCatalog";

type SettingKey = keyof PcSettings;

export function ChatArchiveSection({
  setNotice,
}: {
  pcSettings: PcSettings;
  setNotice: (notice: string) => void;
  setSetting: <K extends SettingKey>(key: K, value: PcSettings[K]) => void;
}) {
  return (
    <>
      <ActionRow
        {...settingRowProps("chatExport")}
        action="待接入"
        onClick={() => setNotice("聊天记录导出能力待接入")}
      />
      <ActionRow
        {...settingRowProps("chatBackup")}
        action="待接入"
        onClick={() => setNotice("聊天记录备份能力待接入")}
      />
      <ActionRow
        {...settingRowProps("chatRestore")}
        action="待接入"
        onClick={() => setNotice("聊天记录恢复能力待接入")}
      />
    </>
  );
}
