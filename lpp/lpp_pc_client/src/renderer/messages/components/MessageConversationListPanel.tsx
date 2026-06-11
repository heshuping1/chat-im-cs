import { Plus, Search } from "lucide-react";
import type { MouseEvent } from "react";

import type {
  ConversationListItem,
  FriendDto,
  TenantMemberDto,
} from "../../data/api-client";
import { PanelState } from "../../components/PanelState";
import { useI18n } from "../../i18n/useI18n";
import { formatBadgeCount } from "../../lib/format";
import { MessagePlusMenu, type MessagePlusAction } from "./MessageStartDialogs";
import type { GroupCreateAccess } from "../models/groupCreateModel";
import type { GroupConversationAvatar } from "../models/groupAvatarTypes";
import { conversationListIdentityView } from "../models/conversationListIdentityModel";
import { ConversationRow } from "./ConversationListParts";

export type MessageConversationFilterKey = "all" | "unread" | "friends" | "groups";

export interface MessageConversationListPanelProps {
  activeConversationId?: string;
  conversationDrawerOpen: boolean;
  conversationFilter: MessageConversationFilterKey;
  conversations: ConversationListItem[];
  draftsByConversation: Record<string, string | undefined>;
  emptyText: string;
  errorText?: string | null;
  friends: FriendDto[];
  friendRequestCount: number;
  groupCreateAccess: GroupCreateAccess;
  keyword: string;
  loading: boolean;
  plusMenuOpen: boolean;
  unreadCount: number;
  tenantMembers: TenantMemberDto[];
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
  resolveConversationAvatar: (conversation: ConversationListItem) => string | null | undefined;
  resolveConversationIsGroup: (conversation: ConversationListItem) => boolean;
  resolveConversationUnread: (conversation: ConversationListItem) => number;
}

const filterTabs: Array<{
  key: MessageConversationFilterKey;
  labelKey: string;
}> = [
  { key: "all", labelKey: "messages.conversationList.filter.all" },
  { key: "unread", labelKey: "messages.conversationList.filter.unread" },
  { key: "friends", labelKey: "messages.conversationList.filter.friends" },
  { key: "groups", labelKey: "messages.conversationList.filter.groups" },
];

export function MessageConversationListPanel({
  activeConversationId,
  conversationDrawerOpen,
  conversationFilter,
  conversations,
  draftsByConversation,
  emptyText,
  errorText,
  friends,
  friendRequestCount,
  groupCreateAccess,
  keyword,
  loading,
  plusMenuOpen,
  tenantMembers,
  unreadCount,
  onConversationClick,
  onConversationContextMenu,
  onFilterChange,
  onKeywordChange,
  onPlusAction,
  onTogglePlusMenu,
  resolveConversationGroupAvatar,
  resolveConversationAvatar,
  resolveConversationIsGroup,
  resolveConversationUnread,
}: MessageConversationListPanelProps) {
  const { t } = useI18n();

  return (
    <section className={`e-panel e-conversation-panel ${conversationDrawerOpen ? "drawer-open" : ""}`}>
      <header className="e-message-list-top">
        <label className="e-search">
          <Search size={16} />
          <input
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            placeholder={t("messages.conversationList.searchPlaceholder")}
          />
        </label>
        <div className="message-plus-wrap" onClick={(event) => event.stopPropagation()}>
          <button
            className="e-icon-button message-plus-button"
            type="button"
            aria-label={
              friendRequestCount > 0
                ? t("messages.conversationList.plusMenuWithRequests", {
                    count: friendRequestCount,
                  })
                : t("messages.conversationList.plusMenu")
            }
            title={t("messages.conversationList.createAndAdd")}
            aria-haspopup="menu"
            aria-expanded={plusMenuOpen}
            onClick={onTogglePlusMenu}
          >
            <Plus size={18} />
            {friendRequestCount > 0 && (
              <span className="message-plus-request-badge" aria-hidden="true">
                {formatBadgeCount(friendRequestCount)}
              </span>
            )}
          </button>
          {plusMenuOpen && (
            <MessagePlusMenu
              friendRequestCount={friendRequestCount}
              groupCreateAccess={groupCreateAccess}
              onAction={onPlusAction}
            />
          )}
        </div>
      </header>

      <nav className="e-filter-row" aria-label={t("messages.conversationList.filtersAria")}>
        {filterTabs.map((tab) => (
          <button
            className={conversationFilter === tab.key ? "selected" : ""}
            key={tab.key}
            type="button"
            onClick={() => onFilterChange(tab.key)}
          >
            {t(tab.labelKey)}
            {tab.key === "unread" && <em>{formatBadgeCount(unreadCount)}</em>}
          </button>
        ))}
      </nav>

      {errorText && <p className="message-notice error">{errorText}</p>}

      <div className="e-conversation-list" aria-label={t("messages.conversationList.listAria")}>
        {loading && <PanelState text={t("messages.conversationList.loading")} />}
        {!loading &&
          conversations.map((item) => {
            const isGroup = resolveConversationIsGroup(item);
            return (
              <ConversationRow
                active={item.conversationId === activeConversationId}
                avatarUrl={resolveConversationAvatar(item)}
                conversation={item}
                draft={draftsByConversation[item.conversationId]}
                groupAvatar={resolveConversationGroupAvatar(item)}
                identity={conversationListIdentityView({
                  conversation: item,
                  friends,
                  isGroup,
                  tenantMembers,
                })}
                isGroup={isGroup}
                key={item.conversationId}
                onClick={() => onConversationClick(item)}
                onContextMenu={(event) => onConversationContextMenu(event, item)}
                unread={resolveConversationUnread(item)}
              />
            );
          })}
        {!loading && conversations.length === 0 && (
          <PanelState className="e-panel-state" text={emptyText} tone={false} />
        )}
      </div>
    </section>
  );
}
