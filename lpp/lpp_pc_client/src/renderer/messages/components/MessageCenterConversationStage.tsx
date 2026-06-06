import type {
  ComponentProps,
  CSSProperties,
  Dispatch,
  DragEvent,
  Ref,
  SetStateAction,
} from "react";
import { useState } from "react";

import { PanelState } from "../../components/PanelState";
import { isKnown } from "../../components/CustomerProfileModel";
import type {
  ConversationListItem,
  GroupMemberDto,
  MessageItemDto,
} from "../../data/api-client";
import type { MessageComposerHandle } from "../../components/MessageComposer";
import type { AuthSession } from "../../data/auth/auth-session";
import type { ConversationReadState } from "../../data/im-read-model";
import type { CurrentUserIdentity } from "../../data/message-display";
import type { PcSettings } from "../../data/settings/pc-settings";
import type { AutoTranslateConversationMode } from "../../translation/models/autoTranslatePreferences";
import type { ContactItem } from "../../data/types";
import type { MessageLayoutMode } from "../../data/workspace-ui/workspace-ui-store";
import { requireApiClient } from "../../data/runtime";
import { extractActionResultText, type ReplyTarget } from "../models/messageComposerModel";
import {
  canMentionAllGroupMembers,
  normalizeGroupRole,
} from "../models/groupManagementModel";
import {
  eventMessageText,
  isMineMessage,
  modelBackedMessageReadStatusText,
  resolveSenderDisplayName,
  shouldShowFileInlineStatus,
  type AvatarProfilePopoverState,
  type UnreadJumpState,
} from "../models/messageDisplayModel";
import { messageActionPreview, type HistoryFilterKey } from "../models/messageListModel";
import type { MessageCenterCommandModel } from "../hooks/useMessageCenterCommandModel";
import { getImConversationType } from "../hooks/useMessageCenterViewModel";
import type { MessageGroupManagement } from "../hooks/useMessageGroupManagement";
import { resolveGroupConversationAvatar } from "../models/groupAvatarModel";
import type { UserAvatarRegistry } from "../models/userAvatarRegistry";
import type { CreateGroupChatPayload } from "../models/groupCreateModel";
import { ChatToastNotice } from "./ChatToastNotice";
import { StandaloneConversationInfoView } from "./ConversationInfoViews";
import { MessageChatHeader } from "./MessageChatHeader";
import { MessageComposerDock } from "./MessageComposerDock";
import { MessageDialogsLayer } from "./MessageDialogsLayer";
import { MessageListPanel } from "./MessageListPanel";
import { MessageContextRail, type MessageContextPane } from "./MessageContextRail";
import { MessageOverlayLayer } from "./MessageOverlayLayer";
import { MessageProfileDock } from "./MessageProfileDock";
import type { ContactPickerItem } from "./MessageStartDialogs";

type MessageOverlayProps = ComponentProps<typeof MessageOverlayLayer>;
type StandaloneProfileProps = ComponentProps<typeof StandaloneConversationInfoView>;
const groupMemberNicknamePrefsKey = "lpp.pc.groupMemberNicknamePrefs";

