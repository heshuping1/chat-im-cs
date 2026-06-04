import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import { AiReplySuggestionDrawer } from "./AiReplySuggestionDrawer";
import { channelLabel as formatChannelLabel } from "./ChannelBadge";
import { PanelState } from "./PanelState";
import {
  type MessageItemDto,
  type KnowledgeInsertPayload,
} from "../data/api-client";
import type { CustomerServiceThreadAction } from "../data/customer-service/cs-action-service";
import { usePcSettings } from "../data/settings/settings-store";
import {
  useDismissRealtimeRemindersForTarget,
  usePushRealtimeReminder,
} from "../data/reminder/reminder-store";
import {
  type ServiceAssistantPane,
  useActiveModule,
  useActiveThreadId,
  useActiveThreadOpenSource,
  useServiceAssistantPane,
  useSetServiceAssistantPane,
} from "../data/workspace-ui/workspace-ui-store";
import { resolveCustomerServiceThreadReadVisibility } from "../data/customer-service/customer-service-read-visibility";
import type { CurrentUserIdentity } from "../data/message-display";
import {
  createCustomerServiceNoThreadState,
} from "../data/customer-service/cs-workspace-view-model";
import { isMineCustomerServiceMessage } from "../data/customer-service/cs-reminder-model";
import { workspaceScopeFromSession } from "../data/workspace-scope";
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
  revealMessageMediaInFolder,
  saveMessageMediaAs,
} from "../messages/runtime/messageMediaActions";
import {
  extractActionResultText,
} from "../messages/models/messageComposerModel";
import { ChatToastNotice, isNoticeErrorText } from "../messages/components/ChatToastNotice";
import { useWindowDismiss } from "../messages/hooks/useWindowDismiss";
import {
  isServiceAiDraftableMessage,
  type ServiceMessageContextAction,
} from "../customer-service/components/ServiceMessageContextMenu";
import { ChatComposerSurface } from "./ChatComposerSurface";
import { CustomerServiceKnowledgeDrawer } from "../customer-service/components/CustomerServiceKnowledgeDrawer";
import {
  customerServiceAssistantInsertEvent,
  readCustomerServiceAssistantInsertText,
} from "../customer-service/runtime/customer-service-assistant-events";
import { CustomerServiceWorkspaceHeader } from "../customer-service/components/CustomerServiceWorkspaceHeader";
import { CustomerServiceReceptionStrip } from "../customer-service/components/CustomerServiceReceptionStrip";
import { CustomerServiceMessageStage } from "../customer-service/components/CustomerServiceMessageStage";
import { useAutoTranslateConversationPreference } from "../translation/hooks/useAutoTranslateConversationPreference";
import { useAutoTranslateMessages } from "../translation/hooks/useAutoTranslateMessages";
import { autoTranslateTargetLanguage } from "../translation/models/autoTranslateModel";
import { nextAutoTranslateConversationMode } from "../translation/models/autoTranslatePreferences";
import { useCustomerServiceIncomingNotifications } from "../customer-service/hooks/useCustomerServiceIncomingNotifications";
import { useCustomerServiceThreadLifecycle } from "../customer-service/hooks/useCustomerServiceThreadLifecycle";
import { useCustomerServiceSendController } from "../customer-service/hooks/useCustomerServiceSendController";
import { useCustomerServiceWorkspaceController } from "../customer-service/hooks/useCustomerServiceWorkspaceController";
import {
  countPendingCustomerServiceCloseMessages,
  createCustomerServiceCloseConfirmation,
  type CustomerServiceCloseConfirmation,
  shouldConfirmCustomerServiceCloseAction,
} from "../customer-service/models/csCloseConfirmationModel";
import { startVerticalPaneResize } from "../lib/paneResize";
import { useWechatBottomFollow } from "../lib/useWechatBottomFollow";
import { isRiskyCustomerServiceThread } from "../customer-service/models/serviceWorkbenchModel";
import type { MessageComposerHandle } from "./MessageComposer";
import { clampComposerHeight } from "../messages/models/messageComposerLayoutModel";

const defaultCustomerServiceComposerHeight = 220;

type ServiceMessageMenuState = {
  canAiDraft?: boolean;
  message: MessageItemDto;
  x: number;
  y: number;
} | null;

type AiDraftDrawerState = {
  customerMessageId?: string | null;
} | null;

type CloseConfirmationState = {
  model: CustomerServiceCloseConfirmation;
  threadId: string;
} | null;

