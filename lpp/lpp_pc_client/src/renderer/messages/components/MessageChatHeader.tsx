import { AppWindow, ChevronLeft, Languages, Search } from "lucide-react";
import { useRef } from "react";

import { ChannelBadge, channelLabel } from "../../components/ChannelBadge";
import type { ConversationListItem } from "../../data/api-client";
import { imConversationEffectiveUnreadCount } from "../../data/im-read/im-conversation-read-view";
import type { CurrentUserIdentity } from "../../data/message-display";
import { useI18n } from "../../i18n/useI18n";
import type { AutoTranslateConversationMode } from "../../translation/models/autoTranslatePreferences";
import { ConversationAvatar } from "./ConversationListParts";

type Translate = ReturnType<typeof useI18n>["t"];

export function MessageChatHeader({
  conversation,
  conversationAvatarUrl,
  conversationIsGroup,
  customerApplicationName,
  customerSource,
  headerTitle,
  historyOpen,
  messageSearchOpen,
  messagesLoaded,
  autoTranslateEffective,
  autoTranslateMode,
  unreadIdentity,
  onCycleAutoTranslateMode,
  onOpenConversationDrawer,
  onToggleLookup,
}: {
  conversation: ConversationListItem;
  conversationAvatarUrl?: string | null;
  conversationIsGroup: boolean;
  customerApplicationName?: string;
  customerSource?: string;
  headerTitle: string;
  historyOpen: boolean;
  messageSearchOpen: boolean;
  messagesLoaded: boolean;
  autoTranslateEffective: boolean;
  autoTranslateMode: AutoTranslateConversationMode;
  unreadIdentity?: CurrentUserIdentity | null;
  onCycleAutoTranslateMode: () => void;
  onOpenConversationDrawer: () => void;
  onToggleLookup: () => void;
}) {
  const { t } = useI18n();
  const lookupPointerHandledRef = useRef(false);
  const lookupOpen = messageSearchOpen || historyOpen;
  const hasApplication = Boolean(customerApplicationName?.trim());
  const hasSource = Boolean(customerSource?.trim());
  const autoTranslateLabel = t("messages.chatHeader.autoTranslate", {
    state: autoTranslateModeLabel(autoTranslateMode, autoTranslateEffective, t),
  });

  return (
    <header className="e-chat-header">
      <div className={`e-chat-title ${conversationIsGroup ? "group-title" : ""}`}>
        <button
          className="e-chat-back-button"
          type="button"
          aria-label={t("messages.chatHeader.showConversationList")}
          title={t("messages.chatHeader.showConversationList")}
          onClick={onOpenConversationDrawer}
        >
          <ChevronLeft size={20} />
        </button>
        {!conversationIsGroup && (
          <ConversationAvatar
            avatarUrl={conversationAvatarUrl ?? conversation.avatarUrl}
            groupAvatar={undefined}
            isGroup={false}
            title={conversation.title}
            unread={imConversationEffectiveUnreadCount(conversation, unreadIdentity, {
              activeConversationId: conversation.conversationId,
              messagesLoaded,
              visibility: "paneVisible",
            })}
          />
        )}
        <div>
          <h2>{headerTitle}</h2>
          {!conversationIsGroup && (hasApplication || hasSource) && (
            <p className="chat-header-meta-chips">
              {hasApplication && (
                <span
                  className="customer-meta-chip customer-meta-chip-app"
                  title={t("messages.chatHeader.channelApp", {
                    name: customerApplicationName ?? "",
                  })}
                  aria-label={t("messages.chatHeader.channelApp", {
                    name: customerApplicationName ?? "",
                  })}
                >
                  <AppWindow size={11} strokeWidth={2.4} aria-hidden="true" />
                  <span>{customerApplicationName}</span>
                </span>
              )}
              {hasSource && (
                <span
                  className="customer-meta-chip customer-meta-chip-source"
                  title={t("messages.chatHeader.sourceChannel", {
                    name: channelLabel(customerSource),
                  })}
                  aria-label={t("messages.chatHeader.sourceChannel", {
                    name: channelLabel(customerSource),
                  })}
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
          className={`e-icon-button ${autoTranslateEffective ? "active" : ""}`}
          type="button"
          aria-label={autoTranslateLabel}
          title={autoTranslateLabel}
          aria-pressed={autoTranslateEffective}
          onClick={onCycleAutoTranslateMode}
        >
          <Languages size={18} />
        </button>
        <button
          className={`e-icon-button ${lookupOpen ? "active" : ""}`}
          type="button"
          aria-label={t("messages.chatHeader.searchMessages")}
          title={t("messages.chatHeader.searchMessages")}
          aria-pressed={lookupOpen}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            onToggleLookup();
          }}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            lookupPointerHandledRef.current = true;
            event.preventDefault();
            onToggleLookup();
          }}
          onClick={() => {
            if (lookupPointerHandledRef.current) {
              lookupPointerHandledRef.current = false;
              return;
            }
            onToggleLookup();
          }}
        >
          <Search size={18} />
        </button>
      </div>
    </header>
  );
}

function autoTranslateModeLabel(
  mode: AutoTranslateConversationMode,
  effective: boolean,
  t: Translate,
) {
  if (mode === "enabled") return t("messages.chatHeader.autoTranslateEnabled");
  if (mode === "disabled") return t("messages.chatHeader.autoTranslateDisabled");
  return effective
    ? t("messages.chatHeader.autoTranslateGlobalEnabled")
    : t("messages.chatHeader.autoTranslateGlobalDisabled");
}
