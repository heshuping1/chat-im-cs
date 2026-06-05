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
  type CustomerServiceWorkspaceTextDescriptor,
} from "../data/customer-service/cs-workspace-view-model";
import { isMineCustomerServiceMessage } from "../data/customer-service/cs-reminder-model";
import { workspaceScopeFromSession } from "../data/workspace-scope";
import { useI18n } from "../i18n/useI18n";
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
  type CustomerServiceCloseConfirmationText,
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
  const { t } = useI18n();
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
  const translatedIdentity = useMemo(
    () => ({
      ...identity,
      ariaName: translateCustomerServiceValue(identity.ariaName, t),
      avatarName: translateCustomerServiceValue(identity.avatarName, t),
      displayName: translateCustomerServiceValue(identity.displayName, t),
    }),
    [identity, t],
  );
  const translatedClosedUnreadNoticeText = closedUnreadNoticeText
    ? formatCustomerServiceWorkspaceText(closedUnreadNoticeText, t)
    : undefined;
  const translatedComposerDisabledText = composerDisabledText
    ? formatCustomerServiceWorkspaceText(composerDisabledText, t)
    : undefined;
  const translatedMessageStageState = messageStageState
    ? {
        ...messageStageState,
        text: formatCustomerServiceWorkspaceText(messageStageState.text, t),
      }
    : undefined;
  const translatedModeLabel = formatCustomerServiceWorkspaceText(modeLabel, t);
  const translatedReceptionText = formatCustomerServiceWorkspaceText(receptionText, t);
  const translatedTitle = translateCustomerServiceValue(title, t);
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
    title: translatedTitle,
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
      setNotice(t("customerService.workspace.emptyKnowledgeContent"));
      return;
    }
    composerRef.current?.insertText(text);
    setKnowledgeDrawerOpen(false);
    setNotice(t("customerService.workspace.insertedNotice"));
    requestAnimationFrame(() => composerRef.current?.focus());
  }, [t]);

  const insertAiDraftReply = useCallback((text: string) => {
    const next = text.trim();
    if (!next) {
      setNotice(t("customerService.workspace.emptyAiDraft"));
      return;
    }
    composerRef.current?.insertText(next);
    setAiDraftDrawer(null);
    setNotice(t("customerService.workspace.aiDraftInsertedNotice"));
    requestAnimationFrame(() => composerRef.current?.focus());
  }, [t]);

  useEffect(() => {
    const handleAssistantInsert = (event: Event) => {
      const text = readCustomerServiceAssistantInsertText(event);
      if (!text) {
        setNotice(t("customerService.workspace.emptyAssistantContent"));
        return;
      }
      composerRef.current?.insertText(text);
      setKnowledgeDrawerOpen(false);
      setAiDraftDrawer(null);
      setNotice(t("customerService.workspace.insertedNotice"));
      requestAnimationFrame(() => composerRef.current?.focus());
    };
    window.addEventListener(customerServiceAssistantInsertEvent, handleAssistantInsert);
    return () =>
      window.removeEventListener(customerServiceAssistantInsertEvent, handleAssistantInsert);
  }, [t]);

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
        setNotice(t("customerService.workspace.mediaNoUrl"));
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
            setNotice(t("customerService.workspace.imageCopied"));
          } else {
            await copyMessageMediaFile(message, url, session?.tenantToken, {
              accountId,
              conversationId,
            });
            setNotice(t("customerService.workspace.fileCopied"));
          }
        } catch (error) {
          setNotice(t("common.copyFailed", { error: formatError(error) }));
        }
        return;
      }
      try {
        if (action === "save_media_as") {
          const savedPath = await saveMessageMediaAs(message, url, session?.tenantToken, {
            accountId,
            conversationId,
          });
          if (savedPath) setNotice(t("customerService.workspace.savedAs"));
        } else if (action === "reveal_in_folder") {
          await revealMessageMediaInFolder(message, url, session?.tenantToken, {
            accountId,
            conversationId,
          });
          setNotice(isMacPlatform() ? t("customerService.workspace.revealedInFinder") : t("customerService.workspace.revealedInFolder"));
        } else if (action === "open_media") {
          await openMessageMediaFile(message, url, session?.tenantToken, {
            accountId,
            conversationId,
          });
          setNotice(t("customerService.workspace.opened"));
        } else {
          await editMessageMediaFile(message, url, session?.tenantToken, {
            accountId,
            conversationId,
          });
          setNotice(t("customerService.workspace.openedForEdit"));
        }
      } catch (error) {
        const prefix =
          action === "save_media_as"
            ? t("customerService.workspace.saveAsFailed")
            : action === "reveal_in_folder"
              ? t("customerService.workspace.revealFailed")
              : action === "open_media"
                ? t("customerService.workspace.openFailed")
                : t("customerService.workspace.editFailed");
        setNotice(t("customerService.workspace.actionFailed", { action: prefix, error: formatError(error) }));
      }
    },
    [selectedThread?.conversationId, selectedThread?.threadId, session, t],
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
        setNotice(t("customerService.workspace.selectThread"));
        return;
      }
      setCloseConfirmation({
        model: createCustomerServiceCloseConfirmation({
          customerTitle:
            translatedTitle || selectedThread.title || t("customerService.workspace.currentCustomer"),
          pendingMessageCount: countPendingCustomerServiceCloseMessages(messages),
        }),
        threadId: selectedThread.threadId,
      });
    },
    [messages, selectedThread, threadActionMutation, translatedTitle, t],
  );

  const confirmCloseThread = useCallback(() => {
    if (!closeConfirmation || closeConfirmation.threadId !== selectedThread?.threadId) {
      setCloseConfirmation(null);
      setNotice(t("customerService.workspace.threadChangedConfirmAgain"));
      return;
    }
    setCloseConfirmation(null);
    threadActionMutation.mutate("close");
  }, [closeConfirmation, selectedThread?.threadId, threadActionMutation, t]);

  if (!selectedThread) {
    const noThreadState = createCustomerServiceNoThreadState();
    return (
      <main className="h-chat-workspace">
        <PanelState
          text={formatCustomerServiceWorkspaceText(noThreadState.text, t)}
          tone={noThreadState.tone}
        />
      </main>
    );
  }

  return (
    <main
      className="h-chat-workspace"
      style={{ "--composer-height": `${composerHeight}px` } as CSSProperties}
    >
      <CustomerServiceWorkspaceHeader
        identity={translatedIdentity}
        modeLabel={translatedModeLabel}
        readOnly={readOnly}
        replyGate={replyGate}
        risky={isRiskyCustomerServiceThread(selectedThread)}
        source={source}
        title={translatedTitle}
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
        receptionText={translatedReceptionText}
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
                <h3 id="cs-close-confirm-title">
                  {formatCustomerServiceCloseConfirmText(closeConfirmation.model.title, t)}
                </h3>
                <p>{formatCustomerServiceCloseConfirmText(closeConfirmation.model.detail, t)}</p>
              </div>
            </header>
            <p className="cs-close-confirm-risk">
              {formatCustomerServiceCloseConfirmText(closeConfirmation.model.riskText, t)}
            </p>
            {closeConfirmation.model.warningText && (
              <p className="cs-close-confirm-warning">
                {formatCustomerServiceCloseConfirmText(closeConfirmation.model.warningText, t)}
              </p>
            )}
            <footer>
              <button
                type="button"
                disabled={threadActionMutation.isPending}
                onClick={() => setCloseConfirmation(null)}
              >
                {t("common.cancel")}
              </button>
              <button
                className="danger"
                type="button"
                disabled={threadActionMutation.isPending}
                onClick={confirmCloseThread}
              >
                {threadActionMutation.isPending
                  ? t("customerService.workspace.closing")
                  : formatCustomerServiceCloseConfirmText(closeConfirmation.model.confirmLabel, t)}
              </button>
            </footer>
          </section>
        </div>
      )}

      {translatedClosedUnreadNoticeText && (
        <div className="composer-disabled-note">{translatedClosedUnreadNoticeText}</div>
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
        messageStageState={translatedMessageStageState}
        pendingNewMessageCount={pendingNewMessageCount}
        selectedThread={selectedThread}
        stageRef={messageStageRef}
        title={translatedTitle}
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
            if (!client) throw new Error(t("auth.login"));
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
          disabledReason={translatedComposerDisabledText || undefined}
          session={session}
          threadId={selectedThread.threadId}
          threadTitle={selectedThread.title || translatedTitle}
          threadType={selectedThread.threadType}
          subtitle={t("customerService.workspace.serviceConversation")}
          onClose={() => {
            setAiDraftDrawer(null);
            requestAnimationFrame(() => composerRef.current?.focus());
          }}
          onInsert={insertAiDraftReply}
          onNotice={setNotice}
        />
      )}
      {translatedComposerDisabledText && (
        <div className="composer-disabled-note">{translatedComposerDisabledText}</div>
      )}
    </main>
  );
}

