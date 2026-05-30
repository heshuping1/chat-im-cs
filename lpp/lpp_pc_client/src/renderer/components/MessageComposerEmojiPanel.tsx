import type { WechatEmojiItem } from "../lib/wechatEmoji";
import { wechatEmojiItems } from "../lib/wechatEmoji";

export function MessageComposerEmojiPanel({
  onPick,
  recentEmojis,
}: {
  onPick: (emoji: WechatEmojiItem) => void;
  recentEmojis: WechatEmojiItem[];
}) {
  return (
    <div className="composer-emoji-panel" role="dialog" aria-label="表情选择">
      <section>
        <h4>最近使用</h4>
        {recentEmojis.length > 0 && (
          <div className="composer-emoji-grid">
            {recentEmojis.slice(0, 8).map((emoji) => (
              <button
                type="button"
                key={emoji.id}
                aria-label={`表情 ${emoji.label}`}
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
        <h4>所有表情</h4>
        <div className="composer-emoji-grid">
          {wechatEmojiItems.map((emoji) => (
            <button
              type="button"
              key={emoji.id}
              aria-label={`表情 ${emoji.label}`}
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
}
