import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import { GripVertical } from "lucide-react";
import type {
  ConversationListItem,
  GroupMemberDto,
  KnowledgeInsertPayload,
  MessageItemDto,
  QuickReplyInsertPayload,
} from "../data/api-client";
import type { CurrentUserIdentity } from "../data/message-display";
import { pcQueryKeys } from "../data/query-keys";
import { recordMessageReminderDiagnostic } from "../data/diagnostics/message-reminder-diagnostics";
import {
  contactMessageOpenTraceForConversation,
  recordContactMessageOpenDiagnostic,
} from "../data/diagnostics/contact-message-open-diagnostics";
import { workspaceScopeFromSession, workspaceScopeDiagnostic } from "../data/workspace-scope";
import { requireApiClient } from "../data/runtime";
import { useAuthSession } from "../data/auth/auth-store";
import { failedMessageRetryAction } from "../data/message/message-retry-model";
import { customerServiceIndexScopeKey } from "../data/customer-service/cs-conversation-index";
import { isVisibleImConversationInScope } from "../data/im/im-conversation-boundary";
import { useI18n } from "../i18n/useI18n";
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
  useActiveModule,
  useActiveImConversationId,
  useListPaneWidth,
  useMessageConversationFilter,
  useMessageLayoutMode,
  useMessageProfileVisible,
  useProfilePaneWidth,
  useSetActiveImConversation,
  useSetActiveImConversationVisibility,
  useSetActiveModule,
  useSetContactFilter,
  useSetListPaneWidth,
  useSetMessageConversationFilter,
  useSetMessageLayoutMode,
  useSetMessageProfileVisible,
  useSetProfilePaneWidth,
} from "../data/workspace-ui/workspace-ui-store";
import { useWechatBottomFollow } from "../lib/useWechatBottomFollow";
import { useMessageDetailSync } from "../lib/useMessageDetailSync";
import { MessageConversationSidebar } from "../messages/components/MessageConversationSidebar";
import { MessageCenterConversationStage } from "../messages/components/MessageCenterConversationStage";
import { ConversationChatBackgroundDialog } from "../messages/components/ConversationChatBackgroundDialog";
import type { ContactPickerItem } from "../messages/components/MessageStartDialogs";
import { useActiveImConversationQueries } from "../messages/hooks/useActiveImConversationQueries";
import { useGroupAvatarSnapshots } from "../messages/hooks/useGroupAvatarSnapshots";
import { useMediaUploadTaskRegistry } from "../messages/hooks/useMediaUploadTaskRegistry";
import { useMessageMenuActionController } from "../messages/hooks/useMessageMenuActionController";
import { useMessageMediaSendController } from "../messages/hooks/useMessageMediaSendController";
import { useMessageTextSendController } from "../messages/hooks/useMessageTextSendController";
import { useMessageStartConversationController } from "../messages/hooks/useMessageStartConversationController";
import { useMessageActionMutations } from "../messages/hooks/useMessageActionMutations";
import {
  resolveActiveImConversationVisibility,
  useImReadCommandExecutor,
} from "../messages/hooks/useImReadCommandExecutor";
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
import { useImConversationsQuery } from "../messages/hooks/useImConversationsQuery";
import { useMessageContactProfileController } from "../messages/hooks/useMessageContactProfileController";
import { useMessageConversationActions } from "../messages/hooks/useMessageConversationActions";
import { useAutoTranslateConversationPreference } from "../translation/hooks/useAutoTranslateConversationPreference";
import { useAutoTranslateMessages } from "../translation/hooks/useAutoTranslateMessages";
import { autoTranslateTargetLanguage } from "../translation/models/autoTranslateModel";
import { nextAutoTranslateConversationMode } from "../translation/models/autoTranslatePreferences";
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
  canAddGroupMemberFriend,
  canMentionAllGroupMembers,
  canViewGroupMemberList,
} from "../messages/models/groupManagementModel";
import {
  normalizeContactCard,
  type AnchoredContactCardProfile,
} from "../messages/models/contactCardModel";
import {
  resolveGroupSpeakPermissionGate,
} from "../messages/models/groupSpeakPermissionModel";
import { contactCardActionErrorText } from "../messages/presentation/contactCardActionNotice";
import { clampComposerHeight } from "../messages/models/messageComposerLayoutModel";
import {
  buildGroupMemberMap,
  isMineMessage,
  type AvatarProfilePopoverState,
  type UnreadJumpState,
} from "../messages/models/messageDisplayModel";
import type { HistoryFilterKey } from "../messages/models/messageListModel";
import { chatMessageRenderKey } from "../messages/models/messageRenderKey";
import {
  useMessageCenterCommandModel,
  type MessageCenterCommandModel,
} from "../messages/hooks/useMessageCenterCommandModel";
import {
  calculateMessageResizeWidth,
  useMessageResponsiveLayout,
} from "../messages/hooks/useMessageResponsiveLayout";
import { useSerialTaskQueue } from "../messages/hooks/useSerialTaskQueue";
import { useWindowDismiss } from "../messages/hooks/useWindowDismiss";
import {
  messageDangerConfirmationDescriptor,
  requestMessageDangerConfirmation,
  type MessageDangerConfirmAction,
} from "../messages/runtime/messageConfirm";
import { useContactAddFriendController } from "../contacts/hooks/useContactAddFriendController";
import { ContactAddFriendDialog } from "./ContactAddFriendDialog";
import { CustomerServiceKnowledgePanel } from "../customer-service/components/CustomerServiceKnowledgeDrawer";
import { CustomerServiceQuickReplyPanel } from "../customer-service/components/CustomerServiceQuickReplyDrawer";
import type { MessageComposerHandle } from "./MessageComposer";
import type { ChatBackgroundSetting } from "../settings/models/chatBackgroundModel";
import {
  clearConversationChatBackground,
  effectiveConversationChatBackground,
  readConversationChatBackground,
  writeConversationChatBackground,
} from "../messages/models/conversationChatBackgroundModel";

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
const GROUP_MEMBER_CONTACT_CARD_SIZE = { width: 340, height: 372 };
const GROUP_MEMBER_CONTACT_CARD_GAP = 12;
const GROUP_MEMBER_CONTACT_CARD_PADDING = 16;

