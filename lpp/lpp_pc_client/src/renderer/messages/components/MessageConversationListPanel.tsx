import { Plus, Search } from "lucide-react";
import type { MouseEvent } from "react";

import type { ConversationListItem } from "../../data/api-client";
import { PanelState } from "../../components/PanelState";
import { formatBadgeCount } from "../../lib/format";
import { MessagePlusMenu } from "./MessageStartDialogs";
import type { GroupCreateAccess } from "../models/groupCreateModel";
import type { GroupConversationAvatar } from "../models/groupAvatarTypes";
import { ConversationRow } from "./ConversationListParts";

export type MessageConversationFilterKey = "all" | "unread" | "friends" | "groups";
export type MessagePlusAction = "direct" | "group" | "requests" | "qr";

export interface MessageConversationListPanelProps {
  activeConversationId?: string;
  conversationDrawerOpen: boolean;
  conversationFilter: MessageConversationFilterKey;
  conversations: ConversationListItem[];
  draftsByConversation: Record<string, string | undefined>;
  emptyText: string;
  errorText?: string | null;
  groupCreateAccess: GroupCreateAccess;
  keyword: string;
  loading: boolean;
  plusMenuOpen: boolean;
  unreadCount: number;
  onConversationClick: (conversation: ConversationListItem) => void;
  onConversationContextMenu: (
    event: MouseEvent<HTMLElement>,
    conversation: ConversationListItem,
  ) => void;
  onFilterChange: (filter: MessageConversationFilterKey) => void;
  onKeywordChange: (keyword: string) => void;
  onPlusAction: (action: MessagePlusAction) => void;
  onTogglePlusMenu: () => void;
  resolveConversationGroupAvatar: (
    conversation: ConversationListItem,
  ) => GroupConversationAvatar | undefined;
  resolveConversationIsGroup: (conversation: ConversationListItem) => boolean;
  resolveConversationUnread: (conversation: ConversationListItem) => number;
}

const filterTabs: Array<{
  key: MessageConversationFilterKey;
  label: string;
}> = [
  { key: "all", label: "全部" },
  { key: "unread", label: "未读" },
  { key: "friends", label: "好友" },
  { key: "groups", label: "群聊" },
];

export function MessageConversationListPanel({
  activeConversationId,
  conversationDrawerOpen,
  conversationFilter,
  conversations,
  draftsByConversation,
  emptyText,
  errorText,
  groupCreateAccess,
  keyword,
  loading,
  plusMenuOpen,
  unreadCount,
  onConversationClick,
  onConversationContextMenu,
  onFilterChange,
  onKeywordChange,
  onPlusAction,
  onTogglePlusMenu,
  resolveConversationGroupAvatar,
  resolveConversationIsGroup,
  resolveConversationUnread,
}: MessageConversationListPanelProps) {
  return (
    <section className={`e-panel e-conversation-panel ${conversationDrawerOpen ? "drawer-open" : ""}`}>
      <header className="e-message-list-top">
        <label className="e-search">
          <Search size={16} />
          <input
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            placeholder="搜索"
          />
        </label>
        <div className="message-plus-wrap" onClick={(event) => event.stopPropagation()}>
          <button
            className="e-icon-button message-plus-button"
            type="button"
            aria-label="打开消息操作菜单"
            title="发起聊天"
            aria-haspopup="menu"
            aria-expanded={plusMenuOpen}
            onClick={onTogglePlusMenu}
          >
            <Plus size={18} />
          </button>
          {plusMenuOpen && (
            <MessagePlusMenu
              groupCreateAccess={groupCreateAccess}
              onAction={onPlusAction}
            />
          )}
        </div>
      </header>

      <nav className="e-filter-row" aria-label="Message filters">
        {filterTabs.map((tab) => (
          <button
            className={conversationFilter === tab.key ? "selected" : ""}
            key={tab.key}
            type="button"
            onClick={() => onFilterChange(tab.key)}
          >
            {tab.label}
            {tab.key === "unread" && <em>{formatBadgeCount(unreadCount)}</em>}
          </button>
        ))}
      </nav>

      {errorText && <p className="message-notice error">{errorText}</p>}

      <div className="e-conversation-list" aria-label="消息会话列表">
        {loading && <PanelState text="正在加载消息..." />}
        {!loading &&
          conversations.map((item) => (
            <ConversationRow
              active={item.conversationId === activeConversationId}
              conversation={item}
              draft={draftsByConversation[item.conversationId]}
              groupAvatar={resolveConversationGroupAvatar(item)}
              isGroup={resolveConversationIsGroup(item)}
              key={item.conversationId}
              onClick={() => onConversationClick(item)}
              onContextMenu={(event) => onConversationContextMenu(event, item)}
              unread={resolveConversationUnread(item)}
            />
          ))}
        {!loading && conversations.length === 0 && (
          <PanelState className="e-panel-state" text={emptyText} tone={false} />
        )}
      </div>
    </section>
  );
}
