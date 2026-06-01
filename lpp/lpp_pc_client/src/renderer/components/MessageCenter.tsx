import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import { GripVertical } from "lucide-react";
import type {
  ConversationListItem,
  KnowledgeInsertPayload,
  MessageItemDto,
  QuickReplyInsertPayload,
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
  derivePcWorkspaceAccess,
  isModuleVisibleForAccess,
} from "../data/workspace-access";
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
import { useMessageContactProfileController } from "../messages/hooks/useMessageContactProfileController";
import {
  useMessageGroupManagement,
  type GroupFileFilter,
} from "../messages/hooks/useMessageGroupManagement";
import {
  getImConversationType,
  useMessageCenterViewModel,
} from "../messages/hooks/useMessageCenterViewModel";
import {
  groupCompositeAvatarAllowed,
  groupCompositeAvatarCells,
} from "../messages/models/groupAvatarModel";
import { buildUserAvatarRegistry } from "../messages/models/userAvatarRegistry";
import type { ReplyTarget } from "../messages/models/messageComposerModel";
import {
  contactCardActionErrorText,
  normalizeContactCard,
  type AnchoredContactCardProfile,
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
import {
  calculateMessageResizeWidth,
  useMessageResponsiveLayout,
} from "../messages/hooks/useMessageResponsiveLayout";
import { useSerialTaskQueue } from "../messages/hooks/useSerialTaskQueue";
import { useWindowDismiss } from "../messages/hooks/useWindowDismiss";
import { requestMessageDangerConfirmation } from "../messages/runtime/messageConfirm";
import { useContactAddFriendController } from "../contacts/hooks/useContactAddFriendController";
import { ContactAddFriendDialog } from "./ContactAddFriendDialog";
import { CustomerServiceKnowledgePanel } from "../customer-service/components/CustomerServiceKnowledgeDrawer";
import { CustomerServiceQuickReplyPanel } from "../customer-service/components/CustomerServiceQuickReplyDrawer";
import type { MessageComposerHandle } from "./MessageComposer";

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

type MessageAssistantPane = "knowledge" | "quickReply" | null;
type MessageContextPaneOrder = "assistant" | "profile";
const messageProfilePinStorageKey = "lpp_pc_message_profile_pinned";
const messageContextOrderStorageKey = "lpp_pc_message_context_order";

function messageAssistantPaneLabel(pane: Exclude<MessageAssistantPane, null>) {
  if (pane === "quickReply") return "快捷话术";
  return "知识库";
}

function readMessageContextOrder(): MessageContextPaneOrder[] {
  if (typeof window === "undefined") return ["assistant", "profile"];
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(messageContextOrderStorageKey) ?? "[]",
    );
    if (
      Array.isArray(parsed) &&
      parsed.length === 2 &&
      parsed.includes("assistant") &&
      parsed.includes("profile")
    ) {
      return parsed as MessageContextPaneOrder[];
    }
  } catch {
    // Ignore invalid persisted layout and fall back to default order.
  }
  return ["assistant", "profile"];
}

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
  const workspaceAccess = derivePcWorkspaceAccess(session);
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
  const [groupFileFilter, setGroupFileFilter] = useState<GroupFileFilter>("all");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilterKey>("all");
  const [notice, setNotice] = useState<string | null>(null);
  const [messageMenu, setMessageMenu] = useState<MessageMenuState>(null);
  const [assistantPane, setAssistantPane] = useState<MessageAssistantPane>(null);
  const [messageProfilePinned, setMessageProfilePinned] = useState(
    () =>
      typeof window !== "undefined" &&
      window.localStorage.getItem(messageProfilePinStorageKey) === "1",
  );
  const [messageContextPaneOrder, setMessageContextPaneOrder] = useState<
    MessageContextPaneOrder[]
  >(readMessageContextOrder);
  const [conversationMenu, setConversationMenu] = useState<ConversationMenuState>(null);
  const [avatarProfilePopover, setAvatarProfilePopover] =
    useState<AvatarProfilePopoverState | null>(null);
  const [contactCardProfile, setContactCardProfile] =
    useState<AnchoredContactCardProfile | null>(null);
  const [contactCardSendPending, setContactCardSendPending] = useState(false);
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
  const [addFriendDialogOpen, setAddFriendDialogOpen] = useState(false);
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
  const composerRef = useRef<MessageComposerHandle | null>(null);
  const localImagePreviewByMessageIdRef = useRef(new Map<string, string>());
  const mediaUploadTasks = useMediaUploadTaskRegistry();
  const messageListScrollRegistry = useMessageListScrollRegistry();
  const enqueueOutgoingTask = useSerialTaskQueue();
  const getChatPanelHeight = useCallback(
    () => chatPanelRef.current?.getBoundingClientRect().height ?? null,
    [],
  );
  useMessageResponsiveLayout({
    assistantPaneOpen: Boolean(assistantPane),
    chatPanelRef,
    listPaneWidth,
    messageLayoutMode,
    profilePaneWidth,
    setConversationDrawerOpen,
    setMessageLayoutMode,
    setProfileStandaloneOpen,
  });
  useEffect(() => {
    window.localStorage.setItem(
      messageProfilePinStorageKey,
      messageProfilePinned ? "1" : "0",
    );
  }, [messageProfilePinned]);
  useEffect(() => {
    window.localStorage.setItem(
      messageContextOrderStorageKey,
      JSON.stringify(messageContextPaneOrder),
    );
  }, [messageContextPaneOrder]);

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
  const groupManagement = useMessageGroupManagement({
    activeConversation,
    fileFilter: groupFileFilter,
    groupMembers: groupMembersQuery.data ?? [],
    queryClient,
    session,
    setFileFilter: setGroupFileFilter,
    setNotice,
  });
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
    tenantMembersQuery,
  } = useMessageContactPickerData(session, composerDialog);
  const addFriendController = useContactAddFriendController({
    onDirectChatCreated: () => setAddFriendDialogOpen(false),
    setNotice,
  });
  const contactProfileController = useMessageContactProfileController({
    activeConversation,
    activeConversationType,
    contactCardProfile,
    friends: friendsQuery.data ?? [],
    queryClient,
    session,
    setContactCardProfile,
    setNotice,
  });

  const {
    createDirectChatMutation,
    createGroupChatMutation,
    createInviteQrMutation,
    groupCreateAccess,
  } = useMessageStartConversationController({
    queryClient,
    session,
    setActiveConversation,
    setComposerDialog,
    setNotice,
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
  const userAvatarRegistry = useMemo(
    () =>
      buildUserAvatarRegistry({
        activeProfiles: [
          contactProfileController.profileQuery.data,
          contactProfileController.profileExtraQuery.data,
          contactProfileController.contactCardProfileQuery.data,
        ],
        conversations,
        friends: friendsQuery.data ?? [],
        groupMembersByConversation: {
          ...groupMembersByConversation,
          ...(activeConversation?.conversationId
            ? { [activeConversation.conversationId]: groupMembersQuery.data ?? [] }
            : {}),
        },
        tenantMembers: tenantMembersQuery.data ?? [],
      }),
    [
      activeConversation?.conversationId,
      contactProfileController.contactCardProfileQuery.data,
      contactProfileController.profileExtraQuery.data,
      contactProfileController.profileQuery.data,
      conversations,
      friendsQuery.data,
      groupMembersByConversation,
      groupMembersQuery.data,
      tenantMembersQuery.data,
    ],
  );
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

  const replaceMessageProfileIfUnpinned = useCallback(() => {
    if (messageProfilePinned) {
      if (messageLayoutMode === "full") setMessageProfileVisible(true);
      return;
    }
    setMessageProfileVisible(false);
    setProfileStandaloneOpen(false);
  }, [
    messageLayoutMode,
    messageProfilePinned,
    setMessageProfileVisible,
    setProfileStandaloneOpen,
  ]);

  const handleMessageContextDragStart = useCallback(
    (event: DragEvent<HTMLElement>, pane: MessageContextPaneOrder) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("application/x-lpp-context-pane", pane);
    },
    [],
  );

  const handleMessageContextDragOver = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const handleMessageContextDrop = useCallback(
    (event: DragEvent<HTMLElement>, targetPane: MessageContextPaneOrder) => {
      event.preventDefault();
      const draggedPane = event.dataTransfer.getData("application/x-lpp-context-pane");
      if (
        draggedPane !== "assistant" &&
        draggedPane !== "profile"
      ) {
        return;
      }
      if (draggedPane === targetPane) return;
      setMessageContextPaneOrder([
        draggedPane,
        draggedPane === "assistant" ? "profile" : "assistant",
      ]);
    },
    [],
  );

  const openAiDraftDrawer = useCallback(() => {
    setAssistantPane(null);
    setNotice("IM 聊天不开放 AI 起草，请在在线客服工作台使用。");
  }, []);

  const openKnowledgePanel = useCallback(() => {
    if (assistantPane !== "knowledge") replaceMessageProfileIfUnpinned();
    setAssistantPane((current) => (current === "knowledge" ? null : "knowledge"));
  }, [assistantPane, replaceMessageProfileIfUnpinned]);

  const openQuickReplyPanel = useCallback(() => {
    if (assistantPane !== "quickReply") replaceMessageProfileIfUnpinned();
    setAssistantPane((current) => (current === "quickReply" ? null : "quickReply"));
  }, [assistantPane, replaceMessageProfileIfUnpinned]);

  const insertKnowledgeReply = useCallback((payload: KnowledgeInsertPayload) => {
    const text = payload.text.trim();
    if (!text) {
      setNotice("这条知识内容暂无可插入文本。");
      return;
    }
    composerRef.current?.insertText(text);
    setAssistantPane(null);
    setNotice("已插入输入框，确认后可发送。");
    requestAnimationFrame(() => composerRef.current?.focus());
  }, []);

  const insertQuickReply = useCallback((payload: QuickReplyInsertPayload) => {
    const text = payload.text.trim();
    if (!text) {
      setNotice("这条话术暂无可插入文本。");
      return;
    }
    composerRef.current?.insertText(text);
    setNotice("话术已插入输入框，确认后可发送。");
    requestAnimationFrame(() => composerRef.current?.focus());
  }, []);

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
    profile: contactProfileController.profileQuery.data,
    profileExtra: contactProfileController.profileExtraQuery.data,
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

  const assistantPaneVisible =
    Boolean(assistantPane) &&
    (messageLayoutMode === "full" || messageLayoutMode === "no-profile");
  const dockProfile = messageProfileVisible && messageLayoutMode === "full";
  const messageProfileFirst =
    assistantPaneVisible && dockProfile && messageContextPaneOrder[0] === "profile";
  const resizeMessageProfilePane = useCallback(
    (requestedWidth: number) => {
      const shell = chatPanelRef.current?.closest(".app-shell.messages-layout");
      if (!shell) {
        setProfilePaneWidth(requestedWidth);
        return;
      }
      const sidebarWidth = Math.round(
        shell.querySelector(".sidebar")?.getBoundingClientRect().width ??
          0,
      );
      setProfilePaneWidth(
        calculateMessageResizeWidth({
          requestedWidth,
          shellWidth: Math.round(shell.getBoundingClientRect().width),
          snapshot: {
            assistantPaneOpen: assistantPaneVisible,
            listPaneWidth,
            profilePaneWidth,
            sidebarWidth,
          },
        }),
      );
    },
    [assistantPaneVisible, listPaneWidth, profilePaneWidth, setProfilePaneWidth],
  );

  return (
    <>
      {messageProfileFirst && (
        <span className="message-context-order-profile-first" hidden />
      )}
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
        friendRequestCount={addFriendController.pendingIncomingRequestCount}
        groupAvatarSnapshotFor={groupAvatarSnapshotFor}
        groupCreateAccess={groupCreateAccess}
        groupMembersByConversation={groupMembersByConversation}
        keyword={keyword}
        listPaneWidth={listPaneWidth}
        loading={conversationList.loading}
        plusMenuOpen={plusMenuOpen}
        unreadCount={counts.unread}
        unreadIdentity={unreadIdentity as CurrentUserIdentity}
        userAvatarRegistry={userAvatarRegistry}
        visibleConversations={visibleConversations}
        onAddFriend={() => {
          setAddFriendDialogOpen(true);
          addFriendController.resetFriendSearch();
        }}
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
          contactProfileController.contactCardActionPending
        }
        contactCardProfile={contactCardProfile}
        contactCardProfileData={contactProfileController.contactCardProfileQuery.data}
        contactCardProfileError={contactProfileController.contactCardProfileQuery.error}
        contactCardProfileLoading={contactProfileController.contactCardProfileQuery.isLoading}
        contactCardRelation={contactProfileController.contactCardRelation}
        chatPanelRef={chatPanelRef}
        composerRef={composerRef}
        canOpenAiAssistant={false}
        canOpenKnowledgeBase={isModuleVisibleForAccess("knowledgeBase", workspaceAccess)}
        composerDialog={composerDialog}
        composerHeight={composerHeight}
        contactPickerItems={contactPickerItems}
        conversationMenu={conversationMenu}
        conversations={conversations}
        createDirectPending={createDirectChatMutation.isPending}
        createGroupPending={createGroupChatMutation.isPending}
        createInviteQrPending={createInviteQrMutation.isPending}
        sendContactCardPending={contactCardSendPending}
        dockProfile={dockProfile}
        draftEditorStatesByConversation={draftEditorStatesByConversation}
        forwardMessages={forwardTargetMessages}
        forwardPending={forwardMutation.isPending}
        getChatPanelHeight={getChatPanelHeight}
        groupAvatarSnapshotFor={groupAvatarSnapshotFor}
        groupManagement={activeConversationIsGroup ? groupManagement : undefined}
        groupMemberMap={groupMemberMap}
        groupMembers={groupMembersQuery.data ?? []}
        handleAvatarClick={handleAvatarClick}
        handleContactCardClick={handleContactCardClick}
        handleConversationMenuAction={handleConversationMenuAction}
        handleMessageStageScroll={handleMessageStageScroll}
        historyCounts={historyCounts}
        historyFilter={historyFilter}
        historyOpen={historyOpen}
        activeAssistantPane={assistantPaneVisible ? assistantPane : null}
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
        messageProfilePinned={messageProfilePinned}
        messageSearchKeyword={messageSearchKeyword}
        messageSearchOpen={messageSearchOpen}
        messageStageRef={messageStageRef}
        messages={messages}
        messagesBottomRef={messagesBottomRef}
        multiSelectMode={multiSelectMode}
        notice={notice}
        onAvatarProfileClose={() => setAvatarProfilePopover(null)}
        onContactCardAccept={() => {
          const relation = contactProfileController.contactCardRelation;
          if (relation?.status !== "incomingPending") return;
          contactProfileController.acceptContactRequest(relation.requestId);
        }}
        onContactCardBlock={() => {
          if (!contactCardProfile?.userId) return;
          if (!requestMessageDangerConfirmation({ action: "block-user" })) {
            return;
          }
          contactProfileController.blockUser(contactCardProfile.userId);
        }}
        onContactCardClose={() => setContactCardProfile(null)}
        onContactCardDeleteFriend={() => {
          const relation = contactProfileController.contactCardRelation;
          if (relation?.status !== "friend") return;
          if (!requestMessageDangerConfirmation({ action: "delete-friend" })) return;
          contactProfileController.deleteFriend(relation.friendUserId);
        }}
        onContactCardReject={() => {
          const relation = contactProfileController.contactCardRelation;
          if (relation?.status !== "incomingPending") return;
          contactProfileController.rejectContactRequest(relation.requestId);
        }}
        onContactCardSendRequest={(message) => contactProfileController.sendContactRequest(message)}
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
        onUpdateCustomerRemark={contactProfileController.updateCustomerRemark}
        onUpdateCustomerTags={contactProfileController.updateCustomerTags}
        onSendContactCard={async (contact) => {
          setContactCardSendPending(true);
          try {
            await messageCenterCommands.sendContactCard(
              normalizeContactCard({
                userId: contact.id,
                displayName: contact.name,
                avatarUrl: contact.avatarUrl,
              }),
            );
            setComposerDialog(null);
          } catch (error) {
            setNotice(contactCardActionErrorText(error, "发送名片失败"));
          } finally {
            setContactCardSendPending(false);
          }
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
        onAiDraft={() => openAiDraftDrawer()}
        onKnowledgeBase={openKnowledgePanel}
        onQuickReply={openQuickReplyPanel}
        openMessageMenu={openMessageMenu}
        pcSettings={pcSettings}
        pendingNewMessageCount={pendingNewMessageCount}
        profilePaneWidth={profilePaneWidth}
        profileActionPending={contactProfileController.profileActionPending}
        profileData={contactProfileController.profileQuery.data}
        profileError={contactProfileController.profileQuery.error}
        profileExtra={contactProfileController.profileExtraQuery.data}
        profileExtraLoading={contactProfileController.profileExtraQuery.isLoading}
        profileLoading={contactProfileController.profileQuery.isLoading}
        profileStandaloneOpen={profileStandaloneOpen}
        replyTarget={replyTarget}
        scrollMessagesToBottom={scrollMessagesToBottom}
        scrollToMessage={scrollToMessage}
        selectedConversationEmptyText={selectedConversationEmptyText}
        selectedMessageIds={selectedMessageIds}
        session={session}
        resendMessage={resendConfirmMessage}
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
        setProfilePaneWidth={resizeMessageProfilePane}
        setProfileStandaloneOpen={setProfileStandaloneOpen}
        onMessageContextDragOver={handleMessageContextDragOver}
        onMessageContextDragStart={handleMessageContextDragStart}
        onMessageContextDrop={handleMessageContextDrop}
        onToggleMessageProfilePin={() =>
          setMessageProfilePinned((current) => !current)
        }
        setReplyTarget={setReplyTarget}
        setSelectedMessageIds={setSelectedMessageIds}
        unreadIdentity={unreadIdentity}
        unreadJump={unreadJump}
        userAvatarRegistry={userAvatarRegistry}
        visibleMessages={visibleMessages}
      />

      {assistantPane && activeConversation && (
        <aside
          className="message-assistant-pane"
          aria-label="消息辅助工作区"
          onDragOver={handleMessageContextDragOver}
          onDrop={(event) => handleMessageContextDrop(event, "assistant")}
        >
          <header className="context-pane-controlbar">
            <button
              className="context-pane-drag"
              type="button"
              draggable
              title="拖拽排序"
              aria-label="拖拽排序"
              onDragStart={(event) => handleMessageContextDragStart(event, "assistant")}
            >
              <GripVertical size={15} />
            </button>
            <strong>{messageAssistantPaneLabel(assistantPane)}</strong>
          </header>
          <div className="context-pane-body">
            {assistantPane === "quickReply" ? (
              <CustomerServiceQuickReplyPanel
                session={session}
                threadType={activeConversationType === "direct" ? "im_direct" : null}
                variant="panel"
                onClose={() => {
                  setAssistantPane(null);
                  requestAnimationFrame(() => composerRef.current?.focus());
                }}
                onInsert={insertQuickReply}
                onNotice={setNotice}
              />
            ) : (
              <CustomerServiceKnowledgePanel
                session={session}
                variant="panel"
                onClose={() => {
                  setAssistantPane(null);
                  requestAnimationFrame(() => composerRef.current?.focus());
                }}
                onInsert={insertKnowledgeReply}
                onNotice={setNotice}
              />
            )}
          </div>
        </aside>
      )}

      {addFriendDialogOpen && (
        <ContactAddFriendDialog
          actionPending={
            addFriendController.sendFriendRequestPending ||
            addFriendController.requestPending ||
            addFriendController.createDirectChatPending
          }
          contactRelation={addFriendController.contactRelation}
          createInviteQrPending={addFriendController.createInviteQrPending}
          inviteQrError={addFriendController.inviteQrError}
          inviteQrLoading={addFriendController.inviteQrLoading}
          inviteQrs={addFriendController.inviteQrs}
          pendingFriendRequestUserId={addFriendController.pendingFriendRequestUserId}
          requestPending={addFriendController.requestPending}
          searchError={addFriendController.friendSearchError}
          searchLoading={addFriendController.friendSearchLoading}
          searchResults={addFriendController.friendSearchResults}
          onAccept={(requestId) => addFriendController.handleRequest(requestId, "accept")}
          onClose={() => setAddFriendDialogOpen(false)}
          onCreateInviteQr={addFriendController.onCreateInviteQr}
          onReject={(requestId) => addFriendController.handleRequest(requestId, "reject")}
          onShowRequests={() => {
            setAddFriendDialogOpen(false);
            setContactFilter("requests");
            setActiveModule("contacts");
          }}
          onStartChat={addFriendController.openDirectMessage}
          searchUsers={addFriendController.searchUsers}
          sendFriendRequest={addFriendController.sendFriendRequest}
        />
      )}
    </>
  );
}
