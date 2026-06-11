import {
  Check,
  ChevronsUp,
} from "lucide-react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CSSProperties, MouseEvent, Ref } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChatMessageBubble } from "../../components/ChatMessageBubble";
import { PanelState } from "../../components/PanelState";
import type { ConversationListItem, GroupMemberDto, MessageItemDto } from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import {
  activeGroupReadReceiptAutoSyncIntervalMs,
  activeGroupReadReceiptAutoSyncMaxTargets,
  activeGroupReadReceiptAutoSyncStaleMs,
  groupReadReceiptQueryKey,
  type GroupReadReceiptMember,
} from "../../data/message/group-read-receipts-model";
import { createChatMessageViewModel } from "../../data/message/message-view-model";
import { pendingGroupReadReceiptSnapshotTargets } from "../../data/read-receipts";
import { requireApiClient } from "../../data/runtime";
import { formatChatMessageTime } from "../../lib/format";
import type { UploadActionHandler } from "../../components/MessageBodyView";
import { useI18n } from "../../i18n/useI18n";
import { messageActionPreview } from "../models/messageListModel";
import { chatMessageRenderKey } from "../models/messageRenderKey";
import { chatBackgroundStyleVariables } from "../../settings/models/chatBackgroundModel";
import {
  createMessageRenderWindow,
  messageRenderWindowExpandStep,
} from "../models/messageListWindowing";
import { logMessageCenterDiagnostic } from "../diagnostics/message-center-diagnostics";
import { logChatScrollTrace } from "../../lib/chatScrollTrace";
import { GroupReadReceiptPopover } from "./GroupReadReceiptPopover";
import {
  groupReadReceiptMemberProfileTarget,
  readableGroupReadReceiptMemberCount,
} from "../models/groupManagementModel";
import { syncGroupReadReceiptSnapshotToCache } from "../models/messageCacheMutationModel";

export interface MessageListPanelProps {
  accountId?: string;
  assetBaseUrl?: string;
  authSession?: AuthSession | null;
  authToken?: string;
  conversation: ConversationListItem;
  chatBackgroundPreset?: unknown;
  eventMessageText: (message: MessageItemDto) => string | undefined;
  groupMemberMap: Map<string, GroupMemberDto>;
  canOpenGroupReadReceiptMemberProfile?: boolean;
  loading: boolean;
  messageAnnotations: Record<string, string>;
  messages: MessageItemDto[];
  messagesBottomRef: Ref<HTMLDivElement>;
  messageStageRef: Ref<HTMLElement>;
  mineAvatarUrl?: string | null;
  multiSelectMode: boolean;
  pendingNewMessageCount: number;
  selectedMessageIds: Set<string>;
  showGroupMemberNicknames?: boolean;
  emptyText: string;
  unreadJump?: {
    conversationId: string;
    count: number;
    lastReadSeq: number;
  } | null;
  onAvatarClick?: (
    event: MouseEvent<HTMLButtonElement>,
    message: MessageItemDto,
    mine: boolean,
  ) => void;
  onContactClick?: (event: MouseEvent<HTMLElement>, value: Record<string, unknown>) => void;
  onContextMenu?: (event: MouseEvent<HTMLElement>, message: MessageItemDto) => void;
  onFailedMessageClick?: (message: MessageItemDto) => void;
  onJumpToLatest: () => void;
  onMessageElementRef: (messageId: string, element: HTMLDivElement | null) => void;
  onMessageStageScroll: () => void;
  onOpenGroupMemberProfile?: (
    target: HTMLElement,
    member: GroupMemberDto,
    options?: { canAddFriend: boolean },
  ) => boolean;
  onSelectMessageToggle: (messageId: string) => void;
  onUnreadJump: () => void;
  onUploadAction?: UploadActionHandler;
  resolveSenderAvatarUrl: (message: MessageItemDto) => string | null | undefined;
  resolveSenderDisplayName: (message: MessageItemDto) => string;
  resolveStatusText: (message: MessageItemDto) => string | undefined;
  shouldShowInlineStatus: (message: MessageItemDto) => boolean;
  isMineMessage: (message: MessageItemDto) => boolean;
}

