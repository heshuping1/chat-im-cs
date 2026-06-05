import { Search, X } from "lucide-react";
import { useState } from "react";

import type { ConversationListItem, MessageItemDto } from "../../data/api-client";
import { imConversationEffectiveUnreadCount } from "../../data/im-read/im-conversation-read-view";
import type { CurrentUserIdentity } from "../../data/message-display";
import { conversationMetaText } from "../../data/message-display";
import { useI18n } from "../../i18n/useI18n";
import type { GroupConversationAvatar } from "../models/groupAvatarTypes";
import { ConversationAvatar } from "./ConversationListParts";

export function ForwardDialog({
  activeConversationId,
  conversations,
  messages,
  pending,
  resolveConversationAvatar,
  resolveConversationType,
  resolveMessagePreview,
  userIdentity,
  onClose,
  onForward,
}: {
  activeConversationId: string;
  conversations: ConversationListItem[];
  messages: MessageItemDto[];
  pending: boolean;
  resolveConversationAvatar: (conversation: ConversationListItem) => GroupConversationAvatar | undefined;
  resolveConversationType: (conversation: ConversationListItem) => "direct" | "group" | undefined;
  resolveMessagePreview: (message: MessageItemDto) => string;
  userIdentity?: CurrentUserIdentity | null;
  onClose: () => void;
  onForward: (conversationId: string) => void;
}) {
  const { t } = useI18n();
  const [keyword, setKeyword] = useState("");
  const preview =
    messages.length > 1
      ? t("messages.forwardDialog.multiPreview", { count: messages.length })
      : resolveMessagePreview(messages[0]);
  const targets = conversations
    .filter((item) => item.conversationId !== activeConversationId)
    .filter((item) => item.title.toLowerCase().includes(keyword.trim().toLowerCase()));

  return (
    <div className="pc-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="pc-forward-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t("messages.forwardDialog.aria")}
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <h3>{t("messages.forwardDialog.title")}</h3>
            <p>{preview}</p>
          </div>
          <button type="button" aria-label={t("common.close")} onClick={onClose}>
            <X size={16} />
          </button>
        </header>
        <label className="e-search compact">
          <Search size={15} />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={t("messages.forwardDialog.searchPlaceholder")}
            autoFocus
          />
        </label>
        <div className="pc-forward-targets">
          {targets.map((item) => (
            <button
              key={item.conversationId}
              type="button"
              disabled={pending}
              onClick={() => onForward(item.conversationId)}
            >
              <ConversationAvatar
                avatarUrl={item.avatarUrl}
                groupAvatar={resolveConversationAvatar(item)}
                isGroup={resolveConversationType(item) === "group"}
                title={item.title}
                unread={imConversationEffectiveUnreadCount(item, userIdentity)}
              />
              <span>
                <strong>{item.title}</strong>
                <small>{conversationMetaText(item, userIdentity)}</small>
              </span>
            </button>
          ))}
          {targets.length === 0 && (
            <p className="panel-state">{t("messages.forwardDialog.empty")}</p>
          )}
        </div>
      </section>
    </div>
  );
}
