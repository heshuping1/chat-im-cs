import type {
  ComponentProps,
  CSSProperties,
  Dispatch,
  Ref,
  SetStateAction,
} from "react";

import { PanelState } from "../../components/PanelState";
import type {
  ConversationListItem,
  GroupMemberDto,
  MessageItemDto,
} from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import type { ConversationReadState } from "../../data/im-read-model";
import type { CurrentUserIdentity } from "../../data/message-display";
import type { PcSettings } from "../../data/settings/pc-settings";
import type { ContactItem, ModuleKey } from "../../data/types";
import type { MessageLayoutMode } from "../../data/workspace-ui/workspace-ui-store";
import { requireApiClient } from "../../data/runtime";
import { extractActionResultText, type ReplyTarget } from "../models/messageComposerModel";
import {
  eventMessageText,
  isMineMessage,
  modelBackedMessageReadStatusText,
  resolveSenderAvatarUrl,
  resolveSenderDisplayName,
  shouldShowFileInlineStatus,
  type AvatarProfilePopoverState,
  type UnreadJumpState,
} from "../models/messageDisplayModel";
import { messageActionPreview, type HistoryFilterKey } from "../models/messageListModel";
import type { MessageCenterCommandModel } from "../hooks/useMessageCenterCommandModel";
import { getImConversationType } from "../hooks/useMessageCenterViewModel";
import { resolveGroupConversationAvatar } from "../models/groupAvatarModel";
import { ChatToastNotice } from "./ChatToastNotice";
import { StandaloneConversationInfoView } from "./ConversationInfoViews";
import { MessageChatHeader } from "./MessageChatHeader";
import { MessageComposerDock } from "./MessageComposerDock";
import { MessageDialogsLayer } from "./MessageDialogsLayer";
import { MessageListPanel } from "./MessageListPanel";
import { MessageOverlayLayer } from "./MessageOverlayLayer";
import { MessageProfileDock } from "./MessageProfileDock";
import type { ContactPickerItem } from "./MessageStartDialogs";

type MessageOverlayProps = ComponentProps<typeof MessageOverlayLayer>;
type StandaloneProfileProps = ComponentProps<typeof StandaloneConversationInfoView>;

