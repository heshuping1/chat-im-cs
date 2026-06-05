import { BellOff } from "lucide-react";
import type { MouseEvent } from "react";

import { PcAvatar } from "../../components/PcAvatar";
import type { ConversationListItem } from "../../data/api-client";
import { useI18n } from "../../i18n/useI18n";
import { formatBadgeCount, formatChatTime } from "../../lib/format";
import { renderWechatEmojiText } from "../../lib/wechatEmoji";
import type { GroupConversationAvatar } from "../models/groupAvatarTypes";

export function ConversationAvatar({
  avatarUrl,
  badge = false,
  groupAvatar,
  isGroup,
  title,
  unread = 0,
}: {
  avatarUrl?: string | null;
  badge?: boolean;
  groupAvatar?: GroupConversationAvatar;
  isGroup: boolean;
  title?: string | null;
  unread?: number;
}) {
  const { t } = useI18n();
  const displayTitle = title || t("messages.conversationRow.unnamed");

  return (
    <span className="e-avatar-badge-host">
      {isGroup && groupAvatar?.kind === "grid" ? (
        <span
          className={`pc-avatar group e-avatar green group-avatar-grid grid-${groupAvatar.cells.length}`}
          aria-label={displayTitle}
          title={displayTitle}
        >
          {groupAvatar.cells.map((cell, index) => (
            <PcAvatar
              avatarUrl={cell.avatarUrl}
              className="group-avatar-cell"
              key={`${cell.avatarUrl || cell.name}-${index}`}
              name={cell.name}
            />
          ))}
        </span>
      ) : (
        <PcAvatar
          avatarUrl={isGroup && groupAvatar?.kind === "image" ? groupAvatar.url : isGroup ? undefined : avatarUrl}
          className={`e-avatar ${isGroup ? "green" : "indigo"}`}
          kind={isGroup ? "group" : "person"}
          name={displayTitle}
        />
      )}
      {badge && unread > 0 && <em className="e-avatar-unread">{formatBadgeCount(unread)}</em>}
    </span>
  );
}

export function ConversationRow({
  active,
  avatarUrl,
  conversation,
  draft,
  groupAvatar,
  isGroup,
  onClick,
  onContextMenu,
  unread,
}: {
  active: boolean;
  avatarUrl?: string | null;
  conversation: ConversationListItem;
  draft?: string;
  groupAvatar?: GroupConversationAvatar;
  isGroup: boolean;
  onClick: () => void;
  onContextMenu: (event: MouseEvent<HTMLElement>) => void;
  unread: number;
}) {
  const { t } = useI18n();
  const draftText = draft?.trim();

  return (
    <button
      className={`e-conversation-row ${active ? "active" : ""}`}
      type="button"
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      <ConversationAvatar
        avatarUrl={avatarUrl ?? conversation.avatarUrl}
        badge
        groupAvatar={groupAvatar}
        isGroup={isGroup}
        title={conversation.title}
        unread={unread}
      />
      <span className="e-conversation-copy">
        <strong>{conversation.title || t("messages.conversationRow.unnamed")}</strong>
        {draftText ? (
          <small className="e-conversation-draft">
            <span className="e-draft-prefix">{t("messages.conversationRow.draftPrefix")}</span>
            <span className="e-draft-preview">{renderWechatEmojiText(draftText)}</span>
          </small>
        ) : (
          <small>
            {renderWechatEmojiText(
              conversation.lastMessage?.preview || t("messages.conversationRow.noRecentMessage"),
            )}
          </small>
        )}
      </span>
      <span className="e-conversation-side">
        <time>{formatChatTime(conversation.lastMessage?.sentAt)}</time>
        {conversation.isMuted && <BellOff className="e-muted-icon" size={15} />}
      </span>
    </button>
  );
}
