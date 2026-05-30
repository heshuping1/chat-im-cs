import {
  Check,
  ChevronsUp,
  Clock3,
  FileImage,
  FileText,
  MessageSquarePlus,
  PanelRight,
  Search,
  Star,
  TextCursorInput,
  X,
} from "lucide-react";
import type { MouseEvent, Ref } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ChatMessageBubble } from "../../components/ChatMessageBubble";
import { PanelState } from "../../components/PanelState";
import type { ConversationListItem, GroupMemberDto, MessageItemDto } from "../../data/api-client";
import { createChatMessageViewModel } from "../../data/message/message-view-model";
import { formatChatMessageTime, formatChatTime } from "../../lib/format";
import type { UploadActionHandler } from "../../components/MessageBodyView";
import type { HistoryFilterKey } from "../models/messageListModel";
import { messageActionPreview } from "../models/messageListModel";
import {
  createMessageRenderWindow,
  messageRenderWindowExpandStep,
} from "../models/messageListWindowing";
import { logMessageCenterDiagnostic } from "../diagnostics/message-center-diagnostics";

export interface MessageListPanelProps {
  accountId?: string;
  assetBaseUrl?: string;
  authToken?: string;
  conversation: ConversationListItem;
  eventMessageText: (message: MessageItemDto) => string | undefined;
  groupMemberMap: Map<string, GroupMemberDto>;
  historyCounts: Record<HistoryFilterKey, number>;
  historyFilter: HistoryFilterKey;
  historyOpen: boolean;
  loading: boolean;
  loadedMessages: MessageItemDto[];
  messageAnnotations: Record<string, string>;
  messageSearchKeyword: string;
  messageSearchOpen: boolean;
  messages: MessageItemDto[];
  messagesBottomRef: Ref<HTMLDivElement>;
  messageStageRef: Ref<HTMLElement>;
  mineAvatarUrl?: string | null;
  multiSelectMode: boolean;
  pendingNewMessageCount: number;
  selectedMessageIds: Set<string>;
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
  onClearMessageSearch: () => void;
  onContactClick?: (event: MouseEvent<HTMLElement>, value: Record<string, unknown>) => void;
  onContextMenu?: (event: MouseEvent<HTMLElement>, message: MessageItemDto) => void;
  onHistoryFilterChange: (filter: HistoryFilterKey) => void;
  onJumpToLatest: () => void;
  onLoadCapture: () => void;
  onMessageElementRef: (messageId: string, element: HTMLDivElement | null) => void;
  onMessageSearchKeywordChange: (keyword: string) => void;
  onMessageStageScroll: () => void;
  onScrollToMessage: (messageId: string) => void;
  onSelectMessageToggle: (messageId: string) => void;
  onUnreadJump: () => void;
  onUploadAction?: UploadActionHandler;
  resolveSenderAvatarUrl: (message: MessageItemDto) => string | null | undefined;
  resolveSenderDisplayName: (message: MessageItemDto) => string;
  resolveStatusText: (message: MessageItemDto) => string | undefined;
  shouldShowInlineStatus: (message: MessageItemDto) => boolean;
  isMineMessage: (message: MessageItemDto) => boolean;
}

const historyFilterTabs: Array<{
  key: HistoryFilterKey;
  label: string;
  icon: typeof Clock3;
}> = [
  { key: "all", label: "\u5168\u90e8", icon: Clock3 },
  { key: "text", label: "\u6587\u5b57", icon: TextCursorInput },
  { key: "image", label: "\u56fe\u7247", icon: FileImage },
  { key: "file", label: "\u6587\u4ef6", icon: FileText },
  { key: "voice", label: "\u8bed\u97f3", icon: MessageSquarePlus },
  { key: "video", label: "\u89c6\u9891", icon: PanelRight },
  { key: "link", label: "\u94fe\u63a5", icon: Search },
  { key: "favorite", label: "\u6536\u85cf", icon: Star },
];