export function MessageListPanel({
  accountId,
  assetBaseUrl,
  authSession,
  authToken,
  chatBackgroundPreset,
  conversation,
  emptyText,
  eventMessageText,
  groupMemberMap,
  canOpenGroupReadReceiptMemberProfile = false,
  loading,
  messageAnnotations,
  messages,
  messagesBottomRef,
  messageStageRef,
  mineAvatarUrl,
  multiSelectMode,
  pendingNewMessageCount,
  selectedMessageIds,
  showGroupMemberNicknames = true,
  unreadJump,
  onAvatarClick,
  onContactClick,
  onContextMenu,
  onFailedMessageClick,
  onJumpToLatest,
  onMessageElementRef,
  onMessageStageScroll,
  onOpenGroupMemberProfile,
  onSelectMessageToggle,
  onUnreadJump,
  onUploadAction,
  resolveSenderAvatarUrl,
  resolveSenderDisplayName,
  resolveStatusText: _resolveStatusText,
  shouldShowInlineStatus: _shouldShowInlineStatus,
  isMineMessage,
}: MessageListPanelProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [expandedOlderCount, setExpandedOlderCount] = useState(0);
  const [activeGroupReadReceipt, setActiveGroupReadReceipt] = useState<{
    anchorRect: DOMRect;
    groupId: string;
    messageId: string;
    messageSeq: number;
  } | null>(null);
  const lastWindowDiagnosticKeyRef = useRef("");
  const windowingEnabled = !unreadJump;
  const messageRenderWindow = useMemo(
    () =>
      createMessageRenderWindow({
        enabled: windowingEnabled,
        expandedOlderCount,
        messages,
      }),
    [expandedOlderCount, messages, windowingEnabled],
  );
  useEffect(() => {
    const firstRendered = messageRenderWindow.renderedMessages[0];
    const lastRendered =
      messageRenderWindow.renderedMessages[messageRenderWindow.renderedMessages.length - 1];
    logChatScrollTrace({
      context: {
        conversationId: conversation.conversationId,
        expandedOlderCount,
        firstRenderedId: firstRendered?.messageId,
        firstRenderedKey: firstRendered ? chatMessageRenderKey(firstRendered) : undefined,
        hiddenBeforeCount: messageRenderWindow.hiddenBeforeCount,
        lastRenderedId: lastRendered?.messageId,
        lastRenderedKey: lastRendered ? chatMessageRenderKey(lastRendered) : undefined,
        messageCount: messages.length,
        renderedCount: messageRenderWindow.renderedMessages.length,
        totalCount: messageRenderWindow.totalCount,
        windowed: messageRenderWindow.windowed,
        windowingEnabled,
      },
      event: "message-list.render-window",
    });
  }, [
    conversation.conversationId,
    expandedOlderCount,
    messageRenderWindow.hiddenBeforeCount,
    messageRenderWindow.renderedMessages,
    messageRenderWindow.totalCount,
    messageRenderWindow.windowed,
    messages.length,
    windowingEnabled,
  ]);
  const groupReadReceiptTotal =
    conversation.conversationType === "group"
      ? readableGroupReadReceiptMemberCount({
          authSession,
          fallbackMemberCount: conversation.memberCount,
          groupMemberMap,
        })
      : undefined;
  const groupReadReceiptAutoSyncTargets = useMemo(
    () =>
      conversation.conversationType === "group"
        ? pendingGroupReadReceiptSnapshotTargets({
            identity: authSession ?? null,
            maxTargets: activeGroupReadReceiptAutoSyncMaxTargets(),
            messages: messageRenderWindow.renderedMessages,
            totalReadableMembers: groupReadReceiptTotal,
          })
        : [],
    [
      authSession,
      conversation.conversationType,
      groupReadReceiptTotal,
      messageRenderWindow.renderedMessages,
    ],
  );

  useEffect(() => {
    logChatScrollTrace({
      context: {
        conversationId: conversation.conversationId,
        expandedOlderCount,
        messageCount: messages.length,
        reason: "conversation_or_message_count_changed",
      },
      event: "message-list.reset-expanded-older",
    });
    setExpandedOlderCount(0);
    setActiveGroupReadReceipt(null);
  }, [conversation.conversationId, messages.length]);

  useEffect(() => {
    if (!activeGroupReadReceipt) return;
    if (messages.some((message) => message.messageId === activeGroupReadReceipt.messageId)) return;
    setActiveGroupReadReceipt(null);
  }, [activeGroupReadReceipt, messages]);

  const groupReadReceiptAutoSyncQueries = useQueries({
    queries: groupReadReceiptAutoSyncTargets.map((target) => ({
      enabled: Boolean(authSession && conversation.conversationType === "group"),
      queryKey: groupReadReceiptQueryKey({
        apiBaseUrl: authSession?.apiBaseUrl,
        groupId: conversation.conversationId,
        messageId: target.messageId,
        messageSeq: target.messageSeq,
        tenantToken: authSession?.tenantToken,
      }),
      queryFn: async () => {
        if (!authSession) throw new Error("No active group read receipt target");
        return requireApiClient(authSession).getGroupReadReceipts(
          conversation.conversationId,
          target.messageId,
          target.messageSeq,
        );
      },
      refetchInterval: activeGroupReadReceiptAutoSyncIntervalMs(),
      refetchIntervalInBackground: false,
      retry: false,
      staleTime: activeGroupReadReceiptAutoSyncStaleMs(),
    })),
  });

  const groupReadReceiptAutoSyncSignature = groupReadReceiptAutoSyncQueries
    .map((query, index) => {
      const target = groupReadReceiptAutoSyncTargets[index];
      return `${target?.messageId ?? ""}:${query.data?.readCount ?? ""}`;
    })
    .join("|");

  useEffect(() => {
    if (conversation.conversationType !== "group") return;
    groupReadReceiptAutoSyncQueries.forEach((query, index) => {
      const target = groupReadReceiptAutoSyncTargets[index];
      if (!target || !query.data) return;
      syncGroupReadReceiptSnapshotToCache(queryClient, {
        conversation,
        messageId: target.messageId,
        messageSeq: target.messageSeq,
        readCount: query.data.readCount,
        session: authSession,
      });
    });
  }, [
    authSession,
    conversation,
    groupReadReceiptAutoSyncSignature,
    groupReadReceiptAutoSyncTargets,
    queryClient,
  ]);

  const groupReadReceiptQuery = useQuery({
    enabled: Boolean(authSession && activeGroupReadReceipt),
    queryKey: activeGroupReadReceipt
      ? groupReadReceiptQueryKey({
          apiBaseUrl: authSession?.apiBaseUrl,
          groupId: activeGroupReadReceipt.groupId,
          messageId: activeGroupReadReceipt.messageId,
          messageSeq: activeGroupReadReceipt.messageSeq,
          tenantToken: authSession?.tenantToken,
        })
      : ["pc-group-read-receipts", "idle"],
    queryFn: async () => {
      if (!authSession || !activeGroupReadReceipt) {
        throw new Error("No active group read receipt target");
      }
      return requireApiClient(authSession).getGroupReadReceipts(
        activeGroupReadReceipt.groupId,
        activeGroupReadReceipt.messageId,
        activeGroupReadReceipt.messageSeq,
      );
    },
    retry: false,
    staleTime: 5_000,
  });

  useEffect(() => {
    if (
      !activeGroupReadReceipt ||
      conversation.conversationType !== "group" ||
      !groupReadReceiptQuery.data
    ) {
      return;
    }
    syncGroupReadReceiptSnapshotToCache(queryClient, {
      conversation,
      messageId: activeGroupReadReceipt.messageId,
      messageSeq: activeGroupReadReceipt.messageSeq,
      readCount: groupReadReceiptQuery.data.readCount,
      session: authSession,
    });
  }, [
    activeGroupReadReceipt,
    authSession,
    conversation,
    groupReadReceiptQuery.data,
    queryClient,
  ]);

  const groupReadReceiptMemberProfileFor = useCallback(
    (receiptMember: GroupReadReceiptMember) =>
      groupReadReceiptMemberProfileTarget({
        canViewMembers: canOpenGroupReadReceiptMemberProfile,
        groupMemberMap,
        member: receiptMember,
      }),
    [canOpenGroupReadReceiptMemberProfile, groupMemberMap],
  );

  const canOpenGroupReadReceiptMemberProfileRow = useCallback(
    (receiptMember: GroupReadReceiptMember) =>
      Boolean(groupReadReceiptMemberProfileFor(receiptMember)),
    [groupReadReceiptMemberProfileFor],
  );

  const openGroupReadReceiptMemberProfile = useCallback(
    (target: HTMLElement, receiptMember: GroupReadReceiptMember) => {
      const member = groupReadReceiptMemberProfileFor(receiptMember);
      if (!member) return;
      onOpenGroupMemberProfile?.(target, member);
    },
    [groupReadReceiptMemberProfileFor, onOpenGroupMemberProfile],
  );

  useEffect(() => {
    if (!messageRenderWindow.windowed) return;
    const diagnosticKey = `${conversation.conversationId}:${messageRenderWindow.totalCount}:${messageRenderWindow.hiddenBeforeCount}`;
    if (lastWindowDiagnosticKeyRef.current === diagnosticKey) return;
    lastWindowDiagnosticKeyRef.current = diagnosticKey;
    logMessageCenterDiagnostic({
      event: "message-list.windowed",
      phase: "render",
      result: "ok",
      reason: "long_message_list_windowed",
      context: {
        conversationId: conversation.conversationId,
        hiddenBeforeCount: messageRenderWindow.hiddenBeforeCount,
        renderedCount: messageRenderWindow.renderedMessages.length,
        totalCount: messageRenderWindow.totalCount,
      },
    });
  }, [
    conversation.conversationId,
    messageRenderWindow.hiddenBeforeCount,
    messageRenderWindow.renderedMessages.length,
    messageRenderWindow.totalCount,
    messageRenderWindow.windowed,
  ]);

  return (
    <section
      className="e-message-stage"
      aria-label={t("messages.listPanel.stageAria")}
      onScroll={onMessageStageScroll}
      ref={messageStageRef}
      style={chatBackgroundStyleVariables(chatBackgroundPreset) as CSSProperties}
    >
      {unreadJump?.conversationId === conversation.conversationId && (
        <button className="pc-chat-unread-jump" type="button" onClick={onUnreadJump}>
          <ChevronsUp size={15} aria-hidden="true" />
          {t("messages.listPanel.newMessages", { count: unreadJump.count })}
        </button>
      )}
      {pendingNewMessageCount > 0 && (
        <button className="pc-chat-latest-jump" type="button" onClick={onJumpToLatest}>
          {t("messages.listPanel.newMessages", { count: pendingNewMessageCount })}
        </button>
      )}
      <div className="e-day-divider">{t("messages.listPanel.today")}</div>
      {loading && <PanelState text={t("messages.listPanel.loading")} />}
      {!loading && messageRenderWindow.hiddenBeforeCount > 0 && (
        <button
          className="pc-chat-load-earlier"
          type="button"
          onClick={() =>
            setExpandedOlderCount((current) => current + messageRenderWindowExpandStep)
          }
        >
          {t("messages.listPanel.loadEarlier", {
            count: messageRenderWindow.hiddenBeforeCount,
          })}
        </button>
      )}
      {!loading &&
        messageRenderWindow.renderedMessages.map((message) => {
          const mine = isMineMessage(message);
          const eventText = eventMessageText(message);
          const senderFallback = resolveSenderDisplayName(message);
          const senderAvatarUrl = resolveSenderAvatarUrl(message);
          const messageViewModel = createChatMessageViewModel({
            contextMenuEnabled: !multiSelectMode,
            conversationFallbackName: conversation.title,
            conversationType: conversation.conversationType,
            groupReadReceiptTotal,
            message,
            mine,
            mineAvatarUrl,
            senderAvatarUrl,
            senderFallback,
            timeText: formatChatMessageTime(message.sentAt),
            translationText: messageAnnotations[message.messageId],
          });
          const renderKey = chatMessageRenderKey(message);

          return (
            <div
              className={`pc-chat-select-row ${mine ? "mine" : "other"} ${
                multiSelectMode ? "selecting" : ""
              } ${eventText ? "event" : ""} ${
                selectedMessageIds.has(message.messageId) ? "selected" : ""
              }`}
              data-message-render-key={renderKey}
              key={renderKey}
              ref={(element) => onMessageElementRef(message.messageId, element)}
            >
              {multiSelectMode && !eventText && (
                <button
                  className="pc-chat-select-check"
                  type="button"
                  aria-label={t("messages.listPanel.selectMessage", {
                    preview: messageActionPreview(message),
                  })}
                  aria-pressed={selectedMessageIds.has(message.messageId)}
                  onClick={() => onSelectMessageToggle(message.messageId)}
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
                  assetBaseUrl={assetBaseUrl}
                  authToken={authToken}
                  mediaCacheContext={{ accountId, conversationId: conversation.conversationId }}
                  conversationFallbackName={conversation.title}
                  mineAvatarUrl={mineAvatarUrl}
                  onAvatarClick={onAvatarClick}
                  onContactClick={onContactClick}
                  onContextMenu={multiSelectMode ? undefined : onContextMenu}
                  onFailedMessageClick={onFailedMessageClick}
                  onGroupReadReceiptClick={(targetMessage, anchor) => {
                    const messageSeq = targetMessage.conversationSeq ?? 0;
                    if (conversation.conversationType !== "group" || messageSeq <= 0) return;
                    setActiveGroupReadReceipt({
                      anchorRect: anchor.getBoundingClientRect(),
                      groupId: conversation.conversationId,
                      messageId: targetMessage.messageId,
                      messageSeq,
                    });
                  }}
                  onUploadAction={onUploadAction}
                  senderFallback={senderFallback}
                  senderAvatarUrl={senderAvatarUrl}
                  showSenderName={
                    conversation.conversationType !== "group" || showGroupMemberNicknames
                  }
                  timeText={formatChatMessageTime(message.sentAt)}
                  translationText={messageAnnotations[message.messageId]}
                  viewModel={messageViewModel}
                />
              )}
            </div>
          );
        })}
      {activeGroupReadReceipt && (
        <GroupReadReceiptPopover
          anchorRect={activeGroupReadReceipt.anchorRect}
          error={groupReadReceiptQuery.error}
          loading={groupReadReceiptQuery.isLoading && !groupReadReceiptQuery.data}
          receipts={groupReadReceiptQuery.data}
          canOpenMemberProfile={
            canOpenGroupReadReceiptMemberProfile && onOpenGroupMemberProfile
              ? canOpenGroupReadReceiptMemberProfileRow
              : undefined
          }
          onClose={() => setActiveGroupReadReceipt(null)}
          onOpenMemberProfile={
            canOpenGroupReadReceiptMemberProfile && onOpenGroupMemberProfile
              ? openGroupReadReceiptMemberProfile
              : undefined
          }
          onRetry={() => void groupReadReceiptQuery.refetch()}
        />
      )}
      <div ref={messagesBottomRef} className="pc-chat-bottom-sentinel" />
      {!loading && messages.length === 0 && (
        <div className="pc-chat-empty-event" role="status">
          <span className="pc-chat-event-pill">{emptyText}</span>
        </div>
      )}
    </section>
  );
}
