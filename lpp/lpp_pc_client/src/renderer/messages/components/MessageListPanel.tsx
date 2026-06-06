import {
  Check,
  ChevronsUp,
  Clock3,
  FileImage,
  FileText,
  MessageSquarePlus,
  Play,
  Search,
  Star,
  TextCursorInput,
  X,
} from "lucide-react";
import type { CSSProperties, MouseEvent, Ref } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ChatMessageBubble } from "../../components/ChatMessageBubble";
import { PanelState } from "../../components/PanelState";
import type { ConversationListItem, GroupMemberDto, MessageItemDto } from "../../data/api-client";
import { createChatMessageViewModel } from "../../data/message/message-view-model";
import { formatChatMessageTime, formatChatTime } from "../../lib/format";
import type { UploadActionHandler } from "../../components/MessageBodyView";
import { useI18n } from "../../i18n/useI18n";
import type { HistoryFilterKey } from "../models/messageListModel";
import { messageActionPreview } from "../models/messageListModel";
import { chatMessageRenderKey } from "../models/messageRenderKey";
import { chatBackgroundStyleVariables } from "../../settings/models/chatBackgroundModel";
import {
  createMessageRenderWindow,
  messageRenderWindowExpandStep,
} from "../models/messageListWindowing";
import { logMessageCenterDiagnostic } from "../diagnostics/message-center-diagnostics";
import { chatMediaItemsFromMessage, type ChatMediaItem } from "../../media/domain/mediaMessage";
import {
  openMessageMediaFile,
  openMessageVideoPlayer,
} from "../runtime/messageMediaActions";
import { useCachedImageMediaUrl } from "../../media/runtime/useCachedImageMediaUrl";

export interface MessageListPanelProps {
  accountId?: string;
  assetBaseUrl?: string;
  authToken?: string;
  conversation: ConversationListItem;
  chatBackgroundPreset?: unknown;
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
  onClearMessageSearch: () => void;
  onCloseMessageLookup: () => void;
  onContactClick?: (event: MouseEvent<HTMLElement>, value: Record<string, unknown>) => void;
  onContextMenu?: (event: MouseEvent<HTMLElement>, message: MessageItemDto) => void;
  onFailedMessageClick?: (message: MessageItemDto) => void;
  onHistoryFilterChange: (filter: HistoryFilterKey) => void;
  onJumpToLatest: () => void;
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
  labelKey: string;
  icon: typeof Clock3;
}> = [
  { key: "all", labelKey: "messages.listPanel.filter.all", icon: Clock3 },
  { key: "text", labelKey: "messages.listPanel.filter.text", icon: TextCursorInput },
  { key: "image", labelKey: "messages.listPanel.filter.image", icon: FileImage },
  { key: "file", labelKey: "messages.listPanel.filter.file", icon: FileText },
  { key: "voice", labelKey: "messages.listPanel.filter.voice", icon: MessageSquarePlus },
  { key: "link", labelKey: "messages.listPanel.filter.link", icon: Search },
  { key: "favorite", labelKey: "messages.listPanel.filter.favorite", icon: Star },
];

