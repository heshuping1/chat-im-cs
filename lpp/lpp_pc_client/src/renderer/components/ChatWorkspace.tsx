import {
  ClipboardList,
  Copy,
  Download,
  Edit3,
  FileImage,
  FileText,
  FolderOpen,
  Languages,
  MessageSquareQuote,
  Sparkles,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { ChannelBadge, channelLabel as formatChannelLabel } from "./ChannelBadge";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { MessageComposer } from "./MessageComposer";
import { PcAvatar, avatarInitial } from "./PcAvatar";
import type { ComposerMediaKind } from "../composer/domain/detectComposerMediaKind";
import {
  isTerminalCustomerServiceThreadStatus,
  isTerminalCustomerServiceWriteError,
  normalizeCustomerServiceThreadType,
  staffServiceHistoryItemToThread,
  type CustomerServiceThread,
  type CustomerServiceThreadType,
  type MediaResourceDto,
  type MessageItemDto,
} from "../data/api-client";
import { type CurrentUserIdentity, isSelfSender } from "../data/message-display";
import {
  firstMessageMedia,
  mediaFileName,
  normalizeMessageType as normalizeImMessageType,
} from "../data/im-message-normalize";
import { pcQueryKeys } from "../data/query-keys";
import { createApiClient } from "../data/runtime";
import { useWorkspaceStore } from "../data/store";
import { customerServiceHistoryStatusLabel } from "../data/customer-service-display";
import { formatChatMessageTime, formatError } from "../lib/format";
import { prefetchImageMessages } from "../media/runtime/imagePrecache";
import {
  hasOpenableMessageMedia,
  messageMediaActionPayload,
  messageMediaFileName,
  resolveMessageMediaUrl,
} from "../media/domain/mediaMessage";
import { withVideoPosterMedia } from "../media/runtime/videoPosterMedia";
import {
  copyDesktopImage,
  copyDesktopMediaFile,
  editDesktopMediaFile,
  openDesktopMediaFile,
  revealDesktopMediaInFolder,
  revealInFolderLabel as desktopRevealInFolderLabel,
  saveDesktopMediaAs,
} from "../media/runtime/desktopMediaActions";
import { startVerticalPaneResize } from "../lib/paneResize";
import { useWechatBottomFollow } from "../lib/useWechatBottomFollow";
import {
  createVideoPoster,
  registerVideoPosterForMedia,
  type VideoPosterResult,
} from "../lib/videoPoster";

const composerHeightBounds = {
  min: 176,
  max: 360,
};

type LocalUploadStatus = "queued" | "uploading" | "paused" | "failed" | "sent" | "canceled";

type LocalServiceUploadTask = {
  localTaskId: string;
  localMessageId: string;
  file: File;
  kind: ComposerMediaKind;
  thread: CustomerServiceThread;
  body: Record<string, unknown>;
  localPreviewUrl?: string;
  videoPoster?: VideoPosterResult;
  videoPosterPromise?: Promise<VideoPosterResult | undefined>;
  controller?: AbortController;
  controlState?: "paused" | "canceled";
};

type ServiceMessageMenuState = {
  message: MessageItemDto;
  x: number;
  y: number;
} | null;

type ServiceMessageContextAction =
  | "copy_image"
  | "copy_media"
  | "open_media"
  | "edit_media"
  | "save_media_as"
  | "reveal_in_folder";

function clampComposerHeight(height: number) {
  return Math.min(
    composerHeightBounds.max,
    Math.max(composerHeightBounds.min, Math.round(height)),
  );
}

export function ChatWorkspace() {
  const session = useWorkspaceStore((state) => state.authSession);
  const selectedThreadId = useWorkspaceStore((state) => state.activeThreadId);
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [messageMenu, setMessageMenu] = useState<ServiceMessageMenuState>(null);
  const seenIncomingMessageIdsRef = useRef<Set<string>>(new Set());
  const notificationBaselineThreadRef = useRef("");
  const notificationBaselineReadyRef = useRef(false);
  const mediaUploadTasksRef = useRef(new Map<string, LocalServiceUploadTask>());
  const setActiveModule = useWorkspaceStore((state) => state.setActiveModule);
  const pcSettings = useWorkspaceStore((state) => state.pcSettings);
  const [composerHeight, setComposerHeight] = useState(176);
  const pushRealtimeReminder = useWorkspaceStore((state) => state.pushRealtimeReminder);
  const dismissRealtimeRemindersForTarget = useWorkspaceStore(
    (state) => state.dismissRealtimeRemindersForTarget,
  );
  const client = useMemo(
    () => (session ? createApiClient(session) : null),
    [session],
  );
  const queryBaseKey = [session?.apiBaseUrl, session?.tenantToken];

  const threadsQuery = useQuery({
    queryKey: pcQueryKeys.customerServiceThreads(...queryBaseKey),
    enabled: Boolean(client),
    queryFn: async () => client!.getWorkbenchThreads(),
  });
  const historyQuery = useQuery({
    queryKey: pcQueryKeys.customerServiceHistory(...queryBaseKey),
    enabled: Boolean(client),
    queryFn: async () =>
      client!.getStaffServiceHistory({ threadType: "temp_session", limit: 50 }),
  });

  const selectedThread = useMemo(() => {
    const currentThreads = [
      ...(threadsQuery.data?.queueItems ?? []),
      ...(threadsQuery.data?.activeItems ?? []),
    ]
      .filter((thread) => normalizeCustomerServiceThreadType(thread.threadType) === "temp_session")
      .filter((thread) => !isTerminalCustomerServiceThreadStatus(thread.status));
    const historyThreads = (historyQuery.data?.items ?? [])
      .map(staffServiceHistoryItemToThread)
      .filter((thread) => thread.threadType === "temp_session");
    return (
      [...currentThreads, ...historyThreads].find(
        (thread) => thread.threadId === selectedThreadId,
      ) ??
      currentThreads[0] ??
      historyThreads[0]
    );
  }, [historyQuery.data, selectedThreadId, threadsQuery.data]);

  const threadType = selectedThread?.threadType ?? "temp_session";
  const threadId = selectedThread?.threadId ?? "";
  const selectedThreadIsLive = selectedThread
    ? !isTerminalCustomerServiceThreadStatus(selectedThread.status)
    : false;

  const detailQuery = useQuery({
    queryKey: pcQueryKeys.customerServiceThreadDetail(...queryBaseKey, threadType, threadId),
    enabled: Boolean(client && selectedThread),
    queryFn: async () => client!.getWorkbenchThreadDetail(threadType, threadId),
    refetchInterval: selectedThreadIsLive ? 2_500 : false,
    refetchIntervalInBackground: true,
  });
  const profileQuery = useQuery({
    queryKey: pcQueryKeys.customerServiceThreadProfile(
      ...queryBaseKey,
      selectedThread?.threadType,
      selectedThread?.threadId,
    ),
    enabled: Boolean(client && selectedThread),
    queryFn: async () =>
      client!.getThreadProfileCard(selectedThread!.threadType, selectedThread!.threadId),
  });

  const detail = detailQuery.data;
  const profile = profileQuery.data;
  const status = String(detail?.status ?? selectedThread?.status ?? "");
  const readOnly = isTerminalCustomerServiceThreadStatus(status);
  const title =
    usableThreadTitle(profile?.displayName) ||
    usableThreadTitle(detail?.title) ||
    usableThreadTitle(selectedThread?.title) ||
    (readOnly ? "访客" : "未知客户");
  const replyGate = customerServiceReplyGate(status || selectedThread?.status);
  const canReply = !readOnly && replyGate === "open";
  const messages = detail?.messages ?? [];
  useEffect(() => {
    if (!session || !selectedThread || messages.length === 0) return;
    prefetchImageMessages({
      accountId:
        session.userId ||
        session.platformUserId ||
        session.lppId ||
        session.tenantId,
      assetBaseUrl: session.apiBaseUrl,
      authToken: session.tenantToken,
      conversationId: selectedThread.threadId || selectedThread.conversationId,
      messages,
    });
  }, [messages, selectedThread, session]);
  const {
    handleScroll: handleMessageStageScroll,
    jumpToLatest,
    pendingNewMessageCount,
    scrollToBottom: scrollMessagesToBottom,
    stageRef: messageStageRef,
  } = useWechatBottomFollow({
    conversationKey: selectedThread?.threadId,
    isMineMessage: (message: MessageItemDto) => isMineMessage(message, session),
    messageKey: (message: MessageItemDto) =>
      message.messageId ||
      `${message.conversationSeq ?? ""}-${message.sentAt ?? ""}-${message.preview ?? ""}`,
    messages,
  });
  const source =
    detail?.sourceChannel ??
    detail?.source ??
    detail?.channel ??
    detail?.from ??
    selectedThread?.sourceChannel ??
    selectedThread?.source ??
    selectedThread?.channel;

  useEffect(() => {
    const threadKey = selectedThread?.threadId ?? "";
    if (notificationBaselineThreadRef.current !== threadKey) {
      notificationBaselineThreadRef.current = threadKey;
      notificationBaselineReadyRef.current = false;
      seenIncomingMessageIdsRef.current = new Set();
      return;
    }
    if (!selectedThread || readOnly || !detail) return;
    if (!notificationBaselineReadyRef.current) {
      notificationBaselineReadyRef.current = true;
      seenIncomingMessageIdsRef.current = new Set(
        messages
          .filter((message) => !isMineMessage(message, session))
          .map((message) => messageIdentity(message))
          .filter(Boolean),
      );
      return;
    }
    if (messages.length === 0) return;
    const latestIncoming = latestMessage(
      messages.filter((message) => !isMineMessage(message, session)),
    );
    if (!latestIncoming) return;
    const messageId = messageIdentity(latestIncoming);
    if (!messageId || seenIncomingMessageIdsRef.current.has(messageId)) return;
    seenIncomingMessageIdsRef.current.add(messageId);
    notifyIncomingCustomerServiceMessage({
      message: latestIncoming,
      pcSettings,
      pushRealtimeReminder,
      thread: selectedThread,
      title,
    });
  }, [detail, messages, pcSettings, pushRealtimeReminder, readOnly, selectedThread, session, title]);

  useEffect(() => {
    if (!selectedThread || !detail) return;
    mergeLoadedCustomerServiceThreadDetail(queryClient, selectedThread, detail);
    markCustomerServiceThreadReadInCache(queryClient, selectedThread.threadId);
    dismissRealtimeRemindersForTarget("onlineService", selectedThread.threadId);
    if (selectedThread.conversationId !== selectedThread.threadId) {
      dismissRealtimeRemindersForTarget("onlineService", selectedThread.conversationId);
    }
  }, [detail, dismissRealtimeRemindersForTarget, queryClient, selectedThread]);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(
      () => setNotice(null),
      isNoticeErrorText(notice) ? 3200 : 1800,
    );
    return () => window.clearTimeout(timeout);
  }, [notice]);

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

  const openServiceMessageMenu = useCallback(
    (event: MouseEvent<HTMLElement>, message: MessageItemDto) => {
      if (!hasOpenableMedia(message)) return;
      event.preventDefault();
      event.stopPropagation();
      setMessageMenu({
        message,
        x: Math.min(event.clientX, window.innerWidth - 240),
        y: Math.min(event.clientY, window.innerHeight - 220),
      });
    },
    [],
  );

  const handleServiceMessageMenuAction = useCallback(
    async (action: ServiceMessageContextAction, message: MessageItemDto) => {
      setMessageMenu(null);
      setNotice(null);
      const url = resolveMessageMediaUrl(message, session?.apiBaseUrl);
      if (!url) {
        setNotice("这条媒体消息没有可处理的地址。");
        return;
      }
      const accountId =
        session?.userId ||
        session?.platformUserId ||
        session?.lppId ||
        session?.tenantId;
      const conversationId = selectedThread?.threadId || selectedThread?.conversationId;
      if (action === "copy_image" || action === "copy_media") {
        try {
          if (action === "copy_image") {
            await copyMessageImage(url, session?.tenantToken, {
              accountId,
              conversationId,
              fileName: messageMediaFileName(message),
            });
            setNotice("图片已复制。");
          } else {
            await copyMessageMediaFile(message, url, session?.tenantToken, {
              accountId,
              conversationId,
            });
            setNotice("文件已复制。");
          }
        } catch (error) {
          setNotice(`复制失败：${formatError(error)}`);
        }
        return;
      }
      try {
        if (action === "save_media_as") {
          const savedPath = await saveMessageMediaAs(message, url, session?.tenantToken, {
            accountId,
            conversationId,
          });
          if (savedPath) setNotice("已另存为。");
        } else if (action === "reveal_in_folder") {
          await revealMessageMediaInFolder(message, url, session?.tenantToken, {
            accountId,
            conversationId,
          });
          setNotice(isMacPlatform() ? "已在 Finder 中显示。" : "已在文件夹中显示。");
        } else if (action === "open_media") {
          await openMessageMediaFile(message, url, session?.tenantToken, {
            accountId,
            conversationId,
          });
          setNotice("已打开。");
        } else {
          await editMessageMediaFile(message, url, session?.tenantToken, {
            accountId,
            conversationId,
          });
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
    },
    [selectedThread?.conversationId, selectedThread?.threadId, session],
  );

  const sendTextMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!client || !selectedThread) throw new Error("请选择在线客服会话");
      return client.sendWorkbenchTextMessage(
        selectedThread.threadType,
        selectedThread.threadId,
        content,
      );
    },
    onSuccess: async (result, content) => {
      if (selectedThread) {
        mergeSentCustomerServiceMessage(queryClient, {
          thread: selectedThread,
          result,
          messageType: "text",
          body: { text: content },
          identity: session,
        });
      }
      setNotice(null);
      await invalidateCustomerServiceQueries(queryClient);
      scrollMessagesToBottom("smooth");
    },
    onError: (error) => {
      if (isTerminalCustomerServiceWriteError(error)) {
        setNotice("会话已结束，已切换为只读状态。");
        void invalidateCustomerServiceQueries(queryClient);
      }
    },
  });

  const sendMediaMutation = useMutation({
    mutationFn: async ({
      file,
      kind,
    }: {
      file: File;
      kind: ComposerMediaKind;
    }) => {
      if (!client || !selectedThread) throw new Error("请选择在线客服会话");
      const media = normalizeUploadedMedia(await client.uploadMedia(file, kind), file);
      const result = await client.sendWorkbenchMediaMessage(
        selectedThread.threadType,
        selectedThread.threadId,
        kind,
        media,
      );
      return { result, media, kind };
    },
    onSuccess: async ({ result, media, kind }) => {
      if (selectedThread) {
        mergeSentCustomerServiceMessage(queryClient, {
          thread: selectedThread,
          result,
          messageType: kind,
          body: { [kind]: media },
          identity: session,
        });
      }
      setNotice(null);
      await invalidateCustomerServiceQueries(queryClient);
      scrollMessagesToBottom("smooth");
    },
    onError: (error) => {
      if (isTerminalCustomerServiceWriteError(error)) {
        setNotice("会话已结束，已切换为只读状态。");
        void invalidateCustomerServiceQueries(queryClient);
      }
    },
  });
  const startServiceMediaUpload = useCallback(
    (localTaskId: string) => {
      const task = mediaUploadTasksRef.current.get(localTaskId);
      if (!task || !client) return;
      const controller = new AbortController();
      task.controller = controller;
      task.controlState = undefined;
      patchCustomerServiceLocalMessage(queryClient, task.thread, task.localMessageId, {
        status: "uploading",
        uploadProgress: 0,
        localError: undefined,
      });
      void (async () => {
        try {
          const uploadedMedia = normalizeUploadedMedia(
            await client.uploadMedia(task.file, task.kind, {
              signal: controller.signal,
              onProgress: (progress) => {
                if (typeof progress.percent !== "number") return;
                patchCustomerServiceLocalMessage(queryClient, task.thread, task.localMessageId, {
                  status: "uploading",
                  uploadProgress: progress.percent,
                });
              },
            }),
            task.file,
          );
          const videoPoster =
            task.videoPoster ??
            (task.kind === "video" && task.videoPosterPromise
              ? await settleVideoPosterForSend(task.videoPosterPromise)
              : undefined);
          task.videoPoster = videoPoster;
          const uploadedPoster =
            task.kind === "video" && videoPoster
              ? await client
                  .uploadMedia(videoPoster.file, "image", { signal: controller.signal })
                  .then((posterMedia) => normalizeUploadedMedia(posterMedia, videoPoster.file))
                  .catch(() => undefined)
              : undefined;
          const media = withVideoPosterMedia(uploadedMedia, videoPoster, uploadedPoster);
          registerVideoPosterForMedia(media as Record<string, unknown>, videoPoster?.url);
          const result = await client.sendWorkbenchMediaMessage(
            task.thread.threadType,
            task.thread.threadId,
            task.kind,
            media,
          );
          removeCustomerServiceLocalMessage(queryClient, task.thread, task.localMessageId);
          mergeSentCustomerServiceMessage(queryClient, {
            thread: task.thread,
            result,
            messageType: task.kind,
            body: {
              [task.kind]:
                (task.kind === "image" || task.kind === "video") && task.localPreviewUrl
                  ? {
                      ...media,
                      localPreviewUrl: task.localPreviewUrl,
                      ...(videoPoster?.url ? { localPosterUrl: videoPoster.url } : {}),
                    }
                  : media,
            },
            identity: session,
          });
          mediaUploadTasksRef.current.delete(localTaskId);
          setNotice(null);
          await invalidateCustomerServiceQueries(queryClient);
          scrollMessagesToBottom("smooth");
        } catch (error) {
          if (controller.signal.aborted && task.controlState) return;
          if (isTerminalCustomerServiceWriteError(error)) {
            setNotice("会话已结束，已切换为只读状态。");
            void invalidateCustomerServiceQueries(queryClient);
          }
          patchCustomerServiceLocalMessage(queryClient, task.thread, task.localMessageId, {
            status: "failed",
            localError: formatError(error),
          });
        }
      })();
    },
    [client, queryClient, scrollMessagesToBottom, session],
  );

  const sendServiceMediaOptimistically = useCallback(
    async (file: File, kind: ComposerMediaKind) => {
      if (!selectedThread) throw new Error("请选择在线客服会话");
      const localMessageId = `pc-cs-local-media-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const localTaskId = `pc-cs-upload-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const localPreviewUrl =
        kind === "image" || kind === "video" ? URL.createObjectURL(file) : undefined;
      const videoPosterPromise = kind === "video" ? createVideoPoster(file) : undefined;
      const localMedia: MediaResourceDto & {
        localPreviewUrl?: string;
        localPosterUrl?: string;
        posterUrl?: string;
      } = {
        url: localPreviewUrl || "",
        thumbnailUrl: kind === "image" ? localPreviewUrl : undefined,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        localPreviewUrl,
      };
      const body = { [kind]: localMedia };
      const message = customerServiceMessageFromSendResult({
        thread: selectedThread,
        result: { messageId: localMessageId, sentAt: new Date().toISOString() },
        messageType: kind,
        body,
        identity: session,
      });
      const localMessage = {
        ...message,
        status: "uploading",
        uploadProgress: 0,
        localTaskId,
      } as MessageItemDto;
      appendCustomerServiceLocalMessage(queryClient, selectedThread, localMessage);
      mediaUploadTasksRef.current.set(localTaskId, {
        localTaskId,
        localMessageId,
        file,
        kind,
        thread: selectedThread,
        body,
        localPreviewUrl,
        videoPosterPromise,
      });
      scrollMessagesToBottom("smooth");
      startServiceMediaUpload(localTaskId);
    },
    [queryClient, scrollMessagesToBottom, selectedThread, session, startServiceMediaUpload],
  );

  const handleServiceUploadAction = useCallback(
    (localTaskId: string, action: "pause" | "resume" | "cancel" | "retry") => {
      const task = mediaUploadTasksRef.current.get(localTaskId);
      if (!task) return;
      if (action === "pause") {
        task.controlState = "paused";
        task.controller?.abort();
        patchCustomerServiceLocalMessage(queryClient, task.thread, task.localMessageId, {
          status: "paused",
          localError: undefined,
        });
        return;
      }
      if (action === "cancel") {
        task.controlState = "canceled";
        task.controller?.abort();
        patchCustomerServiceLocalMessage(queryClient, task.thread, task.localMessageId, {
          status: "canceled",
          localError: undefined,
        });
        return;
      }
      startServiceMediaUpload(localTaskId);
    },
    [queryClient, startServiceMediaUpload],
  );
  const threadActionMutation = useMutation({
    mutationFn: async (action: "claim" | "takeover" | "close") => {
      if (!client || !selectedThread) throw new Error("请选择在线客服会话");
      if (action === "claim") {
        return client.claimCustomerServiceThread(
          selectedThread.threadType,
          selectedThread.threadId,
        );
      }
      if (action === "takeover") {
        return client.takeoverCustomerServiceThread(
          selectedThread.threadType,
          selectedThread.threadId,
        );
      }
      return client.closeCustomerServiceThread(
        selectedThread.threadType,
        selectedThread.threadId,
      );
    },
    onSuccess: async (result, action) => {
      if (action === "close" && selectedThread) {
        markCustomerServiceThreadClosed(queryClient, selectedThread, result);
      }
      setNotice(actionSuccessText(action));
      await invalidateCustomerServiceQueries(queryClient);
    },
    onError: (error) => {
      setNotice(formatError(error));
      void invalidateCustomerServiceQueries(queryClient);
    },
  });

  if (!selectedThread) {
    return (
      <main className="h-chat-workspace">
        <div className="panel-state muted">请选择一个在线客服会话</div>
      </main>
    );
  }

  return (
    <main
      className="h-chat-workspace"
      style={{ "--composer-height": `${composerHeight}px` } as CSSProperties}
    >
      <header className="h-chat-head">
        <div className="h-customer-title">
          <PcAvatar
            avatarUrl={
              profile?.avatarUrl ||
              selectedThread.customerAvatarUrl ||
              selectedThread.avatarUrl
            }
            className={`e-avatar ${selectedThread.isVip ? "gold" : "indigo"}`}
            name={title || "客户"}
          />
          <div>
            <h2>{title}</h2>
            <p>
              在线客服 · <ChannelBadge source={source} compact /> ·{" "}
              {selectedThread.isVip ? "VIP 客户" : "普通客户"} ·{" "}
              {readOnly ? "历史会话" : "当前接待"}
            </p>
          </div>
        </div>
      </header>

      <section className={`h-reception-strip ${readOnly ? "ended" : ""}`}>
        <span className={`status-dot ${readOnly ? "offline" : "online"}`} />
        <strong>{readOnly ? "历史会话" : receptionLabel(status)}</strong>
        <span>
          {readOnly
            ? `只读查看 · ${customerServiceHistoryStatusLabel(status)}`
            : replyGate === "claim"
              ? `客户正在排队 · 来自 ${formatChannelLabel(source)} · 接入后才能人工回复`
              : replyGate === "takeover"
                ? `当前由 AI 接待 · 来自 ${formatChannelLabel(source)} · 接管后才能人工回复`
                : `会话已接入 · 来自 ${formatChannelLabel(source)} · 可继续沟通`}
        </span>
        {!readOnly && (
          <ThreadActionButton
            status={status || selectedThread.status}
            selectedStatus={selectedThread.status}
            pending={threadActionMutation.isPending}
            onAction={(action) => threadActionMutation.mutate(action)}
          />
        )}
      </section>

      {notice && <ChatToastNotice text={notice} />}

      <section
        className="h-message-stage"
        aria-label="在线客服聊天"
        onScroll={handleMessageStageScroll}
        ref={messageStageRef}
      >
        {pendingNewMessageCount > 0 && (
          <button
            className="pc-chat-latest-jump"
            type="button"
            onClick={jumpToLatest}
          >
            ↓ {pendingNewMessageCount} 条新消息
          </button>
        )}
        {detailQuery.isLoading && <div className="panel-state muted">正在加载会话...</div>}
        {detailQuery.error && (
          <div className="panel-state error">
            会话加载失败：{formatError(detailQuery.error)}
          </div>
        )}
        {!detailQuery.isLoading &&
          !detailQuery.error &&
          messages.map((message) => (
            <ServiceMessage
              key={message.messageId}
              message={message}
              mine={isMineMessage(message, session)}
              assetBaseUrl={session?.apiBaseUrl}
              authToken={session?.tenantToken}
              mediaCacheContext={{
                accountId:
                  session?.userId ||
                  session?.platformUserId ||
                  session?.lppId ||
                  session?.tenantId,
                conversationId: selectedThread?.threadId || selectedThread?.conversationId,
              }}
              fallbackInitial={avatarInitial(title || "客")}
              senderFallback={title}
              onContextMenu={openServiceMessageMenu}
              onUploadAction={handleServiceUploadAction}
            />
          ))}
        {!detailQuery.isLoading && !detailQuery.error && messages.length === 0 && (
          <div className="panel-state muted">暂无消息记录</div>
        )}
      </section>

      {messageMenu && (
        <ServiceMessageContextMenu
          message={messageMenu.message}
          onAction={(action) =>
            void handleServiceMessageMenuAction(action, messageMenu.message)
          }
          position={{ x: messageMenu.x, y: messageMenu.y }}
        />
      )}

      {canReply && (
        <MessageComposer
          dense
          placeholder="输入回复..."
          disabled={
            detailQuery.isLoading ||
            sendTextMutation.isPending ||
            sendMediaMutation.isPending
          }
          onResizeStart={(event) =>
            startVerticalPaneResize(event, {
              initialHeight: composerHeight,
              onResize: (height) => setComposerHeight(clampComposerHeight(height)),
            })
          }
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
          onSendText={async (content) => {
            await sendTextMutation.mutateAsync(content);
          }}
          onTranslateDraft={async (content) => {
            if (!client) throw new Error("请先登录");
            return extractActionResultText(await client.translateText(content));
          }}
          onSendMedia={sendServiceMediaOptimistically}
        />
      )}
      {!readOnly && !canReply && (
        <div className="composer-disabled-note">
          {replyGate === "claim"
            ? "当前会话仍在排队中，请先点击“接入”。"
            : "当前会话仍由 AI 接待，请先点击“人工接管”。"}
        </div>
      )}
    </main>
  );
}