export function MessageCenterConversationStage({
  activeConversation,
  activeConversationContact,
  activeConversationDraft,
  activeConversationHeaderTitle,
  activeConversationIsGroup,
  activeConversationReadState,
  activeConversationType,
  avatarProfilePopover,
  chatPanelRef,
  composerDialog,
  composerHeight,
  contactPickerItems,
  conversationMenu,
  conversations,
  createDirectPending,
  createGroupPending,
  createInviteQrPending,
  dockProfile,
  draftEditorStatesByConversation,
  forwardMessages,
  forwardPending,
  getChatPanelHeight,
  groupAvatarSnapshotFor,
  groupMemberMap,
  groupMembers,
  handleAvatarClick,
  handleContactCardClick,
  handleConversationMenuAction,
  handleMessageStageScroll,
  historyCounts,
  historyFilter,
  historyOpen,
  inviteQrError,
  inviteQrLoading,
  inviteQrs,
  isMessageStageNearBottom,
  jumpToLatest,
  loadingGroupMembers,
  messageAnnotations,
  messageCenterCommands,
  messageLayoutMode,
  messageList,
  messageMenu,
  messageMenuMediaStatus,
  messageProfileVisible,
  messageSearchKeyword,
  messageSearchOpen,
  messageStageRef,
  messages,
  messagesBottomRef,
  multiSelectMode,
  notice,
  onAvatarProfileClose,
  onCloseComposerDialog,
  onCloseForward,
  onCreateDirectChat,
  onCreateGroupChat,
  onCreateInviteQr,
  onForwardToConversation,
  onMessageElementRef,
  openMessageMenu,
  pcSettings,
  pendingNewMessageCount,
  profilePaneWidth,
  profileStandaloneOpen,
  replyTarget,
  scrollMessagesToBottom,
  scrollToMessage,
  selectedConversationEmptyText,
  selectedMessageIds,
  session,
  setActiveModule,
  setComposerHeight,
  setConversationDrawerOpen,
  setDraftEditorStatesByConversation,
  setDraftPreviewsByConversation,
  setDraftsByConversation,
  setForwardTargetMessages,
  setHistoryFilter,
  setHistoryOpen,
  setMessageProfileVisible,
  setMessageSearchKeyword,
  setMessageSearchOpen,
  setMultiSelectMode,
  setProfilePaneWidth,
  setProfileStandaloneOpen,
  setReplyTarget,
  setSelectedMessageIds,
  unreadIdentity,
  unreadJump,
  visibleMessages,
}: {
  activeConversation?: ConversationListItem;
  activeConversationContact?: ContactItem | null;
  activeConversationDraft?: string;
  activeConversationHeaderTitle: string;
  activeConversationIsGroup: boolean;
  activeConversationReadState?: ConversationReadState;
  activeConversationType?: "direct" | "group";
  avatarProfilePopover: AvatarProfilePopoverState | null;
  chatPanelRef: Ref<HTMLElement>;
  composerDialog: "direct" | "group" | "qr" | null;
  composerHeight: number;
  contactPickerItems: ContactPickerItem[];
  conversationMenu: MessageOverlayProps["conversationMenu"];
  conversations: ConversationListItem[];
  createDirectPending: boolean;
  createGroupPending: boolean;
  createInviteQrPending: boolean;
  dockProfile: boolean;
  draftEditorStatesByConversation: Record<string, string>;
  forwardMessages: MessageItemDto[];
  forwardPending: boolean;
  getChatPanelHeight: () => number | null;
  groupAvatarSnapshotFor: (
    conversation: ConversationListItem,
  ) => StandaloneProfileProps["groupAvatarSnapshot"];
  groupMemberMap: Map<string, GroupMemberDto>;
  groupMembers: GroupMemberDto[];
  handleAvatarClick: ComponentProps<typeof MessageListPanel>["onAvatarClick"];
  handleContactCardClick: ComponentProps<typeof MessageListPanel>["onContactClick"];
  handleConversationMenuAction: MessageOverlayProps["onConversationAction"];
  handleMessageStageScroll: () => void;
  historyCounts: Record<HistoryFilterKey, number>;
  historyFilter: HistoryFilterKey;
  historyOpen: boolean;
  inviteQrError: unknown;
  inviteQrLoading: boolean;
  inviteQrs: ComponentProps<typeof MessageDialogsLayer>["inviteQrs"];
  isMessageStageNearBottom: (distance?: number) => boolean;
  jumpToLatest: () => void;
  loadingGroupMembers: boolean;
  messageAnnotations: Record<string, string>;
  messageCenterCommands: MessageCenterCommandModel;
  messageLayoutMode: MessageLayoutMode;
  messageList: { emptyText: string; loading: boolean };
  messageMenu: MessageOverlayProps["messageMenu"];
  messageMenuMediaStatus: MessageOverlayProps["messageMenuMediaStatus"];
  messageProfileVisible: boolean;
  messageSearchKeyword: string;
  messageSearchOpen: boolean;
  messageStageRef: Ref<HTMLElement>;
  messages: MessageItemDto[];
  messagesBottomRef: Ref<HTMLDivElement>;
  multiSelectMode: boolean;
  notice: string | null;
  onAvatarProfileClose: () => void;
  onCloseComposerDialog: () => void;
  onCloseForward: () => void;
  onCreateDirectChat: (userId: string) => void;
  onCreateGroupChat: (payload: { name: string; memberUserIds: string[] }) => void;
  onCreateInviteQr: () => void;
  onForwardToConversation: (targetConversationId: string) => void;
  onMessageElementRef: (messageId: string, element: HTMLDivElement | null) => void;
  openMessageMenu: ComponentProps<typeof MessageListPanel>["onContextMenu"];
  pcSettings: PcSettings;
  pendingNewMessageCount: number;
  profilePaneWidth: number;
  profileStandaloneOpen: boolean;
  replyTarget: ReplyTarget;
  scrollMessagesToBottom: (behavior?: ScrollBehavior) => void;
  scrollToMessage: (messageId: string) => void;
  selectedConversationEmptyText: string;
  selectedMessageIds: Set<string>;
  session: AuthSession | null;
  setActiveModule: (module: ModuleKey) => void;
  setComposerHeight: Dispatch<SetStateAction<number>>;
  setConversationDrawerOpen: Dispatch<SetStateAction<boolean>>;
  setDraftEditorStatesByConversation: Dispatch<SetStateAction<Record<string, string>>>;
  setDraftPreviewsByConversation: Dispatch<SetStateAction<Record<string, string>>>;
  setDraftsByConversation: Dispatch<SetStateAction<Record<string, string>>>;
  setForwardTargetMessages: Dispatch<SetStateAction<MessageItemDto[]>>;
  setHistoryFilter: Dispatch<SetStateAction<HistoryFilterKey>>;
  setHistoryOpen: Dispatch<SetStateAction<boolean>>;
  setMessageProfileVisible: (visible: boolean) => void;
  setMessageSearchKeyword: Dispatch<SetStateAction<string>>;
  setMessageSearchOpen: Dispatch<SetStateAction<boolean>>;
  setMultiSelectMode: Dispatch<SetStateAction<boolean>>;
  setProfilePaneWidth: (width: number) => void;
  setProfileStandaloneOpen: Dispatch<SetStateAction<boolean>>;
  setReplyTarget: Dispatch<SetStateAction<ReplyTarget>>;
  setSelectedMessageIds: Dispatch<SetStateAction<Set<string>>>;
  unreadIdentity?: CurrentUserIdentity | null;
  unreadJump: UnreadJumpState | null;
  visibleMessages: MessageItemDto[];
}) {
  return (
    <>
      <main
        ref={chatPanelRef}
        className={`e-chat-panel ${activeConversationIsGroup ? "group-chat-mode" : ""}`}
        style={{ "--composer-height": `${composerHeight}px` } as CSSProperties}
      >
        {activeConversation ? (
          <>
            <MessageChatHeader
              conversation={activeConversation}
              conversationIsGroup={activeConversationIsGroup}
              headerTitle={activeConversationHeaderTitle}
              historyOpen={historyOpen}
              layoutMode={messageLayoutMode}
              messageProfileVisible={messageProfileVisible}
              messageSearchOpen={messageSearchOpen}
              profileStandaloneOpen={profileStandaloneOpen}
              unreadIdentity={unreadIdentity}
              onOpenConversationDrawer={() => setConversationDrawerOpen(true)}
              onOpenStandaloneProfile={() => setProfileStandaloneOpen(true)}
              onToggleHistory={() => {
                setHistoryOpen((value) => !value);
                setMessageSearchOpen(false);
              }}
              onToggleProfileVisible={() => setMessageProfileVisible(!messageProfileVisible)}
              onToggleSearch={() => {
                setMessageSearchOpen((value) => !value);
                setHistoryOpen(false);
              }}
            />

            {notice && <ChatToastNotice text={notice} />}

            {profileStandaloneOpen ? (
              <StandaloneConversationInfoView
                contact={activeConversationContact}
                conversation={activeConversation}
                groupAvatarSnapshot={groupAvatarSnapshotFor(activeConversation)}
                groupMembers={groupMembers}
                loadingGroupMembers={loadingGroupMembers}
                userIdentity={unreadIdentity}
                onBack={() => setProfileStandaloneOpen(false)}
              />
            ) : (
              <MessageListPanel
                accountId={
                  session?.userId ||
                  session?.platformUserId ||
                  session?.lppId ||
                  session?.tenantId
                }
                assetBaseUrl={session?.apiBaseUrl}
                authToken={session?.tenantToken}
                conversation={activeConversation}
                emptyText={messageList.emptyText}
                eventMessageText={eventMessageText}
                groupMemberMap={groupMemberMap}
                historyCounts={historyCounts}
                historyFilter={historyFilter}
                historyOpen={historyOpen}
                loadedMessages={messages}
                loading={messageList.loading}
                messageAnnotations={messageAnnotations}
                messageSearchKeyword={messageSearchKeyword}
                messageSearchOpen={messageSearchOpen}
                messages={visibleMessages}
                messagesBottomRef={messagesBottomRef}
                messageStageRef={messageStageRef}
                mineAvatarUrl={session?.avatarUrl}
                multiSelectMode={multiSelectMode}
                pendingNewMessageCount={pendingNewMessageCount}
                selectedMessageIds={selectedMessageIds}
                unreadJump={unreadJump}
                isMineMessage={(message) => isMineMessage(message, session)}
                onAvatarClick={handleAvatarClick}
                onClearMessageSearch={() => setMessageSearchKeyword("")}
                onContactClick={handleContactCardClick}
                onContextMenu={openMessageMenu}
                onHistoryFilterChange={setHistoryFilter}
                onJumpToLatest={jumpToLatest}
                onLoadCapture={() => {
                  if (isMessageStageNearBottom()) scrollMessagesToBottom("auto");
                }}
                onMessageElementRef={onMessageElementRef}
                onMessageSearchKeywordChange={setMessageSearchKeyword}
                onMessageStageScroll={handleMessageStageScroll}
                onScrollToMessage={scrollToMessage}
                onSelectMessageToggle={(messageId) =>
                  setSelectedMessageIds((current) => {
                    const next = new Set(current);
                    if (next.has(messageId)) {
                      next.delete(messageId);
                    } else {
                      next.add(messageId);
                    }
                    return next;
                  })
                }
                onUnreadJump={messageCenterCommands.unreadJump}
                onUploadAction={messageCenterCommands.uploadAction}
                resolveSenderAvatarUrl={(message) =>
                  resolveSenderAvatarUrl(message, groupMemberMap)
                }
                resolveSenderDisplayName={(message) =>
                  resolveSenderDisplayName(message, activeConversation, groupMemberMap)
                }
                resolveStatusText={(message) =>
                  modelBackedMessageReadStatusText(
                    message,
                    activeConversation,
                    activeConversationReadState,
                    unreadIdentity,
                  )
                }
                shouldShowInlineStatus={shouldShowFileInlineStatus}
              />
            )}

            <MessageOverlayLayer
              avatarProfilePopover={avatarProfilePopover}
              conversationMenu={conversationMenu}
              messageMenu={messageMenu}
              messageMenuMediaStatus={messageMenuMediaStatus}
              profileStandaloneOpen={profileStandaloneOpen}
              isMineMessage={(message) => isMineMessage(message, session)}
              onAvatarProfileClose={onAvatarProfileClose}
              onConversationAction={handleConversationMenuAction}
              onMessageAction={(action, message) =>
                void messageCenterCommands.menuAction(action, message)
              }
            />

            {!profileStandaloneOpen && (
              <MessageComposerDock
                activeConversation={activeConversation}
                activeConversationDraft={activeConversationDraft}
                activeConversationType={activeConversationType}
                composerHeight={composerHeight}
                draftEditorState={
                  draftEditorStatesByConversation[activeConversation.conversationId]
                }
                groupMembers={groupMembers}
                isMessageStageNearBottom={isMessageStageNearBottom}
                messageCenterCommands={messageCenterCommands}
                messages={messages}
                multiSelectMode={multiSelectMode}
                replyTarget={replyTarget}
                screenshotShortcut={pcSettings.screenshotShortcut}
                selectedMessageIds={selectedMessageIds}
                getChatPanelHeight={getChatPanelHeight}
                onAiDraft={() => setActiveModule("aiAssistant")}
                onDraftChange={(conversationId, value) => {
                  setDraftsByConversation((current) => ({
                    ...current,
                    [conversationId]: value,
                  }));
                }}
                onDraftPreviewChange={(conversationId, value) => {
                  setDraftPreviewsByConversation((current) => ({
                    ...current,
                    [conversationId]: value,
                  }));
                }}
                onDraftEditorStateChange={(conversationId, value) => {
                  setDraftEditorStatesByConversation((current) => ({
                    ...current,
                    [conversationId]: value,
                  }));
                }}
                onKnowledgeBase={() => setActiveModule("knowledgeBase")}
                onTranslateDraft={async (content) =>
                  extractActionResultText(
                    await requireApiClient(session).translateText(content),
                  )
                }
                scrollMessagesToBottom={scrollMessagesToBottom}
                setComposerHeight={setComposerHeight}
                setForwardTargetMessages={setForwardTargetMessages}
                setMultiSelectMode={setMultiSelectMode}
                setReplyTarget={setReplyTarget}
                setSelectedMessageIds={setSelectedMessageIds}
              />
            )}

            <MessageDialogsLayer
              activeConversationId={activeConversation.conversationId}
              composerDialog={composerDialog}
              contactPickerItems={contactPickerItems}
              conversations={conversations}
              createDirectPending={createDirectPending}
              createGroupPending={createGroupPending}
              createInviteQrPending={createInviteQrPending}
              forwardMessages={forwardMessages}
              forwardPending={forwardPending}
              inviteQrError={inviteQrError}
              inviteQrLoading={inviteQrLoading}
              inviteQrs={inviteQrs}
              resolveConversationAvatar={(conversation) =>
                resolveGroupConversationAvatar(conversation)
              }
              resolveConversationType={getImConversationType}
              resolveMessagePreview={messageActionPreview}
              userIdentity={unreadIdentity}
              onCloseComposerDialog={onCloseComposerDialog}
              onCloseForward={onCloseForward}
              onCreateDirectChat={onCreateDirectChat}
              onCreateGroupChat={onCreateGroupChat}
              onCreateInviteQr={onCreateInviteQr}
              onForward={onForwardToConversation}
            />
          </>
        ) : (
          <PanelState text={selectedConversationEmptyText} />
        )}
      </main>

      {dockProfile && activeConversation && (
        <MessageProfileDock
          contact={activeConversationContact}
          conversation={activeConversation}
          groupAvatar={resolveGroupConversationAvatar(
            activeConversation,
            groupMembers,
            groupAvatarSnapshotFor(activeConversation),
          )}
          groupMembers={groupMembers}
          loadingGroupMembers={loadingGroupMembers}
          profilePaneWidth={profilePaneWidth}
          userIdentity={unreadIdentity}
          onResize={setProfilePaneWidth}
        />
      )}
    </>
  );
}
