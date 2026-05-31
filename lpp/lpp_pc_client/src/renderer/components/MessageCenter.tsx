import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";
import type {
  ConversationListItem,
  MessageItemDto,
} from "../data/api-client";
import type { CurrentUserIdentity } from "../data/message-display";
import { pcQueryKeys } from "../data/query-keys";
import { requireApiClient } from "../data/runtime";
import { useAuthSession } from "../data/auth/auth-store";
import { failedMessageRetryAction } from "../data/message/message-retry-model";
import {
  useClearPendingImRead,
  useImPeerReadReceipts,
  useImReadStateByConversation,
  useLocalImConversationReads,
  useMarkImConversationReadLocally,
  useMarkImPeerReadReceipt,
  useUpsertImReadState,
} from "../data/im-read/im-read-store";
import { useDismissRealtimeRemindersForTarget } from "../data/reminder/reminder-store";
import { usePcSettings } from "../data/settings/settings-store";
import {
  useActiveImConversationId,
  useListPaneWidth,
  useMessageConversationFilter,
  useMessageLayoutMode,
  useMessageProfileVisible,
  useProfilePaneWidth,
  useSetActiveImConversation,
  useSetActiveModule,
  useSetContactFilter,
  useSetListPaneWidth,
  useSetMessageConversationFilter,
  useSetMessageLayoutMode,
  useSetMessageProfileVisible,
  useSetProfilePaneWidth,
} from "../data/workspace-ui/workspace-ui-store";
import { useWechatBottomFollow } from "../lib/useWechatBottomFollow";
import { MessageConversationSidebar } from "../messages/components/MessageConversationSidebar";
import { MessageCenterConversationStage } from "../messages/components/MessageCenterConversationStage";
import { useActiveImConversationQueries } from "../messages/hooks/useActiveImConversationQueries";
import { useGroupAvatarSnapshots } from "../messages/hooks/useGroupAvatarSnapshots";
import { useMediaUploadTaskRegistry } from "../messages/hooks/useMediaUploadTaskRegistry";
import { useMessageMenuActionController } from "../messages/hooks/useMessageMenuActionController";
import { useMessageMediaSendController } from "../messages/hooks/useMessageMediaSendController";
import { useMessageTextSendController } from "../messages/hooks/useMessageTextSendController";
import { useMessageStartConversationController } from "../messages/hooks/useMessageStartConversationController";
import { useMessageActionMutations } from "../messages/hooks/useMessageActionMutations";
import { useImReadCommandExecutor } from "../messages/hooks/useImReadCommandExecutor";
import { useMessageUnreadJumpController } from "../messages/hooks/useMessageUnreadJumpController";
import { useMessageMenuMediaStatus } from "../messages/hooks/useMessageMenuMediaStatus";
import { useMessageCenterPageEffects } from "../messages/hooks/useMessageCenterPageEffects";
import { useDirectReadReceiptSync } from "../messages/hooks/useDirectReadReceiptSync";
import { useMessageInteractionHandlers } from "../messages/hooks/useMessageInteractionHandlers";
import { useMessageListData } from "../messages/hooks/useMessageListData";
import { useImSendOutboxRestore } from "../messages/hooks/useImSendOutboxRestore";
import { useMessageAuxiliaryData } from "../messages/hooks/useMessageAuxiliaryData";
import { useMessageConversationSelection } from "../messages/hooks/useMessageConversationSelection";
import { useMessageListScrollRegistry } from "../messages/hooks/useMessageListScrollRegistry";
import { useMessageContactPickerData } from "../messages/hooks/useMessageContactPickerData";
import {
  getImConversationType,
  useMessageCenterViewModel,
} from "../messages/hooks/useMessageCenterViewModel";
import {
  groupCompositeAvatarAllowed,
  groupCompositeAvatarCells,
} from "../messages/models/groupAvatarModel";
import type { ReplyTarget } from "../messages/models/messageComposerModel";
import {
  contactCardActionErrorText,
  normalizeContactCard,
  resolveContactCardRelation,
  type NormalizedContactCard,
} from "../messages/models/contactCardModel";
import { clampComposerHeight } from "../messages/models/messageComposerLayoutModel";
import {
  buildGroupMemberMap,
  isMineMessage,
  type AvatarProfilePopoverState,
  type UnreadJumpState,
} from "../messages/models/messageDisplayModel";
import type { HistoryFilterKey } from "../messages/models/messageListModel";
import { useMessageCenterCommandModel } from "../messages/hooks/useMessageCenterCommandModel";
import { useMessageResponsiveLayout } from "../messages/hooks/useMessageResponsiveLayout";
import { useSerialTaskQueue } from "../messages/hooks/useSerialTaskQueue";
import { useWindowDismiss } from "../messages/hooks/useWindowDismiss";
import { requestMessageDangerConfirmation } from "../messages/runtime/messageConfirm";