function ServiceMessage({
  message,
  mine,
  assetBaseUrl,
  authToken,
  mediaCacheContext,
  fallbackInitial,
  senderFallback,
  onContextMenu,
  onUploadAction,
}: {
  message: MessageItemDto;
  mine: boolean;
  assetBaseUrl?: string;
  authToken?: string;
  mediaCacheContext?: {
    accountId?: string;
    conversationId?: string;
  };
  fallbackInitial: string;
  senderFallback: string;
  onContextMenu?: (event: MouseEvent<HTMLElement>, message: MessageItemDto) => void;
  onUploadAction?: (localTaskId: string, action: "pause" | "resume" | "cancel" | "retry") => void;
}) {
  return (
    <ChatMessageBubble
      assetBaseUrl={assetBaseUrl}
      fallbackInitial={fallbackInitial}
      message={message}
      mine={mine}
      authToken={authToken}
      mediaCacheContext={mediaCacheContext}
      onContextMenu={onContextMenu}
      onUploadAction={onUploadAction}
      senderFallback={senderFallback || "访客"}
      statusText={mine ? "已发送" : undefined}
      timeText={formatChatMessageTime(message.sentAt)}
    />
  );
}

function ServiceMessageContextMenu({
  message,
  onAction,
  position,
}: {
  message: MessageItemDto;
  onAction: (action: ServiceMessageContextAction) => void;
  position: { x: number; y: number };
}) {
  const isImage = isImageMessage(message);
  const isVideo = isVideoMessage(message);
  const canCopyMediaFile = Boolean(window.desktopApi?.copyMediaFile || window.desktopApi?.cacheMediaFile);
  const items: Array<{
    action: ServiceMessageContextAction;
    label: string;
    icon: ReactNode;
  }> = [
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
  ];
  const visibleItems = items.filter(
    (item) => !isVideo || (item.action !== "copy_media" && item.action !== "save_media_as"),
  );
  return (
    <div
      className="message-context-menu"
      role="menu"
      style={{ left: position.x, top: position.y }}
      onClick={(event) => event.stopPropagation()}
    >
      {visibleItems.map((item) => (
        <button key={item.action} type="button" role="menuitem" onClick={() => onAction(item.action)}>
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
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

function ThreadActionButton({
  status,
  selectedStatus,
  pending,
  onAction,
}: {
  status: string;
  selectedStatus?: string;
  pending: boolean;
  onAction: (action: "claim" | "takeover" | "close") => void;
}) {
  const normalized = normalizeStatus(status);
  const selectedNormalized = normalizeStatus(selectedStatus);
  if (
    normalized.includes("queue") ||
    normalized === "1" ||
    selectedNormalized.includes("queue") ||
    selectedNormalized === "1"
  ) {
    return (
      <button type="button" disabled={pending} onClick={() => onAction("claim")}>
        接入
      </button>
    );
  }
  if (normalized.includes("ai") || normalized.includes("assist")) {
    return (
      <button type="button" disabled={pending} onClick={() => onAction("takeover")}>
        人工接管
      </button>
    );
  }
  return (
    <button type="button" disabled={pending} onClick={() => onAction("close")}>
      关闭会话
    </button>
  );
}

async function invalidateCustomerServiceQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["pc-cs-thread-detail"] }),
    queryClient.invalidateQueries({ queryKey: ["pc-cs-workbench-threads"] }),
    queryClient.invalidateQueries({ queryKey: ["pc-cs-staff-service-history"] }),
  ]);
}

