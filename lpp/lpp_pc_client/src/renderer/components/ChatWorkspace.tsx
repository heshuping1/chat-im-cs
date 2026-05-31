import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import { channelLabel as formatChannelLabel } from "./ChannelBadge";
import { PanelState } from "./PanelState";
import {
  type MessageItemDto,
} from "../data/api-client";
import { usePcSettings } from "../data/settings/settings-store";
import {
  useDismissRealtimeRemindersForTarget,
  usePushRealtimeReminder,
} from "../data/reminder/reminder-store";
import {
  useCloseOpenServiceThread,
  useActiveThreadId,
  useOpenServiceThreadIds,
  useSetActiveModule,
  useSetActiveThread,
} from "../data/workspace-ui/workspace-ui-store";
import { type CurrentUserIdentity, isSelfSender } from "../data/message-display";
import {
  createCustomerServiceNoThreadState,
} from "../data/customer-service/cs-workspace-view-model";
import { formatError } from "../lib/format";
import {
  hasOpenableMessageMedia,
  messageMediaFileName,
  resolveMessageMediaUrl,
} from "../media/domain/mediaMessage";
import {
  copyMessageImage,
  copyMessageMediaFile,
  editMessageMediaFile,
  isMacPlatform,
  openMessageMediaFile,
  revealInFolderLabel,
  revealMessageMediaInFolder,
  saveMessageMediaAs,
} from "../messages/runtime/messageMediaActions";
import {
  extractActionResultText,
} from "../messages/models/messageComposerModel";
import { ChatToastNotice, isNoticeErrorText } from "../messages/components/ChatToastNotice";
import { useWindowDismiss } from "../messages/hooks/useWindowDismiss";
import {
  type ServiceMessageContextAction,
} from "../customer-service/components/ServiceMessageContextMenu";
import { CustomerServiceComposerSurface } from "../customer-service/components/CustomerServiceComposerSurface";
import { CustomerServiceMultiOpenBar } from "../customer-service/components/CustomerServiceMultiOpenBar";
import { CustomerServiceWorkspaceHeader } from "../customer-service/components/CustomerServiceWorkspaceHeader";
import { CustomerServiceReceptionStrip } from "../customer-service/components/CustomerServiceReceptionStrip";
import { CustomerServiceMessageStage } from "../customer-service/components/CustomerServiceMessageStage";
import { useCustomerServiceIncomingNotifications } from "../customer-service/hooks/useCustomerServiceIncomingNotifications";
import { useCustomerServiceThreadLifecycle } from "../customer-service/hooks/useCustomerServiceThreadLifecycle";
import { useCustomerServiceSendController } from "../customer-service/hooks/useCustomerServiceSendController";
import { useCustomerServiceWorkspaceController } from "../customer-service/hooks/useCustomerServiceWorkspaceController";
import { startVerticalPaneResize } from "../lib/paneResize";
import { useWechatBottomFollow } from "../lib/useWechatBottomFollow";
import { maxOpenServiceThreads } from "../data/customer-service/cs-multi-open";

const composerHeightBounds = {
  min: 176,
  max: 360,
};

type ServiceMessageMenuState = {
  message: MessageItemDto;
  x: number;
  y: number;
} | null;

function clampComposerHeight(height: number) {
  return Math.min(
    composerHeightBounds.max,
    Math.max(composerHeightBounds.min, Math.round(height)),
  );
}