export function MessageCenterConversationStage({
  activeConversation,
  activeConversationContact,
  activeConversationDraft,
  activeConversationHeaderTitle,
  activeConversationIsGroup,
  activeConversationMessagesLoaded,
  activeConversationReadState,
  activeConversationType,
  autoTranslateConversationMode,
  autoTranslateEffective,
  avatarProfilePopover,
  contactCardActionPending,
  contactCardProfile,
  contactCardProfileData,
  contactCardProfileError,
  contactCardProfileLoading,
  contactCardRelation,
  chatPanelRef,
  composerRef,
  canOpenAiAssistant,
  canOpenKnowledgeBase,
  composerDialog,
  composerDisabled,
  composerDisabledReason,
  composerHeight,
  contactPickerItems,
  conversationMenu,
  conversations,
  createDirectPending,
  createGroupPending,
  createInviteQrPending,
  sendContactCardPending,
  dockProfile,
  draftEditorStatesByConversation,
  forwardMessages,
  forwardPending,
  getChatPanelHeight,
  groupAvatarSnapshotFor,
  groupManagement,
  groupMemberMap,
  groupMembers,
  handleAvatarClick,
  handleContactCardClick,
  handleConversationMenuAction,
  handleMessageStageScroll,
  historyCounts,
  historyFilter,
  historyOpen,
  activeAssistantPane,
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
  messageProfilePinned,
  messageSearchKeyword,
  messageSearchOpen,
  messageStageRef,
  messages,
  messagesBottomRef,
  multiSelectMode,
  notice,
  onAvatarProfileClose,
  onCycleAutoTranslateMode,
  onContactCardAccept,
  onContactCardBlock,
  onContactCardClose,
  onContactCardDeleteFriend,
  onContactCardReject,
  onContactCardSendRequest,
  onContactCardStartChat,
  onCloseComposerDialog,
  onCloseForward,
  onCloseResend,
  onCreateDirectChat,
  onCreateGroupChat,
  onCreateInviteQr,
  onOpenCreateGroup,
  onOpenChatBackgroundSettings,
  onSubmitConversationComplaint,
  onUpdateCustomerRemark,
  onUpdateCustomerTags,
  onOpenGroupMemberProfile,
  onSendContactCard,
  onForwardToConversation,
  onFailedMessageClick,
  onMessageContextDragOver,
  onMessageContextDragStart,
  onMessageContextDrop,
  onMessageElementRef,
  onAiDraft,
  onKnowledgeBase,
  onQuickReply,
  onResendMessage,
  onToggleMessageProfilePin,
  openMessageMenu,
  pcSettings,
  pendingNewMessageCount,
  profilePaneWidth,
  profileActionPending,
  profileData,
  profileError,
  profileExtra,
  profileExtraLoading,
  profileLoading,
  profileStandaloneOpen,
  replyTarget,
  resendMessage,
  scrollMessagesToBottom,
  scrollToMessage,
  selectedConversationEmptyText,
  selectedMessageIds,
  session,
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
  userAvatarRegistry,
  visibleMessages,
}: {
  activeConversation?: ConversationListItem;
  activeConversationContact?: ContactItem | null;
  activeConversationDraft?: string;
  activeConversationHeaderTitle: string;
  activeConversationIsGroup: boolean;
  activeConversationMessagesLoaded: boolean;
  activeConversationReadState?: ConversationReadState;
  activeConversationType?: "direct" | "group";
  autoTranslateConversationMode: AutoTranslateConversationMode;
  autoTranslateEffective: boolean;
  avatarProfilePopover: AvatarProfilePopoverState | null;
  contactCardActionPending?: boolean;
  contactCardProfile: MessageOverlayProps["contactCardProfile"];
  contactCardProfileData: MessageOverlayProps["contactCardProfileData"];
  contactCardProfileError: MessageOverlayProps["contactCardProfileError"];
  contactCardProfileLoading: MessageOverlayProps["contactCardProfileLoading"];
  contactCardRelation: MessageOverlayProps["contactCardRelation"];
  chatPanelRef: Ref<HTMLElement>;
  composerRef?: Ref<MessageComposerHandle>;
  canOpenAiAssistant: boolean;
  canOpenKnowledgeBase: boolean;
  composerDialog: "direct" | "group" | "qr" | "card" | null;
  composerDisabled?: boolean;
  composerDisabledReason?: string;
  composerHeight: number;
  contactPickerItems: ContactPickerItem[];
  conversationMenu: MessageOverlayProps["conversationMenu"];
  conversations: ConversationListItem[];
  createDirectPending: boolean;
  createGroupPending: boolean;
  createInviteQrPending: boolean;
  sendContactCardPending: boolean;
  dockProfile: boolean;
  draftEditorStatesByConversation: Record<string, string>;
  forwardMessages: MessageItemDto[];
  forwardPending: boolean;
  getChatPanelHeight: () => number | null;
  groupAvatarSnapshotFor: (
    conversation: ConversationListItem,
  ) => StandaloneProfileProps["groupAvatarSnapshot"];
  groupManagement?: MessageGroupManagement;
  groupMemberMap: Map<string, GroupMemberDto>;
  groupMembers: GroupMemberDto[];
  handleAvatarClick: ComponentProps<typeof MessageListPanel>["onAvatarClick"];
  handleContactCardClick: ComponentProps<typeof MessageListPanel>["onContactClick"];
  handleConversationMenuAction: MessageOverlayProps["onConversationAction"];
  handleMessageStageScroll: () => void;
  historyCounts: Record<HistoryFilterKey, number>;
  historyFilter: HistoryFilterKey;
  historyOpen: boolean;
  activeAssistantPane: MessageContextPane;
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
  messageProfilePinned: boolean;
  messageSearchKeyword: string;
  messageSearchOpen: boolean;
  messageStageRef: Ref<HTMLElement>;
  messages: MessageItemDto[];
  messagesBottomRef: Ref<HTMLDivElement>;
  multiSelectMode: boolean;
  notice: string | null;
  onCycleAutoTranslateMode: () => void;
  onAvatarProfileClose: () => void;
  onContactCardAccept: MessageOverlayProps["onContactCardAccept"];
  onContactCardBlock: MessageOverlayProps["onContactCardBlock"];
  onContactCardClose: MessageOverlayProps["onContactCardClose"];
  onContactCardDeleteFriend: MessageOverlayProps["onContactCardDeleteFriend"];
  onContactCardReject: MessageOverlayProps["onContactCardReject"];
  onContactCardSendRequest: MessageOverlayProps["onContactCardSendRequest"];
  onContactCardStartChat: MessageOverlayProps["onContactCardStartChat"];
  onCloseComposerDialog: () => void;
  onCloseForward: () => void;
  onCloseResend: () => void;
  onCreateDirectChat: (userId: string) => void;
  onCreateGroupChat: (payload: CreateGroupChatPayload) => void;
  onCreateInviteQr: () => void;
  onOpenCreateGroup: () => void;
  onOpenChatBackgroundSettings: () => void;
  onSubmitConversationComplaint: ComponentProps<typeof StandaloneConversationInfoView>["onSubmitComplaint"];
  onUpdateCustomerRemark?: (remarkName: string) => Promise<void> | void;
  onUpdateCustomerTags?: (tags: string[]) => Promise<void> | void;
  onOpenGroupMemberProfile?: ComponentProps<typeof MessageProfileDock>["onOpenGroupMemberProfile"];
  onSendContactCard: ComponentProps<typeof MessageDialogsLayer>["onSendContactCard"];
  onForwardToConversation: (targetConversationId: string) => void;
  onFailedMessageClick: (message: MessageItemDto) => void;
  onMessageContextDragOver: (event: DragEvent<HTMLElement>) => void;
  onMessageContextDragStart: (
    event: DragEvent<HTMLElement>,
    pane: "assistant" | "profile",
  ) => void;
  onMessageContextDrop: (
    event: DragEvent<HTMLElement>,
    pane: "assistant" | "profile",
  ) => void;
  onMessageElementRef: (messageId: string, element: HTMLDivElement | null) => void;
  onAiDraft: () => void;
  onKnowledgeBase: () => void;
  onQuickReply: () => void;
  onResendMessage: () => void;
  onToggleMessageProfilePin: () => void;
  openMessageMenu: ComponentProps<typeof MessageListPanel>["onContextMenu"];
  pcSettings: PcSettings;
  pendingNewMessageCount: number;
  profilePaneWidth: number;
  profileActionPending?: boolean;
  profileData?: StandaloneProfileProps["profile"];
  profileError?: unknown;
  profileExtra?: StandaloneProfileProps["profileExtra"];
  profileExtraLoading?: boolean;
  profileLoading?: boolean;
  profileStandaloneOpen: boolean;
  replyTarget: ReplyTarget;
  resendMessage: MessageItemDto | null;
  scrollMessagesToBottom: (behavior?: ScrollBehavior) => void;
  scrollToMessage: (messageId: string) => void;
  selectedConversationEmptyText: string;
  selectedMessageIds: Set<string>;
  session: AuthSession | null;
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
  userAvatarRegistry: UserAvatarRegistry;
  visibleMessages: MessageItemDto[];
}) {
  const [groupMemberNicknamePrefs, setGroupMemberNicknamePrefs] = useState<Record<string, boolean>>(
    () => readGroupMemberNicknamePrefs(),
  );
  const activeConversationId = activeConversation?.conversationId;
  const showGroupMemberNicknames =
    activeConversationId && activeConversationIsGroup
      ? groupMemberNicknamePrefs[activeConversationId] !== false
      : true;
  const canMentionAll =
    activeConversationType === "group" &&
    canMentionAllGroupMembers({
      role: groupManagement?.role ?? normalizeGroupRole(activeConversation?.myRole),
      settings: groupManagement?.settings ?? groupManagement?.detail?.settings,
    });
  const setShowGroupMemberNicknames = (show: boolean) => {
    if (!activeConversationId) return;
    setGroupMemberNicknamePrefs((current) => {
      const next = { ...current, [activeConversationId]: show };
      writeGroupMemberNicknamePrefs(next);
      return next;
    });
  };
  const directCustomerHeaderMeta =
    activeConversation && activeConversationType === "direct" && !activeConversationIsGroup
      ? {
          applicationName: readCustomerHeaderApplicationName(profileData),
          source: readCustomerHeaderSource(profileData, profileExtra),
        }
      : { applicationName: undefined, source: undefined };
  const chatPanelClassName = [
    "e-chat-panel",
    activeConversationIsGroup ? "group-chat-mode" : "",
    profileStandaloneOpen ? "profile-standalone-open" : "",
  ].filter(Boolean).join(" ");
  const toggleProfileFromRail = () => {
    if (profileStandaloneOpen) {
      setProfileStandaloneOpen(false);
      return;
    }
    if (messageLayoutMode === "full") {
      setMessageProfileVisible(!messageProfileVisible);
      return;
    }
    setHistoryOpen(false);
    setMessageSearchOpen(false);
    setProfileStandaloneOpen(true);
  };
  const openMessageLookupFromInfo = () => {
    setProfileStandaloneOpen(false);
    setHistoryOpen(true);
    setMessageSearchOpen(true);
    setHistoryFilter("all");
  };

  return (
    <>
      <main
        ref={chatPanelRef}
        className={chatPanelClassName}
        style={{ "--composer-height": `${composerHeight}px` } as CSSProperties}
      >
        {activeConversation ? (
          <>
            <MessageChatHeader
              conversation={activeConversation}
              conversationAvatarUrl={userAvatarRegistry.resolveConversationAvatar(activeConversation)}
              conversationIsGroup={activeConversationIsGroup}
              customerApplicationName={directCustomerHeaderMeta.applicationName}
              customerSource={directCustomerHeaderMeta.source}
              headerTitle={activeConversationHeaderTitle}
              historyOpen={historyOpen}
              messageSearchOpen={messageSearchOpen}
              messagesLoaded={activeConversationMessagesLoaded}
              autoTranslateEffective={autoTranslateEffective}
              autoTranslateMode={autoTranslateConversationMode}
              unreadIdentity={unreadIdentity}
              onCycleAutoTranslateMode={onCycleAutoTranslateMode}
              onOpenConversationDrawer={() => setConversationDrawerOpen(true)}
              onToggleLookup={() => {
                const nextOpen = profileStandaloneOpen ? true : !(messageSearchOpen || historyOpen);
                setProfileStandaloneOpen(false);
                setHistoryOpen(nextOpen);
                setMessageSearchOpen(nextOpen);
                if (nextOpen) setHistoryFilter("all");
              }}
            />

            {notice && <ChatToastNotice text={notice} />}

            {profileStandaloneOpen ? (
              <StandaloneConversationInfoView
                contact={activeConversationContact}
                contactPickerItems={contactPickerItems}
                conversation={activeConversation}
                groupAvatarSnapshot={groupAvatarSnapshotFor(activeConversation)}
                groupManagement={groupManagement}
                groupMembers={groupMembers}
                avatarUrl={userAvatarRegistry.resolveConversationAvatar(activeConversation)}
                loadingGroupMembers={loadingGroupMembers}
                profile={profileData}
                profileActionPending={profileActionPending}
                profileError={profileError}
                profileExtra={profileExtra}
                profileExtraLoading={profileExtraLoading}
                profileLoading={profileLoading}
                showGroupMemberNicknames={showGroupMemberNicknames}
                userIdentity={unreadIdentity}
                onShowGroupMemberNicknamesChange={setShowGroupMemberNicknames}
                onUpdateRemark={onUpdateCustomerRemark}
                onUpdateTags={onUpdateCustomerTags}
                onOpenGroupMemberProfile={onOpenGroupMemberProfile}
                onOpenMessageLookup={openMessageLookupFromInfo}
                onOpenChatBackgroundSettings={onOpenChatBackgroundSettings}
                onOpenCreateGroup={onOpenCreateGroup}
                onConversationAction={handleConversationMenuAction}
                onSubmitComplaint={onSubmitConversationComplaint}
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
                chatBackgroundPreset={pcSettings.chatBackgroundPreset}
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
                showGroupMemberNicknames={showGroupMemberNicknames}
                unreadJump={unreadJump}
                isMineMessage={(message) => isMineMessage(message, session)}
                onAvatarClick={handleAvatarClick}
                onClearMessageSearch={() => setMessageSearchKeyword("")}
                onCloseMessageLookup={() => {
                  setHistoryOpen(false);
                  setMessageSearchOpen(false);
                }}
                onContactClick={handleContactCardClick}
                onContextMenu={openMessageMenu}
                onFailedMessageClick={onFailedMessageClick}
                onHistoryFilterChange={setHistoryFilter}
                onJumpToLatest={jumpToLatest}
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
                  userAvatarRegistry.resolveMessageSenderAvatar(message, activeConversation)
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
              contactCardActionPending={contactCardActionPending}
              contactCardProfile={contactCardProfile}
              contactCardProfileData={contactCardProfileData}
              contactCardProfileError={contactCardProfileError}
              contactCardProfileLoading={contactCardProfileLoading}
              contactCardRelation={contactCardRelation}
              conversationMenu={conversationMenu}
              messageMenu={messageMenu}
              messageMenuMediaStatus={messageMenuMediaStatus}
              profileStandaloneOpen={profileStandaloneOpen}
              isMineMessage={(message) => isMineMessage(message, session)}
              onAvatarProfileClose={onAvatarProfileClose}
              onContactCardAccept={onContactCardAccept}
              onContactCardBlock={onContactCardBlock}
              onContactCardClose={onContactCardClose}
              onContactCardDeleteFriend={onContactCardDeleteFriend}
              onContactCardReject={onContactCardReject}
              onContactCardSendRequest={onContactCardSendRequest}
              onContactCardStartChat={onContactCardStartChat}
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
                canMentionAll={canMentionAll}
                composerDisabled={composerDisabled}
                composerHeight={composerHeight}
                composerPlaceholder={composerDisabledReason}
                draftEditorState={
                  draftEditorStatesByConversation[activeConversation.conversationId]
                }
                groupMembers={groupMembers}
                isMessageStageNearBottom={isMessageStageNearBottom}
                messageCenterCommands={messageCenterCommands}
                messages={messages}
                multiSelectMode={multiSelectMode}
                replyTarget={replyTarget}
                composerRef={composerRef}
                screenshotShortcut={pcSettings.screenshotShortcut}
                dragUpload={pcSettings.dragUpload}
                enterToSend={pcSettings.enterToSend}
                shortcutHints={pcSettings.shortcutHints}
                selectedMessageIds={selectedMessageIds}
                showAiTools={canOpenAiAssistant}
                showKnowledgeTools={canOpenKnowledgeBase}
                getChatPanelHeight={getChatPanelHeight}
                onAiDraft={onAiDraft}
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
                onKnowledgeBase={onKnowledgeBase}
                onQuickReply={onQuickReply}
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
              sendContactCardPending={sendContactCardPending}
              forwardMessages={forwardMessages}
              forwardPending={forwardPending}
              inviteQrError={inviteQrError}
              inviteQrLoading={inviteQrLoading}
              inviteQrs={inviteQrs}
              resendMessage={resendMessage}
              resolveConversationAvatar={(conversation) =>
                resolveGroupConversationAvatar(conversation)
              }
              resolveConversationType={getImConversationType}
              resolveMessagePreview={messageActionPreview}
              userIdentity={unreadIdentity}
              onCloseComposerDialog={onCloseComposerDialog}
              onCloseForward={onCloseForward}
              onCloseResend={onCloseResend}
              onCreateDirectChat={onCreateDirectChat}
              onCreateGroupChat={onCreateGroupChat}
              onCreateInviteQr={onCreateInviteQr}
              onSendContactCard={onSendContactCard}
              onForward={onForwardToConversation}
              onResend={onResendMessage}
            />
          </>
        ) : (
          <PanelState text={selectedConversationEmptyText} />
        )}
      </main>

      {dockProfile && activeConversation && (
        <MessageProfileDock
          avatarUrl={userAvatarRegistry.resolveConversationAvatar(activeConversation)}
          contact={activeConversationContact}
          contactPickerItems={contactPickerItems}
          conversation={activeConversation}
          groupAvatar={resolveGroupConversationAvatar(
            activeConversation,
            groupMembers,
            groupAvatarSnapshotFor(activeConversation),
          )}
          groupManagement={groupManagement}
          groupMembers={groupMembers}
          loadingGroupMembers={loadingGroupMembers}
          pinned={messageProfilePinned}
          profilePaneWidth={profilePaneWidth}
          showGroupMemberNicknames={showGroupMemberNicknames}
          userIdentity={unreadIdentity}
          onDragOverContextPane={onMessageContextDragOver}
          onDragStartContextPane={onMessageContextDragStart}
          onDropContextPane={onMessageContextDrop}
          onOpenGroupMemberProfile={onOpenGroupMemberProfile}
          onOpenMessageLookup={openMessageLookupFromInfo}
          onOpenChatBackgroundSettings={onOpenChatBackgroundSettings}
          onOpenCreateGroup={onOpenCreateGroup}
          onConversationAction={handleConversationMenuAction}
          onSubmitComplaint={onSubmitConversationComplaint}
          onShowGroupMemberNicknamesChange={setShowGroupMemberNicknames}
          onTogglePin={onToggleMessageProfilePin}
          onResize={setProfilePaneWidth}
        />
      )}

      <MessageContextRail
        activeAssistantPane={activeAssistantPane}
        conversation={activeConversation}
        isGroup={activeConversationIsGroup}
        profileOpen={dockProfile || profileStandaloneOpen}
        showAiTools={canOpenAiAssistant}
        onToggleAssistantPane={(pane) => {
          if (pane === "aiDraft") {
            if (!canOpenAiAssistant) return;
            onAiDraft();
            return;
          }
          if (pane === "knowledge") {
            onKnowledgeBase();
            return;
          }
          onQuickReply();
        }}
        onToggleProfile={toggleProfileFromRail}
      />
    </>
  );
}

function readCustomerHeaderApplicationName(profile?: StandaloneProfileProps["profile"]) {
  return profileValue(profile, [
    "appDisplayName",
    "app_display_name",
    "appName",
    "app_name",
    "tenantAppName",
    "tenant_app_name",
    "brandName",
    "brand_name",
    "packageName",
    "package_name",
  ]);
}

function readCustomerHeaderSource(
  profile?: StandaloneProfileProps["profile"],
  profileExtra?: StandaloneProfileProps["profileExtra"],
) {
  return firstKnownHeaderValue(
    [
      profileExtra?.source,
      profileValue(profile, [
        "sourceChannel",
        "source_channel",
        "entryChannel",
        "entry_channel",
        "channel",
        "source",
        "from",
        "platform",
        "provider",
      ]),
    ],
  );
}

function profileValue(
  profile: StandaloneProfileProps["profile"] | undefined,
  keys: string[],
  excludedValues = new Set<string>(),
) {
  if (!profile) return undefined;
  const record = profile as Record<string, unknown>;
  for (const key of keys) {
    const text = headerTextValue(record[key]);
    if (text && !excludedValues.has(text)) return text;
  }
  return undefined;
}

function firstKnownHeaderValue(values: unknown[], excludedValues = new Set<string>()) {
  for (const value of values) {
    const text = headerTextValue(value);
    if (text && !excludedValues.has(text)) return text;
  }
  return undefined;
}

function headerTextValue(value: unknown) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : undefined;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return isKnown(text) ? text : undefined;
}

function readGroupMemberNicknamePrefs() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(groupMemberNicknamePrefsKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"),
    );
  } catch {
    return {};
  }
}

function writeGroupMemberNicknamePrefs(prefs: Record<string, boolean>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(groupMemberNicknamePrefsKey, JSON.stringify(prefs));
  } catch {
    // localStorage can be unavailable in hardened environments; keep the in-memory toggle usable.
  }
}