function mergeSentCustomerServiceMessage(
  queryClient: ReturnType<typeof useQueryClient>,
  params: {
    thread: CustomerServiceThread;
    result: {
      messageId?: string;
      conversationSeq?: number;
      sentAt?: string;
      serverTime?: string;
      message?: MessageItemDto;
    };
    messageType: "text" | "image" | "video" | "file";
    body: Record<string, unknown>;
    identity?: CurrentUserIdentity | null;
  },
) {
  const message = customerServiceMessageFromSendResult(params);
  queryClient.setQueriesData<{ messages?: MessageItemDto[] }>(
    {
      predicate: (query) =>
        query.queryKey[0] === "pc-cs-thread-detail" &&
        query.queryKey.includes(params.thread.threadId),
    },
    (old) =>
      old
        ? {
            ...old,
            threadType: params.thread.threadType,
            threadId: params.thread.threadId,
            messages: appendLocalMessage(old.messages, message),
          }
        : old,
  );
  queryClient.setQueriesData<{
    queueItems: CustomerServiceThread[];
    activeItems: CustomerServiceThread[];
    summary?: Record<string, number>;
  }>(
    { queryKey: ["pc-cs-workbench-threads"] },
    (old) =>
      old
        ? {
            ...old,
            queueItems: old.queueItems.map((thread) =>
              updateThreadPreview(thread, params.thread.threadId, message, true),
            ),
            activeItems: old.activeItems.map((thread) =>
              updateThreadPreview(thread, params.thread.threadId, message, true),
            ),
          }
        : old,
  );
}

