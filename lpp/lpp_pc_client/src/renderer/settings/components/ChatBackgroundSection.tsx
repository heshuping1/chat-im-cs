import { Check, ImagePlus, X } from "lucide-react";
import type { CSSProperties, ChangeEvent } from "react";
import { useRef } from "react";

import type { PcSettings } from "../../data/settings/pc-settings";
import { useI18n } from "../../i18n/useI18n";
import {
  chatBackgroundPresets,
  chatBackgroundPresetById,
  chatBackgroundStyleVariables,
  maxChatBackgroundImageDataUrlLength,
  normalizeChatBackgroundSetting,
  type ChatBackgroundPresetId,
} from "../models/chatBackgroundModel";
import { settingRowProps } from "../models/settingsCatalog";

type SettingKey = keyof PcSettings;

export function ChatBackgroundSection({
  pcSettings,
  setNotice,
  setSetting,
}: {
  pcSettings: PcSettings;
  setNotice: (notice: string) => void;
  setSetting: <K extends SettingKey>(key: K, value: PcSettings[K]) => void;
}) {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const row = settingRowProps("chatBackground");
  const backgroundSetting = normalizeChatBackgroundSetting(pcSettings.chatBackgroundPreset);
  const selectedImage =
    typeof backgroundSetting === "object" && backgroundSetting.type === "image"
      ? backgroundSetting
      : null;
  const selectedPreset = chatBackgroundPresetById(backgroundSetting);
  const selectedPresetLabel = selectedImage
    ? t("me.chatBackground.customImage", { name: selectedImage.name })
    : t(`me.chatBackground.preset.${selectedPreset.id}`);

  if (!row.visibleInMainList) return null;

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > maxChatBackgroundImageDataUrlLength) {
      setNotice(t("me.chatBackground.imageTooLarge"));
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (dataUrl.length > maxChatBackgroundImageDataUrlLength) {
        setNotice(t("me.chatBackground.imageTooLarge"));
        return;
      }
      setSetting("chatBackgroundPreset", {
        type: "image",
        dataUrl,
        name: file.name,
      });
      setNotice(t("me.chatBackground.imageActive"));
    } catch {
      setNotice(t("me.chatBackground.imageLoadFailed"));
    }
  };

  return (
    <section
      className="setting-detail-row settings-chat-background"
      aria-label={t("me.chatBackground.aria")}
    >
      <span className="setting-row-copy">
        <span className="setting-row-title">
          <strong>{t("me.chatBackground.title")}</strong>
        </span>
        <em>
          {t("me.chatBackground.desc")}
          {t("me.chatBackground.current", { name: selectedPresetLabel })}
        </em>
      </span>
      <span className="settings-chat-background-control">
        <span
          className="settings-chat-background-preview"
          aria-hidden="true"
          style={chatBackgroundStyleVariables(backgroundSetting) as CSSProperties}
        />
        <span
          className="settings-chat-background-swatches"
          role="radiogroup"
          aria-label={t("me.chatBackground.aria")}
        >
          {chatBackgroundPresets.map((preset) => {
            const selected = !selectedImage && preset.id === selectedPreset.id;
            const presetLabel = t(`me.chatBackground.preset.${preset.id}`);
            return (
              <button
                aria-checked={selected}
                aria-label={presetLabel}
                className={selected ? "selected" : ""}
                key={preset.id}
                role="radio"
                style={{ "--swatch-background": preset.preview } as CSSProperties}
                title={presetLabel}
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
        <span className="settings-chat-background-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleImageChange}
          />
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            <ImagePlus size={14} />
            {t("me.chatBackground.chooseImage")}
          </button>
          {selectedImage && (
            <button
              type="button"
              onClick={() => setSetting("chatBackgroundPreset", "default")}
            >
              <X size={14} />
              {t("me.chatBackground.removeImage")}
            </button>
          )}
        </span>
      </span>
    </section>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Invalid image result"));
    });
    reader.addEventListener("error", () => reject(reader.error ?? new Error("Image read failed")));
    reader.readAsDataURL(file);
  });
}
