import { ChevronLeft, Clock3, PanelRight, Search } from "lucide-react";

import type { ConversationListItem } from "../../data/api-client";
import type { CurrentUserIdentity } from "../../data/message-display";
import type { MessageLayoutMode } from "../../data/workspace-ui/workspace-ui-store";
import {
  conversationMetaText,
  effectiveConversationUnreadCount,
} from "../../data/message-display";
import { ConversationAvatar } from "./ConversationListParts";

export function MessageChatHeader({
  conversation,
  conversationIsGroup,
  headerTitle,
  historyOpen,
  layoutMode,
  messageProfileVisible,
  messageSearchOpen,
  profileStandaloneOpen,
  unreadIdentity,
  onOpenConversationDrawer,
  onOpenStandaloneProfile,
  onToggleHistory,
  onToggleProfileVisible,
  onToggleSearch,
}: {
  conversation: ConversationListItem;
  conversationIsGroup: boolean;
  headerTitle: string;
  historyOpen: boolean;
  layoutMode: MessageLayoutMode;
  messageProfileVisible: boolean;
  messageSearchOpen: boolean;
  profileStandaloneOpen: boolean;
  unreadIdentity?: CurrentUserIdentity | null;
  onOpenConversationDrawer: () => void;
  onOpenStandaloneProfile: () => void;
  onToggleHistory: () => void;
  onToggleProfileVisible: () => void;
  onToggleSearch: () => void;
}) {
  return (
    <header className="e-chat-header">
      <div className={`e-chat-title ${conversationIsGroup ? "group-title" : ""}`}>
        <button
          className="e-chat-back-button"
          type="button"
          aria-label="显示会话列表"
          title="显示会话列表"
          onClick={onOpenConversationDrawer}
        >
          <ChevronLeft size={20} />
        </button>
        {!conversationIsGroup && (
          <ConversationAvatar
            avatarUrl={conversation.avatarUrl}
            groupAvatar={undefined}
            isGroup={false}
            title={conversation.title}
            unread={effectiveConversationUnreadCount(conversation, unreadIdentity)}
          />
        )}
        <div>
          <h2>{headerTitle}</h2>
          {!conversationIsGroup && (
            <p>{conversationMetaText(conversation, unreadIdentity)}</p>
          )}
        </div>
      </div>
      <div className="e-chat-actions">
        <button
          className={`e-icon-button ${messageSearchOpen ? "active" : ""}`}
          type="button"
          aria-label={conversationIsGroup ? "查找聊天记录" : "查找"}
          title={conversationIsGroup ? "查找聊天记录" : "查找"}
          onClick={onToggleSearch}
        >
          <Search size={18} />
        </button>
        {!conversationIsGroup && (
          <button
            className={`e-icon-button ${historyOpen ? "active" : ""}`}
            type="button"
            aria-label="历史"
            title="历史"
            onClick={onToggleHistory}
          >
            <Clock3 size={18} />
          </button>
        )}
        <button
          className={`e-icon-button ${
            layoutMode === "full"
              ? messageProfileVisible
                ? "active"
                : ""
              : profileStandaloneOpen
                ? "active"
                : ""
          }`}
          type="button"
          aria-label={conversationIsGroup ? "群聊资料" : "客户信息"}
          title={conversationIsGroup ? "群聊资料" : "客户信息"}
          aria-pressed={layoutMode === "full" ? messageProfileVisible : profileStandaloneOpen}
          onClick={layoutMode === "full" ? onToggleProfileVisible : onOpenStandaloneProfile}
        >
          <PanelRight size={18} />
        </button>
      </div>
    </header>
  );
}