function appendCustomerServiceLocalMessage(
  queryClient: ReturnType<typeof useQueryClient>,
  thread: CustomerServiceThread,
  message: MessageItemDto,
) {
  queryClient.setQueriesData<{ messages?: MessageItemDto[] }>(
    {
      predicate: (query) =>
        query.queryKey[0] === "pc-cs-thread-detail" &&
        query.queryKey.includes(thread.threadId),
    },
    (old) =>
      old
        ? {
            ...old,
            threadType: thread.threadType,
            threadId: thread.threadId,
            messages: appendLocalMessage(old.messages, message),
          }
        : old,
  );
}

function patchCustomerServiceLocalMessage(
  queryClient: ReturnType<typeof useQueryClient>,
  thread: CustomerServiceThread,
  localMessageId: string,
  patch: {
    status?: LocalUploadStatus;
    uploadProgress?: number;
    localError?: string;
  },
) {
  queryClient.setQueriesData<{ messages?: MessageItemDto[] }>(
    {
      predicate: (query) =>
        query.queryKey[0] === "pc-cs-thread-detail" &&
        query.queryKey.includes(thread.threadId),
    },
    (old) =>
      old
        ? {
            ...old,
            messages: (old.messages ?? []).map((message) =>
              message.messageId === localMessageId
                ? ({
                    ...message,
                    ...(patch.status ? { status: patch.status } : {}),
                    ...(typeof patch.uploadProgress === "number"
                      ? { uploadProgress: patch.uploadProgress }
                      : {}),
                    ...(patch.localError === undefined
                      ? { localError: undefined }
                      : { localError: patch.localError }),
                  } as MessageItemDto)
                : message,
            ),
          }
        : old,
  );
}

