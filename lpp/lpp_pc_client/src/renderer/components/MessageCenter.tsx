import {
  BellOff,
  Check,
  CheckSquare,
  ChevronsUp,
  ClipboardList,
  Clock3,
  Copy,
  Download,
  Edit3,
  FileImage,
  FileText,
  FolderOpen,
  Forward,
  Languages,
  MessageSquarePlus,
  MessageSquareQuote,
  PanelRight,
  Reply,
  Search,
  Sparkles,
  Star,
  TextCursorInput,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, Dispatch, MouseEvent, ReactNode, SetStateAction } from "react";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { CustomerProfileWorkspace } from "./CustomerProfileWorkspace";
import { MessageComposer, type ComposerMediaKind } from "./MessageComposer";
import { PcAvatar, avatarInitial } from "./PcAvatar";
import type {
  ConversationListItem,
  GroupMemberDto,
  MediaResourceDto,
  MessageItemDto,
} from "../data/api-client";
import {
  firstMessageMedia,
  mediaFileName,
  messagePreviewFromBody,
  normalizeMessageItem,
  normalizeMessageType,
  resolveMediaUrl as resolveNormalizedMediaUrl,
} from "../data/im-message-normalize";
import { mergeLocalOutgoingMessages } from "../data/im-local-outgoing";
import {
  type CurrentUserIdentity,
  conversationMetaText,
  effectiveConversationUnreadCount,
  isImConversation,
  isSelfSender,
} from "../data/message-display";
import {
  conversationKey as imConversationKey,
  deriveMessageView,
  reduceImCoreEvent,
  type ConversationReadState,
  type ImCoreCommand,
} from "../data/im-read-model";
import { pcQueryKeys } from "../data/query-keys";
import { applyDirectReadReceiptToMessages } from "../data/read-receipts";
import { requireApiClient } from "../data/runtime";
import { type AuthSession, useWorkspaceStore } from "../data/store";
import { formatChatTime, formatError } from "../lib/format";
import { startHorizontalPaneResize, startVerticalPaneResize } from "../lib/paneResize";
import { useWechatBottomFollow } from "../lib/useWechatBottomFollow";
import {
  createVideoPoster,
  registerVideoPosterForMedia,
  type VideoPosterResult,
} from "../lib/videoPoster";
import { renderWechatEmojiText } from "../lib/wechatEmoji";

type ImConversationType = "direct" | "group";

type AvatarProfilePopoverState = {
  x: number;
  y: number;
  title: string;
  subtitle: string;
  avatarUrl?: string | null;
  rows: Array<{ label: string; value: string }>;
};

const filterTabs: Array<{
  key: "all" | "unread" | "friends" | "groups";
  label: string;
}> = [
  { key: "all", label: "全部" },
  { key: "unread", label: "未读" },
  { key: "friends", label: "好友" },
  { key: "groups", label: "群聊" },
];

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

type ReplyTarget = {
  messageId: string;
  sender: string;
  preview: string;
} | null;

type LocalUploadStatus = "queued" | "uploading" | "paused" | "failed" | "sent" | "canceled";

type LocalMediaUploadTask = {
  localTaskId: string;
  localMessageId: string;
  file: File;
  kind: ComposerMediaKind;
  conversation: ConversationListItem;
  conversationType: ImConversationType;
  body: Record<string, unknown>;
  reply: ReplyTarget;
  localPreviewUrl?: string;
  videoPoster?: VideoPosterResult;
  controller?: AbortController;
  controlState?: "paused" | "canceled";
};

type UnreadJumpState = {
  conversationId: string;
  count: number;
  lastReadSeq: number;
};

type HistoryFilterKey =
  | "all"
  | "text"
  | "image"
  | "file"
  | "voice"
  | "video"
  | "link"
  | "favorite";

const historyFilterTabs: Array<{
  key: HistoryFilterKey;
  label: string;
  icon: typeof Clock3;
}> = [
  { key: "all", label: "全部", icon: Clock3 },
  { key: "text", label: "文字", icon: TextCursorInput },
  { key: "image", label: "图片", icon: FileImage },
  { key: "file", label: "文件", icon: FileText },
  { key: "voice", label: "语音", icon: MessageSquarePlus },
  { key: "video", label: "视频", icon: PanelRight },
  { key: "link", label: "链接", icon: Search },
  { key: "favorite", label: "收藏", icon: Star },
];

const composerHeightBounds = {
  min: 190,
  max: 360,
  minMessageStage: 160,
  maxPanelRatio: 0.46,
};

function clampComposerHeight(height: number, panelHeight?: number | null) {
  const roundedHeight = Math.round(height);
  if (!panelHeight || panelHeight <= 0) {
    return Math.min(
      composerHeightBounds.max,
      Math.max(composerHeightBounds.min, roundedHeight),
    );
  }

  const headerHeight = 72;
  const availableBelowHeader = Math.max(0, panelHeight - headerHeight);
  const dynamicMax = Math.min(
    composerHeightBounds.max,
    Math.floor(panelHeight * composerHeightBounds.maxPanelRatio),
    Math.max(
      composerHeightBounds.min,
      availableBelowHeader - composerHeightBounds.minMessageStage,
    ),
  );
  const maxHeight = Math.max(composerHeightBounds.min, dynamicMax);
  return Math.min(maxHeight, Math.max(composerHeightBounds.min, roundedHeight));
}

