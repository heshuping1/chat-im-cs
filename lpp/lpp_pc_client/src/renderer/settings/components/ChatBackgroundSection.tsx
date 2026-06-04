import { Check } from "lucide-react";
import type { CSSProperties } from "react";

import type { PcSettings } from "../../data/settings/pc-settings";
import {
  chatBackgroundPresets,
  chatBackgroundPresetById,
  type ChatBackgroundPresetId,
} from "../models/chatBackgroundModel";
import { settingRowProps } from "../models/settingsCatalog";

type SettingKey = keyof PcSettings;

export function ChatBackgroundSection({
  pcSettings,
  setSetting,
}: {
  pcSettings: PcSettings;
  setNotice: (notice: string) => void;
  setSetting: <K extends SettingKey>(key: K, value: PcSettings[K]) => void;
}) {
  const row = settingRowProps("chatBackground");
  const selectedPreset = chatBackgroundPresetById(pcSettings.chatBackgroundPreset);

  if (!row.visibleInMainList) return null;

  return (
    <section className="setting-detail-row settings-chat-background" aria-label={row.label}>
      <span className="setting-row-copy">
        <span className="setting-row-title">
          <strong>{row.label}</strong>
        </span>
        <em>
          {row.desc}
          当前：{selectedPreset.label}
        </em>
      </span>
      <span className="settings-chat-background-swatches" role="radiogroup" aria-label="聊天背景">
        {chatBackgroundPresets.map((preset) => {
          const selected = preset.id === selectedPreset.id;
          return (
            <button
              aria-checked={selected}
              aria-label={preset.label}
              className={selected ? "selected" : ""}
              key={preset.id}
              role="radio"
              style={{ "--swatch-background": preset.preview } as CSSProperties}
              title={preset.label}
              type="button"
              onClick={() =>
                setSetting("chatBackgroundPreset", preset.id as ChatBackgroundPresetId)
              }
            >
              {selected && <Check size={14} strokeWidth={3} />}
            </button>
          );
        })}
      </span>
    </section>
  );
}
