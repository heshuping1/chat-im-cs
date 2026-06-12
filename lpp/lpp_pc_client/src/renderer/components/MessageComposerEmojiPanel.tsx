import { forwardRef } from "react";
import type { CSSProperties } from "react";
import type { WechatEmojiItem } from "../lib/wechatEmoji";
import { wechatEmojiItems } from "../lib/wechatEmoji";
import { useI18n } from "../i18n/useI18n";

export const MessageComposerEmojiPanel = forwardRef<HTMLDivElement, {
  onPick: (emoji: WechatEmojiItem) => void;
  recentEmojis: WechatEmojiItem[];
  style?: CSSProperties;
}>(function MessageComposerEmojiPanel({
  onPick,
  recentEmojis,
  style,
}, ref) {
  const { t } = useI18n();
  return (
    <div
      className="composer-emoji-panel"
      ref={ref}
      role="dialog"
      aria-label={t("composer.emoji.panelAria")}
      style={style}
    >
      <section>
        <h4>{t("composer.emoji.recent")}</h4>
        {recentEmojis.length > 0 && (
          <div className="composer-emoji-grid">
            {recentEmojis.slice(0, 8).map((emoji) => (
              <button
                type="button"
                key={emoji.id}
                aria-label={t("composer.emoji.itemAria", { label: emoji.label })}
                title={emoji.label}
                onClick={() => onPick(emoji)}
              >
                <span>{emoji.value}</span>
              </button>
            ))}
          </div>
        )}
      </section>
      <section>
        <h4>{t("composer.emoji.all")}</h4>
        <div className="composer-emoji-grid">
          {wechatEmojiItems.map((emoji) => (
            <button
              type="button"
              key={emoji.id}
              aria-label={t("composer.emoji.itemAria", { label: emoji.label })}
              title={emoji.label}
              onClick={() => onPick(emoji)}
            >
              <span>{emoji.value}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
});