export function MessageListPanel({
  accountId,
  assetBaseUrl,
  authToken,
  conversation,
  emptyText,
  eventMessageText,
  groupMemberMap: _groupMemberMap,
  historyCounts,
  historyFilter,
  historyOpen,
  loading,
  loadedMessages,
  messageAnnotations,
  messageSearchKeyword,
  messageSearchOpen,
  messages,
  messagesBottomRef,
  messageStageRef,
  mineAvatarUrl,
  multiSelectMode,
  pendingNewMessageCount,
  selectedMessageIds,
  unreadJump,
  onAvatarClick,
  onClearMessageSearch,
  onContactClick,
  onContextMenu,
  onHistoryFilterChange,
  onJumpToLatest,
  onLoadCapture,
  onMessageElementRef,
  onMessageSearchKeywordChange,
  onMessageStageScroll,
  onScrollToMessage,
  onSelectMessageToggle,
  onUnreadJump,
  onUploadAction,
  resolveSenderAvatarUrl,
  resolveSenderDisplayName,
  resolveStatusText,
  shouldShowInlineStatus,
  isMineMessage,
}: MessageListPanelProps) {
  const [expandedOlderCount, setExpandedOlderCount] = useState(0);
  const lastWindowDiagnosticKeyRef = useRef("");
  const windowingEnabled = !historyOpen && !messageSearchOpen && !unreadJump;
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
    setExpandedOlderCount(0);
  }, [conversation.conversationId, historyOpen, messageSearchOpen, messages.length]);

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
      aria-label="消息内容"
      onLoadCapture={onLoadCapture}
      onScroll={onMessageStageScroll}
      ref={messageStageRef}
    >
      {messageSearchOpen && (
        <div className="chat-inline-panel">
          <label className="chat-inline-search">
            <Search size={15} />
            <input
              value={messageSearchKeyword}
              onChange={(event) => onMessageSearchKeywordChange(event.target.value)}
              placeholder="在当前会话中查找消息"
              autoFocus
            />
            {messageSearchKeyword && (
              <button type="button" aria-label="清空查找" onClick={onClearMessageSearch}>
                <X size={14} />
              </button>
            )}
          </label>
          <span>
            {messageSearchKeyword
              ? `${messages.length} matches`
              : "输入关键词筛选当前消息"}
          </span>
        </div>
      )}

      {historyOpen && (
        <div className="chat-history-panel">
          <div>
            <strong>历史记录</strong>
            <span>
              已加载 {loadedMessages.length} 条消息
              {loadedMessages[0]?.sentAt ? ` · 最早 ${formatChatTime(loadedMessages[0].sentAt)}` : ""}
              {loadedMessages[loadedMessages.length - 1]?.sentAt
                ? ` · 最新 ${formatChatTime(loadedMessages[loadedMessages.length - 1].sentAt)}`
                : ""}
            </span>
          </div>
          <div className="chat-history-tags" aria-label="Chat history filters">
            {historyFilterTabs.map((tab) => {
              const Icon = tab.icon;
              const count = historyCounts[tab.key] ?? 0;
              return (
                <button
                  className={historyFilter === tab.key ? "selected" : ""}
                  type="button"
                  key={tab.key}
                  onClick={() => onHistoryFilterChange(tab.key)}
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
            <div className="chat-history-results" aria-label="Chat history results">
              {messages.slice(0, 8).map((message) => (
                <button
                  type="button"
                  key={message.messageId}
                  onClick={() => onScrollToMessage(message.messageId)}
                >
                  <span>{formatChatTime(message.sentAt)}</span>
                  <strong>{messageActionPreview(message)}</strong>
                </button>
              ))}
              {messages.length === 0 && <PanelState text="没有匹配的聊天记录" />}
            </div>
          )}
        </div>
      )}

      {unreadJump?.conversationId === conversation.conversationId && (
        <button className="pc-chat-unread-jump" type="button" onClick={onUnreadJump}>
          <ChevronsUp size={15} aria-hidden="true" />
          ↑ {unreadJump.count} 条新消息
        </button>
      )}
      {pendingNewMessageCount > 0 && (
        <button className="pc-chat-latest-jump" type="button" onClick={onJumpToLatest}>
          ↓ {pendingNewMessageCount} 条新消息
        </button>
      )}
      <div className="e-day-divider">今天</div>
      {loading && <PanelState text="正在加载聊天记录..." />}
      {!loading && messageRenderWindow.hiddenBeforeCount > 0 && (
        <button
          className="pc-chat-load-earlier"
          type="button"
          onClick={() =>
            setExpandedOlderCount((current) => current + messageRenderWindowExpandStep)
          }
        >
          查看更早 {messageRenderWindow.hiddenBeforeCount} 条消息
        </button>
      )}
      {!loading &&
        messageRenderWindow.renderedMessages.map((message) => {
          const mine = isMineMessage(message);
          const eventText = eventMessageText(message);
          const statusText = resolveStatusText(message);
          const senderFallback = resolveSenderDisplayName(message);
          const senderAvatarUrl = resolveSenderAvatarUrl(message);
          const bubbleStatusText = shouldShowInlineStatus(message) ? undefined : statusText;
          const messageViewModel = createChatMessageViewModel({
            contextMenuEnabled: !multiSelectMode,
            conversationFallbackName: conversation.title,
            message,
            mine,
            mineAvatarUrl,
            senderAvatarUrl,
            senderFallback,
            statusText: bubbleStatusText,
            timeText: formatChatMessageTime(message.sentAt),
            translationText: messageAnnotations[message.messageId],
          });

          return (
            <div
              className={`pc-chat-select-row ${mine ? "mine" : "other"} ${
                multiSelectMode ? "selecting" : ""
              } ${eventText ? "event" : ""} ${
                selectedMessageIds.has(message.messageId) ? "selected" : ""
              }`}
              key={message.messageId}
              ref={(element) => onMessageElementRef(message.messageId, element)}
            >
              {multiSelectMode && !eventText && (
                <button
                  className="pc-chat-select-check"
                  type="button"
                  aria-label={`选择消息 ${messageActionPreview(message)}`}
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
                  onUploadAction={onUploadAction}
                  senderFallback={senderFallback}
                  senderAvatarUrl={senderAvatarUrl}
                  statusText={bubbleStatusText}
                  timeText={formatChatMessageTime(message.sentAt)}
                  translationText={messageAnnotations[message.messageId]}
                  viewModel={messageViewModel}
                />
              )}
            </div>
          );
        })}
      <div ref={messagesBottomRef} className="pc-chat-bottom-sentinel" />
      {!loading && messages.length === 0 && (
        <PanelState className="e-panel-state" text={emptyText} tone={false} />
      )}
    </section>
  );
}