function isMineMessage(message: MessageItemDto, identity?: CurrentUserIdentity | null) {
  return isMineCustomerServiceMessage(message, identity);
}

type ChatWorkspaceTranslate = (
  key: string,
  params?: Record<string, string | number>,
) => string;

function formatCustomerServiceWorkspaceText(
  descriptor: CustomerServiceWorkspaceTextDescriptor,
  t: ChatWorkspaceTranslate,
) {
  const params = descriptor.params
    ? Object.fromEntries(
        Object.entries(descriptor.params).map(([key, value]) => [
          key,
          typeof value === "string" ? translateCustomerServiceValue(value, t) : value,
        ]),
      )
    : undefined;
  return t(descriptor.key, params);
}

function translateCustomerServiceValue(value: string, t: ChatWorkspaceTranslate) {
  if (
    value.startsWith("customerService.") ||
    value.startsWith("sidebar.") ||
    value.startsWith("channel.")
  ) {
    return t(value);
  }
  return value;
}

function formatCustomerServiceCloseConfirmText(
  descriptor: CustomerServiceCloseConfirmationText,
  t: ChatWorkspaceTranslate,
) {
  const params = descriptor.params
    ? Object.fromEntries(
        Object.entries(descriptor.params).map(([key, value]) => [
          key,
          typeof value === "string" ? translateCustomerServiceValue(value, t) : value,
        ]),
      )
    : undefined;
  return t(descriptor.key, params);
}