export function MessageListPanel({
  accountId,
  assetBaseUrl,
  authToken,
  chatBackgroundPreset,
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
  showGroupMemberNicknames = true,
  unreadJump,
  onAvatarClick,
  onClearMessageSearch,
  onCloseMessageLookup,
  onContactClick,
  onContextMenu,
  onFailedMessageClick,
  onHistoryFilterChange,
  onJumpToLatest,
  onMessageElementRef,
  onMessageSearchKeywordChange,
  onMessageStageScroll,
  onScrollToMessage,
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
  const [expandedOlderCount, setExpandedOlderCount] = useState(0);
  const [lookupImagePreview, setLookupImagePreview] = useState<{
    fileName: string;
    src: string;
  } | null>(null);
  const lastWindowDiagnosticKeyRef = useRef("");
  const lookupOpen = messageSearchOpen || historyOpen;
  const windowingEnabled = !lookupOpen && !unreadJump;
  const showMediaLookupPreview = historyFilter === "image" || historyFilter === "video";
  const lookupMediaGroups = useMemo(
    () =>
      showMediaLookupPreview
        ? groupLookupMediaPreviewItems({
            assetBaseUrl,
            filter: historyFilter,
            messages,
            todayLabel: t("messages.listPanel.today"),
          })
        : [],
    [assetBaseUrl, historyFilter, messages, showMediaLookupPreview, t],
  );
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

  const openLookupMediaPreview = (item: LookupMediaPreviewItem) => {
    const openUrl = item.openUrl || item.previewUrl;
    if (!openUrl) return;
    if (item.kind === "image") {
      setLookupImagePreview({ fileName: item.fileName, src: openUrl });
      return;
    }
    const cacheContext = {
      accountId,
      conversationId: conversation.conversationId,
      fileName: item.fileName,
    };
    void openMessageVideoPlayer(item.message, openUrl, authToken, cacheContext)
      .then((opened) => {
        if (!opened) return openMessageMediaFile(item.message, openUrl, authToken, cacheContext);
        return undefined;
      })
      .catch(() => openMessageMediaFile(item.message, openUrl, authToken, cacheContext));
  };

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
      {lookupOpen && (
        <div className="chat-history-panel chat-lookup-panel">
          <div className="chat-lookup-head">
            <label className="chat-inline-search">
              <Search size={15} />
              <input
                value={messageSearchKeyword}
                onChange={(event) => onMessageSearchKeywordChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") onCloseMessageLookup();
                }}
                placeholder={t("messages.listPanel.searchPlaceholder")}
                autoFocus
              />
              {messageSearchKeyword && (
                <button
                  type="button"
                  aria-label={t("messages.listPanel.clearSearch")}
                  onClick={onClearMessageSearch}
                >
                  <X size={14} />
                </button>
              )}
            </label>
            <button
              type="button"
              aria-label={t("messages.listPanel.closeSearch")}
              onClick={onCloseMessageLookup}
            >
              {t("messages.listPanel.closeSearch")}
            </button>
          </div>
          <div className="chat-lookup-summary">
            <strong>{t("messages.listPanel.historyTitle")}</strong>
            <span>
              {messageSearchKeyword
                ? t("messages.listPanel.matchCount", { count: messages.length })
                : t("messages.listPanel.loadedCount", { count: loadedMessages.length })}
              {loadedMessages[0]?.sentAt
                ? ` · ${t("messages.listPanel.earliest", { time: formatChatTime(loadedMessages[0].sentAt) })}`
                : ""}
              {loadedMessages[loadedMessages.length - 1]?.sentAt
                ? ` · ${t("messages.listPanel.latest", { time: formatChatTime(loadedMessages[loadedMessages.length - 1].sentAt) })}`
                : ""}
            </span>
          </div>
          <div className="chat-history-tags" aria-label={t("messages.listPanel.filtersAria")}>
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
                  {t(tab.labelKey)}
                  <em>{count}</em>
                </button>
              );
            })}
          </div>
          {(historyFilter !== "all" || messageSearchKeyword.trim()) && (
            <div className="chat-history-results" aria-label={t("messages.listPanel.resultsAria")}>
              {showMediaLookupPreview ? (
                <div className="chat-history-media-results">
                  {lookupMediaGroups.map((group) => (
                    <section className="chat-history-media-group" key={group.label}>
                      <h3>{group.label}</h3>
                      <div className="chat-history-media-grid">
                        {group.items.map((item) => (
                          <button
                            className="chat-history-media-tile"
                            type="button"
                            key={`${item.message.messageId}-${item.index}`}
                            title={item.fileName}
                            onClick={() => openLookupMediaPreview(item)}
                          >
                            <LookupMediaThumbnail authToken={authToken} item={item} />
                            {item.kind === "video" && (
                              <em className="chat-history-media-video">
                                <Play size={12} />
                                {formatLookupMediaDuration(item.durationSeconds)}
                              </em>
                            )}
                          </button>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                messages.slice(0, 8).map((message) => (
                  <button
                    type="button"
                    key={message.messageId}
                    onClick={() => onScrollToMessage(message.messageId)}
                  >
                    <span>{formatChatTime(message.sentAt)}</span>
                    <strong>{messageActionPreview(message)}</strong>
                  </button>
                ))
              )}
              {messages.length === 0 && <PanelState text={t("messages.listPanel.noMatches")} />}
            </div>
          )}
        </div>
      )}

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
      {lookupImagePreview && (
        <div
          className="message-image-preview chat-lookup-image-preview"
          role="dialog"
          aria-modal="true"
          aria-label={lookupImagePreview.fileName}
          onClick={() => setLookupImagePreview(null)}
        >
          <button
            className="message-image-preview-close"
            type="button"
            aria-label={t("messages.listPanel.closeSearch")}
            onClick={(event) => {
              event.stopPropagation();
              setLookupImagePreview(null);
            }}
          >
            <X size={18} />
          </button>
          <img
            src={lookupImagePreview.src}
            alt={lookupImagePreview.fileName}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
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
            message,
            mine,
            mineAvatarUrl,
            senderAvatarUrl,
            senderFallback,
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
              key={chatMessageRenderKey(message)}
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
      <div ref={messagesBottomRef} className="pc-chat-bottom-sentinel" />
      {!loading && messages.length === 0 && (
        <div className="pc-chat-empty-event" role="status">
          <span className="pc-chat-event-pill">{emptyText}</span>
        </div>
      )}
    </section>
  );
}

type LookupMediaPreviewItem = {
  durationSeconds?: number;
  fileName: string;
  index: number;
  kind: "image" | "video";
  message: MessageItemDto;
  openUrl?: string;
  previewUrl?: string;
  previewUrls?: string[];
  previewCacheKey?: string;
};

function groupLookupMediaPreviewItems({
  assetBaseUrl,
  filter,
  messages,
  todayLabel,
}: {
  assetBaseUrl?: string;
  filter: HistoryFilterKey;
  messages: MessageItemDto[];
  todayLabel: string;
}) {
  const groups = new Map<string, LookupMediaPreviewItem[]>();
  messages.forEach((message) => {
    lookupMediaPreviewItemsFromMessage({ assetBaseUrl, filter, message }).forEach((item) => {
      const label = lookupMediaDateLabel(message.sentAt, todayLabel);
      const items = groups.get(label) ?? [];
      items.push(item);
      groups.set(label, items);
    });
  });
  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

function lookupMediaPreviewItemsFromMessage({
  assetBaseUrl,
  filter,
  message,
}: {
  assetBaseUrl?: string;
  filter: HistoryFilterKey;
  message: MessageItemDto;
}): LookupMediaPreviewItem[] {
  return chatMediaItemsFromMessage({ assetBaseUrl, message })
    .filter((item): item is ChatMediaItem & { kind: "image" | "video" } =>
      filter === "video" ? item.kind === "video" : item.kind === "image" || item.kind === "video",
    )
    .map((item, index) => ({
      durationSeconds: typeof item.media?.durationSeconds === "number" ? item.media.durationSeconds : undefined,
      fileName: item.fileName,
      index,
      kind: item.kind,
      message,
      openUrl: item.localOpenUrl || item.remoteSourceUrl || item.sourceUrl,
      previewUrl:
        item.kind === "video"
          ? item.posterUrl
          : item.localPreviewUrl || item.localOpenUrl || item.sourceUrl || item.remoteSourceUrl,
      previewUrls:
        item.kind === "image"
          ? item.imageSourceUrls
          : item.posterUrl
            ? [item.posterUrl]
            : [],
      previewCacheKey:
        item.kind === "image"
          ? item.imageCacheKey
          : item.posterUrl
            ? `lookup-poster:${message.messageId}:${index}:${item.posterUrl}`
            : undefined,
    }));
}

function LookupMediaThumbnail({
  authToken,
  item,
}: {
  authToken?: string;
  item: LookupMediaPreviewItem;
}) {
  const previewUrls =
    item.previewUrls?.length
      ? item.previewUrls
      : item.previewUrl
        ? [item.previewUrl]
        : [];
  const previewUrlsKey = previewUrls.join("\n");
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const previewUrl = previewUrls[activePreviewIndex] ?? previewUrls[0];
  const hasNextPreview = activePreviewIndex < previewUrls.length - 1;
  const { displaySrc, failed, loadCachedMedia } = useCachedImageMediaUrl(
    previewUrl,
    authToken,
    item.previewCacheKey,
  );
  const src = displaySrc || (!authToken ? previewUrl : "");
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setActivePreviewIndex(0);
  }, [previewUrlsKey]);

  useEffect(() => {
    setBroken(false);
  }, [src]);

  useEffect(() => {
    if (!failed || !hasNextPreview) return;
    setActivePreviewIndex((current) =>
      current < previewUrls.length - 1 ? current + 1 : current,
    );
  }, [failed, hasNextPreview, previewUrls.length]);

  if (src && !broken) {
    return (
      <img
        src={src}
        alt={item.fileName}
        loading="lazy"
        onError={() => {
          setBroken(true);
          if (!failed) loadCachedMedia();
          if (hasNextPreview) {
            setActivePreviewIndex((current) =>
              current < previewUrls.length - 1 ? current + 1 : current,
            );
          }
        }}
      />
    );
  }

  return (
    <span className="chat-history-media-placeholder">
      {item.kind === "video" ? <Play size={22} /> : <FileImage size={22} />}
    </span>
  );
}

function lookupMediaDateLabel(sentAt: string | undefined, todayLabel: string) {
  if (!sentAt) return todayLabel;
  const date = new Date(sentAt);
  if (Number.isNaN(date.getTime())) return formatChatTime(sentAt);
  const now = new Date();
  if (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  ) {
    return todayLabel;
  }
  return date.toLocaleDateString();
}

function formatLookupMediaDuration(durationSeconds?: number) {
  if (!durationSeconds || durationSeconds <= 0) return "";
  const totalSeconds = Math.round(durationSeconds);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
