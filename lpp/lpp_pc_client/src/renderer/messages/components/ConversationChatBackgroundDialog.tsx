import { ImagePlus, RotateCcw, X } from "lucide-react";
import type { CSSProperties, ChangeEvent } from "react";

import { useI18n } from "../../i18n/useI18n";
import {
  chatBackgroundPresets,
  chatBackgroundStyleVariables,
  isSafeImageDataUrl,
  maxChatBackgroundImageDataUrlLength,
  normalizeChatBackgroundSetting,
  normalizeChatBackgroundPreset,
  type ChatBackgroundPresetId,
  type ChatBackgroundSetting,
} from "../../settings/models/chatBackgroundModel";

export function ConversationChatBackgroundDialog({
  conversationTitle,
  globalBackground,
  value,
  onChange,
  onClear,
  onClose,
}: {
  conversationTitle: string;
  globalBackground: unknown;
  value?: ChatBackgroundSetting;
  onChange: (value: ChatBackgroundSetting) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const effectiveValue = value ?? normalizeChatBackgroundSetting(globalBackground);
  const activePreset = normalizeChatBackgroundPreset(effectiveValue);
  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!isSafeImageDataUrl(dataUrl) || dataUrl.length > maxChatBackgroundImageDataUrlLength) {
        return;
      }
      onChange({ type: "image", name: file.name, dataUrl });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="pc-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="pc-forward-dialog conversation-background-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t("messages.conversationBackground.title")}
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <h3>{t("messages.conversationBackground.title")}</h3>
            <p>{t("messages.conversationBackground.subtitle", { title: conversationTitle })}</p>
          </div>
          <button type="button" aria-label={t("common.close")} onClick={onClose}>
            <X size={16} />
          </button>
        </header>
        <div
          className="conversation-background-preview"
          style={chatBackgroundStyleVariables(effectiveValue) as CSSProperties}
        />
        <div className="conversation-background-swatches">
          {chatBackgroundPresets.map((preset) => (
            <button
              className={
                typeof effectiveValue !== "object" && activePreset === preset.id
                  ? "selected"
                  : ""
              }
              type="button"
              key={preset.id}
              style={chatBackgroundStyleVariables(preset.id) as CSSProperties}
              aria-label={t(`me.chatBackground.preset.${preset.id}`)}
              onClick={() => onChange(preset.id as ChatBackgroundPresetId)}
            >
              <span>{t(`me.chatBackground.preset.${preset.id}`)}</span>
            </button>
          ))}
        </div>
        <footer className="conversation-background-actions">
          <label>
            <ImagePlus size={15} />
            {t("me.chatBackground.chooseImage")}
            <input accept="image/png,image/jpeg,image/webp,image/gif" type="file" onChange={handleImageChange} />
          </label>
          <button type="button" onClick={onClear}>
            <RotateCcw size={15} />
            {t("messages.conversationBackground.clear")}
          </button>
        </footer>
      </section>
    </div>
  );
}