export function ChatWorkspace({
  onOpenCustomerContext,
  onToggleAssistantPane,
}: {
  onOpenCustomerContext?: () => void;
  onToggleAssistantPane?: (pane: Exclude<ServiceAssistantPane, null>) => void;
}) {
  const selectedThreadId = useActiveThreadId();
  const activeModule = useActiveModule();
  const activeThreadOpenSource = useActiveThreadOpenSource();
  const [notice, setNotice] = useState<string | null>(null);
  const [messageMenu, setMessageMenu] = useState<ServiceMessageMenuState>(null);
  const [messageAnnotations, setMessageAnnotations] = useState<Record<string, string>>({});
  const [knowledgeDrawerOpen, setKnowledgeDrawerOpen] = useState(false);
  const [aiDraftDrawer, setAiDraftDrawer] = useState<AiDraftDrawerState>(null);
  const [closeConfirmation, setCloseConfirmation] =
    useState<CloseConfirmationState>(null);
  const composerRef = useRef<MessageComposerHandle | null>(null);
  const serviceAssistantPane = useServiceAssistantPane();
  const setServiceAssistantPane = useSetServiceAssistantPane();
  const pcSettings = usePcSettings();
  const [composerHeight, setComposerHeight] = useState(defaultCustomerServiceComposerHeight);
  const pushRealtimeReminder = usePushRealtimeReminder();
  const dismissRealtimeRemindersForTarget = useDismissRealtimeRemindersForTarget();
  const {
    client,
    detail,
    detailLoading,
    queryClient,
    selectedThread,
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
    closedUnreadNoticeText,
    composerDisabledText,
    identity,
    messageStageState,
    modeLabel,
    messages,
    readOnly,
    receptionText,
    replyGate,
    source,
    status,
    threadState,
    title,
  } = workspaceViewModel;
  const readVisibility = resolveCustomerServiceThreadReadVisibility({
    activeModule,
    activeThreadId: selectedThreadId,
    activeThreadOpenSource,
    conversationId: selectedThread?.conversationId,
    detailLoaded: Boolean(detail),
    threadId: selectedThread?.threadId,
  });
  useCustomerServiceThreadLifecycle({
    activeModule,
    activeThreadOpenSource,
    detail,
    dismissRealtimeRemindersForTarget,
    messages,
    queryClient,
    readVisibility,
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
  const autoTranslateConversationModeKey =
    selectedThread?.threadId || selectedThread?.conversationId;
  const autoTranslateScopeKey = useMemo(
    () => workspaceScopeFromSession(session).key,
    [session],
  );
  const {
    enabled: autoTranslateEffective,
    mode: autoTranslateConversationMode,
    setMode: setAutoTranslateConversationMode,
  } = useAutoTranslateConversationPreference({
    conversationId: autoTranslateConversationModeKey,
    conversationKind: "customer-service",
    globalEnabled: pcSettings.autoTranslate,
    scopeKey: autoTranslateScopeKey,
  });
  const autoTranslateIsMineMessage = useCallback(
    (message: MessageItemDto) => isMineMessage(message, session),
    [session],
  );
  useAutoTranslateMessages({
    annotations: messageAnnotations,
    conversationKey: autoTranslateConversationModeKey,
    enabled: autoTranslateEffective,
    isMineMessage: autoTranslateIsMineMessage,
    messages,
    session,
    setAnnotations: setMessageAnnotations,
    targetLanguage: autoTranslateTargetLanguage(pcSettings.language),
  });

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(
      () => setNotice(null),
      isNoticeErrorText(notice) ? 3200 : 1800,
    );
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    setCloseConfirmation(null);
  }, [selectedThreadId]);

  useWindowDismiss(Boolean(messageMenu), () => setMessageMenu(null));

  const insertKnowledgeReply = useCallback((payload: KnowledgeInsertPayload) => {
    const text = payload.text.trim();
    if (!text) {
      setNotice("这条知识内容暂无可插入文本。");
      return;
    }
    composerRef.current?.insertText(text);
    setKnowledgeDrawerOpen(false);
    setNotice("已插入输入框，确认后可发送给客户。");
    requestAnimationFrame(() => composerRef.current?.focus());
  }, []);

  const insertAiDraftReply = useCallback((text: string) => {
    const next = text.trim();
    if (!next) {
      setNotice("这条 AI 回复建议暂无可插入文本。");
      return;
    }
    composerRef.current?.insertText(next);
    setAiDraftDrawer(null);
    setNotice("AI 回复建议已插入输入框，确认后可发送给客户。");
    requestAnimationFrame(() => composerRef.current?.focus());
  }, []);

  useEffect(() => {
    const handleAssistantInsert = (event: Event) => {
      const text = readCustomerServiceAssistantInsertText(event);
      if (!text) {
        setNotice("这条辅助内容暂无可插入文本。");
        return;
      }
      composerRef.current?.insertText(text);
      setKnowledgeDrawerOpen(false);
      setAiDraftDrawer(null);
      setNotice("已插入输入框，确认后可发送给客户。");
      requestAnimationFrame(() => composerRef.current?.focus());
    };
    window.addEventListener(customerServiceAssistantInsertEvent, handleAssistantInsert);
    return () =>
      window.removeEventListener(customerServiceAssistantInsertEvent, handleAssistantInsert);
  }, []);

  const openServiceMessageMenu = useCallback(
    (event: MouseEvent<HTMLElement>, message: MessageItemDto) => {
      const canAiDraftMessage =
        canReply &&
        !isMineMessage(message, session) &&
        isServiceAiDraftableMessage(message);
      if (!hasOpenableMessageMedia(message) && !canAiDraftMessage) return;
      event.preventDefault();
      event.stopPropagation();
      setMessageMenu({
        canAiDraft: canAiDraftMessage,
        message,
        x: Math.min(event.clientX, window.innerWidth - 240),
        y: Math.min(event.clientY, window.innerHeight - 220),
      });
    },
    [canReply, session],
  );

  const handleServiceMessageMenuAction = useCallback(
    async (action: ServiceMessageContextAction, message: MessageItemDto) => {
      setMessageMenu(null);
      setNotice(null);
      if (action === "ai_reply") {
        setAiDraftDrawer({ customerMessageId: message.messageId });
        return;
      }
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

  const handleThreadAction = useCallback(
    (action: CustomerServiceThreadAction) => {
      if (!shouldConfirmCustomerServiceCloseAction(action)) {
        threadActionMutation.mutate(action);
        return;
      }
      if (!selectedThread) {
        setNotice("请选择在线客服会话");
        return;
      }
      setCloseConfirmation({
        model: createCustomerServiceCloseConfirmation({
          customerTitle: title || selectedThread.title || "当前客户",
          pendingMessageCount: countPendingCustomerServiceCloseMessages(messages),
        }),
        threadId: selectedThread.threadId,
      });
    },
    [messages, selectedThread, threadActionMutation, title],
  );

  const confirmCloseThread = useCallback(() => {
    if (!closeConfirmation || closeConfirmation.threadId !== selectedThread?.threadId) {
      setCloseConfirmation(null);
      setNotice("当前会话已变化，请重新确认关闭。");
      return;
    }
    setCloseConfirmation(null);
    threadActionMutation.mutate("close");
  }, [closeConfirmation, selectedThread?.threadId, threadActionMutation]);

  if (!selectedThread) {
    const noThreadState = createCustomerServiceNoThreadState();
    return <main className="h-chat-workspace"><PanelState {...noThreadState} /></main>;
  }

  return (
    <main
      className="h-chat-workspace"
      style={{ "--composer-height": `${composerHeight}px` } as CSSProperties}
    >
      <CustomerServiceWorkspaceHeader
        identity={identity}
        modeLabel={modeLabel}
        readOnly={readOnly}
        replyGate={replyGate}
        risky={isRiskyCustomerServiceThread(selectedThread)}
        source={source}
        title={title}
        autoTranslateEffective={autoTranslateEffective}
        autoTranslateMode={autoTranslateConversationMode}
        unreadCount={selectedThread.unreadCount}
        onCycleAutoTranslateMode={() =>
          setAutoTranslateConversationMode(
            nextAutoTranslateConversationMode(autoTranslateConversationMode),
          )
        }
        onOpenCustomerContext={onOpenCustomerContext}
      />

      <CustomerServiceReceptionStrip
        pending={threadActionMutation.isPending}
        readOnly={readOnly}
        receptionText={receptionText}
        selectedStatus={selectedThread.status}
        status={status || selectedThread.status}
        threadState={threadState}
        onAction={handleThreadAction}
      />

      {notice && <ChatToastNotice text={notice} />}

      {closeConfirmation && (
        <div
          className="pc-modal-backdrop cs-close-confirm-backdrop"
          role="presentation"
          onClick={() => setCloseConfirmation(null)}
        >
          <section
            aria-labelledby="cs-close-confirm-title"
            aria-modal="true"
            className="cs-close-confirm-dialog"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <span className="cs-close-confirm-mark" aria-hidden="true">!</span>
              <div>
                <h3 id="cs-close-confirm-title">{closeConfirmation.model.title}</h3>
                <p>{closeConfirmation.model.detail}</p>
              </div>
            </header>
            <p className="cs-close-confirm-risk">{closeConfirmation.model.riskText}</p>
            {closeConfirmation.model.warningText && (
              <p className="cs-close-confirm-warning">
                {closeConfirmation.model.warningText}
              </p>
            )}
            <footer>
              <button
                type="button"
                disabled={threadActionMutation.isPending}
                onClick={() => setCloseConfirmation(null)}
              >
                取消
              </button>
              <button
                className="danger"
                type="button"
                disabled={threadActionMutation.isPending}
                onClick={confirmCloseThread}
              >
                {threadActionMutation.isPending
                  ? "关闭中..."
                  : closeConfirmation.model.confirmLabel}
              </button>
            </footer>
          </section>
        </div>
      )}

      {closedUnreadNoticeText && (
        <div className="composer-disabled-note">{closedUnreadNoticeText}</div>
      )}

      <CustomerServiceMessageStage
        accountId={
          session?.userId ||
          session?.platformUserId ||
          session?.lppId ||
          session?.tenantId
        }
        assetBaseUrl={session?.apiBaseUrl}
        authToken={session?.tenantToken}
        chatBackgroundPreset={pcSettings.chatBackgroundPreset}
        isMineMessage={(message) => isMineMessage(message, session)}
        jumpToLatest={jumpToLatest}
        messageAnnotations={messageAnnotations}
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
        <ChatComposerSurface
          ref={composerRef}
          attachmentScopeKey={selectedThread.threadId}
          disabled={
            detailLoading ||
            sendTextMutation.isPending ||
            sendMediaMutation.isPending
          }
          dragUpload={pcSettings.dragUpload}
          enterToSend={pcSettings.enterToSend}
          screenshotShortcut={pcSettings.screenshotShortcut}
          shortcutHints={pcSettings.shortcutHints}
          toolMode="customerService"
          onResizeStart={(event) =>
            startVerticalPaneResize(event, {
              initialHeight: composerHeight,
              onResize: (height) => setComposerHeight(clampComposerHeight(height)),
            })
          }
          onAiDraft={() =>
            onToggleAssistantPane
              ? onToggleAssistantPane("aiDraft")
              : setServiceAssistantPane(
                  serviceAssistantPane === "aiDraft" ? null : "aiDraft",
                )
          }
          onQuickReply={() =>
            onToggleAssistantPane
              ? onToggleAssistantPane("quickReply")
              : setServiceAssistantPane(
                  serviceAssistantPane === "quickReply" ? null : "quickReply",
                )
          }
          onKnowledgeBase={() =>
            onToggleAssistantPane
              ? onToggleAssistantPane("knowledge")
              : setServiceAssistantPane(
                  serviceAssistantPane === "knowledge" ? null : "knowledge",
                )
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
      {knowledgeDrawerOpen && canReply && (
        <CustomerServiceKnowledgeDrawer
          session={session}
          onClose={() => {
            setKnowledgeDrawerOpen(false);
            requestAnimationFrame(() => composerRef.current?.focus());
          }}
          onInsert={insertKnowledgeReply}
          onNotice={setNotice}
        />
      )}
      {aiDraftDrawer && canReply && selectedThread && (
        <AiReplySuggestionDrawer
          customerMessageId={aiDraftDrawer.customerMessageId}
          disabledReason={composerDisabledText || undefined}
          session={session}
          threadId={selectedThread.threadId}
          threadTitle={selectedThread.title || title}
          threadType={selectedThread.threadType}
          subtitle="客服会话"
          onClose={() => {
            setAiDraftDrawer(null);
            requestAnimationFrame(() => composerRef.current?.focus());
          }}
          onInsert={insertAiDraftReply}
          onNotice={setNotice}
        />
      )}
      {composerDisabledText && (
        <div className="composer-disabled-note">{composerDisabledText}</div>
      )}
    </main>
  );
}

function isMineMessage(message: MessageItemDto, identity?: CurrentUserIdentity | null) {
  return isMineCustomerServiceMessage(message, identity);
}