function removeCustomerServiceLocalMessage(
  queryClient: ReturnType<typeof useQueryClient>,
  thread: CustomerServiceThread,
  localMessageId: string,
) {
  queryClient.setQueriesData<{ messages?: MessageItemDto[] }>(
    {
      predicate: (query) =>
        query.queryKey[0] === "pc-cs-thread-detail" &&
        query.queryKey.includes(thread.threadId),
    },
    (old) =>
      old
        ? {
            ...old,
            messages: (old.messages ?? []).filter(
              (message) => message.messageId !== localMessageId,
            ),
          }
        : old,
  );
}

function customerServiceMessageFromSendResult(params: {
  thread: CustomerServiceThread;
  result: {
    messageId?: string;
    conversationSeq?: number;
    sentAt?: string;
    serverTime?: string;
    message?: MessageItemDto;
  };
  messageType: "text" | "image" | "video" | "file";
  body: Record<string, unknown>;
  identity?: CurrentUserIdentity | null;
}): MessageItemDto {
  if (params.result.message) {
    return {
      ...params.result.message,
      conversationId:
        params.result.message.conversationId || params.thread.conversationId || params.thread.threadId,
      messageType: params.result.message.messageType || params.messageType,
      body: params.result.message.body ?? params.body,
      isSelf: true,
      direction: params.result.message.direction || "out",
    };
  }
  return {
    messageId:
      params.result.messageId ||
      `pc-cs-local-${params.thread.threadId}-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}`,
    conversationId: params.thread.conversationId || params.thread.threadId,
    conversationSeq: params.result.conversationSeq,
    senderUserId: params.identity?.userId || undefined,
    senderId: params.identity?.userId || undefined,
    senderPlatformUserId: params.identity?.platformUserId || undefined,
    senderLppId: params.identity?.lppId || undefined,
    senderDisplayName: params.identity?.displayName || "我",
    senderAvatarUrl:
      typeof (params.identity as { avatarUrl?: unknown } | null | undefined)?.avatarUrl === "string"
        ? ((params.identity as { avatarUrl?: string }).avatarUrl ?? null)
        : null,
    messageType: params.messageType,
    body: { ...params.body, messageType: params.messageType },
    preview: previewFromComposerBody(params.messageType, params.body),
    sentAt: params.result.sentAt || params.result.serverTime || new Date().toISOString(),
    isSelf: true,
    direction: "out",
  };
}