function messageAssistantPaneLabel(
  pane: Exclude<MessageAssistantPane, null>,
  t: (key: string) => string,
) {
  if (pane === "quickReply") return t("messages.center.quickReply");
  return t("messages.center.knowledgeBase");
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
  const { t } = useI18n();
  const activeModule = useActiveModule();
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
  const setActiveImConversationVisibility = useSetActiveImConversationVisibility();
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
  const [groupLockedContacts, setGroupLockedContacts] = useState<ContactPickerItem[]>([]);
  const [conversationBackgroundDialogOpen, setConversationBackgroundDialogOpen] = useState(false);
  const [conversationChatBackground, setConversationChatBackground] =
    useState<ChatBackgroundSetting | undefined>(() =>
      readConversationChatBackground(activeConversationId),
    );
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
  const [localMutedConversationOverrides, setLocalMutedConversationOverrides] = useState<
    Map<string, boolean>
  >(() => new Map());
  const [localPinnedConversationOverrides, setLocalPinnedConversationOverrides] = useState<
    Map<string, boolean>
  >(() => new Map());
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

  const conversationsQuery = useImConversationsQuery(session);
  useEffect(() => {
    if (!session || !conversationsQuery.data) return;
    recordMessageReminderDiagnostic({
      event: "im.scope.query-visible",
      source: "message-center",
      phase: "query",
      route: "conversation-list",
      classification: {
        itemCount: conversationsQuery.data.items.length,
        queryKey: pcQueryKeys.imConversationsForSession(session),
        scope: workspaceScopeDiagnostic(workspaceScopeFromSession(session)),
      },
    });
  }, [conversationsQuery.data, session]);

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
    localMutedConversationOverrides,
    localPinnedConversationOverrides,
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
    messages: hotServerMessages,
    messagesHydrationSource,
    messagesLoaded,
    messagesLoading,
    messagesQuery,
  } = useActiveImConversationQueries({
    activeConversation,
    activeConversationType,
    session,
  });
  useMessageDetailSync({
    enabled: Boolean(session && activeConversation && activeConversationType),
    isFetching: messagesQuery.isFetching,
    messages: hotServerMessages,
    refetch: messagesQuery.refetch,
    target: activeConversation
      ? {
          targetId: activeConversation.conversationId,
          targetType: activeConversationType,
          lastMessageId: activeConversation.lastMessage?.messageId,
          lastMessageSeq: activeConversation.lastMessageSeq,
        }
      : null,
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
  const groupSpeakPermissionGate = useMemo(
    () =>
      resolveGroupSpeakPermissionGate({
        conversationType: activeConversationType,
        detailLoaded: Boolean(groupManagement.detail),
        groupRole: groupManagement.role,
        muteMode: groupManagement.detail?.muteMode,
      }),
    [
      activeConversationType,
      groupManagement.detail,
      groupManagement.detail?.muteMode,
      groupManagement.role,
    ],
  );
  const composerDisabledNotice =
    groupSpeakPermissionGate.reason === "all_muted"
      ? t("messages.center.groupAllMutedReadOnly")
      : undefined;
  const canMentionAll =
    activeConversationType === "group" &&
    canMentionAllGroupMembers({
      role: groupManagement.role,
      settings: groupManagement.settings ?? groupManagement.detail?.settings,
    });
  const canAddCurrentGroupMemberFriend =
    activeConversationType !== "group" ||
    canAddGroupMemberFriend({
      role: groupManagement.role,
      settings: groupManagement.settings ?? groupManagement.detail?.settings,
    });
  const canViewCurrentGroupMemberList =
    activeConversationType !== "group" ||
    canViewGroupMemberList({
      role: groupManagement.role,
      settings: groupManagement.settings ?? groupManagement.detail?.settings,
    });
  const notifyComposerBlocked = useCallback(() => {
    if (!composerDisabledNotice) return;
    setNotice(composerDisabledNotice);
  }, [composerDisabledNotice]);
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
  const openCreateGroupFromActiveConversation = useCallback(() => {
    if (activeConversation?.conversationType !== "direct" || !activeConversation.peerUserId) {
      setGroupLockedContacts([]);
      setComposerDialog("group");
      return;
    }
    setGroupLockedContacts([
      contactPickerItems.find((item) => item.id === activeConversation.peerUserId) ??
        contactPickerItemFromDirectConversation(activeConversation),
    ]);
    setComposerDialog("group");
  }, [activeConversation, contactPickerItems]);
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
  const handleGroupMemberProfileOpen = useCallback(
    (target: HTMLElement, member: GroupMemberDto, options?: { canAddFriend?: boolean }) => {
      if (!member.userId) return false;
      setAvatarProfilePopover(null);
      setConversationMenu(null);
      setMessageMenu(null);
      setNotice(null);
      const rect = target.getBoundingClientRect();
      setContactCardProfile({
        ...normalizeContactCard({
          userId: member.userId,
          displayName: groupMemberContactCardName(member),
          avatarUrl: member.avatarUrl,
          lppId: member.lppId,
          signature: member.signature,
          bio: member.bio,
          source: activeConversation?.title,
        }),
        allowFriendRequest: options?.canAddFriend ?? canAddCurrentGroupMemberFriend,
        ...resolveGroupMemberContactCardPosition(rect),
      });
      return true;
    },
    [activeConversation?.title, canAddCurrentGroupMemberFriend],
  );

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
  const { conversationActionPending, runConversationAction } = useMessageConversationActions({
    activeConversationId,
    queryClient,
    session,
    setActiveConversation,
    setLocalHiddenConversationIds,
    setLocalMutedConversationOverrides,
    setLocalPinnedConversationOverrides,
    setNotice,
  });

  const {
    historyCounts,
    lookupMessages,
    lookupScope,
    messages,
    visibleMessages,
  } = useMessageListData({
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
    messagesHydrationSource,
    session,
    serverMessages: hotServerMessages,
    unreadIdentity,
  });
  useEffect(() => {
    setConversationChatBackground(readConversationChatBackground(activeConversation?.conversationId));
    setConversationBackgroundDialogOpen(false);
  }, [activeConversation?.conversationId]);
  useEffect(() => {
    if (!composerDialog) setGroupLockedContacts([]);
  }, [composerDialog]);
  const activeConversationChatBackground = effectiveConversationChatBackground(
    conversationChatBackground,
    pcSettings.chatBackgroundPreset,
  );
  const {
    deleteMutation,
    batchDeleteMutation,
    favoriteMutation,
    forwardMutation,
    recallMutation,
    translateMutation,
    voiceToTextMutation,
  } = useMessageActionMutations({
    activeConversation,
    activeConversationType,
    conversations,
    mediaUploadTasks,
    messages,
    queryClient,
    session,
    setForwardTargetMessages,
    setLocalOutgoingMessagesByConversation,
    setMessageAnnotations,
    setMultiSelectMode,
    setNotice,
    setSelectedMessageIds,
  });
  const autoTranslateConversationKind =
    activeConversationType === "group" ? "im-group" : "im-direct";
  const autoTranslateScopeKey = useMemo(
    () => workspaceScopeFromSession(session).key,
    [session],
  );
  const {
    enabled: autoTranslateEffective,
    mode: autoTranslateConversationMode,
    setMode: setAutoTranslateConversationMode,
  } = useAutoTranslateConversationPreference({
    conversationId: activeConversation?.conversationId,
    conversationKind: autoTranslateConversationKind,
    globalEnabled: pcSettings.autoTranslate,
    scopeKey: autoTranslateScopeKey,
  });
  const autoTranslateIsMineMessage = useCallback(
    (message: MessageItemDto) => isMineMessage(message, session),
    [session],
  );
  useAutoTranslateMessages({
    annotations: messageAnnotations,
    conversationKey: activeConversation?.conversationId,
    enabled: autoTranslateEffective,
    isMineMessage: autoTranslateIsMineMessage,
    messages: visibleMessages,
    session,
    setAnnotations: setMessageAnnotations,
    targetLanguage: autoTranslateTargetLanguage(pcSettings.language),
  });
  useImSendOutboxRestore({
    activeConversation,
    activeConversationType,
    localImagePreviewByMessageIdRef,
    mediaUploadTasks,
    session,
    setLocalOutgoingMessagesByConversation,
  });
  const {
    activeConversationSource,
    handleUnreadJump,
    openConversationFromUserClick,
  } = useMessageUnreadJumpController({
    activeConversation,
    activeConversationId,
    messageListScrollRegistry,
    messageSearchOpen,
    messages,
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
  const activeConversationVisibility = resolveActiveImConversationVisibility({
    activeConversationId,
    activeModule,
    conversationDrawerOpen,
    conversationId: activeConversation?.conversationId,
    messageLayoutMode,
  });
  const activeConversationOpenTrace =
    contactMessageOpenTraceForConversation(activeConversationId);
  const firstPaneVisibleTraceKeysRef = useRef(new Set<string>());
  useEffect(() => {
    setActiveImConversationVisibility(activeConversationVisibility);
  }, [activeConversationVisibility, setActiveImConversationVisibility]);
  const activeConversationMessagesLoaded = messagesLoaded;
  useEffect(() => {
    if (!activeConversationOpenTrace || activeModule !== "messages" || !activeConversationId) {
      return;
    }
    recordContactMessageOpenDiagnostic(
      "message-center.route-observed",
      {
        activeConversationId,
        activeConversationVisibility,
        activeModule,
        conversationDrawerOpen,
        messageLayoutMode,
      },
      activeConversationOpenTrace,
    );
  }, [
    activeConversationId,
    activeConversationOpenTrace?.traceId,
    activeConversationVisibility,
    activeModule,
    conversationDrawerOpen,
    messageLayoutMode,
  ]);
  useEffect(() => {
    if (!activeConversationOpenTrace || !activeConversationId) return;
    const rawConversation = conversationsQuery.data?.items.find(
      (item) => item.conversationId === activeConversationId,
    );
    const ownershipScopeKey = session ? customerServiceIndexScopeKey(session) : undefined;
    recordContactMessageOpenDiagnostic(
      "message-center.active-conversation.resolve",
      {
        activeConversationFound: Boolean(activeConversation),
        activeConversationId,
        conversationCount: conversations.length,
        filteredByCustomerServiceBoundary: Boolean(
          rawConversation &&
            ownershipScopeKey &&
            !isVisibleImConversationInScope(rawConversation, ownershipScopeKey),
        ),
        messagesLoaded,
        rawConversationFound: Boolean(rawConversation),
        rawConversationType: rawConversation?.conversationType,
        visibleConversationCount: visibleConversations.length,
        visibleConversationFound: visibleConversations.some(
          (item) => item.conversationId === activeConversationId,
        ),
      },
      activeConversationOpenTrace,
    );
  }, [
    activeConversation,
    activeConversationId,
    activeConversationOpenTrace?.traceId,
    conversations.length,
    conversationsQuery.data?.items,
    messagesLoaded,
    session,
    visibleConversations,
  ]);
  useEffect(() => {
    if (
      !activeConversationOpenTrace ||
      activeConversationVisibility !== "paneVisible" ||
      !activeConversation ||
      activeConversation.conversationId !== activeConversationId
    ) {
      return;
    }
    const traceKey = `${activeConversationOpenTrace.traceId}:${activeConversation.conversationId}`;
    if (firstPaneVisibleTraceKeysRef.current.has(traceKey)) return;
    firstPaneVisibleTraceKeysRef.current.add(traceKey);
    recordContactMessageOpenDiagnostic(
      "message-center.first-pane-visible",
      {
        activeConversationId,
        activeConversationType,
        messagesLoaded,
        visibleMessagesLength: visibleMessages.length,
      },
      activeConversationOpenTrace,
    );
  }, [
    activeConversation,
    activeConversationId,
    activeConversationOpenTrace?.traceId,
    activeConversationType,
    activeConversationVisibility,
    messagesLoaded,
    visibleMessages.length,
  ]);
  useEffect(() => {
    recordMessageReminderDiagnostic({
      event: "im.message-center.mounted",
      source: "message-center",
      phase: "mounted",
      route: activeModule,
      classification: {
        activeConversationId,
        activeConversationSource,
        activeConversationVisibility,
        activeModule,
        conversationId: activeConversation?.conversationId,
        conversationCount: conversations.length,
        visibleConversationCount: visibleConversations.length,
      },
      summary: {
        activeConversation,
      },
    });
  }, [
    activeConversation?.conversationId,
    activeConversationId,
    activeConversationSource,
    activeConversationVisibility,
    activeModule,
    conversations.length,
    visibleConversations.length,
  ]);
  useImReadCommandExecutor({
    activeConversation,
    activeConversationId,
    activeConversationSource,
    activeConversationVisibility,
    activeConversationType,
    clearPendingImRead,
    conversationItems: conversationsQuery.data?.items ?? [],
    dismissRealtimeRemindersForTarget,
    markConversationReadLocally,
    messages,
    messagesLoaded: activeConversationMessagesLoaded,
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
    activeConversationMessagesLoaded,
    activeConversationVisibility,
    conversationListError: conversationsQuery.error,
    conversationListLoading: conversationsQuery.isLoading,
    conversationOwnershipScopeKey: session ? customerServiceIndexScopeKey(session) : undefined,
    conversations,
    draftsByConversation,
    friends: friendsQuery.data ?? [],
    groupMembers: groupMembersQuery.data ?? [],
    imReadStateByConversation,
    keyword,
    messageSearchKeyword,
    messagesError: messagesQuery.error,
    messagesLoading,
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
    messageKey: chatMessageRenderKey,
    messages,
  });
  const {
    retryTextMessage,
    sendContactCardOptimistically,
    sendTextOptimistically,
  } = useMessageTextSendController({
    activeConversation,
    activeConversationType,
    canMentionAll,
    enqueueOutgoingTask,
    groupMembers: groupMembersQuery.data ?? [],
    queryClient,
    replyTarget,
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
      session,
      setLocalOutgoingMessagesByConversation,
      setReplyTarget,
    });
  const guardedSendText = useCallback<MessageCenterCommandModel["sendText"]>(
    (content) => {
      if (groupSpeakPermissionGate.disabled) {
        notifyComposerBlocked();
        return;
      }
      sendTextOptimistically(content);
    },
    [groupSpeakPermissionGate.disabled, notifyComposerBlocked, sendTextOptimistically],
  );
  const guardedSendMedia = useCallback<MessageCenterCommandModel["sendMedia"]>(
    async (file, kind) => {
      if (groupSpeakPermissionGate.disabled) {
        notifyComposerBlocked();
        return;
      }
      await sendMediaOptimistically(file, kind);
    },
    [groupSpeakPermissionGate.disabled, notifyComposerBlocked, sendMediaOptimistically],
  );
  const guardedSendContactCard = useCallback<MessageCenterCommandModel["sendContactCard"]>(
    (card) => {
      if (groupSpeakPermissionGate.disabled) {
        notifyComposerBlocked();
        return;
      }
      return sendContactCardOptimistically(card);
    },
    [
      groupSpeakPermissionGate.disabled,
      notifyComposerBlocked,
      sendContactCardOptimistically,
    ],
  );
  const guardedOpenContactCardPicker = useCallback<
    MessageCenterCommandModel["openContactCardPicker"]
  >(() => {
    if (groupSpeakPermissionGate.disabled) {
      notifyComposerBlocked();
      return;
    }
    setComposerDialog("card");
  }, [groupSpeakPermissionGate.disabled, notifyComposerBlocked]);
  const guardedUploadAction = useCallback<MessageCenterCommandModel["uploadAction"]>(
    (localTaskId, action) => {
      if (
        groupSpeakPermissionGate.disabled &&
        (action === "retry" || action === "resume")
      ) {
        notifyComposerBlocked();
        return;
      }
      handleUploadAction(localTaskId, action);
    },
    [groupSpeakPermissionGate.disabled, handleUploadAction, notifyComposerBlocked],
  );
  useDirectReadReceiptSync({
    activeConversation,
    activeConversationType,
    directReadStatus: directReadStatusQuery.data,
    directReadStatusRefetch: directReadStatusQuery.refetch,
    markImPeerReadReceipt,
    messages,
    peerReadSeq:
      activeConversationReadState?.peerReadSeq ??
      activeConversation?.peerReadSeq ??
      imPeerReadReceipts[activeConversation?.conversationId ?? ""]?.readSeq ??
      0,
    queryClient,
    session,
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
    if (groupSpeakPermissionGate.disabled) {
      notifyComposerBlocked();
      return;
    }
    setAssistantPane(null);
    setNotice(t("messages.center.aiDraftUnavailable"));
  }, [groupSpeakPermissionGate.disabled, notifyComposerBlocked, t]);

  const openKnowledgePanel = useCallback(() => {
    if (groupSpeakPermissionGate.disabled) {
      notifyComposerBlocked();
      return;
    }
    if (assistantPane !== "knowledge") replaceMessageProfileIfUnpinned();
    setAssistantPane((current) => (current === "knowledge" ? null : "knowledge"));
  }, [
    assistantPane,
    groupSpeakPermissionGate.disabled,
    notifyComposerBlocked,
    replaceMessageProfileIfUnpinned,
  ]);

  const openQuickReplyPanel = useCallback(() => {
    if (groupSpeakPermissionGate.disabled) {
      notifyComposerBlocked();
      return;
    }
    if (assistantPane !== "quickReply") replaceMessageProfileIfUnpinned();
    setAssistantPane((current) => (current === "quickReply" ? null : "quickReply"));
  }, [
    assistantPane,
    groupSpeakPermissionGate.disabled,
    notifyComposerBlocked,
    replaceMessageProfileIfUnpinned,
  ]);

  const insertKnowledgeReply = useCallback((payload: KnowledgeInsertPayload) => {
    if (groupSpeakPermissionGate.disabled) {
      notifyComposerBlocked();
      return;
    }
    const text = payload.text.trim();
    if (!text) {
      setNotice(t("messages.center.knowledgeEmpty"));
      return;
    }
    composerRef.current?.insertText(text);
    setAssistantPane(null);
    setNotice(t("messages.center.insertedToComposer"));
    requestAnimationFrame(() => composerRef.current?.focus());
  }, [groupSpeakPermissionGate.disabled, notifyComposerBlocked, t]);

  const insertQuickReply = useCallback((payload: QuickReplyInsertPayload) => {
    if (groupSpeakPermissionGate.disabled) {
      notifyComposerBlocked();
      return;
    }
    const text = payload.text.trim();
    if (!text) {
      setNotice(t("messages.center.quickReplyEmpty"));
      return;
    }
    composerRef.current?.insertText(text);
    setNotice(t("messages.center.quickReplyInserted"));
    requestAnimationFrame(() => composerRef.current?.focus());
  }, [groupSpeakPermissionGate.disabled, notifyComposerBlocked, t]);
  const submitConversationComplaint = useCallback(
    async (conversation: ConversationListItem, content: string) => {
      if (!session) {
        setNotice(t("messages.conversationInfo.complaintLoginRequired"));
        return;
      }
      try {
        await requireApiClient(session).submitFeedback({
          type: "complaint",
          title: t("messages.conversationInfo.complaintTitle", {
            title: conversation.title,
          }),
          content,
          diagnosticsIncluded: true,
          clientContext: {
            source: "pc-conversation-info",
            conversationId: conversation.conversationId,
            conversationType: conversation.conversationType,
            title: conversation.title,
          },
        });
        setNotice(t("messages.conversationInfo.complaintSubmitted"));
      } catch (error) {
        setNotice(
          t("messages.conversationInfo.complaintFailed", {
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    },
    [session, t],
  );

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
    canAddGroupMemberFriend: canAddCurrentGroupMemberFriend,
    deleteMessages: batchDeleteMutation.mutateAsync,
    groupMemberMap,
    messageListScrollRegistry,
    profile: contactProfileController.profileQuery.data,
    profileExtra: contactProfileController.profileExtraQuery.data,
    runConversationAction,
    selectedMessageIds,
    session,
    setAvatarProfilePopover,
    setContactCardProfile,
    setConversationMenu,
    setMessageMenu,
    setNotice,
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

  const messageCenterCommands = useMessageCenterCommandModel({
    deleteSelectedMessages: handleBatchDeleteSelected,
    menuAction: handleMenuAction,
    openContactCardPicker: guardedOpenContactCardPicker,
    sendContactCard: guardedSendContactCard,
    sendMedia: guardedSendMedia,
    sendText: guardedSendText,
    unreadJump: handleUnreadJump,
    uploadAction: guardedUploadAction,
  });

  const handleConfirmResendMessage = useCallback(() => {
    const message = resendConfirmMessage;
    if (!message) return;
    const action = failedMessageRetryAction(message);
    setResendConfirmMessage(null);
    if (!action) {
      setNotice(t("messages.center.resendUnavailable"));
      return;
    }
    if (groupSpeakPermissionGate.disabled) {
      notifyComposerBlocked();
      return;
    }
    if (action.type === "upload") {
      messageCenterCommands.uploadAction(action.localTaskId, "retry");
      return;
    }
    try {
      retryTextMessage(message);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t("messages.center.resendUnavailable"));
    }
  }, [
    groupSpeakPermissionGate.disabled,
    messageCenterCommands,
    notifyComposerBlocked,
    resendConfirmMessage,
    retryTextMessage,
    t,
  ]);

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
        activeConversationMessagesLoaded={activeConversationMessagesLoaded}
        activeGroupMembers={groupMembersQuery.data}
        conversationDrawerOpen={conversationDrawerOpen}
        conversationFilter={messageFilter}
        draftsByConversation={{
          ...draftsByConversation,
          ...draftPreviewsByConversation,
        }}
        emptyText={conversationList.emptyText}
        errorText={errorText}
        friends={friendsQuery.data ?? []}
        friendRequestCount={addFriendController.pendingIncomingRequestCount}
        groupAvatarSnapshotFor={groupAvatarSnapshotFor}
        groupCreateAccess={groupCreateAccess}
        groupMembersByConversation={groupMembersByConversation}
        keyword={keyword}
        listPaneWidth={listPaneWidth}
        loading={conversationList.loading}
        plusMenuOpen={plusMenuOpen}
        tenantMembers={tenantMembersQuery.data ?? []}
        unreadCount={counts.unread}
        unreadIdentity={unreadIdentity as CurrentUserIdentity}
        activeConversationVisibility={activeConversationVisibility}
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
        activeConversationMessagesLoaded={activeConversationMessagesLoaded}
        activeConversationReadState={activeConversationReadState}
        activeConversationType={activeConversationType}
        autoTranslateConversationMode={autoTranslateConversationMode}
        autoTranslateEffective={autoTranslateEffective}
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
        chatBackgroundPreset={activeConversationChatBackground}
        canOpenAiAssistant={false}
        canOpenKnowledgeBase={isModuleVisibleForAccess("knowledgeBase", workspaceAccess)}
        composerDialog={composerDialog}
        composerDisabled={groupSpeakPermissionGate.disabled}
        composerDisabledReason={composerDisabledNotice}
        composerHeight={composerHeight}
        contactPickerItems={contactPickerItems}
        groupLockedContacts={groupLockedContacts}
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
        canOpenGroupReadReceiptMemberProfile={canViewCurrentGroupMemberList}
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
        onCycleAutoTranslateMode={() =>
          setAutoTranslateConversationMode(
            nextAutoTranslateConversationMode(autoTranslateConversationMode),
          )
        }
        onContactCardAccept={() => {
          const relation = contactProfileController.contactCardRelation;
          if (relation?.status !== "incomingPending") return;
          contactProfileController.acceptContactRequest(relation.requestId);
        }}
        onContactCardBlock={async () => {
          if (!contactCardProfile?.userId) return;
          if (!(await confirmMessageDanger("block-user", t))) {
            return;
          }
          contactProfileController.blockUser(contactCardProfile.userId);
        }}
        onContactCardClose={() => setContactCardProfile(null)}
        onContactCardDeleteFriend={async () => {
          const relation = contactProfileController.contactCardRelation;
          if (relation?.status !== "friend") return;
          if (!(await confirmMessageDanger("delete-friend", t))) return;
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
        onCloseComposerDialog={() => {
          setComposerDialog(null);
          setGroupLockedContacts([]);
        }}
        onCloseForward={() => setForwardTargetMessages([])}
        onCloseResend={() => setResendConfirmMessage(null)}
        onCreateDirectChat={(userId) => createDirectChatMutation.mutate(userId)}
        onCreateGroupChat={(payload) => createGroupChatMutation.mutate(payload)}
        onCreateInviteQr={() => createInviteQrMutation.mutate()}
        onOpenCreateGroup={openCreateGroupFromActiveConversation}
        onOpenChatBackgroundSettings={() => setConversationBackgroundDialogOpen(true)}
        onSubmitConversationComplaint={submitConversationComplaint}
        onUpdateCustomerRemark={contactProfileController.updateCustomerRemark}
        onUpdateCustomerTags={contactProfileController.updateCustomerTags}
        onOpenGroupMemberProfile={handleGroupMemberProfileOpen}
        onSendContactCard={async (contact) => {
          if (groupSpeakPermissionGate.disabled) {
            notifyComposerBlocked();
            return;
          }
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
            setNotice(contactCardActionErrorText(error, "messages.center.sendContactCardFailed", t));
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
        profileActionPending={
          contactProfileController.profileActionPending || conversationActionPending
        }
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
        lookupScope={lookupScope}
        lookupMessages={lookupMessages}
      />

      {assistantPane && activeConversation && (
        <aside
          className="message-assistant-pane"
          aria-label={t("messages.center.assistantWorkspaceAria")}
          onDragOver={handleMessageContextDragOver}
          onDrop={(event) => handleMessageContextDrop(event, "assistant")}
        >
          <header className="context-pane-controlbar">
            <button
              className="context-pane-drag"
              type="button"
              draggable
              title={t("messages.center.dragSort")}
              aria-label={t("messages.center.dragSort")}
              onDragStart={(event) => handleMessageContextDragStart(event, "assistant")}
            >
              <GripVertical size={15} />
            </button>
            <strong>{messageAssistantPaneLabel(assistantPane, t)}</strong>
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

      {conversationBackgroundDialogOpen && activeConversation && (
        <ConversationChatBackgroundDialog
          conversationTitle={activeConversation.title}
          globalBackground={pcSettings.chatBackgroundPreset}
          value={conversationChatBackground}
          onChange={(value) => {
            writeConversationChatBackground(activeConversation.conversationId, value);
            setConversationChatBackground(value);
          }}
          onClear={() => {
            clearConversationChatBackground(activeConversation.conversationId);
            setConversationChatBackground(undefined);
          }}
          onClose={() => setConversationBackgroundDialogOpen(false)}
        />
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

type MessageCenterTranslate = (key: string, params?: Record<string, string | number>) => string;

function confirmMessageDanger(
  action: MessageDangerConfirmAction,
  t: MessageCenterTranslate,
  count?: number,
) {
  const descriptor = messageDangerConfirmationDescriptor(action, count);
  return requestMessageDangerConfirmation({
    action,
    count,
    message: t(descriptor.key, descriptor.params),
  });
}

function groupMemberContactCardName(member: GroupMemberDto) {
  const groupNickname = `${member.groupAlias ?? ""}`.trim();
  const accountNickname =
    `${member.displayName ?? ""}`.trim() ||
    `${member.nickname ?? ""}`.trim() ||
    `${(member as unknown as Record<string, unknown>).name ?? ""}`.trim() ||
    `${(member as unknown as Record<string, unknown>).userName ?? ""}`.trim();
  if (groupNickname && accountNickname && groupNickname !== accountNickname) {
    return `${groupNickname} / ${accountNickname}`;
  }
  return groupNickname || accountNickname || member.userId;
}

function resolveGroupMemberContactCardPosition(anchor: DOMRect) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const spaceRight = viewportWidth - anchor.right - GROUP_MEMBER_CONTACT_CARD_PADDING;
  const spaceLeft = anchor.left - GROUP_MEMBER_CONTACT_CARD_PADDING;
  const side = spaceRight >= GROUP_MEMBER_CONTACT_CARD_SIZE.width || spaceRight >= spaceLeft ? "right" : "left";
  const rawX =
    side === "right"
      ? anchor.right + GROUP_MEMBER_CONTACT_CARD_GAP
      : anchor.left - GROUP_MEMBER_CONTACT_CARD_SIZE.width - GROUP_MEMBER_CONTACT_CARD_GAP;
  const rawY = anchor.top + anchor.height / 2 - GROUP_MEMBER_CONTACT_CARD_SIZE.height / 2;
  return {
    x: clampGroupMemberContactCard(
      rawX,
      GROUP_MEMBER_CONTACT_CARD_PADDING,
      viewportWidth - GROUP_MEMBER_CONTACT_CARD_SIZE.width - GROUP_MEMBER_CONTACT_CARD_PADDING,
    ),
    y: clampGroupMemberContactCard(
      rawY,
      GROUP_MEMBER_CONTACT_CARD_PADDING,
      viewportHeight - GROUP_MEMBER_CONTACT_CARD_SIZE.height - GROUP_MEMBER_CONTACT_CARD_PADDING,
    ),
  };
}

function contactPickerItemFromDirectConversation(
  conversation: ConversationListItem,
): ContactPickerItem {
  return {
    avatarUrl: conversation.avatarUrl,
    id: conversation.peerUserId ?? conversation.conversationId,
    name: conversation.peerDisplayName || conversation.title,
    source: "friend",
    subtitle:
      conversation.peerLppId ||
      conversation.peerLppNo ||
      conversation.peerLppNumber ||
      String(conversation.peerUserNo ?? "") ||
      conversation.peerPhoneMasked ||
      conversation.peerEmailMasked ||
      conversation.peerUserId ||
      conversation.conversationId,
  };
}

function clampGroupMemberContactCard(value: number, min: number, max: number) {
  if (max < min) return min;
  return Math.max(min, Math.min(value, max));
}