export function MessageCenter() {
  const session = useWorkspaceStore((state) => state.authSession);
  const activeConversationId = useWorkspaceStore(
    (state) => state.activeImConversationId,
  );
  const setActiveConversation = useWorkspaceStore(
    (state) => state.setActiveImConversation,
  );
  const locallyReadConversationReads = useWorkspaceStore(
    (state) => state.locallyReadImConversationReads,
  );
  const imPeerReadReceipts = useWorkspaceStore((state) => state.imPeerReadReceipts);
  const imReadStateByConversation = useWorkspaceStore(
    (state) => state.imReadStateByConversation,
  );
  const markConversationReadLocally = useWorkspaceStore(
    (state) => state.markImConversationReadLocally,
  );
  const markImPeerReadReceipt = useWorkspaceStore((state) => state.markImPeerReadReceipt);
  const upsertImReadState = useWorkspaceStore((state) => state.upsertImReadState);
  const clearPendingImRead = useWorkspaceStore((state) => state.clearPendingImRead);
  const dismissRealtimeRemindersForTarget = useWorkspaceStore(
    (state) => state.dismissRealtimeRemindersForTarget,
  );
  const messageFilter = useWorkspaceStore((state) => state.messageFilter);
  const setMessageFilter = useWorkspaceStore((state) => state.setMessageFilter);
  const pcSettings = useWorkspaceStore((state) => state.pcSettings);
  const listPaneWidth = useWorkspaceStore((state) => state.listPaneWidth);
  const profilePaneWidth = useWorkspaceStore((state) => state.profilePaneWidth);
  const setListPaneWidth = useWorkspaceStore((state) => state.setListPaneWidth);
  const setProfilePaneWidth = useWorkspaceStore((state) => state.setProfilePaneWidth);
  const messageProfileVisible = useWorkspaceStore((state) => state.messageProfileVisible);
  const setMessageProfileVisible = useWorkspaceStore(
    (state) => state.setMessageProfileVisible,
  );
  const setActiveModule = useWorkspaceStore((state) => state.setActiveModule);
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
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [replyTarget, setReplyTarget] = useState<ReplyTarget>(null);
  const [composerHeight, setComposerHeight] = useState(220);
  const [forwardTargetMessages, setForwardTargetMessages] = useState<MessageItemDto[]>([]);
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
  const messageElementRefs = useRef(new Map<string, HTMLDivElement>());
  const localImagePreviewByMessageIdRef = useRef(new Map<string, string>());
  const autoSelectedConversationIdsRef = useRef(new Set<string>());
  const outgoingSendQueueRef = useRef(Promise.resolve());
  const mediaUploadTasksRef = useRef(new Map<string, LocalMediaUploadTask>());
  const getChatPanelHeight = useCallback(
    () => chatPanelRef.current?.getBoundingClientRect().height ?? null,
    [],
  );
  useEffect(() => {
    const panel = chatPanelRef.current;
    if (!panel) return undefined;

    const clampCurrentHeight = () => {
      const panelHeight = panel.getBoundingClientRect().height;
      setComposerHeight((current) => clampComposerHeight(current, panelHeight));
    };

    clampCurrentHeight();
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(clampCurrentHeight);
    resizeObserver?.observe(panel);
    window.addEventListener("resize", clampCurrentHeight);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", clampCurrentHeight);
    };
  }, []);

  useEffect(
    () => () => {
      localImagePreviewByMessageIdRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      localImagePreviewByMessageIdRef.current.clear();
    },
    [],
  );

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(
      () => setNotice(null),
      isNoticeErrorText(notice) ? 3200 : 1800,
    );
    return () => window.clearTimeout(timeout);
  }, [notice]);

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

  const unreadIdentity = useMemo<CurrentUserIdentity | null>(
    () =>
      session
        ? {
            ...session,
            locallyReadConversationReads: mergeUnifiedReadStateForIdentity(
              locallyReadConversationReads,
              imReadStateByConversation,
            ),
          }
        : null,
    [imReadStateByConversation, locallyReadConversationReads, session],
  );
  const conversations = useMemo(
    () =>
      sortConversations(
        (conversationsQuery.data?.items ?? [])
          .filter((item) => isImConversation(item))
          .filter((item) => !localHiddenConversationIds.has(item.conversationId))
          .map((item) =>
            localMutedConversationIds.has(item.conversationId)
              ? { ...item, isMuted: true }
              : item,
          ),
        unreadIdentity,
      ),
    [
      conversationsQuery.data?.items,
      localHiddenConversationIds,
      localMutedConversationIds,
      unreadIdentity,
    ],
  );

  const visibleConversations = useMemo(
    () =>
      filterConversations(conversations, messageFilter, keyword, unreadIdentity),
    [conversations, keyword, messageFilter, unreadIdentity],
  );
  const activeConversation =
    visibleConversations.find((item) => item.conversationId === activeConversationId) ??
    conversations.find((item) => item.conversationId === activeConversationId) ??
    visibleConversations[0] ??
    conversations[0];
  const activeConversationType = getImConversationType(activeConversation);
  const activeConversationKey =
    activeConversation && activeConversationType
      ? imConversationKey(activeConversationType, activeConversation.conversationId)
      : undefined;
  const activeConversationReadState =
    activeConversation && activeConversationType
      ? imReadStateByConversation[
          imConversationKey(activeConversationType, activeConversation.conversationId)
        ]
      : undefined;
  const activeConversationIsGroup = activeConversationType === "group";
  const executeImCoreCommands = useCallback(
    (commands: ImCoreCommand[]) => {
      commands.forEach((command) => {
        if (command.type === "log_diagnostic") return;
        if (command.type === "clear_new_message_jump") {
          setUnreadJump((current) =>
            current?.conversationId === command.conversationId ? null : current,
          );
          dismissRealtimeRemindersForTarget("messages", command.conversationId);
          return;
        }

        const nextReadSeq = Math.max(0, Math.floor(command.readSeq));
        if (nextReadSeq <= 0) return;
        const key = imConversationKey(command.conversationType, command.conversationId);
        const currentReadState =
          useWorkspaceStore.getState().imReadStateByConversation[key];
        upsertImReadState({
          conversationKey: key,
          conversationId: command.conversationId,
          conversationType: command.conversationType,
          myReadSeq: Math.max(currentReadState?.myReadSeq ?? 0, nextReadSeq),
          peerReadSeq: currentReadState?.peerReadSeq ?? 0,
          lastMessageSeq: Math.max(currentReadState?.lastMessageSeq ?? 0, nextReadSeq),
          unreadCount: 0,
          pendingReadSeq: nextReadSeq,
          updatedAt: Date.now(),
        });
        if (command.conversationType === "direct") {
          markConversationReadLocally(command.conversationId, nextReadSeq);
        }
        applyConversationReadToCache(
          queryClient,
          command.conversationId,
          nextReadSeq,
        );
        setUnreadJump((current) =>
          current?.conversationId === command.conversationId ? null : current,
        );
        dismissRealtimeRemindersForTarget("messages", command.conversationId);
        if (!session) return;
        void requireApiClient(session)
          .markConversationRead(
            command.conversationType,
            command.conversationId,
            nextReadSeq,
          )
          .then(() => {
            clearPendingImRead(
              command.conversationType,
              command.conversationId,
              nextReadSeq,
            );
            return queryClient.invalidateQueries({ queryKey: ["pc-im-conversations"] });
          })
          .catch((error) => {
            setNotice(`已在本地标记已读，服务端同步失败：${formatError(error)}`);
          });
      });
    },
    [
      clearPendingImRead,
      dismissRealtimeRemindersForTarget,
      markConversationReadLocally,
      queryClient,
      session,
      upsertImReadState,
    ],
  );
  const activeConversationDraft = activeConversation
    ? draftsByConversation[activeConversation.conversationId] ?? ""
    : "";

  useEffect(() => {
    if (!session || !unreadIdentity) return;
    const items = conversationsQuery.data?.items ?? [];
    if (items.length === 0) return;
    let stateByConversation = useWorkspaceStore.getState().imReadStateByConversation;
    for (const conversation of items) {
      if (!isImConversation(conversation)) continue;
      const conversationType = getImConversationType(conversation);
      if (!conversationType) continue;
      const key = imConversationKey(conversationType, conversation.conversationId);
      const result = reduceImCoreEvent({
        identity: unreadIdentity,
        stateByConversation,
        event: {
          type: "api.conversation_snapshot",
          conversationId: conversation.conversationId,
          conversationType,
          conversation: {
            myReadSeq: conversation.lastReadSeq ?? 0,
            peerReadSeq: conversation.peerReadSeq ?? 0,
            lastMessageSeq: conversation.lastMessageSeq ?? 0,
            unreadCount: conversation.unreadCount ?? 0,
          },
        },
      });
      const nextState = result.stateByConversation[key];
      if (nextState && readStateMeaningfullyChanged(stateByConversation[key], nextState)) {
        upsertImReadState(nextState);
      }
      if (result.commands.length > 0) {
        executeImCoreCommands(result.commands);
      }
      stateByConversation = result.stateByConversation;
    }
  }, [
    conversationsQuery.data?.items,
    executeImCoreCommands,
    session,
    unreadIdentity,
    upsertImReadState,
  ]);

  useEffect(() => {
    if (
      activeConversation &&
      activeConversationId !== activeConversation.conversationId
    ) {
      if (!activeConversationId) {
        autoSelectedConversationIdsRef.current.add(activeConversation.conversationId);
      }
      setActiveConversation(activeConversation.conversationId);
    }
  }, [activeConversation, activeConversationId, setActiveConversation]);

  useEffect(() => {
    setReplyTarget(null);
    setMessageMenu(null);
    setAvatarProfilePopover(null);
    setConversationMenu(null);
    setForwardTargetMessages([]);
    setUnreadJump((current) =>
      current?.conversationId === activeConversation?.conversationId ? current : null,
    );
  }, [activeConversation?.conversationId]);

  const messagesQuery = useQuery({
    queryKey: pcQueryKeys.imMessages(
      session?.apiBaseUrl,
      session?.tenantToken,
      activeConversationType,
      activeConversation?.conversationId,
    ),
    enabled: Boolean(session && activeConversation && activeConversationType),
    queryFn: async () =>
      requireApiClient(session).getConversationMessages(
        activeConversationType!,
        activeConversation!.conversationId,
      ),
    gcTime: 30 * 60_000,
    refetchInterval: 2_500,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60_000,
  });
  const directReadStatusQuery = useQuery({
    queryKey: pcQueryKeys.imDirectReadStatus(
      session?.apiBaseUrl,
      session?.tenantToken,
      activeConversation?.conversationId,
    ),
    enabled: Boolean(
      session &&
        activeConversation &&
        activeConversationType === "direct",
    ),
    queryFn: async () =>
      requireApiClient(session).getDirectReadStatus(
        activeConversation!.conversationId,
      ),
    refetchInterval: 5_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    staleTime: 2_000,
  });
  const groupMembersQuery = useQuery({
    queryKey: [
      "pc-group-members",
      session?.apiBaseUrl ?? "",
      session?.tenantToken ?? "",
      activeConversation?.conversationId ?? "",
    ],
    enabled: Boolean(session && activeConversationType === "group" && activeConversation),
    queryFn: async () =>
      requireApiClient(session).getGroupMembers(activeConversation!.conversationId),
    staleTime: 60_000,
  });
  const groupMemberMap = useMemo(
    () => buildGroupMemberMap(groupMembersQuery.data ?? []),
    [groupMembersQuery.data],
  );

  const sendTextMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!session || !activeConversation || !activeConversationType) {
        throw new Error("请选择一个普通 IM 会话");
      }
      return requireApiClient(session).sendConversationTextMessage(
        activeConversationType,
        activeConversation.conversationId,
        content,
        replyTarget?.messageId,
        activeConversationType === "group"
          ? extractMentions(content, groupMembersQuery.data ?? [])
          : [],
      );
    },
    onSuccess: (result, content) => {
      const reply = replyTarget;
      setReplyTarget(null);
      if (activeConversation) {
        appendLocalMessage(
          queryClient,
          session,
          activeConversation,
          "text",
          withReplyBody({ text: content }, reply),
          result,
        );
      }
      void invalidateMessages(queryClient);
      scrollMessagesToBottom("smooth");
    },
  });

  const sendMediaMutation = useMutation({
    onMutate: async (variables: { file: File; kind: ComposerMediaKind }) => {
      if (!session || !activeConversation) return undefined;
      const localMessageId = `pc-local-media-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const localPreviewUrl =
        variables.kind === "image" || variables.kind === "video"
          ? URL.createObjectURL(variables.file)
          : undefined;
      const localMedia: MediaResourceDto & { localPreviewUrl?: string } = {
        url: localPreviewUrl || "",
        thumbnailUrl: localPreviewUrl,
        fileName: variables.file.name,
        mimeType: variables.file.type,
        sizeBytes: variables.file.size,
        localPreviewUrl,
      };
      appendLocalMessage(
        queryClient,
        session,
        activeConversation,
        variables.kind,
        withReplyBody({ [variables.kind]: localMedia }, replyTarget),
        {
          messageId: localMessageId,
          conversationId: activeConversation.conversationId,
          serverTime: new Date().toISOString(),
        },
        { status: "sending" },
      );
      scrollMessagesToBottom("smooth");
      return {
        conversation: activeConversation,
        localMessageId,
        localPreviewUrl,
        reply: replyTarget,
      };
    },
    mutationFn: async ({
      file,
      kind,
    }: {
      file: File;
      kind: ComposerMediaKind;
    }) => {
      if (!session || !activeConversation || !activeConversationType) {
        throw new Error("请选择一个普通 IM 会话");
      }
      const client = requireApiClient(session);
      const media = await client.uploadMedia(file, kind);
      const normalizedMedia = normalizeUploadedMedia(media, file);
      const sent = await client.sendConversationMediaMessage(
        activeConversationType,
        activeConversation.conversationId,
        kind,
        normalizedMedia,
        replyTarget?.messageId,
      );
      return { media: normalizedMedia, sent };
    },
    onSuccess: (result, variables, context) => {
      const reply = context?.reply ?? replyTarget;
      setReplyTarget(null);
      if (context?.conversation) {
        const serverMessageId = result.sent.messageId || context.localMessageId;
        const localPreviewUrl = context.localPreviewUrl;
        if (variables.kind === "image" && localPreviewUrl) {
          localImagePreviewKeys(serverMessageId, result.media).forEach((key) => {
            localImagePreviewByMessageIdRef.current.set(key, localPreviewUrl);
          });
        }
        replaceLocalMessageInCache(
          queryClient,
          session,
          context.conversation,
          context.localMessageId,
          variables.kind,
          withReplyBody(
            {
              [variables.kind]:
                (variables.kind === "image" || variables.kind === "video") && context.localPreviewUrl
                  ? { ...result.media, localPreviewUrl: context.localPreviewUrl }
                  : result.media,
            },
            reply,
          ),
          result.sent,
        );
      }
      void invalidateMessages(queryClient);
      scrollMessagesToBottom("smooth");
    },
    onError: (error, _variables, context) => {
      if (context?.conversation) {
        markLocalMessageFailed(
          queryClient,
          session,
          context.conversation,
          context.localMessageId,
          formatError(error),
        );
      }
    },
  });

  const enqueueOutgoingTask = (task: () => Promise<void>) => {
    outgoingSendQueueRef.current = outgoingSendQueueRef.current
      .catch(() => undefined)
      .then(task);
  };

  const sendTextOptimistically = (content: string) => {
    if (!session || !activeConversation || !activeConversationType) {
      throw new Error("请选择一个普通 IM 会话");
    }
    const conversation = activeConversation;
    const conversationType = activeConversationType;
    const reply = replyTarget;
    const localMessageId = `pc-local-text-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const body = withReplyBody({ text: content }, reply);
    const members = groupMembersQuery.data ?? [];
    const localMessage = appendLocalMessage(
      queryClient,
      session,
      conversation,
      "text",
      body,
      {
        messageId: localMessageId,
        conversationId: conversation.conversationId,
        serverTime: new Date().toISOString(),
      },
      { status: "sending" },
    );
    setLocalOutgoingMessagesByConversation((current) =>
      upsertLocalOutgoingMessage(current, conversationType, conversation.conversationId, localMessage),
    );
    setReplyTarget(null);
    scrollMessagesToBottom("smooth");
    enqueueOutgoingTask(async () => {
      try {
        const result = await requireApiClient(session).sendConversationTextMessage(
          conversationType,
          conversation.conversationId,
          content,
          reply?.messageId,
          conversationType === "group" ? extractMentions(content, members) : [],
        );
        const sentMessage = replaceLocalMessageInCache(
          queryClient,
          session,
          conversation,
          localMessageId,
          "text",
          body,
          result,
        );
        setLocalOutgoingMessagesByConversation((current) =>
          replaceLocalOutgoingMessage(
            current,
            conversationType,
            conversation.conversationId,
            localMessageId,
            sentMessage,
          ),
        );
        void invalidateMessages(queryClient);
        scrollMessagesToBottom("smooth");
      } catch (error) {
        const reason = formatError(error);
        markLocalMessageFailed(
          queryClient,
          session,
          conversation,
          localMessageId,
          reason,
        );
        setLocalOutgoingMessagesByConversation((current) =>
          markLocalOutgoingMessageFailed(
            current,
            conversationType,
            conversation.conversationId,
            localMessageId,
            reason,
          ),
        );
      }
    });
  };

  const startMediaUpload = useCallback(
    (localTaskId: string) => {
      const task = mediaUploadTasksRef.current.get(localTaskId);
      if (!task || !session) return;
      const controller = new AbortController();
      task.controller = controller;
      task.controlState = undefined;
      patchLocalMediaMessage(
        queryClient,
        session,
        task.conversation,
        task.conversationType,
        task.localMessageId,
        { status: "uploading", uploadProgress: 0, localError: undefined },
        setLocalOutgoingMessagesByConversation,
      );
      void (async () => {
        try {
          const client = requireApiClient(session);
          const media = await client.uploadMedia(task.file, task.kind, {
            signal: controller.signal,
            onProgress: (progress) => {
              if (typeof progress.percent !== "number") return;
              patchLocalMediaMessage(
                queryClient,
                session,
                task.conversation,
                task.conversationType,
                task.localMessageId,
                { status: "uploading", uploadProgress: progress.percent },
                setLocalOutgoingMessagesByConversation,
              );
            },
          });
          const uploadedPoster =
            task.kind === "video" && task.videoPoster
              ? await client
                  .uploadMedia(task.videoPoster.file, "image", { signal: controller.signal })
                  .then((posterMedia) => normalizeUploadedMedia(posterMedia, task.videoPoster!.file))
                  .catch(() => undefined)
              : undefined;
          const normalizedMedia = withVideoPosterMedia(
            normalizeUploadedMedia(media, task.file),
            task.videoPoster,
            uploadedPoster,
          );
          registerVideoPosterForMedia(
            normalizedMedia as Record<string, unknown>,
            task.videoPoster?.url,
          );
          const sent = await client.sendConversationMediaMessage(
            task.conversationType,
            task.conversation.conversationId,
            task.kind,
            normalizedMedia,
            task.reply?.messageId,
          );
          const serverMessageId = sent.messageId || task.localMessageId;
          if (task.kind === "image" && task.localPreviewUrl) {
            localImagePreviewKeys(serverMessageId, normalizedMedia).forEach((key) => {
              localImagePreviewByMessageIdRef.current.set(key, task.localPreviewUrl!);
            });
          }
          const sentMessage = replaceLocalMessageInCache(
            queryClient,
            session,
            task.conversation,
            task.localMessageId,
            task.kind,
            withReplyBody(
              {
                [task.kind]:
                  (task.kind === "image" || task.kind === "video") && task.localPreviewUrl
                    ? {
                        ...normalizedMedia,
                        localPreviewUrl: task.localPreviewUrl,
                        ...(task.videoPoster?.url ? { localPosterUrl: task.videoPoster.url } : {}),
                      }
                    : normalizedMedia,
              },
              task.reply,
            ),
            sent,
          );
          setLocalOutgoingMessagesByConversation((current) =>
            replaceLocalOutgoingMessage(
              current,
              task.conversationType,
              task.conversation.conversationId,
              task.localMessageId,
              sentMessage,
            ),
          );
          mediaUploadTasksRef.current.delete(localTaskId);
          void invalidateMessages(queryClient);
          scrollMessagesToBottom("smooth");
        } catch (error) {
          if (controller.signal.aborted && task.controlState) return;
          const reason = formatError(error);
          patchLocalMediaMessage(
            queryClient,
            session,
            task.conversation,
            task.conversationType,
            task.localMessageId,
            { status: "failed", localError: reason },
            setLocalOutgoingMessagesByConversation,
          );
        }
      })();
    },
    [queryClient, session],
  );

  const sendMediaOptimistically = async (file: File, kind: ComposerMediaKind) => {
    if (!session || !activeConversation || !activeConversationType) {
      throw new Error("请选择一个普通 IM 会话");
    }
    const conversation = activeConversation;
    const conversationType = activeConversationType;
    const reply = replyTarget;
    const localMessageId = `pc-local-media-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const localTaskId = `pc-upload-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const localPreviewUrl =
      kind === "image" || kind === "video" ? URL.createObjectURL(file) : undefined;
    const videoPoster = kind === "video" ? await createVideoPoster(file) : undefined;
    const localMedia: MediaResourceDto & {
      localPreviewUrl?: string;
      localPosterUrl?: string;
      posterUrl?: string;
    } = {
      url: localPreviewUrl || "",
      thumbnailUrl: videoPoster?.url || (kind === "image" ? localPreviewUrl : undefined),
      posterUrl: videoPoster?.url,
      localPosterUrl: videoPoster?.url,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      durationSeconds: videoPoster?.durationSeconds,
      width: videoPoster?.width,
      height: videoPoster?.height,
      localPreviewUrl,
    };
    registerVideoPosterForMedia(localMedia as Record<string, unknown>, videoPoster?.url);
    const body = withReplyBody({ [kind]: localMedia }, reply);
    const localMessage = appendLocalMessage(
      queryClient,
      session,
      conversation,
      kind,
      body,
      {
        messageId: localMessageId,
        conversationId: conversation.conversationId,
        serverTime: new Date().toISOString(),
      },
      { status: "uploading", uploadProgress: 0, localTaskId },
    );
    setLocalOutgoingMessagesByConversation((current) =>
      upsertLocalOutgoingMessage(current, conversationType, conversation.conversationId, localMessage),
    );
    mediaUploadTasksRef.current.set(localTaskId, {
      localTaskId,
      localMessageId,
      file,
      kind,
      conversation,
      conversationType,
      body,
      reply,
      localPreviewUrl,
      videoPoster,
    });
    setReplyTarget(null);
    scrollMessagesToBottom("smooth");
    startMediaUpload(localTaskId);
  };

  const handleUploadAction = useCallback(
    (localTaskId: string, action: "pause" | "resume" | "cancel" | "retry") => {
      const task = mediaUploadTasksRef.current.get(localTaskId);
      if (!task || !session) return;
      if (action === "pause") {
        task.controlState = "paused";
        task.controller?.abort();
        patchLocalMediaMessage(
          queryClient,
          session,
          task.conversation,
          task.conversationType,
          task.localMessageId,
          { status: "paused", localError: undefined },
          setLocalOutgoingMessagesByConversation,
        );
        return;
      }
      if (action === "cancel") {
        task.controlState = "canceled";
        task.controller?.abort();
        patchLocalMediaMessage(
          queryClient,
          session,
          task.conversation,
          task.conversationType,
          task.localMessageId,
          { status: "canceled", localError: undefined },
          setLocalOutgoingMessagesByConversation,
        );
        return;
      }
      startMediaUpload(localTaskId);
    },
    [queryClient, session, startMediaUpload],
  );

  const recallMutation = useMutation({
    mutationFn: async (messageId: string) => {
      if (!session) throw new Error("请先登录");
      return requireApiClient(session).recallMessage(messageId);
    },
    onSuccess: async (_result, messageId) => {
      markMessageRecalledInCache(queryClient, messageId);
      setNotice("消息已撤回。");
      await invalidateMessages(queryClient);
    },
    onError: (error) => setNotice(`撤回失败：${formatError(error)}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (messageId: string) => {
      if (!session) throw new Error("请先登录");
      return requireApiClient(session).deleteMessage(messageId);
    },
    onSuccess: async (_result, messageId) => {
      removeMessageFromCache(queryClient, messageId);
      setNotice("消息已删除。");
      await invalidateMessages(queryClient);
    },
    onError: (error) => setNotice(`删除失败：${formatError(error)}`),
  });

  const favoriteMutation = useMutation({
    mutationFn: async (message: MessageItemDto) => {
      if (!session || !activeConversation) throw new Error("请选择一个普通 IM 会话");
      return requireApiClient(session).addFavoriteMessage({
        messageId: message.messageId,
        conversationId: message.conversationId || activeConversation.conversationId,
      });
    },
    onSuccess: async (result, message) => {
      markMessageFavoriteInCache(
        queryClient,
        message.messageId,
        (result as { favoriteId?: string }).favoriteId,
      );
      setNotice("已收藏。");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pc-im-messages"] }),
        queryClient.invalidateQueries({ queryKey: ["pc-account-favorites"] }),
        queryClient.invalidateQueries({ queryKey: ["pc-account-favorites-summary"] }),
      ]);
    },
    onError: (error) => setNotice(`收藏失败：${formatError(error)}`),
  });

  const translateMutation = useMutation({
    mutationFn: async (message: MessageItemDto) => {
      if (!session) throw new Error("请先登录");
      if (!message.messageId) throw new Error("这条消息缺少 messageId，无法翻译");
      const apiClient = requireApiClient(session);
      const messageText = extractMessageText(message);
      let text: string | undefined;
      try {
        text = extractActionResultText(
          await apiClient.translateMessage(message.messageId),
        );
      } catch (error) {
        if (!messageText) throw error;
      }
      if (!text && messageText) {
        text = extractActionResultText(await apiClient.translateText(messageText));
      }
      return {
        messageId: message.messageId,
        text,
      };
    },
    onSuccess: ({ messageId, text }) => {
      if (!text) {
        setMessageAnnotations((current) => {
          const next = { ...current };
          delete next[messageId];
          return next;
        });
        setNotice("翻译服务没有返回内容。");
        return;
      }
      setMessageAnnotations((current) => ({
        ...current,
        [messageId]: `译文：${text}`,
      }));
      setNotice("已翻译。");
    },
    onError: (error, message) => {
      setMessageAnnotations((current) => {
        const next = { ...current };
        delete next[message.messageId];
        return next;
      });
      setNotice(`翻译失败：${formatError(error)}`);
    },
  });

  const voiceToTextMutation = useMutation({
    mutationFn: async (message: MessageItemDto) => {
      if (!session) throw new Error("请先登录");
      return {
        messageId: message.messageId,
        text: extractActionResultText(
          await requireApiClient(session).voiceToText(message.messageId),
        ),
      };
    },
    onSuccess: ({ messageId, text }) => {
      if (!text) {
        setNotice("语音转文字没有返回内容。");
        return;
      }
      setMessageAnnotations((current) => ({
        ...current,
        [messageId]: `转文字：${text}`,
      }));
      setNotice("已转文字。");
    },
    onError: (error) => setNotice(`语音转文字失败：${formatError(error)}`),
  });

  const forwardMutation = useMutation({
    mutationFn: async ({
      messages,
      targetConversationId,
    }: {
      messages: MessageItemDto[];
      targetConversationId: string;
    }) => {
      if (!session) throw new Error("请先登录");
      const client = requireApiClient(session);
      const results = await Promise.allSettled(
        messages.map((message) =>
          client.forwardMessage({
            sourceMessageId: message.messageId,
            targetConversationId,
          }).then(() => message),
        ),
      );
      const succeededMessages = results
        .filter((result): result is PromiseFulfilledResult<MessageItemDto> => result.status === "fulfilled")
        .map((result) => result.value);
      const failedCount = results.length - succeededMessages.length;
      if (succeededMessages.length === 0) {
        const firstFailure = results.find(
          (result): result is PromiseRejectedResult => result.status === "rejected",
        );
        throw firstFailure?.reason ?? new Error("转发失败");
      }
      return { failedCount, succeededMessages, targetConversationId };
    },
    onSuccess: async ({ failedCount, succeededMessages }, variables) => {
      const target = conversations.find(
        (item) => item.conversationId === variables.targetConversationId,
      );
      if (target) {
        appendForwardedMessagesToCache(
          queryClient,
          session,
          target,
          succeededMessages,
        );
      }
      setForwardTargetMessages([]);
      setMultiSelectMode(false);
      setSelectedMessageIds(new Set());
      setNotice(
        failedCount > 0
          ? `已转发 ${succeededMessages.length} 条，${failedCount} 条失败，请稍后重试。`
          : succeededMessages.length > 1
            ? `已转发 ${succeededMessages.length} 条消息。`
            : "已转发。",
      );
      await invalidateMessages(queryClient);
    },
    onError: (error) => setNotice(`转发失败：${formatError(error)}`),
  });

  const counts = getConversationCounts(conversations, unreadIdentity);
  const messages = useMemo(
    () => {
      const serverMessages = messagesQuery.data ?? [];
      const mergedOutgoingMessages = mergeLocalOutgoingMessages(
        serverMessages,
        activeConversationKey
          ? (localOutgoingMessagesByConversation[activeConversationKey] ?? [])
          : [],
      );
      const messagesWithPreviews = withLocalImagePreviews(
        mergedOutgoingMessages,
        localImagePreviewByMessageIdRef.current,
      );
      const peerReadSeq = activeConversation?.conversationId
        ? imPeerReadReceipts[activeConversation.conversationId]?.readSeq
        : undefined;
      return activeConversationType === "direct" && peerReadSeq
        ? applyDirectReadReceiptToMessages(
            messagesWithPreviews,
            peerReadSeq,
            unreadIdentity,
          )
        : messagesWithPreviews;
    },
    [
      activeConversation?.conversationId,
      activeConversationKey,
      activeConversationType,
      imPeerReadReceipts,
      localOutgoingMessagesByConversation,
      messagesQuery.data,
      unreadIdentity,
    ],
  );
  const historyCounts = useMemo(() => getHistoryFilterCounts(messages), [messages]);
  const visibleMessages = useMemo(
    () =>
      filterMessages(
        filterMessagesByHistory(messages, historyOpen ? historyFilter : "all"),
        messageSearchOpen ? messageSearchKeyword : "",
      ),
    [historyFilter, historyOpen, messageSearchKeyword, messageSearchOpen, messages],
  );
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
  useEffect(() => {
    if (
      !activeConversation ||
      activeConversationType !== "direct" ||
      !directReadStatusQuery.data
    ) {
      return;
    }
    const peerReadSeq = Math.max(
      0,
      Math.floor(Number(directReadStatusQuery.data.peerLastReadSeq ?? 0)),
    );
    if (peerReadSeq <= 0) return;

    const key = imConversationKey("direct", activeConversation.conversationId);
    const currentReadState =
      useWorkspaceStore.getState().imReadStateByConversation[key];
    if ((currentReadState?.peerReadSeq ?? 0) >= peerReadSeq) return;

    markImPeerReadReceipt(activeConversation.conversationId, peerReadSeq);
    upsertImReadState({
      conversationKey: key,
      conversationId: activeConversation.conversationId,
      conversationType: "direct",
      myReadSeq: currentReadState?.myReadSeq ?? activeConversation.lastReadSeq ?? 0,
      peerReadSeq,
      lastMessageSeq: Math.max(
        currentReadState?.lastMessageSeq ?? 0,
        activeConversation.lastMessageSeq ?? 0,
      ),
      unreadCount: currentReadState?.unreadCount ?? activeConversation.unreadCount ?? 0,
      pendingReadSeq: currentReadState?.pendingReadSeq,
      updatedAt: Date.now(),
    });
    queryClient.setQueriesData<MessageItemDto[]>(
      {
        predicate: (query) =>
          query.queryKey[0] === "pc-im-messages" &&
          query.queryKey.includes(activeConversation.conversationId),
      },
      (old) =>
        old
          ? applyDirectReadReceiptToMessages(old, peerReadSeq, unreadIdentity)
          : old,
    );
  }, [
    activeConversation,
    activeConversationType,
    directReadStatusQuery.data,
    markImPeerReadReceipt,
    queryClient,
    unreadIdentity,
    upsertImReadState,
  ]);
  useEffect(() => {
    if (!activeConversation || !session || !activeConversationType) return;
    if (activeConversationId !== activeConversation.conversationId) return;
    if (messages.length === 0) return;
    const key = imConversationKey(
      activeConversationType,
      activeConversation.conversationId,
    );
    const stateByConversation = useWorkspaceStore.getState().imReadStateByConversation;
    const result = reduceImCoreEvent({
      identity: unreadIdentity,
      stateByConversation,
      event: {
        type: "ui.conversation_opened",
        conversationId: activeConversation.conversationId,
        conversationType: activeConversationType,
        loadedMessages: messages,
        conversation: {
          lastMessageSeq: activeConversation.lastMessageSeq ?? 0,
          myReadSeq: activeConversation.lastReadSeq ?? 0,
        },
      },
    });
    const nextState = result.stateByConversation[key];
    if (nextState && readStateMeaningfullyChanged(stateByConversation[key], nextState)) {
      upsertImReadState(nextState);
    }
    if (result.commands.length > 0) {
      executeImCoreCommands(result.commands);
    }
  }, [
    activeConversation,
    activeConversationId,
    activeConversationType,
    executeImCoreCommands,
    messages,
    session,
    upsertImReadState,
    unreadIdentity,
  ]);
  const loading = conversationsQuery.isLoading;
  const errorText = conversationsQuery.error
    ? `会话列表加载失败：${formatError(conversationsQuery.error)}`
    : messagesQuery.error
      ? `消息加载失败：${formatError(messagesQuery.error)}`
      : null;

  useEffect(() => {
    if (!messageMenu) return undefined;
    const close = () => setMessageMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", close);
    };
  }, [messageMenu]);

  useEffect(() => {
    if (!conversationMenu) return undefined;
    const close = () => setConversationMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", close);
    };
  }, [conversationMenu]);

  useEffect(() => {
    if (!avatarProfilePopover) return undefined;
    const close = () => setAvatarProfilePopover(null);
    window.addEventListener("click", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", close);
    };
  }, [avatarProfilePopover]);

  const openMessageMenu = useCallback(
    (event: MouseEvent<HTMLElement>, message: MessageItemDto) => {
      event.preventDefault();
      event.stopPropagation();
      setMessageMenu({
        message,
        x: Math.min(event.clientX, window.innerWidth - 260),
        y: Math.min(event.clientY, window.innerHeight - 340),
      });
    },
    [],
  );

  const openConversationMenu = useCallback(
    (event: MouseEvent<HTMLElement>, conversation: ConversationListItem) => {
      event.preventDefault();
      event.stopPropagation();
      setConversationMenu({
        conversation,
        x: Math.min(event.clientX, window.innerWidth - 240),
        y: Math.min(event.clientY, window.innerHeight - 220),
      });
    },
    [],
  );

  const handleConversationMenuAction = useCallback(
    (action: "mute" | "hide" | "delete", conversation: ConversationListItem) => {
      setConversationMenu(null);
      if (action === "mute") {
        setLocalMutedConversationIds((current) => {
          const next = new Set(current);
          if (conversation.isMuted || next.has(conversation.conversationId)) {
            next.delete(conversation.conversationId);
            setNotice("已在本地取消免打扰。服务端持久化需要接口支持。");
          } else {
            next.add(conversation.conversationId);
            setNotice("已在本地开启免打扰。服务端持久化需要接口支持。");
          }
          return next;
        });
        return;
      }
      if (action === "hide" || action === "delete") {
        if (
          action === "delete" &&
          !window.confirm("删除会话后将从当前 PC 列表隐藏。服务端持久化删除需要接口支持，确定继续吗？")
        ) {
          return;
        }
        setLocalHiddenConversationIds((current) => {
          const next = new Set(current);
          next.add(conversation.conversationId);
          return next;
        });
        if (activeConversationId === conversation.conversationId) {
          setActiveConversation("");
        }
        setNotice(action === "delete" ? "已从本地隐藏会话。服务端删除需要接口支持。" : "已在本地隐藏会话。");
      }
    },
    [activeConversationId, setActiveConversation],
  );

  const handleAvatarClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>, message: MessageItemDto, mine: boolean) => {
      event.preventDefault();
      event.stopPropagation();
      if (!activeConversation) return;
      setMessageMenu(null);
      setNotice(null);
      const rect = event.currentTarget.getBoundingClientRect();
      setAvatarProfilePopover(
        buildAvatarProfilePopover({
          conversation: activeConversation,
          groupMembers: groupMemberMap,
          message,
          mine,
          session,
          x: mine
            ? Math.max(16, Math.min(rect.right - 300, window.innerWidth - 332))
            : Math.min(rect.left + 44, window.innerWidth - 332),
          y: Math.max(12, Math.min(rect.top, window.innerHeight - 244)),
        }),
      );
    },
    [activeConversation, groupMemberMap, session],
  );

  const handleContactCardClick = useCallback(
    (event: MouseEvent<HTMLElement>, value: Record<string, unknown>) => {
      event.preventDefault();
      event.stopPropagation();
      setMessageMenu(null);
      setNotice(null);
      const rect = event.currentTarget.getBoundingClientRect();
      setAvatarProfilePopover(
        buildContactCardProfilePopover({
          value,
          x: Math.min(rect.left + 24, window.innerWidth - 332),
          y: Math.max(12, Math.min(rect.top, window.innerHeight - 284)),
        }),
      );
    },
    [],
  );

  const handleMenuAction = useCallback(
    async (action: MessageContextAction, message: MessageItemDto) => {
      setMessageMenu(null);
      setNotice(null);
      if (action === "multi_select") {
        setMultiSelectMode(true);
        setSelectedMessageIds(new Set([message.messageId]));
        setNotice("已进入多选模式。");
        return;
      }
      if (action === "copy") {
        const text = extractMessageText(message);
        if (!text) {
          setNotice("这条消息没有可复制的文本。");
          return;
        }
        await navigator.clipboard.writeText(text);
        setNotice("已复制。");
        return;
      }
      if (action === "copy_image" || action === "copy_media") {
        const url = resolveMessageMediaUrl(message, session?.apiBaseUrl);
        if (!url) {
          setNotice("这条媒体消息没有可复制的地址。");
          return;
        }
        try {
          const context = {
            accountId:
              session?.userId ||
              session?.platformUserId ||
              session?.lppId ||
              session?.tenantId,
            conversationId: activeConversation?.conversationId,
            fileName: mediaCacheFileName(message),
          };
          if (action === "copy_image") {
            await copyMessageImage(url, session?.tenantToken, context);
            setNotice("图片已复制。");
          } else {
            await copyMessageMediaFile(message, url, session?.tenantToken, context);
            setNotice("文件已复制。");
          }
        } catch (error) {
          setNotice(`复制失败：${formatError(error)}`);
        }
        return;
      }
      if (action === "reply") {
        setReplyTarget({
          messageId: message.messageId,
          sender: isMineMessage(message, session)
            ? "我"
            : message.senderDisplayName || activeConversation?.title || "对方",
          preview: messageActionPreview(message),
        });
        return;
      }
      if (action === "ai_reply") {
        setActiveModule("aiAssistant");
        setNotice("已打开 AI 助手，可基于当前消息起草回复。");
        return;
      }
      if (action === "translate") {
        setMessageAnnotations((current) => ({
          ...current,
          [message.messageId]: "译文：翻译中...",
        }));
        translateMutation.mutate(message);
        return;
      }
      if (action === "voice_to_text") {
        voiceToTextMutation.mutate(message);
        return;
      }
      if (
        action === "save_media_as" ||
        action === "reveal_in_folder" ||
        action === "open_media" ||
        action === "edit_media"
      ) {
        const url = resolveMessageMediaUrl(message, session?.apiBaseUrl);
        if (!url) {
          setNotice("这条媒体消息没有可处理的地址。");
          return;
        }
        try {
          const context = {
            accountId:
              session?.userId ||
              session?.platformUserId ||
              session?.lppId ||
              session?.tenantId,
            conversationId: activeConversation?.conversationId,
          };
          if (action === "save_media_as") {
            const savedPath = await saveMessageMediaAs(message, url, session?.tenantToken, context);
            if (savedPath) setNotice("已另存为。");
          } else if (action === "reveal_in_folder") {
            await revealMessageMediaInFolder(message, url, session?.tenantToken, context);
            setNotice(isMacPlatform() ? "已在 Finder 中显示。" : "已在文件夹中显示。");
          } else if (action === "open_media") {
            await openMessageMediaFile(message, url, session?.tenantToken, context);
            setNotice("已打开。");
          } else {
            await editMessageMediaFile(message, url, session?.tenantToken, context);
            setNotice("已打开编辑。");
          }
        } catch (error) {
          const prefix =
            action === "save_media_as"
              ? "另存为失败"
              : action === "reveal_in_folder"
                ? "显示文件位置失败"
                : action === "open_media"
                  ? "打开失败"
                  : "编辑失败";
          setNotice(`${prefix}：${formatError(error)}`);
        }
        return;
      }
      if (action === "forward") {
        setForwardTargetMessages([message]);
        return;
      }
      if (action === "favorite") {
        favoriteMutation.mutate(message);
        return;
      }
      if (action === "recall") {
        if (!window.confirm("确定撤回这条消息吗？")) return;
        recallMutation.mutate(message.messageId);
        return;
      }
      if (action === "delete") {
        if (!window.confirm("确定删除这条消息吗？删除后将从当前会话移除。")) return;
        deleteMutation.mutate(message.messageId);
      }
    },
    [
      activeConversation?.title,
      deleteMutation,
      favoriteMutation,
      recallMutation,
      session,
      setActiveModule,
      translateMutation,
      voiceToTextMutation,
    ],
  );

  const openConversationFromUserClick = useCallback(
    (conversation: ConversationListItem) => {
      autoSelectedConversationIdsRef.current.delete(conversation.conversationId);
      setActiveConversation(conversation.conversationId);

      const conversationType = getImConversationType(conversation);
      if (!session || !conversationType) return;
      void queryClient.invalidateQueries({
        queryKey: pcQueryKeys.imMessages(
          session.apiBaseUrl,
          session.tenantToken,
          conversationType,
          conversation.conversationId,
        ),
      });

      const unread = effectiveConversationUnreadCount(conversation, unreadIdentity);
      if (unread <= 0) {
        setUnreadJump(null);
        return;
      }

      setUnreadJump({
        conversationId: conversation.conversationId,
        count: unread,
        lastReadSeq: Number(conversation.lastReadSeq ?? 0),
      });
    },
    [
      queryClient,
      session,
      setActiveConversation,
      unreadIdentity,
    ],
  );

  useEffect(() => {
    if (!activeConversation || !session) return;
    if (activeConversationId !== activeConversation.conversationId) return;
    if (autoSelectedConversationIdsRef.current.has(activeConversation.conversationId)) {
      return;
    }
    const unread = effectiveConversationUnreadCount(activeConversation, unreadIdentity);
    if (unread <= 0) return;
    const readSeq =
      typeof activeConversation.lastMessageSeq === "number"
        ? activeConversation.lastMessageSeq
        : typeof activeConversation.lastReadSeq === "number"
          ? activeConversation.lastReadSeq
          : 0;
    if (readSeq <= 0) return;
    setUnreadJump((current) =>
      current?.conversationId === activeConversation.conversationId
        ? current
        : {
            conversationId: activeConversation.conversationId,
            count: unread,
            lastReadSeq: Number(activeConversation.lastReadSeq ?? 0),
          },
    );
  }, [
    activeConversation?.conversationId,
    activeConversation?.lastMessage?.messageId,
    activeConversation?.lastMessageSeq,
    activeConversation?.lastReadSeq,
    activeConversation?.unreadCount,
    activeConversationId,
    session,
    unreadIdentity,
  ]);

  const handleUnreadJump = useCallback(() => {
    if (!unreadJump || unreadJump.conversationId !== activeConversation?.conversationId) {
      return;
    }
    if (messageSearchOpen) {
      setMessageSearchOpen(false);
      setMessageSearchKeyword("");
    }
    const target = findFirstUnreadLoadedMessage(
      messages,
      unreadJump,
      session,
    );
    if (!target) {
      setNotice("第一条未读不在当前已加载记录里，请向上加载更多历史消息后再查看。");
      return;
    }
    const scrollToTarget = () => {
      const element = messageElementRefs.current.get(target.messageId);
      if (!element) {
        setNotice("第一条未读不在当前筛选结果中，请清空搜索后查看。");
        return;
      }
      element.scrollIntoView({ block: "center", behavior: "smooth" });
      element.classList.add("pc-chat-unread-target");
      window.setTimeout(() => element.classList.remove("pc-chat-unread-target"), 1400);
      setUnreadJump(null);
    };
    requestAnimationFrame(scrollToTarget);
    window.setTimeout(scrollToTarget, 80);
  }, [activeConversation?.conversationId, messageSearchOpen, messages, session, unreadJump]);

  const scrollToMessage = useCallback((messageId: string) => {
    const scroll = () => {
      const element = messageElementRefs.current.get(messageId);
      if (!element) {
        setNotice("这条消息不在当前已加载记录里，请调整筛选或加载更多历史消息。");
        return;
      }
      element.scrollIntoView({ block: "center", behavior: "smooth" });
      element.classList.add("pc-chat-unread-target");
      window.setTimeout(() => element.classList.remove("pc-chat-unread-target"), 1200);
    };
    requestAnimationFrame(scroll);
    window.setTimeout(scroll, 80);
  }, []);

  const handleBatchDeleteSelected = useCallback(async () => {
    const messageIds = Array.from(selectedMessageIds);
    if (messageIds.length === 0) return;
    if (!window.confirm(`确定删除已选择的 ${messageIds.length} 条消息吗？`)) return;
    const results = await Promise.allSettled(
      messageIds.map((messageId) => deleteMutation.mutateAsync(messageId)),
    );
    const failedCount = results.filter((result) => result.status === "rejected").length;
    setMultiSelectMode(false);
    setSelectedMessageIds(new Set());
    if (failedCount > 0) {
      setNotice(`已删除 ${messageIds.length - failedCount} 条，${failedCount} 条失败，请稍后重试。`);
    } else {
      setNotice(`已删除 ${messageIds.length} 条消息。`);
    }
  }, [deleteMutation, selectedMessageIds]);

  return (
    <>
      <section className="e-panel e-conversation-panel">
        <header className="e-panel-header">
          <div>
            <h1>消息</h1>
          </div>
          <button
            className="e-icon-button primary"
            type="button"
            aria-label="发起聊天"
            title="发起聊天需接入联系人选择"
            disabled
          >
            <MessageSquarePlus size={18} />
          </button>
        </header>

        <label className="e-search">
          <Search size={17} />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索会话、联系人、群聊"
          />
        </label>

        <nav className="e-filter-row" aria-label="消息筛选">
          {filterTabs.map((tab) => (
            <button
              className={messageFilter === tab.key ? "selected" : ""}
              key={tab.key}
              type="button"
              onClick={() => setMessageFilter(tab.key)}
            >
              {tab.label}
              {tab.key === "unread" && <em>{counts.unread}</em>}
            </button>
          ))}
        </nav>

        {errorText && <p className="message-notice error">{errorText}</p>}

        <div className="e-conversation-list" aria-label="消息会话列表">
          {loading && <PanelState text="正在加载消息..." />}
          {!loading &&
            visibleConversations.map((item) => (
              <ConversationRow
                active={item.conversationId === activeConversation?.conversationId}
                conversation={item}
                draft={
                  draftPreviewsByConversation[item.conversationId] ??
                  draftsByConversation[item.conversationId]
                }
                key={item.conversationId}
                onClick={() => openConversationFromUserClick(item)}
                onContextMenu={(event) => openConversationMenu(event, item)}
                userIdentity={unreadIdentity}
              />
            ))}
          {!loading && visibleConversations.length === 0 && (
            <PanelState text={keyword ? "没有匹配的普通 IM 会话" : "暂无普通 IM 会话"} />
          )}
        </div>
      </section>

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

      <main
        ref={chatPanelRef}
        className={`e-chat-panel ${activeConversationIsGroup ? "group-chat-mode" : ""}`}
        style={{ "--composer-height": `${composerHeight}px` } as CSSProperties}
      >
        {activeConversation ? (
          <>
            <header className="e-chat-header">
              <div className={`e-chat-title ${activeConversationIsGroup ? "group-title" : ""}`}>
                {!activeConversationIsGroup && (
                  <ConversationAvatar
                    conversation={activeConversation}
                    userIdentity={unreadIdentity}
                  />
                )}
                <div>
                  <h2>{activeConversation.title}</h2>
                  {!activeConversationIsGroup && (
                    <p>
                      {conversationMetaText(
                        activeConversation,
                        unreadIdentity,
                      )}
                    </p>
                  )}
                </div>
              </div>
              <div className="e-chat-actions">
                <button
                  className={`e-icon-button ${messageSearchOpen ? "active" : ""}`}
                  type="button"
                  aria-label={activeConversationIsGroup ? "查找聊天记录" : "查找"}
                  title={activeConversationIsGroup ? "查找聊天记录" : "查找"}
                  onClick={() => {
                    setMessageSearchOpen((value) => !value);
                    setHistoryOpen(false);
                  }}
                >
                  <Search size={18} />
                </button>
                {!activeConversationIsGroup && (
                  <button
                    className={`e-icon-button ${historyOpen ? "active" : ""}`}
                    type="button"
                    aria-label="历史"
                    title="历史"
                    onClick={() => {
                      setHistoryOpen((value) => !value);
                      setMessageSearchOpen(false);
                    }}
                  >
                    <Clock3 size={18} />
                  </button>
                )}
                <button
                  className={`e-icon-button ${messageProfileVisible ? "active" : ""}`}
                  type="button"
                  aria-label={activeConversationIsGroup ? "群资料" : "资料"}
                  title={activeConversationIsGroup ? "群资料" : "资料"}
                  aria-pressed={messageProfileVisible}
                  onClick={() => setMessageProfileVisible(!messageProfileVisible)}
                >
                  <PanelRight size={18} />
                </button>
              </div>
            </header>

            {notice && <ChatToastNotice text={notice} />}

            <section
              className="e-message-stage"
              aria-label="消息内容"
              onLoadCapture={() => {
                if (isMessageStageNearBottom()) scrollMessagesToBottom("auto");
              }}
              onScroll={handleMessageStageScroll}
              ref={messageStageRef}
            >
              {messageSearchOpen && (
                <div className="chat-inline-panel">
                  <label className="chat-inline-search">
                    <Search size={15} />
                    <input
                      value={messageSearchKeyword}
                      onChange={(event) => setMessageSearchKeyword(event.target.value)}
                      placeholder="在当前会话中查找消息"
                      autoFocus
                    />
                    {messageSearchKeyword && (
                      <button
                        type="button"
                        aria-label="清空查找"
                        onClick={() => setMessageSearchKeyword("")}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </label>
                  <span>
                    {messageSearchKeyword
                      ? `${visibleMessages.length} 条匹配`
                      : "输入关键词后筛选当前会话消息"}
                  </span>
                </div>
              )}
              {historyOpen && (
                <div className="chat-history-panel">
                  <div>
                    <strong>历史记录</strong>
                    <span>
                      当前已加载 {messages.length} 条消息
                      {messages[0]?.sentAt ? ` · 最早 ${formatChatTime(messages[0].sentAt)}` : ""}
                      {messages[messages.length - 1]?.sentAt
                        ? ` · 最新 ${formatChatTime(messages[messages.length - 1].sentAt)}`
                        : ""}
                    </span>
                  </div>
                  <div className="chat-history-tags" aria-label="聊天历史快捷筛选">
                    {historyFilterTabs.map((tab) => {
                      const Icon = tab.icon;
                      const count = historyCounts[tab.key] ?? 0;
                      return (
                        <button
                          className={historyFilter === tab.key ? "selected" : ""}
                          type="button"
                          key={tab.key}
                          onClick={() => setHistoryFilter(tab.key)}
                          disabled={tab.key !== "all" && count === 0}
                        >
                          <Icon size={14} />
                          {tab.label}
                          <em>{count}</em>
                        </button>
                      );
                    })}
                  </div>
                  {(historyFilter !== "all" || messageSearchKeyword.trim()) && (
                    <div className="chat-history-results" aria-label="历史筛选结果">
                      {visibleMessages.slice(0, 8).map((message) => (
                        <button
                          type="button"
                          key={message.messageId}
                          onClick={() => scrollToMessage(message.messageId)}
                        >
                          <span>{formatChatTime(message.sentAt)}</span>
                          <strong>{messageActionPreview(message)}</strong>
                        </button>
                      ))}
                      {visibleMessages.length === 0 && (
                        <PanelState text="没有符合条件的聊天记录" />
                      )}
                    </div>
                  )}
                </div>
              )}
              {unreadJump?.conversationId === activeConversation.conversationId && (
                <button
                  className="pc-chat-unread-jump"
                  type="button"
                  onClick={handleUnreadJump}
                >
                  <ChevronsUp size={15} aria-hidden="true" />
                  ↑↑ {unreadJump.count} 条新消息
                </button>
              )}
              {pendingNewMessageCount > 0 && (
                <button
                  className="pc-chat-latest-jump"
                  type="button"
                  onClick={jumpToLatest}
                >
                  ↓ {pendingNewMessageCount} 条新消息
                </button>
              )}
              <div className="e-day-divider">今天</div>
              {messagesQuery.isLoading && <PanelState text="正在加载聊天记录..." />}
              {!messagesQuery.isLoading &&
                visibleMessages.map((message) => {
                  const mine = isMineMessage(message, session);
                  const eventText = eventMessageText(message);
                  const statusText = modelBackedMessageReadStatusText(
                    message,
                    activeConversation,
                    activeConversationReadState,
                    unreadIdentity,
                  );
                  return (
                    <div
                      className={`pc-chat-select-row ${mine ? "mine" : "other"} ${
                        multiSelectMode ? "selecting" : ""
                      } ${eventText ? "event" : ""} ${
                        selectedMessageIds.has(message.messageId) ? "selected" : ""
                      }`}
                      key={message.messageId}
                      ref={(element) => {
                        if (element) {
                          messageElementRefs.current.set(message.messageId, element);
                        } else {
                          messageElementRefs.current.delete(message.messageId);
                        }
                      }}
                    >
                      {multiSelectMode && !eventText && (
                        <button
                          className="pc-chat-select-check"
                          type="button"
                          aria-label={`选择消息 ${messageActionPreview(message)}`}
                          aria-pressed={selectedMessageIds.has(message.messageId)}
                          onClick={() =>
                            setSelectedMessageIds((current) => {
                              const next = new Set(current);
                              if (next.has(message.messageId)) {
                                next.delete(message.messageId);
                              } else {
                                next.add(message.messageId);
                              }
                              return next;
                            })
                          }
                        >
                          <Check size={15} strokeWidth={3} />
                        </button>
                      )}
                      {eventText ? (
                        <div className="pc-chat-event-pill">{eventText}</div>
                      ) : (
                        <ChatMessageBubble
                          message={message}
                          mine={mine}
                          assetBaseUrl={session?.apiBaseUrl}
                          authToken={session?.tenantToken}
                          mediaCacheContext={{
                            accountId:
                              session?.userId ||
                              session?.platformUserId ||
                              session?.lppId ||
                              session?.tenantId,
                            conversationId: activeConversation.conversationId,
                          }}
                          fallbackInitial={avatarInitial(activeConversation.title)}
                          mineAvatarUrlFallback={session?.avatarUrl}
                          onAvatarClick={handleAvatarClick}
                          onContactClick={handleContactCardClick}
                          onContextMenu={multiSelectMode ? undefined : openMessageMenu}
                          onUploadAction={handleUploadAction}
                          senderFallback={resolveSenderDisplayName(
                            message,
                            activeConversation,
                            groupMemberMap,
                          )}
                          senderAvatarUrlFallback={resolveSenderAvatarUrl(message, groupMemberMap)}
                          statusText={
                            shouldShowFileInlineStatus(message)
                              ? undefined
                              : statusText
                          }
                          timeText={formatChatTime(message.sentAt)}
                          translationText={messageAnnotations[message.messageId]}
                        />
                      )}
                    </div>
                  );
                })}
              <div ref={messagesBottomRef} className="pc-chat-bottom-sentinel" />
              {!messagesQuery.isLoading && visibleMessages.length === 0 && (
                <PanelState
                  text={
                    messageSearchKeyword
                      ? "没有匹配的消息"
                      : "暂无消息，发送第一条消息开始沟通。"
                  }
                />
              )}
            </section>

            {messageMenu && (
              <MessageContextMenu
                mine={isMineMessage(messageMenu.message, session)}
                message={messageMenu.message}
                onAction={(action) => void handleMenuAction(action, messageMenu.message)}
                position={{ x: messageMenu.x, y: messageMenu.y }}
              />
            )}
            {conversationMenu && (
              <ConversationContextMenu
                conversation={conversationMenu.conversation}
                onAction={(action) =>
                  handleConversationMenuAction(action, conversationMenu.conversation)
                }
                position={{ x: conversationMenu.x, y: conversationMenu.y }}
              />
            )}

            {avatarProfilePopover && (
              <AvatarProfilePopover
                profile={avatarProfilePopover}
                onClose={() => setAvatarProfilePopover(null)}
              />
            )}

            {replyTarget && (
              <div className="composer-reply-preview" role="status">
                <Reply size={15} />
                <span>
                  回复 {replyTarget.sender}：{replyTarget.preview}
                </span>
                <button
                  type="button"
                  aria-label="取消回复"
                  onClick={() => setReplyTarget(null)}
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {multiSelectMode && (
              <div className="pc-multi-select-bar" role="status">
                <span>已选择 {selectedMessageIds.size} 条</span>
                <button
                  type="button"
                  onClick={() => {
                    setForwardTargetMessages(
                      messages.filter((item) => selectedMessageIds.has(item.messageId)),
                    );
                  }}
                  disabled={selectedMessageIds.size === 0}
                >
                  <Forward size={15} />
                  转发
                </button>
                <button
                  type="button"
                  onClick={() => void handleBatchDeleteSelected()}
                  disabled={selectedMessageIds.size === 0}
                >
                  <Trash2 size={15} />
                  删除
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMultiSelectMode(false);
                    setSelectedMessageIds(new Set());
                  }}
                >
                  <X size={15} />
                  取消
                </button>
              </div>
            )}

            <MessageComposer
              dense
              attachmentUi="compact"
              attachmentScopeKey={activeConversation.conversationId}
              combinedAttachmentTool
              enableScreenshot
              screenshotShortcut={pcSettings.screenshotShortcut}
              placeholder="输入消息..."
              disabled={false}
              draftValue={activeConversationDraft}
              draftEditorState={
                draftEditorStatesByConversation[activeConversation.conversationId]
              }
              mentionOptions={
                activeConversationType === "group"
                  ? buildMentionOptions(groupMembersQuery.data ?? [])
                  : []
              }
              onDraftChange={(value) => {
                if (!activeConversation) return;
                setDraftsByConversation((current) => ({
                  ...current,
                  [activeConversation.conversationId]: value,
                }));
              }}
              onDraftPreviewChange={(value) => {
                if (!activeConversation) return;
                setDraftPreviewsByConversation((current) => ({
                  ...current,
                  [activeConversation.conversationId]: value,
                }));
              }}
              onDraftEditorStateChange={(value) => {
                if (!activeConversation) return;
                setDraftEditorStatesByConversation((current) => ({
                  ...current,
                  [activeConversation.conversationId]: value,
                }));
              }}
              onResizeStart={(event) => {
                const keepBottomAligned = isMessageStageNearBottom(96);
                startVerticalPaneResize(event, {
                  initialHeight: composerHeight,
                  onResize: (height) => {
                    setComposerHeight(
                      clampComposerHeight(height, getChatPanelHeight()),
                    );
                    if (keepBottomAligned) {
                      scrollMessagesToBottom("auto");
                    }
                  },
                });
              }}
              leadingTools={
                <>
                  <button
                    className="composer-advanced-tool"
                    type="button"
                    aria-label="快捷话术"
                    title="快捷话术"
                    onClick={() => setActiveModule("knowledgeBase")}
                  >
                    <MessageSquareQuote size={16} />
                    <span>话术</span>
                  </button>
                  <button
                    className="composer-advanced-tool"
                    type="button"
                    aria-label="知识库"
                    title="知识库"
                    onClick={() => setActiveModule("knowledgeBase")}
                  >
                    <ClipboardList size={16} />
                    <span>知识库</span>
                  </button>
                  <button
                    className="composer-advanced-tool"
                    type="button"
                    aria-label="AI 起草"
                    title="AI 起草"
                    onClick={() => setActiveModule("aiAssistant")}
                  >
                    <Sparkles size={16} />
                    <span>AI起草</span>
                  </button>
                </>
              }
              extraTools={
                <button
                  className="composer-advanced-tool"
                  type="button"
                  aria-label="翻译"
                  title="翻译"
                >
                  <Languages size={16} />
                  <span>翻译</span>
                </button>
              }
              onSendText={sendTextOptimistically}
              onTranslateDraft={async (content) =>
                extractActionResultText(
                  await requireApiClient(session).translateText(content),
                )
              }
              onSendMedia={sendMediaOptimistically}
            />

            {forwardTargetMessages.length > 0 && (
              <ForwardDialog
                activeConversationId={activeConversation.conversationId}
                conversations={conversations}
                messages={forwardTargetMessages}
                pending={forwardMutation.isPending}
                userIdentity={unreadIdentity}
                onClose={() => setForwardTargetMessages([])}
                onForward={(targetConversationId) =>
                  forwardMutation.mutate({
                    messages: forwardTargetMessages,
                    targetConversationId,
                  })
                }
              />
            )}
          </>
        ) : (
          <PanelState text="请选择一个普通 IM 会话" />
        )}
      </main>

      {messageProfileVisible && (
        <>
          <div
            className="resizer profile-resizer"
            role="separator"
            aria-label="调整客户资料宽度"
            onPointerDown={(event) =>
              startHorizontalPaneResize(event, {
                initialWidth: profilePaneWidth,
                onResize: setProfilePaneWidth,
                direction: -1,
              })
            }
          />

          <ConversationInfoPanel
            conversation={activeConversation}
            groupMembers={groupMembersQuery.data ?? []}
            loadingGroupMembers={groupMembersQuery.isLoading}
            userIdentity={unreadIdentity}
          />
        </>
      )}
    </>
  );
}

function ConversationRow({
  conversation,
  active,
  draft,
  onClick,
  onContextMenu,
  userIdentity,
}: {
  conversation: ConversationListItem;
  active: boolean;
  draft?: string;
  onClick: () => void;
  onContextMenu: (event: MouseEvent<HTMLElement>) => void;
  userIdentity?: CurrentUserIdentity | null;
}) {
  const draftText = draft?.trim();
  return (
    <button
      className={`e-conversation-row ${active ? "active" : ""}`}
      type="button"
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      <ConversationAvatar
        conversation={conversation}
        badge
        userIdentity={userIdentity}
      />
      <span className="e-conversation-copy">
        <strong>{conversation.title || "未命名会话"}</strong>
        {draftText ? (
          <small className="e-conversation-draft">
            <span className="e-draft-prefix">[草稿]</span>
            <span className="e-draft-preview">{renderWechatEmojiText(draftText)}</span>
          </small>
        ) : (
          <small>{renderWechatEmojiText(conversation.lastMessage?.preview || "暂无最近消息")}</small>
        )}
      </span>
      <span className="e-conversation-side">
        <time>{formatChatTime(conversation.lastMessage?.sentAt)}</time>
        {conversation.isMuted && <BellOff className="e-muted-icon" size={15} />}
      </span>
    </button>
  );
}

function ConversationAvatar({
  conversation,
  badge = false,
  userIdentity,
}: {
  conversation: ConversationListItem;
  badge?: boolean;
  userIdentity?: CurrentUserIdentity | null;
}) {
  const isGroup = conversation.conversationType === "group";
  const unread = effectiveConversationUnreadCount(conversation, userIdentity);
  return (
    <PcAvatar
      avatarUrl={conversation.avatarUrl}
      className={`e-avatar e-avatar-badge-host ${isGroup ? "green" : "indigo"}`}
      kind={isGroup ? "group" : "person"}
      name={conversation.title || "未命名会话"}
    >
      {badge && unread > 0 && (
        <em className="e-avatar-unread">{unread}</em>
      )}
    </PcAvatar>
  );
}

function ConversationInfoPanel({
  conversation,
  groupMembers,
  loadingGroupMembers = false,
  userIdentity,
}: {
  conversation?: ConversationListItem;
  groupMembers?: GroupMemberDto[];
  loadingGroupMembers?: boolean;
  userIdentity?: CurrentUserIdentity | null;
}) {
  const [activeTab, setActiveTab] = useState("资料");
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    setActiveTab("资料");
  }, [conversation?.conversationId]);

  if (!conversation) {
    return (
      <aside className="e-profile-panel message-info-panel">
        <header className="customer-info-head">
          <h2>会话资料</h2>
        </header>
        <PanelState text="请选择会话查看资料。" />
      </aside>
    );
  }
  const isGroup = conversation.conversationType === "group";
  if (!isGroup) {
    return (
      <CustomerProfileWorkspace
        className="e-profile-panel message-info-panel"
        conversation={conversation}
        title="客户信息"
      />
    );
  }
  const tabs = isGroup ? ["资料", "成员", "公告", "文件"] : ["资料", "账户", "行为", "工单"];
  const unread = effectiveConversationUnreadCount(conversation, userIdentity);
  const selectedTab = tabs.includes(activeTab) ? activeTab : "资料";
  return (
    <aside className="e-profile-panel customer-info-panel message-info-panel">
      <header className="customer-info-head">
        <h2>{isGroup ? "群聊资料" : "客户信息"}</h2>
      </header>
      <section className="customer-info-card">
        <div className="customer-info-identity">
          <ConversationAvatar
            conversation={conversation}
            userIdentity={userIdentity}
          />
          <div>
            <strong>{conversation.title}</strong>
            <p>
              <span>{isGroup ? "群聊" : "好友私聊"}</span>
              {unread > 0 && <span>{unread} 条未读</span>}
            </p>
          </div>
        </div>
        <nav className="customer-info-tabs" aria-label="消息资料页签">
          {tabs.map((tab) => (
            <button
              className={selectedTab === tab ? "active" : ""}
              type="button"
              key={tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>
        {renderConversationInfoTab(selectedTab, conversation, unread, groupMembers ?? [], loadingGroupMembers)}
      </section>
      {selectedTab === "资料" && expanded && (
        <section className="customer-info-block">
          <h3>{isGroup ? "群聊概览" : "会话概览"}</h3>
          <div className="customer-info-rows">
            <InfoRow label="置顶" value={conversation.isPinned ? "已置顶" : "--"} />
            <InfoRow label="未读消息" value={String(unread)} />
            <InfoRow label="最后时间" value={formatChatTime(conversation.lastMessage?.sentAt)} />
          </div>
        </section>
      )}
      {selectedTab === "资料" && (
        <button
          className="message-info-collapse"
          type="button"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "收起群资料" : "展开群资料"}
        </button>
      )}
    </aside>
  );
}

function renderConversationInfoTab(
  tab: string,
  conversation: ConversationListItem,
  unread: number,
  groupMembers: GroupMemberDto[] = [],
  loadingGroupMembers = false,
) {
  const isGroup = conversation.conversationType === "group";
  if (isGroup) {
    if (tab === "成员") {
      return (
        <>
          <div className="customer-info-rows">
            <InfoRow
              label="成员数"
              value={String((conversation.memberCount ?? groupMembers.length) || "--")}
            />
            <InfoRow label="群主" value={conversation.ownerDisplayName || "--"} />
            <InfoRow label="我的身份" value={conversation.myRole || "--"} />
          </div>
          {loadingGroupMembers && <PanelState text="正在加载群成员..." />}
          {!loadingGroupMembers && groupMembers.length > 0 && (
            <div className="group-member-list" aria-label="群成员列表">
              {groupMembers.slice(0, 24).map((member) => (
                <div key={member.userId || member.displayName}>
                  <PcAvatar
                    avatarUrl={member.avatarUrl}
                    className="group-member-avatar"
                    name={member.displayName}
                  />
                  <span>{member.displayName || "成员"}</span>
                  {(member.role || member.memberRole) && (
                    <em>{member.role || member.memberRole}</em>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      );
    }
    if (tab === "公告") {
      return <PanelState text="暂无群公告" />;
    }
    if (tab === "文件") {
      return <PanelState text="暂无群文件" />;
    }
  } else {
    if (tab === "账户") {
      return (
        <div className="customer-info-rows">
          <InfoRow label="用户 ID" value={conversation.peerUserId || "--"} />
          <InfoRow label="LPP 号" value={conversation.peerLppId || "--"} />
          <InfoRow label="手机号" value={conversation.peerPhoneMasked || "--"} />
          <InfoRow label="邮箱" value={conversation.peerEmailMasked || "--"} />
        </div>
      );
    }
    if (tab === "行为") {
      return (
        <div className="customer-info-rows">
          <InfoRow label="未读消息" value={String(unread)} />
          <InfoRow label="最近消息" value={renderWechatEmojiText(conversation.lastMessage?.preview || "--")} />
          <InfoRow label="最后时间" value={formatChatTime(conversation.lastMessage?.sentAt)} />
          <InfoRow label="免打扰" value={conversation.isMuted ? "已开启" : "未开启"} />
        </div>
      );
    }
    if (tab === "工单") {
      return <PanelState text="暂无关联工单" />;
    }
  }
  return (
    <>
      <div className="customer-info-rows">
        <InfoRow label="会话类型" value={isGroup ? "群聊" : "好友私聊"} />
        <InfoRow
          label={isGroup ? "成员数" : "用户 ID"}
          value={isGroup ? String(conversation.memberCount ?? "--") : conversation.peerUserId || "--"}
        />
        <InfoRow label="免打扰" value={conversation.isMuted ? "已开启" : "未开启"} />
        <InfoRow label="最近消息" value={renderWechatEmojiText(conversation.lastMessage?.preview || "--")} />
      </div>
      <div className="customer-info-tags">
        {(isGroup ? ["群聊", "企业协作"] : ["好友", "IM"]).map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
        {!isGroup && <button type="button">+ 添加</button>}
      </div>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="customer-info-row">
      <span>{label}</span>
      <strong>{value || "--"}</strong>
    </div>
  );
}

function PanelState({ text }: { text: string }) {
  return <div className="panel-state muted">{text}</div>;
}

function AvatarProfilePopover({
  onClose,
  profile,
}: {
  onClose: () => void;
  profile: AvatarProfilePopoverState;
}) {
  return (
    <aside
      className="pc-avatar-profile-popover"
      style={{ left: profile.x, top: profile.y }}
      role="dialog"
      aria-label="头像资料"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        className="pc-avatar-profile-close"
        type="button"
        aria-label="关闭头像资料"
        onClick={onClose}
      >
        <X size={14} />
      </button>
      <div className="pc-avatar-profile-head">
        <PcAvatar
          avatarUrl={profile.avatarUrl}
          className="pc-avatar-profile-image"
          name={profile.title}
        />
        <div>
          <strong>{profile.title}</strong>
          <span>{profile.subtitle}</span>
        </div>
      </div>
      <div className="pc-avatar-profile-rows">
        {profile.rows.map((row) => (
          <div key={row.label}>
            <span>{row.label}</span>
            <strong>{row.value || "--"}</strong>
          </div>
        ))}
      </div>
    </aside>
  );
}

type MessageContextAction =
  | "multi_select"
  | "reply"
  | "ai_reply"
  | "copy"
  | "copy_image"
  | "copy_media"
  | "open_media"
  | "edit_media"
  | "translate"
  | "voice_to_text"
  | "save_media_as"
  | "reveal_in_folder"
  | "forward"
  | "favorite"
  | "recall"
  | "delete";

function MessageContextMenu({
  message,
  mine,
  onAction,
  position,
}: {
  message: MessageItemDto;
  mine: boolean;
  onAction: (action: MessageContextAction) => void;
  position: { x: number; y: number };
}) {
  const isText = isTextLikeMessage(message);
  const isImage = isImageMessage(message);
  const isVideo = isVideoMessage(message);
  const isVoice = normalizeMessageType(message) === "voice";
  const hasMedia = hasOpenableMedia(message);
  const canCopyMediaFile = Boolean(window.desktopApi?.copyMediaFile || window.desktopApi?.cacheMediaFile);
  const serverUsable = isServerUsableMessage(message);
  const recallable = mine && serverUsable && isRecentMessage(message, 2);
  const fallbackItems: Array<{
    action: MessageContextAction;
    label: string;
    icon: ReactNode;
    danger?: boolean;
  }> = [
    ...(serverUsable
      ? [
          {
            action: "multi_select" as const,
            label: "多选",
            icon: <CheckSquare size={15} />,
          },
          { action: "reply" as const, label: "引用", icon: <Reply size={15} /> },
        ]
      : []),
    ...(isText
      ? [
          { action: "copy" as const, label: "复制", icon: <Copy size={15} /> },
          {
            action: "ai_reply" as const,
            label: "AI 回复",
            icon: <Sparkles size={15} />,
          },
          {
            action: "translate" as const,
            label: "翻译",
            icon: <Languages size={15} />,
          },
        ]
      : []),
    ...(isImage && hasMedia
      ? [
          {
            action: "copy_image" as const,
            label: "复制图片",
            icon: <FileImage size={15} />,
          },
        ]
      : []),
    ...(serverUsable && isVoice
      ? [
          {
            action: "voice_to_text" as const,
            label: "转文字",
            icon: <TextCursorInput size={15} />,
          },
        ]
      : []),
    ...(hasMedia
      ? [
          {
            action: "save_media_as" as const,
            label: "另存为",
            icon: <Download size={15} />,
          },
          {
            action: "reveal_in_folder" as const,
            label: revealInFolderLabel(),
            icon: <FolderOpen size={15} />,
          },
        ]
      : []),
    ...(serverUsable
      ? [
          { action: "forward" as const, label: "转发", icon: <Forward size={15} /> },
          { action: "favorite" as const, label: "收藏", icon: <Star size={15} /> },
        ]
      : []),
    ...(recallable
      ? [
          {
            action: "recall" as const,
            label: "撤回",
            icon: <Undo2 size={15} />,
            danger: true,
          },
        ]
      : []),
    {
      action: "delete",
      label: "删除",
      icon: <Trash2 size={15} />,
      danger: true,
    },
  ];
  const mediaItems: typeof fallbackItems = [
    ...(isImage || canCopyMediaFile
      ? [
          {
            action: isImage ? ("copy_image" as const) : ("copy_media" as const),
            label: "复制",
            icon: isImage ? <FileImage size={15} /> : <Copy size={15} />,
          },
        ]
      : []),
    {
      action: "save_media_as",
      label: "另存为...",
      icon: <Download size={15} />,
    },
    {
      action: "open_media",
      label: "打开",
      icon: <FileText size={15} />,
    },
    ...(!isVideo
      ? [
          {
            action: "edit_media" as const,
            label: "编辑",
            icon: <Edit3 size={15} />,
          },
        ]
      : []),
    {
      action: "reveal_in_folder",
      label: revealInFolderLabel(),
      icon: <FolderOpen size={15} />,
    },
    ...(serverUsable
      ? [
          { action: "forward" as const, label: "转发...", icon: <Forward size={15} /> },
          { action: "favorite" as const, label: "收藏", icon: <Star size={15} /> },
          {
            action: "multi_select" as const,
            label: "多选",
            icon: <CheckSquare size={15} />,
          },
          { action: "reply" as const, label: "引用", icon: <Reply size={15} /> },
        ]
      : []),
    ...(recallable
      ? [
          {
            action: "recall" as const,
            label: "撤回",
            icon: <Undo2 size={15} />,
            danger: true,
          },
        ]
      : []),
    {
      action: "delete",
      label: "删除",
      icon: <Trash2 size={15} />,
      danger: true,
    },
  ];
  const items = hasMedia ? mediaItems : fallbackItems;

  return (
    <div
      className="message-context-menu"
      role="menu"
      style={{ left: position.x, top: position.y }}
      onClick={(event) => event.stopPropagation()}
    >
      {items.map((item) => (
        <button
          className={item.danger ? "danger" : ""}
          key={item.action}
          type="button"
          role="menuitem"
          onClick={() => onAction(item.action)}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

function ConversationContextMenu({
  conversation,
  onAction,
  position,
}: {
  conversation: ConversationListItem;
  onAction: (action: "mute" | "hide" | "delete") => void;
  position: { x: number; y: number };
}) {
  return (
    <div
      className="message-context-menu"
      role="menu"
      style={{ left: position.x, top: position.y }}
      onClick={(event) => event.stopPropagation()}
    >
      <button type="button" role="menuitem" onClick={() => onAction("mute")}>
        <BellOff size={15} />
        <span>{conversation.isMuted ? "取消免打扰" : "免打扰"}</span>
      </button>
      <button type="button" role="menuitem" onClick={() => onAction("hide")}>
        <X size={15} />
        <span>隐藏会话</span>
      </button>
      <button className="danger" type="button" role="menuitem" onClick={() => onAction("delete")}>
        <Trash2 size={15} />
        <span>删除会话</span>
      </button>
    </div>
  );
}

function ChatToastNotice({ text }: { text: string }) {
  return (
    <div
      className={`pc-chat-toast${isNoticeErrorText(text) ? " error" : ""}`}
      role="status"
      aria-live="polite"
    >
      {text}
    </div>
  );
}

function isNoticeErrorText(text: string) {
  return /失败|错误|异常|无法|不能|未能|请稍后重试/.test(text);
}

function ForwardDialog({
  activeConversationId,
  conversations,
  messages,
  pending,
  userIdentity,
  onClose,
  onForward,
}: {
  activeConversationId: string;
  conversations: ConversationListItem[];
  messages: MessageItemDto[];
  pending: boolean;
  userIdentity?: CurrentUserIdentity | null;
  onClose: () => void;
  onForward: (conversationId: string) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const preview = messages.length > 1
    ? `${messages.length} 条消息`
    : messageActionPreview(messages[0]);
  const targets = conversations
    .filter((item) => item.conversationId !== activeConversationId)
    .filter((item) =>
      item.title.toLowerCase().includes(keyword.trim().toLowerCase()),
    );
  return (
    <div className="pc-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="pc-forward-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="转发消息"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <h3>转发消息</h3>
            <p>{preview}</p>
          </div>
          <button type="button" aria-label="关闭" onClick={onClose}>
            <X size={16} />
          </button>
        </header>
        <label className="e-search compact">
          <Search size={15} />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索会话"
            autoFocus
          />
        </label>
        <div className="pc-forward-targets">
          {targets.map((item) => (
            <button
              key={item.conversationId}
              type="button"
              disabled={pending}
              onClick={() => onForward(item.conversationId)}
            >
              <ConversationAvatar conversation={item} userIdentity={userIdentity} />
              <span>
                <strong>{item.title}</strong>
                <small>{conversationMetaText(item, userIdentity)}</small>
              </span>
            </button>
          ))}
          {targets.length === 0 && <PanelState text="没有可转发的会话" />}
        </div>
      </section>
    </div>
  );
}

async function invalidateMessages(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["pc-im-messages"] }),
    queryClient.invalidateQueries({ queryKey: ["pc-im-conversations"] }),
  ]);
}

function appendLocalMessage(
  queryClient: ReturnType<typeof useQueryClient>,
  session: AuthSession | null,
  conversation: ConversationListItem,
  messageType: "text" | "image" | "video" | "file",
  body: Record<string, unknown>,
  result: { messageId?: string; conversationId?: string; conversationSeq?: number; serverTime?: string },
  options: {
    status?: string;
    localError?: string;
    uploadProgress?: number;
    localTaskId?: string;
  } = {},
) {
  const queryKey = pcQueryKeys.imMessages(
    session?.apiBaseUrl,
    session?.tenantToken,
    getImConversationType(conversation),
    conversation.conversationId,
  );
  const messageId = result.messageId || `pc-local-${Date.now()}`;
  const sentAt = result.serverTime || new Date().toISOString();
  const conversationSeq = result.conversationSeq;
  const next = normalizeMessageItem({
    messageId,
    body,
    conversationId: result.conversationId || conversation.conversationId,
    conversationSeq,
    direction: "out",
    isMine: true,
    isSelf: true,
    messageType,
    preview: previewFromOutgoingBody(messageType, body),
    readAt: null,
    senderAvatarUrl: session?.avatarUrl,
    senderDisplayName: session?.displayName || "我",
    senderLppId: session?.lppId,
    senderUserId: session?.userId || session?.platformUserId,
    sentAt,
    status: options.status ?? "sent",
    ...(options.localError ? { localError: options.localError } : {}),
    ...(typeof options.uploadProgress === "number"
      ? { uploadProgress: options.uploadProgress }
      : {}),
    ...(options.localTaskId ? { localTaskId: options.localTaskId } : {}),
  });
  queryClient.setQueryData<MessageItemDto[]>(queryKey, (old = []) => {
    if (old.some((item) => item.messageId === messageId)) return old;
    return [...old, next].sort(sortMessagesForCache);
  });
  queryClient.setQueriesData<{ items: ConversationListItem[] }>(
    { queryKey: ["pc-im-conversations"] },
    (old) =>
      old
        ? {
            ...old,
            items: old.items.map((item) =>
              item.conversationId === conversation.conversationId
                ? {
                    ...item,
                    lastMessage: {
                      messageId,
                      messageType,
                      preview: previewFromOutgoingBody(messageType, body),
                      sentAt,
                      senderUserId: session?.userId || session?.platformUserId,
                      senderId: session?.userId,
                      senderPlatformUserId: session?.platformUserId,
                      senderLppId: session?.lppId,
                      senderDisplayName: session?.displayName || "我",
                      isSelf: true,
                      isMine: true,
                      direction: "out",
                    },
                    lastMessageSeq: Math.max(
                      item.lastMessageSeq ?? 0,
                      conversationSeq ?? 0,
                    ),
                    lastReadSeq: Math.max(
                      item.lastReadSeq ?? 0,
                      conversationSeq ?? 0,
                    ),
                    unreadCount: 0,
                  }
                : item,
            ),
          }
        : old,
  );
  applySendSucceededToImCore(session, conversation, {
    messageId,
    conversationId: result.conversationId || conversation.conversationId,
    conversationSeq,
    direction: "out",
    isMine: true,
    isSelf: true,
    senderDisplayName: session?.displayName || "我",
    senderLppId: session?.lppId,
    senderUserId: session?.userId || session?.platformUserId,
  });
  return next;
}

function replaceLocalMessageInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  session: AuthSession | null,
  conversation: ConversationListItem,
  localMessageId: string,
  messageType: "text" | "image" | "video" | "file",
  body: Record<string, unknown>,
  result: { messageId?: string; conversationId?: string; conversationSeq?: number; serverTime?: string },
) {
  const queryKey = pcQueryKeys.imMessages(
    session?.apiBaseUrl,
    session?.tenantToken,
    getImConversationType(conversation),
    conversation.conversationId,
  );
  const messageId = result.messageId || localMessageId;
  const sentAt = result.serverTime || new Date().toISOString();
  const next = normalizeMessageItem({
    messageId,
    body,
    conversationId: result.conversationId || conversation.conversationId,
    conversationSeq: result.conversationSeq,
    direction: "out",
    isMine: true,
    isSelf: true,
    messageType,
    preview: previewFromOutgoingBody(messageType, body),
    readAt: null,
    senderAvatarUrl: session?.avatarUrl,
    senderDisplayName: session?.displayName || "我",
    senderLppId: session?.lppId,
    senderUserId: session?.userId || session?.platformUserId,
    sentAt,
    status: "sent",
  });
  queryClient.setQueryData<MessageItemDto[]>(queryKey, (old = []) => {
    const withoutServerDuplicate = old.filter(
      (item) => item.messageId === localMessageId || item.messageId !== messageId,
    );
    if (!withoutServerDuplicate.some((item) => item.messageId === localMessageId)) {
      return [...withoutServerDuplicate, next].sort(sortMessagesForCache);
    }
    return withoutServerDuplicate
      .map((item) => (item.messageId === localMessageId ? next : item))
      .sort(sortMessagesForCache);
  });
  queryClient.setQueriesData<{ items: ConversationListItem[] }>(
    { queryKey: ["pc-im-conversations"] },
    (old) =>
      old
        ? {
            ...old,
            items: old.items.map((item) =>
              item.conversationId === conversation.conversationId
                ? {
                    ...item,
                    lastMessage: {
                      ...(item.lastMessage ?? {}),
                      messageId,
                      messageType,
                      preview: previewFromOutgoingBody(messageType, body),
                      sentAt,
                      senderUserId: session?.userId || session?.platformUserId,
                      senderId: session?.userId,
                      senderPlatformUserId: session?.platformUserId,
                      senderLppId: session?.lppId,
                      senderDisplayName: session?.displayName || "我",
                      isSelf: true,
                      isMine: true,
                      direction: "out",
                    },
                    lastMessageSeq: Math.max(
                      item.lastMessageSeq ?? 0,
                      result.conversationSeq ?? 0,
                    ),
                    lastReadSeq: Math.max(
                      item.lastReadSeq ?? 0,
                      result.conversationSeq ?? 0,
                    ),
                    unreadCount: 0,
                  }
                : item,
            ),
          }
        : old,
  );
  applySendSucceededToImCore(session, conversation, {
    messageId,
    conversationId: result.conversationId || conversation.conversationId,
    conversationSeq: result.conversationSeq,
    direction: "out",
    isMine: true,
    isSelf: true,
    senderDisplayName: session?.displayName || "我",
    senderLppId: session?.lppId,
    senderUserId: session?.userId || session?.platformUserId,
  });
  return next;
}

function applySendSucceededToImCore(
  session: AuthSession | null,
  conversation: ConversationListItem,
  message: MessageItemDto,
) {
  const conversationType = getImConversationType(conversation);
  if (!conversationType || !message.conversationSeq) return;
  const store = useWorkspaceStore.getState();
  const result = reduceImCoreEvent({
    identity: session,
    stateByConversation: store.imReadStateByConversation,
    event: {
      type: "send.message_succeeded",
      conversationId: conversation.conversationId,
      conversationType,
      message,
    },
  });
  const key = imConversationKey(conversationType, conversation.conversationId);
  const nextState = result.stateByConversation[key];
  if (nextState) {
    store.upsertImReadState(nextState);
  }
  for (const command of result.commands) {
    if (command.type !== "mark_read" && command.type !== "retry_pending_read") continue;
    store.markImConversationReadLocally(command.conversationId, command.readSeq);
    if (!session) continue;
    void requireApiClient(session)
      .markConversationRead(
        command.conversationType,
        command.conversationId,
        command.readSeq,
      )
      .then(() => {
        store.clearPendingImRead(
          command.conversationType,
          command.conversationId,
          command.readSeq,
        );
      })
      .catch(() => undefined);
  }
}

function withLocalImagePreviews(
  messages: MessageItemDto[],
  localPreviews: Map<string, string>,
): MessageItemDto[] {
  if (localPreviews.size === 0) return messages;
  return messages.map((message) => {
    const type = normalizeMessageType(message);
    if (!type.includes("image") && !message.body?.image) return message;
    const media = firstMessageMedia(message);
    const localPreviewUrl = localImagePreviewKeys(message.messageId, media)
      .map((key) => localPreviews.get(key))
      .find(Boolean);
    if (!localPreviewUrl) return message;
    return normalizeMessageItem({
      ...message,
      body: {
        ...(message.body ?? {}),
        image: withLocalPreviewOnMedia(message.body?.image, localPreviewUrl),
      },
    });
  });
}

function localImagePreviewKeys(
  messageId?: string,
  media?: MediaResourceDto,
): string[] {
  const keys = new Set<string>();
  if (messageId) keys.add(`message:${messageId}`);
  const record = media as Record<string, unknown> | undefined;
  [
    record?.url,
    record?.thumbnailUrl,
    record?.downloadUrl,
    record?.signedUrl,
    record?.fileUrl,
    record?.uri,
    record?.path,
  ].forEach((value) => {
    if (typeof value === "string" && value.trim()) keys.add(`media:${value.trim()}`);
  });
  const fileName = mediaFileName(media);
  const sizeBytes = typeof record?.sizeBytes === "number" ? record.sizeBytes : undefined;
  if (fileName && sizeBytes !== undefined) keys.add(`file:${fileName}:${sizeBytes}`);
  return Array.from(keys);
}

function withLocalPreviewOnMedia(value: unknown, localPreviewUrl: string): unknown {
  if (Array.isArray(value)) {
    const [first, ...rest] = value;
    return [withLocalPreviewOnMedia(first, localPreviewUrl), ...rest];
  }
  if (value && typeof value === "object") {
    return {
      ...(value as Record<string, unknown>),
      localPreviewUrl,
    };
  }
  if (typeof value === "string" && value.trim()) {
    return { url: value, localPreviewUrl };
  }
  return { localPreviewUrl };
}

function markLocalMessageFailed(
  queryClient: ReturnType<typeof useQueryClient>,
  session: AuthSession | null,
  conversation: ConversationListItem,
  localMessageId: string,
  reason: string,
) {
  const queryKey = pcQueryKeys.imMessages(
    session?.apiBaseUrl,
    session?.tenantToken,
    getImConversationType(conversation),
    conversation.conversationId,
  );
  queryClient.setQueryData<MessageItemDto[]>(queryKey, (old = []) =>
    old.map((item) =>
      item.messageId === localMessageId
        ? normalizeMessageItem({
            ...item,
            status: "failed",
            localError: reason,
          } as MessageItemDto)
        : item,
    ),
  );
}

function patchLocalMediaMessage(
  queryClient: ReturnType<typeof useQueryClient>,
  session: AuthSession | null,
  conversation: ConversationListItem,
  conversationType: ImConversationType,
  localMessageId: string,
  patch: {
    status?: LocalUploadStatus;
    uploadProgress?: number;
    localError?: string;
  },
  setLocalOutgoingMessagesByConversation: Dispatch<
    SetStateAction<Record<string, MessageItemDto[]>>
  >,
) {
  const applyPatch = (item: MessageItemDto) =>
    normalizeMessageItem({
      ...item,
      ...(patch.status ? { status: patch.status } : {}),
      ...(typeof patch.uploadProgress === "number"
        ? { uploadProgress: patch.uploadProgress }
        : {}),
      ...(patch.localError === undefined
        ? { localError: undefined }
        : { localError: patch.localError }),
    } as MessageItemDto);
  const queryKey = pcQueryKeys.imMessages(
    session?.apiBaseUrl,
    session?.tenantToken,
    getImConversationType(conversation),
    conversation.conversationId,
  );
  queryClient.setQueryData<MessageItemDto[]>(queryKey, (old = []) =>
    old.map((item) => (item.messageId === localMessageId ? applyPatch(item) : item)),
  );
  setLocalOutgoingMessagesByConversation((current) => {
    const key = imConversationKey(conversationType, conversation.conversationId);
    const existing = current[key] ?? [];
    return {
      ...current,
      [key]: existing.map((item) =>
        item.messageId === localMessageId ? applyPatch(item) : item,
      ),
    };
  });
}

function upsertLocalOutgoingMessage(
  current: Record<string, MessageItemDto[]>,
  conversationType: ImConversationType,
  conversationId: string,
  message: MessageItemDto,
) {
  const key = imConversationKey(conversationType, conversationId);
  const existing = current[key] ?? [];
  const next = existing.some((item) => item.messageId === message.messageId)
    ? existing.map((item) => (item.messageId === message.messageId ? message : item))
    : [...existing, message];
  return { ...current, [key]: next.sort(sortMessagesForCache) };
}

function replaceLocalOutgoingMessage(
  current: Record<string, MessageItemDto[]>,
  conversationType: ImConversationType,
  conversationId: string,
  localMessageId: string,
  message: MessageItemDto,
) {
  const key = imConversationKey(conversationType, conversationId);
  const existing = current[key] ?? [];
  const withoutServerDuplicate = existing.filter(
    (item) => item.messageId === localMessageId || item.messageId !== message.messageId,
  );
  const next = withoutServerDuplicate.some((item) => item.messageId === localMessageId)
    ? withoutServerDuplicate.map((item) =>
        item.messageId === localMessageId ? message : item,
      )
    : [...withoutServerDuplicate, message];
  return { ...current, [key]: next.sort(sortMessagesForCache) };
}

function markLocalOutgoingMessageFailed(
  current: Record<string, MessageItemDto[]>,
  conversationType: ImConversationType,
  conversationId: string,
  localMessageId: string,
  reason: string,
) {
  const key = imConversationKey(conversationType, conversationId);
  const existing = current[key] ?? [];
  const next = existing.map((item) =>
    item.messageId === localMessageId
      ? normalizeMessageItem({
          ...item,
          status: "failed",
          localError: reason,
        } as MessageItemDto)
      : item,
  );
  return { ...current, [key]: next };
}

function sortMessagesForCache(left: MessageItemDto, right: MessageItemDto) {
  const leftSeq = Number(left.conversationSeq ?? Number.MAX_SAFE_INTEGER);
  const rightSeq = Number(right.conversationSeq ?? Number.MAX_SAFE_INTEGER);
  return (
    leftSeq - rightSeq ||
    new Date(left.sentAt ?? 0).getTime() - new Date(right.sentAt ?? 0).getTime()
  );
}

function appendForwardedMessagesToCache(
  queryClient: ReturnType<typeof useQueryClient>,
  session: AuthSession | null,
  conversation: ConversationListItem,
  messages: MessageItemDto[],
) {
  const conversationType = getImConversationType(conversation);
  const queryKey = pcQueryKeys.imMessages(
    session?.apiBaseUrl,
    session?.tenantToken,
    conversationType,
    conversation.conversationId,
  );
  const now = Date.now();
  queryClient.setQueryData<MessageItemDto[]>(queryKey, (old = []) => {
    const forwarded = messages.map((message, index) =>
      normalizeMessageItem({
        ...message,
        messageId: `pc-forward-${now}-${index}`,
        conversationId: conversation.conversationId,
        conversationSeq: undefined,
        direction: "out",
        isMine: true,
        isSelf: true,
        preview: `转发：${messageActionPreview(message)}`,
        senderAvatarUrl: session?.avatarUrl,
        senderDisplayName: session?.displayName || "我",
        senderLppId: session?.lppId,
        senderUserId: session?.userId || session?.platformUserId,
        sentAt: new Date(now + index).toISOString(),
        status: "sent",
      }),
    );
    return [...old, ...forwarded];
  });
}

function markMessageRecalledInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  messageId: string,
) {
  queryClient.setQueriesData<MessageItemDto[]>(
    { queryKey: ["pc-im-messages"] },
    (old) =>
      old?.map((message) =>
        message.messageId === messageId
          ? normalizeMessageItem({
              ...message,
              body: { eventText: "消息已撤回", messageType: "event" },
              isRecalled: true,
              messageType: "event",
              preview: "消息已撤回",
              status: "recalled",
            })
          : message,
      ),
  );
}

function removeMessageFromCache(
  queryClient: ReturnType<typeof useQueryClient>,
  messageId: string,
) {
  queryClient.setQueriesData<MessageItemDto[]>(
    { queryKey: ["pc-im-messages"] },
    (old) => old?.filter((message) => message.messageId !== messageId),
  );
}

function markMessageFavoriteInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  messageId: string,
  favoriteId?: string,
) {
  queryClient.setQueriesData<MessageItemDto[]>(
    { queryKey: ["pc-im-messages"] },
    (old) =>
      old?.map((message) =>
        message.messageId === messageId
          ? ({
              ...message,
              favoriteId: favoriteId || true,
              isFavorite: true,
              favoritedAt: new Date().toISOString(),
            } as MessageItemDto)
          : message,
      ),
  );
}

function withReplyBody(body: Record<string, unknown>, reply: ReplyTarget) {
  if (!reply) return body;
  return {
    ...body,
    reply: {
      messageId: reply.messageId,
      sender: reply.sender,
      preview: reply.preview,
    },
  };
}

function previewFromOutgoingBody(
  messageType: "text" | "image" | "video" | "file",
  body: Record<string, unknown>,
) {
  return messagePreviewFromBody(body, messageType);
}

function applyConversationReadToCache(
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: string,
  readSeq: number,
) {
  queryClient.setQueriesData<{ items: ConversationListItem[] }>(
    { queryKey: ["pc-im-conversations"] },
    (old) =>
      old
        ? {
            ...old,
            items: old.items.map((item) =>
              item.conversationId === conversationId
                ? applyReadSeqToConversationListItem(item, readSeq)
                : item,
            ),
          }
        : old,
  );
}

function applyReadSeqToConversationListItem(
  item: ConversationListItem,
  readSeq: number,
) {
  const nextReadSeq = Math.max(item.lastReadSeq ?? 0, readSeq);
  const lastMessageSeq = Math.max(0, Number(item.lastMessageSeq ?? 0));
  return {
    ...item,
    unreadCount: lastMessageSeq > nextReadSeq ? item.unreadCount ?? 0 : 0,
    lastReadSeq: nextReadSeq,
  };
}

function sortConversations(
  conversations: ConversationListItem[],
  userIdentity?: CurrentUserIdentity | null,
) {
  return [...conversations].sort((left, right) => {
    const pinnedDelta = Number(Boolean(right.isPinned)) - Number(Boolean(left.isPinned));
    if (pinnedDelta !== 0) return pinnedDelta;
    const unreadDelta =
      Number(effectiveConversationUnreadCount(right, userIdentity) > 0) -
      Number(effectiveConversationUnreadCount(left, userIdentity) > 0);
    if (unreadDelta !== 0) return unreadDelta;
    return conversationTime(right) - conversationTime(left);
  });
}

function conversationTime(conversation: ConversationListItem) {
  const time = conversation.lastMessage?.sentAt
    ? new Date(conversation.lastMessage.sentAt).getTime()
    : 0;
  return Number.isFinite(time) ? time : 0;
}

function filterConversations(
  conversations: ConversationListItem[],
  filter: "all" | "friends" | "groups" | "unread",
  keyword: string,
  userIdentity?: CurrentUserIdentity | null,
) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  return conversations.filter((item) => {
    const conversationType = getImConversationType(item);
    if (filter === "friends" && conversationType !== "direct") return false;
    if (filter === "groups" && conversationType !== "group") return false;
    if (
      filter === "unread" &&
      effectiveConversationUnreadCount(item, userIdentity) <= 0
    ) {
      return false;
    }
    if (!normalizedKeyword) return true;
    return `${item.title} ${item.lastMessage?.preview ?? ""}`
      .toLowerCase()
      .includes(normalizedKeyword);
  });
}

function buildMentionOptions(members: GroupMemberDto[]) {
  return members
    .map((member) => ({
      id: member.userId || member.platformUserId || member.lppId || member.displayName,
      label: member.displayName || member.userId || "成员",
    }))
    .filter((item) => item.id && item.label);
}

function extractMentions(content: string, members: GroupMemberDto[]) {
  const names = new Set(
    Array.from(content.matchAll(/@([^\s@]+)/g)).map((match) => match[1]),
  );
  return members
    .filter((member) => member.displayName && names.has(member.displayName))
    .map((member) => ({
      userId: member.userId || member.platformUserId || member.lppId,
      displayName: member.displayName,
    }));
}

function filterMessages(messages: MessageItemDto[], keyword: string) {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return messages;
  return messages.filter((message) =>
    [
      message.preview,
      message.senderDisplayName,
      typeof message.body?.text === "string" ? message.body.text : "",
      typeof message.body?.file === "object" && message.body.file
        ? (message.body.file as MediaResourceDto).fileName
        : "",
      typeof message.body?.image === "object" && message.body.image
        ? (message.body.image as MediaResourceDto).fileName
        : "",
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalized)),
	  );
}

function filterMessagesByHistory(
  messages: MessageItemDto[],
  filter: HistoryFilterKey,
) {
  if (filter === "all") return messages;
  return messages.filter((message) => historyMessageMatches(message, filter));
}

function getHistoryFilterCounts(messages: MessageItemDto[]) {
  return historyFilterTabs.reduce(
    (counts, tab) => ({
      ...counts,
      [tab.key]:
        tab.key === "all"
          ? messages.length
          : messages.filter((message) => historyMessageMatches(message, tab.key)).length,
    }),
    {} as Record<HistoryFilterKey, number>,
  );
}

function historyMessageMatches(message: MessageItemDto, filter: HistoryFilterKey) {
  const type = normalizeMessageType(message);
  const body = message.body ?? {};
  if (filter === "text") {
    return (
      type.includes("text") ||
      typeof body.text === "string" ||
      (!type && Boolean(message.preview))
    );
  }
  if (filter === "image") return type.includes("image") || Boolean(body.image);
  if (filter === "file") return type.includes("file") || Boolean(body.file);
  if (filter === "voice") return type.includes("voice") || type.includes("audio") || Boolean(body.voice || body.audio);
  if (filter === "video") return type.includes("video") || Boolean(body.video);
  if (filter === "link") return messageContainsLink(message);
  if (filter === "favorite") {
    const record = message as unknown as Record<string, unknown>;
    return Boolean(record.favoriteId || record.isFavorite || record.favoritedAt);
  }
  return true;
}

function messageContainsLink(message: MessageItemDto) {
  const values = [
    message.preview ?? "",
    typeof message.body?.text === "string" ? message.body.text : "",
    ...Object.values(message.body ?? {}).map((value) =>
      typeof value === "string" ? value : "",
    ),
  ];
  return values.some((value) => /https?:\/\//i.test(value));
}

function getConversationCounts(
  conversations: ConversationListItem[],
  userIdentity?: CurrentUserIdentity | null,
) {
  return {
    unread: conversations.filter(
      (item) => effectiveConversationUnreadCount(item, userIdentity) > 0,
    ).length,
  };
}

function mergeUnifiedReadStateForIdentity(
  legacyReads: CurrentUserIdentity["locallyReadConversationReads"],
  readStateByConversation: Record<string, ConversationReadState>,
) {
  const merged = { ...(legacyReads ?? {}) };
  Object.values(readStateByConversation).forEach((readState) => {
    const readSeq = Math.max(0, Math.floor(readState.myReadSeq));
    if (readSeq <= 0) return;
    const read = { readSeq, readAt: readState.updatedAt };
    const currentByKey = merged[readState.conversationKey];
    if (!currentByKey || currentByKey.readSeq < readSeq) {
      merged[readState.conversationKey] = read;
    }
    const currentById = merged[readState.conversationId];
    if (!currentById || currentById.readSeq < readSeq) {
      merged[readState.conversationId] = read;
    }
  });
  return merged;
}

function readStateMeaningfullyChanged(
  previous: ConversationReadState | undefined,
  next: ConversationReadState,
) {
  return (
    !previous ||
    previous.myReadSeq !== next.myReadSeq ||
    previous.peerReadSeq !== next.peerReadSeq ||
    previous.lastMessageSeq !== next.lastMessageSeq ||
    previous.unreadCount !== next.unreadCount ||
    previous.pendingReadSeq !== next.pendingReadSeq
  );
}

function getImConversationType(
  conversation?: ConversationListItem,
): ImConversationType | undefined {
  const conversationType = conversation?.conversationType
    ?.trim()
    .toLowerCase()
    .replace(/-/g, "_");
  if (
    conversationType === "direct" ||
    conversationType === "im_direct" ||
    conversationType === "direct_chat" ||
    conversationType === "direct_customer" ||
    conversationType === "customer_direct"
  ) {
    return "direct";
  }
  if (
    conversationType === "group" ||
    conversationType === "im_group" ||
    conversationType === "group_chat"
  ) {
    return "group";
  }
  return undefined;
}

function buildGroupMemberMap(members: GroupMemberDto[]) {
  const map = new Map<string, GroupMemberDto>();
  members.forEach((member) => {
    [
      member.userId,
      member.platformUserId,
      member.lppId,
      member.displayName,
    ].forEach((key) => {
      if (key) map.set(key.trim().toLowerCase(), member);
    });
  });
  return map;
}

function usablePersonName(value?: string | null) {
  const text = value?.trim();
  if (!text || text === "00000000-0000-0000-0000-000000000000") return undefined;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)) {
    return undefined;
  }
  return text;
}

function resolveSenderDisplayName(
  message: MessageItemDto,
  conversation: ConversationListItem,
  groupMembers: Map<string, GroupMemberDto>,
) {
  const member = resolveGroupMember(message, groupMembers);
  const senderName = usablePersonName(message.senderDisplayName);
  if (conversation.conversationType === "direct") {
    return senderName || conversation.title || "对方";
  }
  if (member?.displayName) return member.displayName;
  if (senderName) return senderName;
  const bodyName = usablePersonName(
    stringField(message.body ?? {}, "senderName", "senderDisplayName", "displayName"),
  );
  return bodyName || "成员";
}

function eventMessageText(message: MessageItemDto) {
  if (!isEventLikeMessage(message)) return undefined;
  const body = message.body ?? {};
  const eventRecord =
    body.event && typeof body.event === "object"
      ? (body.event as Record<string, unknown>)
      : undefined;
  const directText =
    stringField(body, "eventText", "notice") ||
    stringField(eventRecord ?? {}, "text", "preview", "content") ||
    (typeof body.event === "string" ? body.event.trim() : undefined) ||
    extractMessageText(message) ||
    message.preview;
  if (directText && !isGenericGroupJoinText(directText)) return directText;
  return formatGroupMemberEventText(eventRecord ?? body) || directText || undefined;
}

function isEventLikeMessage(message: MessageItemDto) {
  const type = normalizeMessageType(message);
  return Boolean(
    type === "event" ||
      type === "system" ||
      type === "notice" ||
      message.body?.event ||
      message.body?.eventText ||
      message.body?.notice,
  );
}

function isGenericGroupJoinText(text: string) {
  return ["成员已加入群聊", "成员加入群聊", "已加入群聊"].includes(text.trim());
}

function formatGroupMemberEventText(record: Record<string, unknown>) {
  const type = String(record.type ?? record.eventType ?? "").trim();
  const joinTypes = new Set([
    "members_added",
    "member_added",
    "group_member_added",
    "group_member_joined",
    "member_joined",
    "join_group",
    "joined_group",
  ]);
  if (!joinTypes.has(type)) return undefined;
  const names = eventMemberNames(record);
  if (names.length === 0) return undefined;
  return `${joinNames(names)} 加入群聊`;
}

function eventMemberNames(record: Record<string, unknown>) {
  const names: string[] = [];
  const addName = (value: unknown) => {
    const name = usablePersonName(String(value ?? ""));
    if (name && !names.includes(name)) names.push(name);
  };
  [
    "addedUserDisplayNames",
    "addedUserNames",
    "addedDisplayNames",
    "memberDisplayNames",
    "memberNames",
  ].forEach((key) => {
    const value = record[key];
    if (Array.isArray(value)) value.forEach(addName);
  });
  ["addedUsers", "addedMembers", "members", "users"].forEach((key) => {
    const value = record[key];
    if (!Array.isArray(value)) return;
    value.forEach((item) => {
      if (!item || typeof item !== "object") return;
      addName(
        stringField(
          item as Record<string, unknown>,
          "displayName",
          "name",
          "nickname",
          "userName",
          "loginName",
        ),
      );
    });
  });
  addName(
    stringField(
      record,
      "addedUserDisplayName",
      "addedUserName",
      "memberDisplayName",
      "memberName",
      "targetDisplayName",
      "targetName",
      "displayName",
      "userName",
    ),
  );
  return names;
}

function joinNames(names: string[]) {
  return names.length <= 3 ? names.join("、") : `${names.slice(0, 3).join("、")}等${names.length}人`;
}

function resolveSenderAvatarUrl(
  message: MessageItemDto,
  groupMembers: Map<string, GroupMemberDto>,
) {
  return resolveGroupMember(message, groupMembers)?.avatarUrl ?? null;
}

function buildAvatarProfilePopover({
  conversation,
  groupMembers,
  message,
  mine,
  session,
  x,
  y,
}: {
  conversation: ConversationListItem;
  groupMembers: Map<string, GroupMemberDto>;
  message: MessageItemDto;
  mine: boolean;
  session?: AuthSession | null;
  x: number;
  y: number;
}): AvatarProfilePopoverState {
  if (mine) {
    return {
      x,
      y,
      title: session?.displayName || "我",
      subtitle: "当前账号",
      avatarUrl: session?.avatarUrl,
      rows: compactProfileRows([
        ["LPP 号", session?.lppId],
        ["用户 ID", session?.userId],
        ["身份", "我"],
      ]),
    };
  }
  const member = resolveGroupMember(message, groupMembers);
  const isGroup = conversation.conversationType === "group";
  const displayName =
    member?.displayName ||
    message.senderDisplayName ||
    (isGroup ? "群成员" : conversation.title || "对方");
  const lppId = member?.lppId || message.senderLppId || message.lppId;
  const userId =
    member?.userId ||
    message.senderUserId ||
    message.senderId ||
    message.fromUserId ||
    conversation.peerUserId;
  const platformUserId = member?.platformUserId || message.senderPlatformUserId;
  const role = member?.role || member?.memberRole || (isGroup ? "群成员" : "好友");
  return {
    x,
    y,
    title: displayName,
    subtitle: isGroup ? role : "好友私聊",
    avatarUrl:
      member?.avatarUrl ||
      message.senderAvatarUrl ||
      message.avatarUrl ||
      conversation.avatarUrl,
    rows: compactProfileRows([
      ["LPP 号", lppId || conversation.peerLppId],
      ["用户 ID", userId],
      ["平台 ID", platformUserId],
      ["角色", role],
      ["会话", isGroup ? conversation.title : "好友私聊"],
    ]),
  };
}

function buildContactCardProfilePopover({
  value,
  x,
  y,
}: {
  value: Record<string, unknown>;
  x: number;
  y: number;
}): AvatarProfilePopoverState {
  const title =
    stringField(
      value,
      "displayName",
      "display_name",
      "name",
      "userName",
      "user_name",
      "realName",
      "real_name",
      "nickname",
      "nickName",
      "nick_name",
    ) ||
    "联系人名片";
  const userId = stringField(value, "userId", "user_id", "friendUserId", "customerUserId", "id");
  const platformUserId = stringField(value, "platformUserId", "platform_user_id");
  const lppId = stringField(value, "lppId", "lpp_id", "lppNo", "lppNumber");
  const mobile = stringField(value, "mobile", "phone", "phoneMasked", "mobileMasked");
  const email = stringField(value, "email", "emailMasked");
  const source = stringField(value, "source", "sourceChannel", "channel", "from");
  const avatarUrl = stringField(value, "avatarUrl", "avatar_url", "avatar", "photoUrl");
  return {
    x,
    y,
    title,
    subtitle: lppId || mobile || email || "个人名片",
    avatarUrl,
    rows: compactProfileRows([
      ["LPP 号", lppId],
      ["用户 ID", userId],
      ["平台 ID", platformUserId],
      ["手机", mobile],
      ["邮箱", email],
      ["来源", source],
    ]),
  };
}

function compactProfileRows(rows: Array<[string, string | number | null | undefined]>) {
  return rows
    .map(([label, value]) => ({
      label,
      value: value === null || value === undefined || value === "" ? "--" : String(value),
    }))
    .filter((row, index) => row.value !== "--" || index < 3);
}

function resolveGroupMember(
  message: MessageItemDto,
  groupMembers: Map<string, GroupMemberDto>,
) {
  const keys = [
    message.senderUserId,
    message.senderId,
    message.fromUserId,
    message.senderPlatformUserId,
    message.platformUserId,
    message.senderLppId,
    message.lppId,
    message.senderDisplayName,
  ];
  for (const key of keys) {
    const member = key ? groupMembers.get(key.trim().toLowerCase()) : undefined;
    if (member) return member;
  }
  return undefined;
}

function modelBackedMessageReadStatusText(
  message: MessageItemDto,
  conversation: ConversationListItem,
  readState: ConversationReadState | undefined,
  identity?: CurrentUserIdentity | null,
) {
  const status = String(message.status ?? "").trim().toLowerCase();
  if (status === "sending" || status === "uploading" || status === "failed") {
    return messageReadStatusText(message, conversation, identity);
  }
  if (getImConversationType(conversation) === "group") {
    return messageReadStatusText(message, conversation, identity);
  }
  if (readState) {
    const view = deriveMessageView({ identity: identity ?? null, state: readState, message });
    if (view.ownership === "mine") return view.bubbleStatusText || undefined;
  }
  return messageReadStatusText(message, conversation, identity);
}

function messageReadStatusText(
  message: MessageItemDto,
  conversation: ConversationListItem,
  identity?: CurrentUserIdentity | null,
) {
  if (!isMineMessage(message, identity)) return undefined;
  const record = message as unknown as Record<string, unknown>;
  const status = String(message.status ?? "").trim().toLowerCase();
  if (status === "sending" || status === "uploading") {
    const type = normalizeMessageType(message);
    return type === "image" || type === "video" || type === "file" ? "上传中" : "发送中";
  }
  if (status === "failed") {
    const reason = typeof record.localError === "string" && record.localError.trim()
      ? `：${record.localError.trim()}`
      : "";
    return `发送失败${reason}`;
  }
  if (conversation.conversationType === "group") {
    if (typeof message.readCount === "number" && message.readCount > 0) {
      return `${message.readCount}人已读`;
    }
    return "已发送";
  }
  if (
    message.isRead ||
    message.readAt ||
    ["read", "seen"].includes(status) ||
    record.deliveryStatus === "read"
  ) {
    return "已读";
  }
  return "已发送";
}

function shouldShowFileInlineStatus(message: MessageItemDto) {
  const status = String(message.status ?? "").trim().toLowerCase();
  const type = normalizeMessageType(message);
  return (type === "file" || type === "video") && ["sending", "uploading", "failed"].includes(status);
}

function findFirstUnreadLoadedMessage(
  messages: MessageItemDto[],
  unreadJump: UnreadJumpState,
  identity?: CurrentUserIdentity | null,
) {
  const readableMessages = messages.filter(
    (message) => !isMineMessage(message, identity) && !eventMessageText(message),
  );
  const seqMatched = readableMessages.find(
    (message) => Number(message.conversationSeq ?? 0) > unreadJump.lastReadSeq,
  );
  if (seqMatched) return seqMatched;
  const fallbackIndex = Math.max(0, readableMessages.length - unreadJump.count);
  return readableMessages[fallbackIndex];
}

function isMineMessage(message: MessageItemDto, identity?: CurrentUserIdentity | null) {
  const record = message as unknown as Record<string, unknown>;
  const senderIds = [
    message.senderUserId,
    message.senderId,
    message.fromUserId,
    typeof record.platformUserId === "string" ? record.platformUserId : undefined,
    typeof record.senderPlatformUserId === "string"
      ? record.senderPlatformUserId
      : undefined,
    typeof record.senderLppId === "string" ? record.senderLppId : undefined,
    typeof record.lppId === "string" ? record.lppId : undefined,
  ];
  if (
    record.isSelf === true ||
    record.isMine === true ||
    ["out", "outgoing", "sent", "self"].includes(
      String(record.direction ?? "").trim().toLowerCase(),
    )
  ) {
    return true;
  }
  const hasSenderId = senderIds.some((id) => typeof id === "string" && id.trim());
  if (hasSenderId) {
    return (
      isSelfSender(message.senderUserId, undefined, identity) ||
      isSelfSender(message.senderId, undefined, identity) ||
      isSelfSender(message.fromUserId, undefined, identity) ||
      isSelfSender(
        typeof record.platformUserId === "string" ? record.platformUserId : undefined,
        undefined,
        identity,
      ) ||
      isSelfSender(
        typeof record.senderPlatformUserId === "string"
          ? record.senderPlatformUserId
          : undefined,
        undefined,
        identity,
      ) ||
      isSelfSender(
        typeof record.senderLppId === "string" ? record.senderLppId : undefined,
        undefined,
        identity,
      ) ||
      isSelfSender(
        typeof record.lppId === "string" ? record.lppId : undefined,
        undefined,
        identity,
      )
    );
  }
  return Boolean(
    isSelfSender(message.senderUserId, message.senderDisplayName, identity) ||
      isSelfSender(message.senderId, message.senderDisplayName, identity) ||
      isSelfSender(message.fromUserId, message.senderDisplayName, identity) ||
      isSelfSender(
        typeof record.platformUserId === "string" ? record.platformUserId : undefined,
        message.senderDisplayName,
        identity,
      ) ||
      isSelfSender(
        typeof record.senderPlatformUserId === "string"
          ? record.senderPlatformUserId
          : undefined,
        message.senderDisplayName,
        identity,
      ) ||
      isSelfSender(
        typeof record.senderLppId === "string" ? record.senderLppId : undefined,
        message.senderDisplayName,
        identity,
      ) ||
      isSelfSender(
        typeof record.lppId === "string" ? record.lppId : undefined,
        message.senderDisplayName,
        identity,
      ),
  );
}

function isServerUsableMessage(message: MessageItemDto) {
  const record = message as unknown as Record<string, unknown>;
  const status = String(record.status ?? "").trim().toLowerCase();
  return Boolean(
    message.messageId &&
      !message.isRecalled &&
      !["sending", "failed", "local", "recalled"].includes(status),
  );
}

function isRecentMessage(message: MessageItemDto, minutes: number) {
  const sentAt = message.sentAt ? new Date(message.sentAt).getTime() : NaN;
  if (!Number.isFinite(sentAt)) return false;
  return Date.now() - sentAt < minutes * 60 * 1000;
}

function isTextLikeMessage(message: MessageItemDto) {
  return Boolean(extractMessageText(message));
}

function isImageMessage(message: MessageItemDto) {
  const type = normalizeMessageType(message);
  return type.includes("image") || Boolean(message.body?.image);
}

function isVideoMessage(message: MessageItemDto) {
  const type = normalizeMessageType(message);
  return type.includes("video") || Boolean(message.body?.video);
}

function extractMessageText(message: MessageItemDto) {
  const body = message.body ?? {};
  const directText = stringField(
    body,
    "text",
    "content",
    "message",
    "markdown",
    "markdownText",
    "caption",
  );
  if (directText) return directText;
  const nested = [
    body.parts,
    body.bodies,
    body.items,
    body.contents,
    body.messageBodies,
  ].flatMap((value) => (Array.isArray(value) ? value : []));
  for (const item of nested) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const nestedBody =
      record.body && typeof record.body === "object"
        ? (record.body as Record<string, unknown>)
        : record;
    const text = stringField(
      nestedBody,
      "text",
      "content",
      "message",
      "markdown",
      "markdownText",
      "caption",
    );
    if (text) return text;
  }
  return undefined;
}

function messageActionPreview(message: MessageItemDto) {
  const text = extractMessageText(message);
  if (text) return text.length > 60 ? `${text.slice(0, 60)}...` : text;
  const type = normalizeMessageType(message);
  if (type.includes("image") || message.body?.image) return "[图片]";
  if (type.includes("file") || message.body?.file) return mediaName(message) || "[文件]";
  if (type.includes("voice") || message.body?.voice || message.body?.audio) return "[语音]";
  if (type.includes("video") || message.body?.video) return "[视频]";
  if (type.includes("location") || message.body?.location) return "[位置]";
  if (
    type.includes("contact") ||
    message.body?.contact ||
    message.body?.contactCard ||
    message.body?.contact_card ||
    message.body?.nameCard ||
    message.body?.name_card ||
    message.body?.businessCard ||
    message.body?.business_card
  ) {
    return "[名片]";
  }
  return message.preview || "[消息]";
}

function mediaName(message: MessageItemDto) {
  const media = firstMessageMedia(message);
  return mediaFileName(media) || message.preview;
}

function mediaCacheFileName(message: MessageItemDto) {
  const media = firstMessageMedia(message);
  return mediaFileName(media) || mediaFallbackName(message);
}

function hasOpenableMedia(message: MessageItemDto) {
  return Boolean(resolveMessageMediaUrl(message));
}

function resolveMessageMediaUrl(
  message: MessageItemDto,
  assetBaseUrl?: string,
) {
  const media = firstMessageMedia(message);
  const raw = resolveNormalizedMediaUrl(
    media,
    assetBaseUrl || window.location.origin,
    "url",
    "downloadUrl",
    "signedUrl",
    "fileUrl",
    "uri",
    "path",
    "thumbnailUrl",
  );
  if (!raw) return undefined;
  try {
    return new URL(raw, assetBaseUrl || window.location.origin).toString();
  } catch {
    return raw;
  }
}

async function downloadMessageMedia(
  message: MessageItemDto,
  url: string,
  authToken?: string,
  cacheContext?: {
    accountId?: string;
    conversationId?: string;
  },
) {
  const fileName = safeDownloadFileName(mediaCacheFileName(message));
  if (!/^(blob:|file:)/i.test(url) && window.desktopApi?.cacheMediaFile) {
    await window.desktopApi.cacheMediaFile({
      url,
      fileName,
      kind: mediaCacheKind(message),
      authToken,
      accountId: cacheContext?.accountId,
      conversationId: cacheContext?.conversationId,
    });
    return;
  }
  if (/^(blob:|data:|file:)/i.test(url)) {
    triggerDownload(url, fileName);
    return;
  }
  try {
    const response = await fetch(url, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    triggerDownload(objectUrl, fileName);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 5_000);
  } catch {
    triggerDownload(url, fileName);
  }
}

async function saveMessageMediaAs(
  message: MessageItemDto,
  url: string,
  authToken?: string,
  cacheContext?: {
    accountId?: string;
    conversationId?: string;
  },
) {
  const fileName = safeDownloadFileName(mediaCacheFileName(message));
  if (/^blob:/i.test(url)) {
    throw new Error("这条本地临时文件暂不支持另存为，请先发送完成后再操作");
  }
  if (window.desktopApi?.saveMediaAs) {
    return window.desktopApi.saveMediaAs({
      url,
      fileName,
      kind: mediaCacheKind(message),
      authToken,
      accountId: cacheContext?.accountId,
      conversationId: cacheContext?.conversationId,
    });
  }
  await downloadAuthenticatedMediaBlob(url, fileName, authToken);
  return fileName;
}

async function revealMessageMediaInFolder(
  message: MessageItemDto,
  url: string,
  authToken?: string,
  cacheContext?: {
    accountId?: string;
    conversationId?: string;
  },
) {
  if (/^blob:/i.test(url)) {
    throw new Error("这条本地临时文件暂不支持显示位置，请先发送完成后再操作");
  }
  const fileName = safeDownloadFileName(mediaCacheFileName(message));
  const kind = mediaCacheKind(message);
  if (window.desktopApi?.revealMediaInFolder) {
    return window.desktopApi.revealMediaInFolder({
      url,
      fileName,
      kind,
      authToken,
      accountId: cacheContext?.accountId,
      conversationId: cacheContext?.conversationId,
    });
  }
  if (window.desktopApi?.cacheMediaFile && window.desktopApi?.openFile) {
    const cached = await window.desktopApi.cacheMediaFile({
      url,
      fileName,
      kind,
      authToken,
      accountId: cacheContext?.accountId,
      conversationId: cacheContext?.conversationId,
    });
    await window.desktopApi.openFile(parentDirectory(cached.filePath));
    return cached.filePath;
  }
  throw new Error("当前环境不支持显示文件位置");
}

async function copyMessageMediaFile(
  message: MessageItemDto,
  url: string,
  authToken?: string,
  cacheContext?: {
    accountId?: string;
    conversationId?: string;
    fileName?: string;
  },
) {
  if (/^blob:/i.test(url)) {
    throw new Error("这条本地临时文件暂不支持复制，请先发送完成后再操作");
  }
  if (window.desktopApi?.copyMediaFile) {
    return window.desktopApi.copyMediaFile(mediaDesktopPayload(message, url, authToken, cacheContext));
  }
  if (window.desktopApi?.cacheMediaFile) {
    const cached = await window.desktopApi.cacheMediaFile(
      mediaDesktopPayload(message, url, authToken, cacheContext),
    );
    if (window.desktopApi?.copyFilePath) {
      await window.desktopApi.copyFilePath(cached.filePath);
    } else {
      await navigator.clipboard.writeText(cached.filePath);
    }
    return cached.filePath;
  }
  throw new Error("PC 桌面能力未就绪，请重启 PC 客户端后再试");
}

async function openMessageMediaFile(
  message: MessageItemDto,
  url: string,
  authToken?: string,
  cacheContext?: {
    accountId?: string;
    conversationId?: string;
    fileName?: string;
  },
) {
  if (/^blob:/i.test(url)) {
    throw new Error("这条本地临时文件暂不支持打开，请先发送完成后再操作");
  }
  if (window.desktopApi?.openMediaFile) {
    return window.desktopApi.openMediaFile(mediaDesktopPayload(message, url, authToken, cacheContext));
  }
  if (window.desktopApi?.cacheMediaFile && window.desktopApi?.openFile) {
    const cached = await window.desktopApi.cacheMediaFile(
      mediaDesktopPayload(message, url, authToken, cacheContext),
    );
    await window.desktopApi.openFile(cached.filePath);
    return cached.filePath;
  }
  throw new Error("当前环境不支持打开文件");
}

async function editMessageMediaFile(
  message: MessageItemDto,
  url: string,
  authToken?: string,
  cacheContext?: {
    accountId?: string;
    conversationId?: string;
    fileName?: string;
  },
) {
  if (/^blob:/i.test(url)) {
    throw new Error("这条本地临时文件暂不支持编辑，请先发送完成后再操作");
  }
  if (window.desktopApi?.editMediaFile) {
    return window.desktopApi.editMediaFile(mediaDesktopPayload(message, url, authToken, cacheContext));
  }
  return openMessageMediaFile(message, url, authToken, cacheContext);
}

function mediaDesktopPayload(
  message: MessageItemDto,
  url: string,
  authToken?: string,
  cacheContext?: {
    accountId?: string;
    conversationId?: string;
    fileName?: string;
  },
) {
  return {
    url,
    fileName: safeDownloadFileName(
      cacheContext?.fileName || mediaCacheFileName(message),
    ),
    kind: mediaCacheKind(message),
    authToken,
    accountId: cacheContext?.accountId,
    conversationId: cacheContext?.conversationId,
  };
}

function mediaCacheKind(message: MessageItemDto): "image" | "video" | "file" {
  const type = normalizeMessageType(message);
  if (type.includes("image") || message.body?.image) return "image";
  if (type.includes("video") || message.body?.video) return "video";
  return "file";
}

function revealInFolderLabel() {
  return isMacPlatform() ? "在 Finder 中显示" : "在文件夹中显示";
}

function isMacPlatform() {
  return /mac/i.test(navigator.platform);
}

function parentDirectory(filePath: string) {
  const normalized = filePath.trim();
  const parent = normalized.replace(/[\\/][^\\/]*$/, "");
  return parent || normalized;
}

async function downloadAuthenticatedMediaBlob(
  url: string,
  fileName: string,
  authToken?: string,
) {
  const response = await fetch(url, {
    headers: authToken
      ? {
          Accept: "application/octet-stream,*/*",
          Authorization: `Bearer ${authToken}`,
          "X-Access-Token": authToken,
          "X-Tenant-Token": authToken,
        }
      : undefined,
  });
  const blob = await response.blob();
  if (!response.ok || blob.type.includes("json")) {
    const text = await blob.text().catch(() => "");
    const message = jsonErrorMessage(text) || `文件下载失败：HTTP ${response.status}`;
    throw new Error(message);
  }
  const objectUrl = URL.createObjectURL(blob);
  triggerDownload(objectUrl, fileName);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 5_000);
}

function jsonErrorMessage(text: string) {
  if (!text.trim()) return undefined;
  try {
    const payload = JSON.parse(text) as { code?: string; message?: string };
    if (payload.code === "AUTH_REQUIRED") return "文件下载需要登录认证，请重新登录后再试";
    return payload.message || payload.code;
  } catch {
    return undefined;
  }
}

async function copyMessageImage(
  url: string,
  authToken?: string,
  cacheContext?: {
    accountId?: string;
    conversationId?: string;
    fileName?: string;
  },
) {
  if (!/^(blob:|data:)/i.test(url) && window.desktopApi?.copyImageFromUrl) {
    await window.desktopApi.copyImageFromUrl({
      url,
      authToken,
      accountId: cacheContext?.accountId,
      conversationId: cacheContext?.conversationId,
      fileName: cacheContext?.fileName,
    });
    return;
  }
  const pngBlob = await imageUrlToPngBlob(url, authToken);
  const ClipboardItemCtor = window.ClipboardItem;
  if (!navigator.clipboard?.write || !ClipboardItemCtor) {
    throw new Error("当前环境不支持复制图片");
  }
  await navigator.clipboard.write([
    new ClipboardItemCtor({ "image/png": pngBlob }),
  ]);
}

async function imageUrlToPngBlob(url: string, authToken?: string) {
  const response = await fetch(url, {
    headers:
      authToken && !/^(blob:|data:)/i.test(url)
        ? { Authorization: `Bearer ${authToken}` }
        : undefined,
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const sourceBlob = await response.blob();
  if (sourceBlob.type === "image/png") return sourceBlob;
  const bitmap = await createImageBitmap(sourceBlob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法创建图片画布");
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("图片转换失败"));
    }, "image/png");
  });
}

function triggerDownload(url: string, fileName: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function safeDownloadFileName(value: string) {
  const sanitized = value.trim().replace(/[\\/:*?"<>|]/g, "_");
  return sanitized || "lpp-media";
}

function mediaFallbackName(message: MessageItemDto) {
  const type = normalizeMessageType(message);
  if (type.includes("image")) return "lpp-image.jpg";
  if (type.includes("video")) return "lpp-video.mp4";
  if (type.includes("voice") || type.includes("audio")) return "lpp-voice.m4a";
  return "lpp-file";
}

function extractActionResultText(value: unknown): string | undefined {
  if (typeof value === "string") {
    const text = value.trim();
    return text || undefined;
  }
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  for (const key of [
    "translatedText",
    "translation",
    "text",
    "content",
    "transcript",
    "result",
    "data",
    "body",
    "payload",
    "output",
  ]) {
    const item = record[key];
    if (typeof item === "string" && item.trim()) return item.trim();
    const nested: string | undefined = extractActionResultText(item);
    if (nested) return nested;
  }
  const translations = record.translations;
  if (Array.isArray(translations)) {
    for (const item of translations) {
      const nested: string | undefined = extractActionResultText(item);
      if (nested) return nested;
    }
  }
  return undefined;
}

function normalizeUploadedMedia(
  media: MediaResourceDto,
  file: File,
): MediaResourceDto {
  const record = media as Record<string, unknown>;
  return {
    ...media,
    url: media.url || stringField(record, "resourceUrl", "mediaUrl", "objectUrl", "downloadUrl", "fileUrl", "filePath", "uri", "path"),
    thumbnailUrl:
      media.thumbnailUrl ||
      stringField(record, "thumbUrl", "previewUrl", "previewPath", "coverUrl", "cover", "thumbnail"),
    fileName: media.fileName || file.name,
    mimeType: media.mimeType || file.type,
    sizeBytes: media.sizeBytes || file.size,
  };
}

function withVideoPosterMedia(
  media: MediaResourceDto,
  poster?: VideoPosterResult,
  uploadedPoster?: MediaResourceDto,
): MediaResourceDto {
  if (!poster && !uploadedPoster) return media;
  const posterUrl = uploadedPoster?.url || uploadedPoster?.thumbnailUrl || poster?.url;
  return {
    ...media,
    thumbnailUrl: media.thumbnailUrl || posterUrl,
    posterUrl,
    localPosterUrl: poster?.url,
    durationSeconds: media.durationSeconds || poster?.durationSeconds,
    width: media.width || poster?.width,
    height: media.height || poster?.height,
  } as MediaResourceDto;
}

function stringField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}