function appendLocalMessage(old: MessageItemDto[] | undefined, message: MessageItemDto) {
  const items = old ? [...old] : [];
  if (items.some((item) => item.messageId === message.messageId)) return old;
  items.push(message);
  items.sort((a, b) => {
    const seqA = a.conversationSeq ?? 0;
    const seqB = b.conversationSeq ?? 0;
    if (seqA !== seqB) return seqA - seqB;
    return Date.parse(a.sentAt ?? "") - Date.parse(b.sentAt ?? "");
  });
  return items;
}

function isImageMessage(message: MessageItemDto) {
  const type = normalizeImMessageType(message);
  return type.includes("image") || Boolean(message.body?.image);
}

function isVideoMessage(message: MessageItemDto) {
  const type = normalizeImMessageType(message);
  return type.includes("video") || Boolean(message.body?.video);
}

function mediaName(message: MessageItemDto) {
  const media = firstMessageMedia(message);
  return mediaFileName(media) || message.preview;
}

function hasOpenableMedia(message: MessageItemDto) {
  return hasOpenableMessageMedia(message);
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
  return saveDesktopMediaAs(
    messageMediaActionPayload({ message, url, authToken, cacheContext }),
  );
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
  return revealDesktopMediaInFolder(
    messageMediaActionPayload({ message, url, authToken, cacheContext }),
  );
}

