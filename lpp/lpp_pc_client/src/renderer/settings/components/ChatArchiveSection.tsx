import { ActionRow, SwitchRow } from "./SettingsRows";
import type { PcSettings } from "../../data/settings/pc-settings";

type SettingKey = keyof PcSettings;

export function ChatArchiveSection({
  pcSettings,
  setNotice,
  setSetting,
}: {
  pcSettings: PcSettings;
  setNotice: (notice: string) => void;
  setSetting: <K extends SettingKey>(key: K, value: PcSettings[K]) => void;
}) {
  return (
    <>
      <SwitchRow
        label="聊天记录本地缓存"
        desc="提升重新打开会话速度，缓存敏感信息按脱敏规则处理。"
        checked={pcSettings.localMessageCache}
        onChange={(value) => setSetting("localMessageCache", value)}
      />
      <ActionRow
        label="导出聊天记录"
        desc="按会话导出文本、图片、文件索引。"
        action="导出"
        onClick={() => setNotice("聊天记录导出能力待接入")}
      />
      <ActionRow
        label="备份聊天记录"
        desc="备份到本机或后续支持的安全存储。"
        action="备份"
        onClick={() => setNotice("聊天记录备份能力待接入")}
      />
      <ActionRow
        label="恢复聊天记录"
        desc="从本机备份恢复聊天记录。"
        action="恢复"
        onClick={() => setNotice("聊天记录恢复能力待接入")}
      />
      <ActionRow
        label="清理本地缓存"
        desc="清理图片、文件缩略图和临时缓存，不删除服务端消息。"
        action="清理"
        onClick={() => {
          localStorage.removeItem("lpp.pc.message-cache");
          setNotice("已清理本地聊天缓存");
        }}
      />
    </>
  );
}
