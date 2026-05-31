import { AppWindow, ChevronLeft, PanelRight, Search } from "lucide-react";

import { ChannelBadge, channelLabel } from "../../components/ChannelBadge";
import type { ConversationListItem } from "../../data/api-client";
import type { CurrentUserIdentity } from "../../data/message-display";
import type { MessageLayoutMode } from "../../data/workspace-ui/workspace-ui-store";
import { effectiveConversationUnreadCount } from "../../data/message-display";
import { ConversationAvatar } from "./ConversationListParts";

export function MessageChatHeader({
  conversation,
  conversationIsGroup,
  customerApplicationName,
  customerSource,
  headerTitle,
  historyOpen,
  layoutMode,
  messageProfileVisible,
  messageSearchOpen,
  profileStandaloneOpen,
  unreadIdentity,
  onOpenConversationDrawer,
  onOpenStandaloneProfile,
  onToggleLookup,
  onToggleProfileVisible,
}: {
  conversation: ConversationListItem;
  conversationIsGroup: boolean;
  customerApplicationName?: string;
  customerSource?: string;
  headerTitle: string;
  historyOpen: boolean;
  layoutMode: MessageLayoutMode;
  messageProfileVisible: boolean;
  messageSearchOpen: boolean;
  profileStandaloneOpen: boolean;
  unreadIdentity?: CurrentUserIdentity | null;
  onOpenConversationDrawer: () => void;
  onOpenStandaloneProfile: () => void;
  onToggleLookup: () => void;
  onToggleProfileVisible: () => void;
}) {
  const lookupOpen = messageSearchOpen || historyOpen;
  const hasApplication = Boolean(customerApplicationName?.trim());
  const hasSource = Boolean(customerSource?.trim());
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
          {!conversationIsGroup && (hasApplication || hasSource) && (
            <p className="chat-header-meta-chips">
              {hasApplication && (
                <span
                  className="customer-meta-chip customer-meta-chip-app"
                  title={`渠道应用：${customerApplicationName}`}
                  aria-label={`渠道应用：${customerApplicationName}`}
                >
                  <AppWindow size={11} strokeWidth={2.4} aria-hidden="true" />
                  <span>{customerApplicationName}</span>
                </span>
              )}
              {hasSource && (
                <span
                  className="customer-meta-chip customer-meta-chip-source"
                  title={`来源渠道：${channelLabel(customerSource)}`}
                  aria-label={`来源渠道：${channelLabel(customerSource)}`}
                >
                  <ChannelBadge source={customerSource} compact />
                </span>
              )}
            </p>
          )}
        </div>
      </div>
      <div className="e-chat-actions">
        <button
          className={`e-icon-button ${lookupOpen ? "active" : ""}`}
          type="button"
          aria-label="查找聊天内容"
          title="查找聊天内容"
          aria-pressed={lookupOpen}
          onClick={onToggleLookup}
        >
          <Search size={18} />
        </button>
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