type MessageMenuState = {
  message: MessageItemDto;
  x: number;
  y: number;
} | null;

type ConversationMenuState = {
  conversation: ConversationListItem;
  x: number;
  y: number;
} | null;

export function MessageCenter() {
  const session = useAuthSession();
  const activeConversationId = useActiveImConversationId();
  const setActiveConversation = useSetActiveImConversation();
  const locallyReadConversationReads = useLocalImConversationReads();
  const imPeerReadReceipts = useImPeerReadReceipts();
  const imReadStateByConversation = useImReadStateByConversation();
  const markConversationReadLocally = useMarkImConversationReadLocally();
  const markImPeerReadReceipt = useMarkImPeerReadReceipt();
  const upsertImReadState = useUpsertImReadState();
  const clearPendingImRead = useClearPendingImRead();
  const dismissRealtimeRemindersForTarget = useDismissRealtimeRemindersForTarget();
  const messageFilter = useMessageConversationFilter();
  const setMessageFilter = useSetMessageConversationFilter();
  const pcSettings = usePcSettings();
  const listPaneWidth = useListPaneWidth();
  const profilePaneWidth = useProfilePaneWidth();
  const setListPaneWidth = useSetListPaneWidth();
  const setProfilePaneWidth = useSetProfilePaneWidth();
  const messageProfileVisible = useMessageProfileVisible();
  const setMessageProfileVisible = useSetMessageProfileVisible();
  const messageLayoutMode = useMessageLayoutMode();
  const setMessageLayoutMode = useSetMessageLayoutMode();
  const setActiveModule = useSetActiveModule();
  const setContactFilter = useSetContactFilter();
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [messageSearchOpen, setMessageSearchOpen] = useState(false);
  const [messageSearchKeyword, setMessageSearchKeyword] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilterKey>("all");
  const [notice, setNotice] = useState<string | null>(null);
  const [messageMenu, setMessageMenu] = useState<MessageMenuState>(null);
  const [conversationMenu, setConversationMenu] = useState<ConversationMenuState>(null);
  const [avatarProfilePopover, setAvatarProfilePopover] =
    useState<AvatarProfilePopoverState | null>(null);
  const [contactCardProfile, setContactCardProfile] =
    useState<NormalizedContactCard | null>(null);
  const [localOutgoingContactRequestIds, setLocalOutgoingContactRequestIds] =
    useState<Set<string>>(() => new Set());
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [replyTarget, setReplyTarget] = useState<ReplyTarget>(null);
  const [composerHeight, setComposerHeight] = useState(220);
  const [forwardTargetMessages, setForwardTargetMessages] = useState<MessageItemDto[]>([]);
  const [resendConfirmMessage, setResendConfirmMessage] =
    useState<MessageItemDto | null>(null);
  const [conversationDrawerOpen, setConversationDrawerOpen] = useState(false);
  const [profileStandaloneOpen, setProfileStandaloneOpen] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [composerDialog, setComposerDialog] = useState<"direct" | "group" | "qr" | "card" | null>(null);
  const [unreadJump, setUnreadJump] = useState<UnreadJumpState | null>(null);
  const [messageAnnotations, setMessageAnnotations] = useState<
    Record<string, string>
  >({});
  const [draftsByConversation, setDraftsByConversation] = useState<Record<string, string>>({});
  const [draftPreviewsByConversation, setDraftPreviewsByConversation] = useState<Record<string, string>>({});
  const [draftEditorStatesByConversation, setDraftEditorStatesByConversation] =
    useState<Record<string, string>>({});
  const [localOutgoingMessagesByConversation, setLocalOutgoingMessagesByConversation] =
    useState<Record<string, MessageItemDto[]>>({});
  const [localHiddenConversationIds, setLocalHiddenConversationIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [localMutedConversationIds, setLocalMutedConversationIds] = useState<Set<string>>(
    () => new Set(),
  );
  const chatPanelRef = useRef<HTMLElement | null>(null);
  const localImagePreviewByMessageIdRef = useRef(new Map<string, string>());
  const mediaUploadTasks = useMediaUploadTaskRegistry();
  const messageListScrollRegistry = useMessageListScrollRegistry();
  const enqueueOutgoingTask = useSerialTaskQueue();
  const getChatPanelHeight = useCallback(
    () => chatPanelRef.current?.getBoundingClientRect().height ?? null,
    [],
  );
  useMessageResponsiveLayout({
    chatPanelRef,
    listPaneWidth,
    messageLayoutMode,
    profilePaneWidth,
    setConversationDrawerOpen,
    setMessageLayoutMode,
    setProfileStandaloneOpen,
  });

  const conversationsQuery = useQuery({
    queryKey: pcQueryKeys.imConversations(session?.apiBaseUrl, session?.tenantToken),
    enabled: Boolean(session),
    queryFn: async () => requireApiClient(session).getConversations({ limit: 100 }),
    gcTime: 30 * 60_000,
    refetchInterval: 5_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    staleTime: 2 * 60_000,
  });

  const {
    activeConversation,
    activeConversationIsGroup,
    activeConversationKey,
    activeConversationReadState,
    activeConversationType,
    conversations,
    unreadIdentity,
    visibleConversations,
  } = useMessageConversationSelection({
    activeConversationId,
    conversationItems: conversationsQuery.data?.items ?? [],
    imReadStateByConversation,
    keyword,
    localHiddenConversationIds,
    localMutedConversationIds,
    locallyReadConversationReads,
    messageFilter,
    session,
  });
  useMessageCenterPageEffects({
    activeConversation,
    activeConversationType,
    chatPanelRef,
    clampComposerHeight,
    localImagePreviewByMessageIdRef,
    notice,
    setAvatarProfilePopover,
    setComposerHeight,
    setConversationDrawerOpen,
    setConversationMenu,
    setForwardTargetMessages,
    setMessageMenu,
    setNotice,
    setProfileStandaloneOpen,
    setReplyTarget,
    setUnreadJump,
    visibleConversationCount: visibleConversations.length,
  });

  const {
    directReadStatusQuery,
    groupMembersQuery,
    messagesQuery,
  } = useActiveImConversationQueries({
    activeConversation,
    activeConversationType,
    session,
  });
  const groupMemberMap = useMemo(
    () => buildGroupMemberMap(groupMembersQuery.data ?? []),
    [groupMembersQuery.data],
  );
  const { groupAvatarSnapshotFor } = useGroupAvatarSnapshots({
    activeConversation,
    activeConversationType,
    activeGroupMembers: groupMembersQuery.data,
    getConversationType: getImConversationType,
    groupCompositeAvatarAllowed,
    groupCompositeAvatarCells,
    session,
    visibleConversations,
  });
  const {
    contactPickerItems,
    friendsQuery,
    inviteQrsQuery,
  } = useMessageContactPickerData(session, composerDialog);
  const friendRequestsQuery = useQuery({
    queryKey: ["pc-friend-requests", session?.apiBaseUrl, session?.tenantToken],
    enabled: Boolean(session),
    queryFn: async () => requireApiClient(session).getFriendRequests(),
    staleTime: 30_000,
  });
  const contactCardProfileQuery = useQuery({
    queryKey: [
      "pc-user-profile",
      session?.apiBaseUrl,
      session?.tenantToken,
      contactCardProfile?.userId ?? "",
    ],
    enabled: Boolean(session && contactCardProfile?.userId),
    queryFn: async () => requireApiClient(session).getUserProfile(contactCardProfile!.userId),
    retry: false,
    staleTime: 60_000,
  });
  const contactCardRelation = useMemo(() => {
    if (!contactCardProfile) return undefined;
    const relation = resolveContactCardRelation({
      card: contactCardProfile,
      friends: friendsQuery.data ?? [],
      requests: friendRequestsQuery.data ?? [],
      session,
    });
    if (
      relation.status === "none" &&
      localOutgoingContactRequestIds.has(contactCardProfile.userId)
    ) {
      return { status: "outgoingPending" as const, requestId: "local" };
    }
    return relation;
  }, [
    contactCardProfile,
    friendRequestsQuery.data,
    friendsQuery.data,
    localOutgoingContactRequestIds,
    session,
  ]);

  const {
    createDirectChatMutation,
    createGroupChatMutation,
    createInviteQrMutation,
  } = useMessageStartConversationController({
    queryClient,
    session,
    setActiveConversation,
    setComposerDialog,
    setNotice,
  });
  const refreshContactRelation = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["pc-friends"] }),
      queryClient.invalidateQueries({ queryKey: ["pc-friend-requests"] }),
      queryClient.invalidateQueries({
        queryKey: pcQueryKeys.accountBlocklist(session?.apiBaseUrl, session?.tenantToken),
      }),
      queryClient.invalidateQueries({ queryKey: ["pc-im-conversations"] }),
      queryClient.invalidateQueries({ queryKey: ["pc-user-profile"] }),
    ]);
  }, [queryClient, session?.apiBaseUrl, session?.tenantToken]);
  const sendFriendRequestMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!contactCardProfile?.userId) throw new Error("名片缺少用户 ID");
      return requireApiClient(session).sendFriendRequest(contactCardProfile.userId, message);
    },
    onSuccess: async () => {
      const targetUserId = contactCardProfile?.userId;
      if (targetUserId) {
        setLocalOutgoingContactRequestIds((current) => new Set(current).add(targetUserId));
      }
      setNotice("好友申请已发送");
      await refreshContactRelation();
    },
    onError: (error) => setNotice(contactCardActionErrorText(error, "发送好友申请失败")),
  });
  const handleFriendRequestMutation = useMutation({
    mutationFn: async (payload: { action: "accept" | "reject"; requestId: string }) =>
      requireApiClient(session).handleFriendRequest(payload.requestId, payload.action),
    onSuccess: async (_result, payload) => {
      setNotice(payload.action === "accept" ? "已通过好友申请" : "已拒绝好友申请");
      await refreshContactRelation();
    },
    onError: (error) => setNotice(contactCardActionErrorText(error, "处理好友申请失败")),
  });
  const deleteFriendMutation = useMutation({
    mutationFn: async (friendUserId: string) =>
      requireApiClient(session).deleteFriend(friendUserId),
    onSuccess: async () => {
      setNotice("已删除好友");
      await refreshContactRelation();
    },
    onError: (error) => setNotice(contactCardActionErrorText(error, "删除好友失败")),
  });
  const blockUserMutation = useMutation({
    mutationFn: async (userId: string) => requireApiClient(session).blockUser(userId),
    onSuccess: async () => {
      setNotice("已加入黑名单");
      setContactCardProfile(null);
      await refreshContactRelation();
    },
    onError: (error) => setNotice(contactCardActionErrorText(error, "加入黑名单失败")),
  });

  const {
    deleteMutation,
    favoriteMutation,
    forwardMutation,
    recallMutation,
    translateMutation,
    voiceToTextMutation,
  } = useMessageActionMutations({
    activeConversation,
    conversations,
    queryClient,
    session,
    setForwardTargetMessages,
    setMessageAnnotations,
    setMultiSelectMode,
    setNotice,
    setSelectedMessageIds,
  });

  const { historyCounts, messages, visibleMessages } = useMessageListData({
    activeConversation,
    activeConversationKey,
    activeConversationType,
    historyFilter,
    historyOpen,
    imPeerReadReceipts,
    localImagePreviewByMessageIdRef,
    localOutgoingMessagesByConversation,
    messageSearchKeyword,
    messageSearchOpen,
    serverMessages: messagesQuery.data ?? [],
    unreadIdentity,
  });
  useImSendOutboxRestore({
    activeConversation,
    activeConversationType,
    localImagePreviewByMessageIdRef,
    mediaUploadTasks,
    session,
    setLocalOutgoingMessagesByConversation,
  });
  useImReadCommandExecutor({
    activeConversation,
    activeConversationId,
    activeConversationType,
    clearPendingImRead,
    conversationItems: conversationsQuery.data?.items ?? [],
    dismissRealtimeRemindersForTarget,
    markConversationReadLocally,
    messages,
    queryClient,
    session,
    setNotice,
    setUnreadJump,
    unreadIdentity,
    upsertImReadState,
  });
  const { groupMembersByConversation } = useMessageAuxiliaryData({
    activeConversation,
    activeConversationType,
    groupMembers: groupMembersQuery.data ?? [],
    messages,
    session,
  });
  const messageCenterViewModel = useMessageCenterViewModel({
    activeConversationId,
    conversationListError: conversationsQuery.error,
    conversationListLoading: conversationsQuery.isLoading,
    conversations,
    draftsByConversation,
    friends: friendsQuery.data ?? [],
    groupMembers: groupMembersQuery.data ?? [],
    imReadStateByConversation,
    keyword,
    messageSearchKeyword,
    messagesError: messagesQuery.error,
    messagesLoading: messagesQuery.isLoading,
    unreadIdentity,
    visibleConversations,
    visibleMessagesLength: visibleMessages.length,
  });
  const {
    activeConversationContact,
    activeConversationDraft,
    activeConversationHeaderTitle,
    conversationList,
    counts,
    errorText,
    messageList,
    selectedConversationEmptyText,
  } = messageCenterViewModel;
  const {
    bottomRef: messagesBottomRef,
    handleScroll: handleMessageStageScroll,
    isNearBottom: isMessageStageNearBottom,
    jumpToLatest,
    pendingNewMessageCount,
    scrollToBottom: scrollMessagesToBottom,
    stageRef: messageStageRef,
  } = useWechatBottomFollow({
    conversationKey: activeConversation?.conversationId,
    isMineMessage: (message: MessageItemDto) => isMineMessage(message, session),
    messageKey: (message: MessageItemDto) =>
      message.messageId ||
      `${message.conversationSeq ?? ""}-${message.sentAt ?? ""}-${message.preview ?? ""}`,
    messages,
  });
  const {
    retryTextMessage,
    sendContactCardOptimistically,
    sendTextOptimistically,
  } = useMessageTextSendController({
    activeConversation,
    activeConversationType,
    enqueueOutgoingTask,
    groupMembers: groupMembersQuery.data ?? [],
    queryClient,
    replyTarget,
    scrollMessagesToBottom,
    session,
    setLocalOutgoingMessagesByConversation,
    setReplyTarget,
  });
  const { handleUploadAction, sendMediaOptimistically } =
    useMessageMediaSendController({
      activeConversation,
      activeConversationType,
      localImagePreviewByMessageIdRef,
      mediaUploadTasks,
      queryClient,
      replyTarget,
      scrollMessagesToBottom,
      session,
      setLocalOutgoingMessagesByConversation,
      setReplyTarget,
    });
  useDirectReadReceiptSync({
    activeConversation,
    activeConversationType,
    directReadStatus: directReadStatusQuery.data,
    markImPeerReadReceipt,
    queryClient,
    unreadIdentity,
    upsertImReadState,
  });
  useWindowDismiss(Boolean(messageMenu), () => setMessageMenu(null));
  useWindowDismiss(plusMenuOpen, () => setPlusMenuOpen(false), { keyboard: "escape" });

  const messageMenuMediaStatus = useMessageMenuMediaStatus({
    activeConversationId: activeConversation?.conversationId,
    message: messageMenu?.message,
    session,
  });

  useWindowDismiss(Boolean(conversationMenu), () => setConversationMenu(null));
  useWindowDismiss(Boolean(avatarProfilePopover), () => setAvatarProfilePopover(null));
  useWindowDismiss(Boolean(contactCardProfile), () => setContactCardProfile(null));

  const {
    handleAvatarClick,
    handleBatchDeleteSelected,
    handleContactCardClick,
    handleConversationMenuAction,
    openConversationMenu,
    openMessageMenu,
    scrollToMessage,
  } = useMessageInteractionHandlers({
    activeConversation,
    activeConversationId,
    deleteMessage: deleteMutation.mutateAsync,
    groupMemberMap,
    messageListScrollRegistry,
    selectedMessageIds,
    session,
    setActiveConversation,
    setAvatarProfilePopover,
    setContactCardProfile,
    setConversationMenu,
    setLocalHiddenConversationIds,
    setLocalMutedConversationIds,
    setMessageMenu,
    setMultiSelectMode,
    setNotice,
    setSelectedMessageIds,
  });

  const handleMenuAction = useMessageMenuActionController({
    activeConversation,
    deleteMessage: deleteMutation.mutate,
    favoriteMessage: favoriteMutation.mutate,
    recallMessage: recallMutation.mutate,
    session,
    setActiveModule,
    setForwardTargetMessages,
    setMessageAnnotations,
    setMessageMenu,
    setMultiSelectMode,
    setNotice,
    setReplyTarget,
    setSelectedMessageIds,
    translateMessage: translateMutation.mutate,
    voiceToTextMessage: voiceToTextMutation.mutate,
  });

  const { handleUnreadJump, openConversationFromUserClick } =
    useMessageUnreadJumpController({
      activeConversation,
      activeConversationId,
      messageListScrollRegistry,
      messageSearchOpen,
      messages,
      queryClient,
      session,
      setActiveConversation,
      setConversationDrawerOpen,
      setMessageSearchKeyword,
      setMessageSearchOpen,
      setNotice,
      setUnreadJump,
      unreadIdentity,
      unreadJump,
    });

  const messageCenterCommands = useMessageCenterCommandModel({
    deleteSelectedMessages: handleBatchDeleteSelected,
    menuAction: handleMenuAction,
    openContactCardPicker: () => setComposerDialog("card"),
    sendContactCard: sendContactCardOptimistically,
    sendMedia: sendMediaOptimistically,
    sendText: sendTextOptimistically,
    unreadJump: handleUnreadJump,
    uploadAction: handleUploadAction,
  });

  const handleConfirmResendMessage = useCallback(() => {
    const message = resendConfirmMessage;
    if (!message) return;
    const action = failedMessageRetryAction(message);
    setResendConfirmMessage(null);
    if (!action) {
      setNotice("该消息暂时无法重发");
      return;
    }
    if (action.type === "upload") {
      messageCenterCommands.uploadAction(action.localTaskId, "retry");
      return;
    }
    try {
      retryTextMessage(message);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "该消息暂时无法重发");
    }
  }, [messageCenterCommands, resendConfirmMessage, retryTextMessage]);

  const dockProfile = messageProfileVisible && messageLayoutMode === "full";

  return (
    <>
      <MessageConversationSidebar
        activeConversation={activeConversation}
        activeGroupMembers={groupMembersQuery.data}
        conversationDrawerOpen={conversationDrawerOpen}
        conversationFilter={messageFilter}
        draftsByConversation={{
          ...draftsByConversation,
          ...draftPreviewsByConversation,
        }}
        emptyText={conversationList.emptyText}
        errorText={errorText}
        groupAvatarSnapshotFor={groupAvatarSnapshotFor}
        groupMembersByConversation={groupMembersByConversation}
        keyword={keyword}
        listPaneWidth={listPaneWidth}
        loading={conversationList.loading}
        plusMenuOpen={plusMenuOpen}
        unreadCount={counts.unread}
        unreadIdentity={unreadIdentity as CurrentUserIdentity}
        visibleConversations={visibleConversations}
        onConversationClick={openConversationFromUserClick}
        onConversationContextMenu={openConversationMenu}
        setActiveModule={setActiveModule}
        setComposerDialog={setComposerDialog}
        setContactFilter={setContactFilter}
        setConversationFilter={setMessageFilter}
        setKeyword={setKeyword}
        setListPaneWidth={setListPaneWidth}
        setPlusMenuOpen={setPlusMenuOpen}
      />

      <MessageCenterConversationStage
        activeConversation={activeConversation}
        activeConversationContact={activeConversationContact}
        activeConversationDraft={activeConversationDraft}
        activeConversationHeaderTitle={activeConversationHeaderTitle}
        activeConversationIsGroup={activeConversationIsGroup}
        activeConversationReadState={activeConversationReadState}
        activeConversationType={activeConversationType}
        avatarProfilePopover={avatarProfilePopover}
        contactCardActionPending={
          sendFriendRequestMutation.isPending ||
          handleFriendRequestMutation.isPending ||
          deleteFriendMutation.isPending ||
          blockUserMutation.isPending
        }
        contactCardProfile={contactCardProfile}
        contactCardProfileData={contactCardProfileQuery.data}
        contactCardProfileError={contactCardProfileQuery.error}
        contactCardProfileLoading={contactCardProfileQuery.isLoading}
        contactCardRelation={contactCardRelation}
        chatPanelRef={chatPanelRef}
        composerDialog={composerDialog}
        composerHeight={composerHeight}
        contactPickerItems={contactPickerItems}
        conversationMenu={conversationMenu}
        conversations={conversations}
        createDirectPending={createDirectChatMutation.isPending}
        createGroupPending={createGroupChatMutation.isPending}
        createInviteQrPending={createInviteQrMutation.isPending}
        dockProfile={dockProfile}
        draftEditorStatesByConversation={draftEditorStatesByConversation}
        forwardMessages={forwardTargetMessages}
        forwardPending={forwardMutation.isPending}
        getChatPanelHeight={getChatPanelHeight}
        groupAvatarSnapshotFor={groupAvatarSnapshotFor}
        groupMemberMap={groupMemberMap}
        groupMembers={groupMembersQuery.data ?? []}
        handleAvatarClick={handleAvatarClick}
        handleContactCardClick={handleContactCardClick}
        handleConversationMenuAction={handleConversationMenuAction}
        handleMessageStageScroll={handleMessageStageScroll}
        historyCounts={historyCounts}
        historyFilter={historyFilter}
        historyOpen={historyOpen}
        inviteQrError={inviteQrsQuery.error}
        inviteQrLoading={inviteQrsQuery.isLoading}
        inviteQrs={inviteQrsQuery.data ?? []}
        isMessageStageNearBottom={isMessageStageNearBottom}
        jumpToLatest={jumpToLatest}
        loadingGroupMembers={groupMembersQuery.isLoading}
        messageAnnotations={messageAnnotations}
        messageCenterCommands={messageCenterCommands}
        messageLayoutMode={messageLayoutMode}
        messageList={messageList}
        messageMenu={messageMenu}
        messageMenuMediaStatus={messageMenuMediaStatus}
        messageProfileVisible={messageProfileVisible}
        messageSearchKeyword={messageSearchKeyword}
        messageSearchOpen={messageSearchOpen}
        messageStageRef={messageStageRef}
        messages={messages}
        messagesBottomRef={messagesBottomRef}
        multiSelectMode={multiSelectMode}
        notice={notice}
        onAvatarProfileClose={() => setAvatarProfilePopover(null)}
        onContactCardAccept={() => {
          if (contactCardRelation?.status !== "incomingPending") return;
          handleFriendRequestMutation.mutate({
            action: "accept",
            requestId: contactCardRelation.requestId,
          });
        }}
        onContactCardBlock={() => {
          if (!contactCardProfile?.userId) return;
          if (!requestMessageDangerConfirmation({ action: "block-user" })) {
            return;
          }
          blockUserMutation.mutate(contactCardProfile.userId);
        }}
        onContactCardClose={() => setContactCardProfile(null)}
        onContactCardDeleteFriend={() => {
          if (contactCardRelation?.status !== "friend") return;
          if (!requestMessageDangerConfirmation({ action: "delete-friend" })) return;
          deleteFriendMutation.mutate(contactCardRelation.friendUserId);
        }}
        onContactCardReject={() => {
          if (contactCardRelation?.status !== "incomingPending") return;
          handleFriendRequestMutation.mutate({
            action: "reject",
            requestId: contactCardRelation.requestId,
          });
        }}
        onContactCardSendRequest={(message) => sendFriendRequestMutation.mutate(message)}
        onContactCardStartChat={() => {
          if (!contactCardProfile?.userId) return;
          setContactCardProfile(null);
          createDirectChatMutation.mutate(contactCardProfile.userId);
        }}
        onCloseComposerDialog={() => setComposerDialog(null)}
        onCloseForward={() => setForwardTargetMessages([])}
        onCloseResend={() => setResendConfirmMessage(null)}
        onCreateDirectChat={(userId) => createDirectChatMutation.mutate(userId)}
        onCreateGroupChat={(payload) => createGroupChatMutation.mutate(payload)}
        onCreateInviteQr={() => createInviteQrMutation.mutate()}
        onSendContactCard={(contact) => {
          messageCenterCommands.sendContactCard(
            normalizeContactCard({
              userId: contact.id,
              displayName: contact.name,
              avatarUrl: contact.avatarUrl,
            }),
          );
          setComposerDialog(null);
        }}
        onFailedMessageClick={setResendConfirmMessage}
        onForwardToConversation={(targetConversationId) =>
          forwardMutation.mutate({
            messages: forwardTargetMessages,
            targetConversationId,
          })
        }
        onResendMessage={handleConfirmResendMessage}
        onMessageElementRef={messageListScrollRegistry.registerMessageElement}
        openMessageMenu={openMessageMenu}
        pcSettings={pcSettings}
        pendingNewMessageCount={pendingNewMessageCount}
        profilePaneWidth={profilePaneWidth}
        profileStandaloneOpen={profileStandaloneOpen}
        replyTarget={replyTarget}
        scrollMessagesToBottom={scrollMessagesToBottom}
        scrollToMessage={scrollToMessage}
        selectedConversationEmptyText={selectedConversationEmptyText}
        selectedMessageIds={selectedMessageIds}
        session={session}
        resendMessage={resendConfirmMessage}
        setActiveModule={setActiveModule}
        setComposerHeight={setComposerHeight}
        setConversationDrawerOpen={setConversationDrawerOpen}
        setDraftEditorStatesByConversation={setDraftEditorStatesByConversation}
        setDraftPreviewsByConversation={setDraftPreviewsByConversation}
        setDraftsByConversation={setDraftsByConversation}
        setForwardTargetMessages={setForwardTargetMessages}
        setHistoryFilter={setHistoryFilter}
        setHistoryOpen={setHistoryOpen}
        setMessageProfileVisible={setMessageProfileVisible}
        setMessageSearchKeyword={setMessageSearchKeyword}
        setMessageSearchOpen={setMessageSearchOpen}
        setMultiSelectMode={setMultiSelectMode}
        setProfilePaneWidth={setProfilePaneWidth}
        setProfileStandaloneOpen={setProfileStandaloneOpen}
        setReplyTarget={setReplyTarget}
        setSelectedMessageIds={setSelectedMessageIds}
        unreadIdentity={unreadIdentity}
        unreadJump={unreadJump}
        visibleMessages={visibleMessages}
      />
    </>
  );
}
