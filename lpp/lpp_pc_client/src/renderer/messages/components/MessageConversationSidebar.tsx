import type { Dispatch, SetStateAction } from "react";

import type { ConversationListItem, GroupMemberDto } from "../../data/api-client";
import { effectiveConversationUnreadCount } from "../../data/message-display";
import { startHorizontalPaneResize } from "../../lib/paneResize";
import { getImConversationType } from "../hooks/useMessageCenterViewModel";
import { resolveGroupConversationAvatar } from "../models/groupAvatarModel";
import type { CurrentUserIdentity } from "../../data/message-display";
import {
  MessageConversationListPanel,
  type MessageConversationFilterKey,
  type MessagePlusAction,
} from "./MessageConversationListPanel";

type ComposerDialog = "direct" | "group" | "qr" | "card" | null;

export function MessageConversationSidebar({
  activeConversation,
  conversationDrawerOpen,
  conversationFilter,
  draftsByConversation,
  emptyText,
  errorText,
  groupAvatarSnapshotFor,
  groupMembersByConversation,
  keyword,
  listPaneWidth,
  loading,
  plusMenuOpen,
  unreadCount,
  unreadIdentity,
  visibleConversations,
  activeGroupMembers,
  onConversationClick,
  onConversationContextMenu,
  setActiveModule,
  setComposerDialog,
  setContactFilter,
  setConversationFilter,
  setKeyword,
  setListPaneWidth,
  setPlusMenuOpen,
}: {
  activeConversation?: ConversationListItem;
  conversationDrawerOpen: boolean;
  conversationFilter: MessageConversationFilterKey;
  draftsByConversation: Record<string, string | undefined>;
  emptyText: string;
  errorText?: string | null;
  groupAvatarSnapshotFor: (conversation?: ConversationListItem) => string | undefined;
  groupMembersByConversation: Record<string, GroupMemberDto[]>;
  keyword: string;
  listPaneWidth: number;
  loading: boolean;
  plusMenuOpen: boolean;
  unreadCount: number;
  unreadIdentity: CurrentUserIdentity;
  visibleConversations: ConversationListItem[];
  activeGroupMembers?: GroupMemberDto[];
  onConversationClick: (conversation: ConversationListItem) => void;
  onConversationContextMenu: (
    event: React.MouseEvent<HTMLElement>,
    conversation: ConversationListItem,
  ) => void;
  setActiveModule: (module: "contacts") => void;
  setComposerDialog: Dispatch<SetStateAction<ComposerDialog>>;
  setContactFilter: (filter: "requests") => void;
  setConversationFilter: (filter: MessageConversationFilterKey) => void;
  setKeyword: Dispatch<SetStateAction<string>>;
  setListPaneWidth: (width: number) => void;
  setPlusMenuOpen: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <>
      <MessageConversationListPanel
        activeConversationId={activeConversation?.conversationId}
        conversationDrawerOpen={conversationDrawerOpen}
        conversationFilter={conversationFilter}
        conversations={visibleConversations}
        draftsByConversation={draftsByConversation}
        emptyText={emptyText}
        errorText={errorText}
        keyword={keyword}
        loading={loading}
        plusMenuOpen={plusMenuOpen}
        unreadCount={unreadCount}
        onConversationClick={onConversationClick}
        onConversationContextMenu={onConversationContextMenu}
        onFilterChange={setConversationFilter}
        onKeywordChange={setKeyword}
        onPlusAction={(action) =>
          handlePlusAction({
            action,
            setActiveModule,
            setComposerDialog,
            setContactFilter,
            setPlusMenuOpen,
          })
        }
        onTogglePlusMenu={() => setPlusMenuOpen((value) => !value)}
        resolveConversationGroupAvatar={(item) =>
          resolveGroupConversationAvatar(
            item,
            groupMembersByConversation[item.conversationId] ??
              activeConversationGroupMembers(item, activeConversation, activeGroupMembers),
            groupAvatarSnapshotFor(item),
          )
        }
        resolveConversationIsGroup={(item) => getImConversationType(item) === "group"}
        resolveConversationUnread={(item) =>
          effectiveConversationUnreadCount(item, unreadIdentity)
        }
      />

      <div
        className="resizer list-resizer"
        role="separator"
        aria-label="调整消息列表宽度"
        onPointerDown={(event) =>
          startHorizontalPaneResize(event, {
            initialWidth: listPaneWidth,
            onResize: setListPaneWidth,
          })
        }
      />
    </>
  );
}

function handlePlusAction({
  action,
  setActiveModule,
  setComposerDialog,
  setContactFilter,
  setPlusMenuOpen,
}: {
  action: MessagePlusAction;
  setActiveModule: (module: "contacts") => void;
  setComposerDialog: Dispatch<SetStateAction<ComposerDialog>>;
  setContactFilter: (filter: "requests") => void;
  setPlusMenuOpen: Dispatch<SetStateAction<boolean>>;
}) {
  setPlusMenuOpen(false);
  if (action === "requests") {
    setContactFilter("requests");
    setActiveModule("contacts");
    return;
  }
  setComposerDialog(action);
}

function activeConversationGroupMembers(
  conversation: ConversationListItem,
  activeConversation?: ConversationListItem,
  activeGroupMembers?: GroupMemberDto[],
) {
  return conversation.conversationId === activeConversation?.conversationId &&
    getImConversationType(conversation) === "group"
    ? activeGroupMembers
    : undefined;
}