export function ChatWorkspace() {
  const selectedThreadId = useActiveThreadId();
  const openServiceThreadIds = useOpenServiceThreadIds();
  const [notice, setNotice] = useState<string | null>(null);
  const [messageMenu, setMessageMenu] = useState<ServiceMessageMenuState>(null);
  const setActiveModule = useSetActiveModule();
  const setActiveThread = useSetActiveThread();
  const closeOpenServiceThread = useCloseOpenServiceThread();
  const pcSettings = usePcSettings();
  const [composerHeight, setComposerHeight] = useState(176);
  const pushRealtimeReminder = usePushRealtimeReminder();
  const dismissRealtimeRemindersForTarget = useDismissRealtimeRemindersForTarget();
  const {
    client,
    detail,
    detailLoading,
    queryClient,
    selectedThread,
    selectableThreads,
    session,
    threadActionMutation,
    workspaceViewModel,
  } = useCustomerServiceWorkspaceController({
    formatSourceLabel: formatChannelLabel,
    selectedThreadId,
    setNotice,
  });
  const {
    canReply,
    composerDisabledText,
    identity,
    messageStageState,
    modeLabel,
    messages,
    readOnly,
    receptionText,
    source,
    status,
    threadState,
    title,
  } = workspaceViewModel;
  const openThreads = useMemo(() => {
    const threadsById = new Map(
      selectableThreads.map((thread) => [thread.threadId, thread]),
    );
    const opened = openServiceThreadIds
      .map((threadId) => threadsById.get(threadId))
      .filter((thread): thread is NonNullable<typeof thread> => Boolean(thread));
    if (selectedThread && !opened.some((thread) => thread.threadId === selectedThread.threadId)) {
      return [...opened, selectedThread].slice(-maxOpenServiceThreads);
    }
    return opened;
  }, [openServiceThreadIds, selectableThreads, selectedThread]);
  useCustomerServiceThreadLifecycle({
    detail,
    dismissRealtimeRemindersForTarget,
    messages,
    queryClient,
    selectedThread,
    session,
    status,
    threadState,
  });
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
  useCustomerServiceIncomingNotifications({
    detailLoaded: Boolean(detail),
    isMineMessage,
    messages,
    pcSettings,
    pushRealtimeReminder,
    readOnly,
    selectedThread,
    session,
    title,
  });

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(
      () => setNotice(null),
      isNoticeErrorText(notice) ? 3200 : 1800,
    );
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useWindowDismiss(Boolean(messageMenu), () => setMessageMenu(null));

  const openServiceMessageMenu = useCallback(
    (event: MouseEvent<HTMLElement>, message: MessageItemDto) => {
      if (!hasOpenableMessageMedia(message)) return;
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

  const {
    handleServiceUploadAction,
    sendMediaMutation,
    sendServiceMediaOptimistically,
    sendTextMutation,
  } = useCustomerServiceSendController({
    client,
    queryClient,
    scrollMessagesToBottom,
    selectedThread,
    session,
    setNotice,
  });

  if (!selectedThread) {
    const noThreadState = createCustomerServiceNoThreadState();
    return <main className="h-chat-workspace"><PanelState {...noThreadState} /></main>;
  }

  return (
    <main
      className="h-chat-workspace"
      style={{ "--composer-height": `${composerHeight}px` } as CSSProperties}
    >
      <CustomerServiceMultiOpenBar
        activeThreadId={selectedThread.threadId}
        maxOpenCount={maxOpenServiceThreads}
        openThreads={openThreads}
        onClose={closeOpenServiceThread}
        onSelect={setActiveThread}
      />

      <CustomerServiceWorkspaceHeader
        identity={identity}
        modeLabel={modeLabel}
        source={source}
        title={title}
      />

      <CustomerServiceReceptionStrip
        pending={threadActionMutation.isPending}
        readOnly={readOnly}
        receptionText={receptionText}
        selectedStatus={selectedThread.status}
        status={status || selectedThread.status}
        threadState={threadState}
        onAction={(action) => threadActionMutation.mutate(action)}
      />

      {notice && <ChatToastNotice text={notice} />}

      <CustomerServiceMessageStage
        accountId={
          session?.userId ||
          session?.platformUserId ||
          session?.lppId ||
          session?.tenantId
        }
        assetBaseUrl={session?.apiBaseUrl}
        authToken={session?.tenantToken}
        isMineMessage={(message) => isMineMessage(message, session)}
        jumpToLatest={jumpToLatest}
        messageMenu={messageMenu}
        messages={messages}
        messageStageState={messageStageState}
        pendingNewMessageCount={pendingNewMessageCount}
        selectedThread={selectedThread}
        stageRef={messageStageRef}
        title={title}
        onContextMenu={openServiceMessageMenu}
        onMenuAction={(action, message) =>
          void handleServiceMessageMenuAction(action, message)
        }
        onScroll={handleMessageStageScroll}
        onUploadAction={handleServiceUploadAction}
      />

      {canReply && (
        <CustomerServiceComposerSurface
          disabled={
            detailLoading ||
            sendTextMutation.isPending ||
            sendMediaMutation.isPending
          }
          onResizeStart={(event) =>
            startVerticalPaneResize(event, {
              initialHeight: composerHeight,
              onResize: (height) => setComposerHeight(clampComposerHeight(height)),
            })
          }
          onAiDraft={() => setActiveModule("aiAssistant")}
          onKnowledgeBase={() => setActiveModule("knowledgeBase")}
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
      {!readOnly && composerDisabledText && (
        <div className="composer-disabled-note">{composerDisabledText}</div>
      )}
    </main>
  );
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