async function copyMessageMediaFile(
  message: MessageItemDto,
  url: string,
  authToken?: string,
  cacheContext?: {
    accountId?: string;
    conversationId?: string;
  },
) {
  return copyDesktopMediaFile(
    messageMediaActionPayload({ message, url, authToken, cacheContext }),
  );
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
  await copyDesktopImage({
    url,
    authToken,
    accountId: cacheContext?.accountId,
    conversationId: cacheContext?.conversationId,
    fileName: cacheContext?.fileName || "image.png",
  });
}

async function openMessageMediaFile(
  message: MessageItemDto,
  url: string,
  authToken?: string,
  cacheContext?: {
    accountId?: string;
    conversationId?: string;
  },
) {
  return openDesktopMediaFile(
    messageMediaActionPayload({ message, url, authToken, cacheContext }),
  );
}

async function editMessageMediaFile(
  message: MessageItemDto,
  url: string,
  authToken?: string,
  cacheContext?: {
    accountId?: string;
    conversationId?: string;
  },
) {
  return editDesktopMediaFile(
    messageMediaActionPayload({ message, url, authToken, cacheContext }),
  );
}

function revealInFolderLabel() {
  return desktopRevealInFolderLabel();
}

function isMacPlatform() {
  return /mac/i.test(navigator.platform);
}

function updateThreadPreview(
  thread: CustomerServiceThread,
  threadId: string,
  message: MessageItemDto,
  read: boolean,
) {
  if (thread.threadId !== threadId && thread.conversationId !== threadId) return thread;
  return {
    ...thread,
    lastMessagePreview: message.preview || thread.lastMessagePreview,
    lastMessageAt: message.sentAt || thread.lastMessageAt,
    unreadCount: read ? 0 : thread.unreadCount,
  };
}

function mergeLoadedCustomerServiceThreadDetail(
  queryClient: ReturnType<typeof useQueryClient>,
  thread: CustomerServiceThread,
  detail: {
    title?: string;
    avatarUrl?: string | null;
    source?: string;
    from?: string;
    channel?: string;
    sourceChannel?: string;
    entryChannel?: string;
    platform?: string;
    provider?: string;
    lastMessagePreview?: string;
    lastMessageAt?: string | null;
    messages?: MessageItemDto[];
  },
) {
  const latest = latestMessage(detail.messages ?? []);
  const lastMessagePreview =
    detail.lastMessagePreview || previewFromMessage(latest) || thread.lastMessagePreview;
  const lastMessageAt = detail.lastMessageAt || latest?.sentAt || thread.lastMessageAt;
  queryClient.setQueriesData<{
    queueItems: CustomerServiceThread[];
    activeItems: CustomerServiceThread[];
    summary?: Record<string, number>;
  }>(
    { queryKey: ["pc-cs-workbench-threads"] },
    (old) =>
      old
        ? {
            ...old,
            queueItems: old.queueItems.map((item) =>
              mergeThreadDetailIntoListItem(item, thread.threadId, detail, lastMessagePreview, lastMessageAt),
            ),
            activeItems: old.activeItems.map((item) =>
              mergeThreadDetailIntoListItem(item, thread.threadId, detail, lastMessagePreview, lastMessageAt),
            ),
          }
        : old,
  );
}

function markCustomerServiceThreadReadInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  threadId: string,
) {
  queryClient.setQueriesData<{
    queueItems: CustomerServiceThread[];
    activeItems: CustomerServiceThread[];
    summary?: Record<string, number>;
  }>(
    { queryKey: ["pc-cs-workbench-threads"] },
    (old) => {
      if (!old) return old;
      let changed = false;
      const markRead = (item: CustomerServiceThread) => {
        if (item.threadId !== threadId && item.conversationId !== threadId) return item;
        if (!item.unreadCount) return item;
        changed = true;
        return { ...item, unreadCount: 0 };
      };
      const queueItems = old.queueItems.map(markRead);
      const activeItems = old.activeItems.map(markRead);
      return changed ? { ...old, queueItems, activeItems } : old;
    },
  );
}

function mergeThreadDetailIntoListItem(
  item: CustomerServiceThread,
  threadId: string,
  detail: {
    status?: string;
    title?: string;
    avatarUrl?: string | null;
    source?: string;
    from?: string;
    channel?: string;
    sourceChannel?: string;
    entryChannel?: string;
    platform?: string;
    provider?: string;
  },
  lastMessagePreview?: string,
  lastMessageAt?: string | null,
) {
  if (item.threadId !== threadId && item.conversationId !== threadId) return item;
  return {
    ...item,
    title: detail.title || item.title,
    avatarUrl: detail.avatarUrl || item.avatarUrl,
    customerAvatarUrl: detail.avatarUrl || item.customerAvatarUrl,
    source: detail.source || item.source,
    from: detail.from || item.from,
    channel: detail.channel || item.channel,
    sourceChannel: detail.sourceChannel || item.sourceChannel,
    entryChannel: detail.entryChannel || item.entryChannel,
    platform: detail.platform || item.platform,
    provider: detail.provider || item.provider,
    lastMessagePreview: lastMessagePreview || item.lastMessagePreview,
    lastMessageAt: lastMessageAt || item.lastMessageAt,
  };
}

function markCustomerServiceThreadClosed(
  queryClient: ReturnType<typeof useQueryClient>,
  thread: CustomerServiceThread,
  result: { status?: string; closed?: boolean },
) {
  const status = result.status || (result.closed ? "closed_by_staff" : "closed_by_staff");
  queryClient.setQueriesData<{ status?: string; messages?: MessageItemDto[] }>(
    {
      predicate: (query) =>
        query.queryKey[0] === "pc-cs-thread-detail" && query.queryKey.includes(thread.threadId),
    },
    (old) => (old ? { ...old, status } : old),
  );
}

