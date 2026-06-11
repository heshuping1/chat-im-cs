import type { Dispatch, SetStateAction } from "react";

import type {
  ConversationListItem,
  FriendDto,
  GroupMemberDto,
  TenantMemberDto,
} from "../../data/api-client";
import { imConversationEffectiveUnreadCount } from "../../data/im-read/im-conversation-read-view";
import { useI18n } from "../../i18n/useI18n";
import { startHorizontalPaneResize } from "../../lib/paneResize";
import { getImConversationType } from "../hooks/useMessageCenterViewModel";
import { resolveGroupConversationAvatar } from "../models/groupAvatarModel";
import type { GroupCreateAccess } from "../models/groupCreateModel";
import type { UserAvatarRegistry } from "../models/userAvatarRegistry";
import type { CurrentUserIdentity } from "../../data/message-display";
import type { ActiveImConversationVisibility } from "../hooks/useImReadCommandExecutor";
import {
  MessageConversationListPanel,
  type MessageConversationFilterKey,
} from "./MessageConversationListPanel";
import type { MessagePlusAction } from "./MessageStartDialogs";

type ComposerDialog = "direct" | "group" | "qr" | "card" | null;

export function MessageConversationSidebar({
  activeConversation,
  activeConversationMessagesLoaded,
  activeConversationVisibility,
  conversationDrawerOpen,
  conversationFilter,
  draftsByConversation,
  emptyText,
  errorText,
  friends,
  friendRequestCount,
  groupAvatarSnapshotFor,
  groupCreateAccess,
  groupMembersByConversation,
  keyword,
  listPaneWidth,
  loading,
  plusMenuOpen,
  tenantMembers,
  unreadCount,
  unreadIdentity,
  userAvatarRegistry,
  visibleConversations,
  activeGroupMembers,
  onAddFriend,
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
  activeConversationMessagesLoaded: boolean;
  activeConversationVisibility: ActiveImConversationVisibility;
  conversationDrawerOpen: boolean;
  conversationFilter: MessageConversationFilterKey;
  draftsByConversation: Record<string, string | undefined>;
  emptyText: string;
  errorText?: string | null;
  friends: FriendDto[];
  friendRequestCount: number;
  groupAvatarSnapshotFor: (conversation?: ConversationListItem) => string | undefined;
  groupCreateAccess: GroupCreateAccess;
  groupMembersByConversation: Record<string, GroupMemberDto[]>;
  keyword: string;
  listPaneWidth: number;
  loading: boolean;
  plusMenuOpen: boolean;
  tenantMembers: TenantMemberDto[];
  unreadCount: number;
  unreadIdentity: CurrentUserIdentity;
  userAvatarRegistry: UserAvatarRegistry;
  visibleConversations: ConversationListItem[];
  activeGroupMembers?: GroupMemberDto[];
  onAddFriend: () => void;
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
  const { t } = useI18n();

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
        friends={friends}
        friendRequestCount={friendRequestCount}
        groupCreateAccess={groupCreateAccess}
        keyword={keyword}
        loading={loading}
        plusMenuOpen={plusMenuOpen}
        tenantMembers={tenantMembers}
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
            onAddFriend,
          })
        }
        onTogglePlusMenu={() => setPlusMenuOpen((value) => !value)}
        resolveConversationAvatar={userAvatarRegistry.resolveConversationAvatar}
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
          imConversationEffectiveUnreadCount(item, unreadIdentity, {
            activeConversationId: activeConversation?.conversationId,
            messagesLoaded: activeConversationMessagesLoaded,
            visibility: activeConversationVisibility,
          })
        }
      />

      <div
        className="resizer list-resizer"
        role="separator"
        aria-label={t("message.profileDock.resizeList")}
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
  onAddFriend,
}: {
  action: MessagePlusAction;
  setActiveModule: (module: "contacts") => void;
  setComposerDialog: Dispatch<SetStateAction<ComposerDialog>>;
  setContactFilter: (filter: "requests") => void;
  setPlusMenuOpen: Dispatch<SetStateAction<boolean>>;
  onAddFriend: () => void;
}) {
  setPlusMenuOpen(false);
  if (action === "addFriend") {
    onAddFriend();
    return;
  }
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