function previewFromComposerBody(messageType: "text" | "image" | "video" | "file", body: Record<string, unknown>) {
  if (messageType === "text") {
    const text = body.text;
    return typeof text === "string" ? text : "";
  }
  if (messageType === "image") return "[图片]";
  if (messageType === "video") return "[视频]";
  if (messageType === "file") return "[文件]";
  return "[消息]";
}

function previewFromMessage(message?: MessageItemDto) {
  if (!message) return undefined;
  if (message.preview?.trim()) return message.preview.trim();
  return previewFromComposerBody(
    normalizeMessageType(message.messageType),
    message.body ?? {},
  );
}

function normalizeMessageType(messageType?: string): "text" | "image" | "video" | "file" {
  const normalized = String(messageType ?? "").trim().toLowerCase();
  if (normalized === "image") return "image";
  if (normalized === "video") return "video";
  if (normalized === "file") return "file";
  return "text";
}

function latestMessage(messages: MessageItemDto[]) {
  return [...messages].sort((a, b) => {
    const seqA = a.conversationSeq ?? 0;
    const seqB = b.conversationSeq ?? 0;
    if (seqA !== seqB) return seqB - seqA;
    return Date.parse(b.sentAt ?? "") - Date.parse(a.sentAt ?? "");
  })[0];
}

function messageIdentity(message: MessageItemDto) {
  return (
    message.messageId ||
    [
      message.conversationId ?? "",
      message.conversationSeq ?? "",
      message.sentAt ?? "",
      previewFromMessage(message) ?? "",
    ].join("|")
  );
}

function notifyIncomingCustomerServiceMessage({
  message,
  pcSettings,
  pushRealtimeReminder,
  thread,
  title,
}: {
  message: MessageItemDto;
  pcSettings: ReturnType<typeof useWorkspaceStore.getState>["pcSettings"];
  pushRealtimeReminder: ReturnType<typeof useWorkspaceStore.getState>["pushRealtimeReminder"];
  thread: CustomerServiceThread;
  title: string;
}) {
  if (!pcSettings.serviceQueueNotifications) return;
  const body = previewFromMessage(message) || "当前在线客服会话有新消息";
  const targetId = thread.threadId || thread.conversationId || message.conversationId;
  pushRealtimeReminder({
    id: `cs-detail-message-${targetId}-${messageIdentity(message)}`,
    title: title || thread.title || "在线客服新消息",
    body,
    targetModule: "onlineService",
    targetId,
    severity: "warning",
    icon: "service",
  });
  if (pcSettings.desktopNotifications) {
    notifyDesktopOrBrowser({
      title: title || thread.title || "在线客服新消息",
      body,
      conversationId: targetId,
    });
  }
}

function notifyDesktopOrBrowser(payload: {
  title: string;
  body: string;
  conversationId?: string;
}) {
  if (window.desktopApi?.notify) {
    void window.desktopApi.notify(payload);
    return;
  }
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(payload.title, { body: payload.body });
    return;
  }
  if (Notification.permission === "default") {
    void Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        new Notification(payload.title, { body: payload.body });
      }
    });
  }
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
    fileName: file.name || media.fileName,
    originalFileName: file.name,
    mimeType: file.type || media.mimeType,
    sizeBytes: file.size || media.sizeBytes,
  } as MediaResourceDto;
}

async function settleVideoPosterForSend(
  promise: Promise<VideoPosterResult | undefined>,
  timeoutMs = 700,
) {
  let timer: number | undefined;
  try {
    return await Promise.race([
      promise.catch(() => undefined),
      new Promise<undefined>((resolve) => {
        timer = window.setTimeout(() => resolve(undefined), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) window.clearTimeout(timer);
  }
}

function stringField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
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
    "result",
    "data",
    "body",
    "payload",
    "output",
  ]) {
    const item = record[key];
    if (typeof item === "string" && item.trim()) return item.trim();
    const nested = extractActionResultText(item);
    if (nested) return nested;
  }
  return undefined;
}

function isMineMessage(message: MessageItemDto, identity?: CurrentUserIdentity | null) {
  const record = message as unknown as Record<string, unknown>;
  return Boolean(
    record.isSelf === true ||
      record.isMine === true ||
      ["out", "outgoing", "sent", "self"].includes(
        String(record.direction ?? "").trim().toLowerCase(),
      ) ||
      isSelfSender(message.senderUserId, message.senderDisplayName, identity) ||
      isSelfSender(message.senderId, message.senderDisplayName, identity) ||
      isSelfSender(message.fromUserId, message.senderDisplayName, identity) ||
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
      ),
  );
}

function receptionLabel(status: string) {
  const normalized = normalizeStatus(status);
  if (normalized.includes("queue") || normalized.includes("waiting")) return "等待人工接入";
  if (normalized.includes("ai")) return "AI 转人工";
  if (normalized.includes("assist")) return "协助接待中";
  return "我正在接待";
}

function customerServiceReplyGate(status: string): "claim" | "takeover" | "open" {
  const normalized = normalizeStatus(status);
  if (
    normalized === "1" ||
    normalized === "queued" ||
    normalized === "created" ||
    normalized.includes("queue") ||
    normalized.includes("pending") ||
    normalized.includes("waiting")
  ) {
    return "claim";
  }
  if (normalized.includes("ai") || normalized.includes("assist") || normalized === "bot") {
    return "takeover";
  }
  return "open";
}

function usableThreadTitle(value?: string | null) {
  const title = value?.trim();
  if (!title || title.startsWith("历史会话")) return undefined;
  return title;
}

function normalizeStatus(status?: string | null) {
  return String(status ?? "").trim().toLowerCase().replace(/-/g, "_");
}

function actionSuccessText(action: "claim" | "takeover" | "close") {
  if (action === "claim") return "已接入会话。";
  if (action === "takeover") return "已人工接管会话。";
  return "会话已关闭。";
}
