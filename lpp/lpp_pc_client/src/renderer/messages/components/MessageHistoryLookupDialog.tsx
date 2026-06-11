import {
  CalendarDays,
  FileImage,
  FileText,
  Grid2X2,
  Play,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PanelState } from "../../components/PanelState";
import { PcAvatar } from "../../components/PcAvatar";
import type { ConversationListItem, MediaResourceDto, MessageItemDto } from "../../data/api-client";
import { mediaStableCacheIdentity } from "../../data/im-message-normalize";
import { useI18n } from "../../i18n/useI18n";
import { formatChatTime } from "../../lib/format";
import { ImagePreviewViewer } from "../../media/components/ImageMessageFrame";
import { chatMediaItemsFromMessage, messageMediaFileName, type ChatMediaItem } from "../../media/domain/mediaMessage";
import { useCachedImageMediaUrl } from "../../media/runtime/useCachedImageMediaUrl";
import {
  ensureMaterializedMediaDisplayUrl,
  getMaterializedMediaDisplayUrl,
  getMaterializedMediaFileUrl,
  mediaMaterializationCacheKey,
  subscribeMaterializedMediaDisplayUrl,
  subscribeMaterializedMediaFile,
} from "../../media/runtime/mediaMaterialization";
import { inlineVideoPreviewSrc } from "../../media/runtime/videoPlayer";
import { useVideoPosterSource } from "../../media/runtime/videoPosterRuntime";
import { getCurrentMediaActionCapabilities } from "../runtime/mediaActionCapabilities";
import {
  openMessageMediaFile,
  openMessageVideoPlayer,
} from "../runtime/messageMediaActions";
import type { HistoryFilterKey, MessageLookupScope } from "../models/messageListModel";
import { messageActionPreview } from "../models/messageListModel";

export interface MessageHistoryLookupDialogProps {
  accountId?: string;
  assetBaseUrl?: string;
  authToken?: string;
  conversation: ConversationListItem;
  currentUserAvatarUrl?: string | null;
  currentUserDisplayName?: string | null;
  historyCounts: Record<HistoryFilterKey, number>;
  historyFilter: HistoryFilterKey;
  isMineMessage?: (message: MessageItemDto) => boolean;
  loadedMessages: MessageItemDto[];
  lookupScope: MessageLookupScope;
  messageSearchKeyword: string;
  messages: MessageItemDto[];
  onClearMessageSearch: () => void;
  onClose: () => void;
  onHistoryFilterChange: (filter: HistoryFilterKey) => void;
  onMessageSearchKeywordChange: (keyword: string) => void;
  onScrollToMessage: (messageId: string) => void;
}

const historyFilterTabs: Array<{
  key: HistoryFilterKey;
  labelKey: string;
  icon: typeof FileText;
}> = [
  { key: "file", labelKey: "messages.listPanel.filter.file", icon: FileText },
  { key: "image", labelKey: "messages.listPanel.filter.image", icon: Grid2X2 },
  { key: "link", labelKey: "messages.listPanel.filter.link", icon: Search },
  { key: "date", labelKey: "messages.listPanel.filter.date", icon: CalendarDays },
];

export function MessageHistoryLookupDialog({
  accountId,
  assetBaseUrl,
  authToken,
  conversation,
  currentUserAvatarUrl,
  currentUserDisplayName,
  historyCounts,
  historyFilter,
  isMineMessage,
  loadedMessages,
  lookupScope,
  messageSearchKeyword,
  messages,
  onClearMessageSearch,
  onClose,
  onHistoryFilterChange,
  onMessageSearchKeywordChange,
  onScrollToMessage,
}: MessageHistoryLookupDialogProps) {
  const { t } = useI18n();
  const [lookupImagePreview, setLookupImagePreview] = useState<{
    cacheKey?: string;
    fileName: string;
    src: string;
  } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const [draftDate, setDraftDate] = useState(() => localDateInputValue(new Date()));
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [previousFilterBeforeDate, setPreviousFilterBeforeDate] =
    useState<HistoryFilterKey>("all");
  const showMediaLookupPreview = historyFilter === "image";
  const showFileLookup = historyFilter === "file";
  const showDateLookup = historyFilter === "date";
  const lookupMessagesForDate = useMemo(
    () =>
      showDateLookup && selectedDate
        ? messages.filter((message) => messageMatchesLocalDate(message.sentAt, selectedDate))
        : messages,
    [messages, selectedDate, showDateLookup],
  );
  const lookupMediaGroups = useMemo(
    () =>
      showMediaLookupPreview
        ? groupLookupMediaPreviewItems({
            assetBaseUrl,
            filter: historyFilter,
            messages,
            thisMonthLabel: t("messages.listPanel.thisMonth"),
            thisWeekLabel: t("messages.listPanel.thisWeek"),
            todayLabel: t("messages.listPanel.today"),
          })
        : [],
    [assetBaseUrl, historyFilter, messages, showMediaLookupPreview, t],
  );
  const lookupResultMessages = useMemo(
    () => lookupMessagesForDate.slice().reverse(),
    [lookupMessagesForDate],
  );
  const lookupFileItems = useMemo(
    () =>
      showFileLookup
        ? fileLookupItemsFromMessages({ assetBaseUrl, messages }).slice().reverse()
        : [],
    [assetBaseUrl, messages, showFileLookup],
  );
  const activeFilterTab = historyFilter === "date" && !selectedDate ? "date" : historyFilter;
  const activeFilterChip =
    historyFilter === "image" || historyFilter === "file"
      ? historyFilterTabs.find((tab) => tab.key === historyFilter)
      : undefined;
  const searchPlaceholder =
    historyFilter === "image"
      ? t("messages.listPanel.searchPlaceholderMedia")
      : historyFilter === "file"
        ? t("messages.listPanel.searchPlaceholderFile")
        : t("messages.listPanel.searchPlaceholder");
  const resultCount = showMediaLookupPreview
    ? lookupMediaGroups.reduce((count, group) => count + group.items.length, 0)
    : showFileLookup
      ? lookupFileItems.length
      : lookupResultMessages.length;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      if (lookupImagePreview) {
        setLookupImagePreview(null);
        return;
      }
      if (datePickerOpen) {
        setDatePickerOpen(false);
        if (!selectedDate) onHistoryFilterChange(previousFilterBeforeDate);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [
    datePickerOpen,
    lookupImagePreview,
    onClose,
    onHistoryFilterChange,
    previousFilterBeforeDate,
    selectedDate,
  ]);

  const openLookupMediaPreview = (item: LookupMediaPreviewItem) => {
    const openUrl = item.openUrl || item.previewUrl;
    if (!openUrl) return;
    if (item.kind === "image") {
      setLookupImagePreview({
        cacheKey: item.previewCacheKey,
        fileName: item.fileName,
        src: openUrl,
      });
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

  const selectMessage = (messageId: string) => {
    onClose();
    onScrollToMessage(messageId);
  };

  const clearFilterChip = () => {
    setDatePickerOpen(false);
    setSelectedDate(undefined);
    onHistoryFilterChange("all");
  };

  const selectHistoryFilter = (filter: HistoryFilterKey) => {
    if (filter === "date") {
      setPreviousFilterBeforeDate(historyFilter === "date" ? previousFilterBeforeDate : historyFilter);
      setDraftDate(selectedDate || localDateInputValue(new Date()));
      setDatePickerOpen(true);
      onHistoryFilterChange("date");
      return;
    }
    setDatePickerOpen(false);
    setSelectedDate(undefined);
    onHistoryFilterChange(filter);
  };

  const cancelDatePicker = () => {
    setDatePickerOpen(false);
    if (!selectedDate) onHistoryFilterChange(previousFilterBeforeDate);
  };

  const confirmDatePicker = () => {
    setSelectedDate(draftDate);
    setDatePickerOpen(false);
    onHistoryFilterChange("date");
  };

  return (
    <div className="message-history-lookup-backdrop" role="presentation">
      <section
        aria-label={t("messages.listPanel.historyTitle")}
        aria-modal="true"
        className="message-history-lookup-dialog chat-lookup-panel"
        role="dialog"
      >
        <header className="message-history-lookup-titlebar">
          <strong>{t("messages.listPanel.wechatHistoryTitle", { name: conversation.title })}</strong>
          <button
            type="button"
            aria-label={t("messages.listPanel.closeSearch")}
            onClick={onClose}
          >
            <X size={17} />
          </button>
        </header>
        <div className="chat-lookup-head">
          <label className="chat-inline-search">
            <Search size={15} />
            {activeFilterChip && (
              <button
                className="chat-history-filter-chip"
                type="button"
                aria-label={t("messages.listPanel.clearSearch")}
                onClick={clearFilterChip}
              >
                {t(activeFilterChip.labelKey)}
                <X size={13} />
              </button>
            )}
            <input
              value={messageSearchKeyword}
              onChange={(event) => onMessageSearchKeywordChange(event.target.value)}
              placeholder={searchPlaceholder}
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
        </div>
        <div className="chat-history-tags" aria-label={t("messages.listPanel.filtersAria")}>
          {historyFilterTabs.map((tab) => {
            const Icon = tab.icon;
            const count = historyCounts[tab.key] ?? 0;
            return (
              <button
                className={activeFilterTab === tab.key ? "selected" : ""}
                type="button"
                key={tab.key}
                onClick={() => selectHistoryFilter(tab.key)}
                disabled={tab.key !== "date" && count === 0}
              >
                <Icon size={14} />
                {t(tab.labelKey)}
              </button>
            );
          })}
        </div>
        <div className="chat-lookup-summary">
          <span>
            {messageSearchKeyword
              ? t("messages.listPanel.matchCount", { count: resultCount })
              : t("messages.listPanel.loadedCount", { count: loadedMessages.length })}
            {loadedMessages[0]?.sentAt
              ? ` · ${t("messages.listPanel.earliest", { time: formatChatTime(loadedMessages[0].sentAt) })}`
              : ""}
            {loadedMessages[loadedMessages.length - 1]?.sentAt
              ? ` · ${t("messages.listPanel.latest", { time: formatChatTime(loadedMessages[loadedMessages.length - 1].sentAt) })}`
              : ""}
            {lookupScope.limitedToLoadedRange
              ? ` · ${t(lookupScope.labelKey)}`
              : ` · ${t("messages.listPanel.syncedRange")}`}
          </span>
        </div>
        <div className="message-history-lookup-results-shell">
          {datePickerOpen && (
            <LookupDatePicker
              value={draftDate}
              onCancel={cancelDatePicker}
              onChange={setDraftDate}
              onConfirm={confirmDatePicker}
            />
          )}
          <div
            className={`chat-history-results ${
              showMediaLookupPreview ? "chat-history-results-media" : ""
            }`}
            aria-label={t("messages.listPanel.resultsAria")}
          >
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
                          <LookupMediaThumbnail
                            accountId={accountId}
                            authToken={authToken}
                            conversationId={conversation.conversationId}
                            item={item}
                          />
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
            ) : showFileLookup ? (
              lookupFileItems.map((item) => (
                <LookupFileResultRow
                  currentUserDisplayName={currentUserDisplayName}
                  isMine={isMineMessage?.(item.message) ?? false}
                  item={item}
                  key={`${item.message.messageId}-${item.index}`}
                  unknownSizeText={t("messages.listPanel.fileSizeUnknown")}
                  onSelect={() => selectMessage(item.message.messageId)}
                />
              ))
            ) : (
              lookupResultMessages.map((message) => (
                <LookupMessageResultRow
                  conversation={conversation}
                  currentUserAvatarUrl={currentUserAvatarUrl}
                  currentUserDisplayName={currentUserDisplayName}
                  isMine={isMineMessage?.(message) ?? false}
                  key={message.messageId}
                  message={message}
                  onSelect={() => selectMessage(message.messageId)}
                />
              ))
            )}
            {resultCount === 0 && <PanelState text={t("messages.listPanel.noMatches")} />}
          </div>
        </div>
      </section>
      {lookupImagePreview && (
        <LookupImagePreviewViewer
          authToken={authToken}
          onClose={() => setLookupImagePreview(null)}
          preview={lookupImagePreview}
        />
      )}
    </div>
  );
}

function LookupMessageResultRow({
  conversation,
  currentUserAvatarUrl,
  currentUserDisplayName,
  isMine,
  message,
  onSelect,
}: {
  conversation: ConversationListItem;
  currentUserAvatarUrl?: string | null;
  currentUserDisplayName?: string | null;
  isMine: boolean;
  message: MessageItemDto;
  onSelect: () => void;
}) {
  const senderName = isMine
    ? currentUserDisplayName || message.senderDisplayName || "我"
    : message.senderDisplayName || conversation.title;
  const avatarUrl = isMine
    ? currentUserAvatarUrl || message.senderAvatarUrl || message.avatarUrl
    : message.senderAvatarUrl || message.avatarUrl || conversation.avatarUrl;
  return (
    <button
      className="chat-history-message-row"
      type="button"
      onClick={onSelect}
    >
      <PcAvatar
        avatarUrl={avatarUrl}
        className="chat-history-row-avatar"
        name={senderName}
      />
      <span className="chat-history-message-main">
        <span className="chat-history-message-sender">{senderName}</span>
        <strong>{messageActionPreview(message)}</strong>
      </span>
      <time>{formatLookupFullDateTime(message.sentAt)}</time>
    </button>
  );
}

type LookupFileItem = {
  fileName: string;
  index: number;
  media?: MediaResourceDto;
  message: MessageItemDto;
  sizeBytes?: number;
};

function LookupFileResultRow({
  currentUserDisplayName,
  isMine,
  item,
  onSelect,
  unknownSizeText,
}: {
  currentUserDisplayName?: string | null;
  isMine: boolean;
  item: LookupFileItem;
  onSelect: () => void;
  unknownSizeText: string;
}) {
  const senderName = isMine
    ? currentUserDisplayName || item.message.senderDisplayName || "我"
    : item.message.senderDisplayName || "";
  return (
    <button
      className="chat-history-file-row"
      type="button"
      onClick={onSelect}
    >
      <span className="chat-history-file-icon" aria-hidden="true">
        <FileText size={21} />
      </span>
      <span className="chat-history-file-main">
        <strong>{item.fileName}</strong>
        <span>{senderName}</span>
      </span>
      <span className="chat-history-file-meta">
        <time>{formatLookupShortDate(item.message.sentAt)}</time>
        <span>{formatLookupFileSize(item.sizeBytes, unknownSizeText)}</span>
      </span>
    </button>
  );
}

function LookupDatePicker({
  onCancel,
  onChange,
  onConfirm,
  value,
}: {
  onCancel: () => void;
  onChange: (value: string) => void;
  onConfirm: () => void;
  value: string;
}) {
  const { t } = useI18n();
  const parsed = parseLocalDateValue(value) ?? new Date();
  const year = parsed.getFullYear();
  const month = parsed.getMonth();
  const selectedDay = parsed.getDate();
  const days = calendarDaysForMonth(year, month);
  const years = Array.from({ length: 9 }, (_, index) => year - 4 + index);
  const setDatePart = (nextYear: number, nextMonth: number, nextDay: number) => {
    const maxDay = new Date(nextYear, nextMonth + 1, 0).getDate();
    onChange(localDateInputValue(new Date(nextYear, nextMonth, Math.min(nextDay, maxDay))));
  };

  return (
    <section className="chat-history-date-picker" aria-label={t("messages.listPanel.selectSendDate")}>
      <h3>{t("messages.listPanel.selectSendDate")}</h3>
      <div className="chat-history-date-controls">
        <select
          value={year}
          onChange={(event) => setDatePart(Number(event.target.value), month, selectedDay)}
        >
          {years.map((item) => (
            <option value={item} key={item}>
              {item}年
            </option>
          ))}
        </select>
        <select
          value={month}
          onChange={(event) => setDatePart(year, Number(event.target.value), selectedDay)}
        >
          {Array.from({ length: 12 }, (_, index) => (
            <option value={index} key={index}>
              {index + 1}月
            </option>
          ))}
        </select>
      </div>
      <div className="chat-history-calendar-weekdays" aria-hidden="true">
        {["一", "二", "三", "四", "五", "六", "日"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="chat-history-calendar-days">
        {days.map((day, index) =>
          day ? (
            <button
              className={day === selectedDay ? "selected" : ""}
              type="button"
              key={`${year}-${month}-${day}`}
              onClick={() => setDatePart(year, month, day)}
            >
              {day}
            </button>
          ) : (
            <span key={`empty-${index}`} />
          ),
        )}
      </div>
      <footer>
        <button type="button" onClick={onCancel}>
          {t("messages.listPanel.cancel")}
        </button>
        <button className="primary" type="button" onClick={onConfirm}>
          {t("messages.listPanel.confirm")}
        </button>
      </footer>
    </section>
  );
}

type LookupMediaPreviewItem = {
  durationSeconds?: number;
  fileName: string;
  index: number;
  kind: "image" | "video";
  localOpenUrl?: string;
  media?: MediaResourceDto;
  message: MessageItemDto;
  openUrl?: string;
  posterUrl?: string;
  previewUrl?: string;
  previewUrls?: string[];
  previewCacheKey?: string;
  remoteSourceUrl?: string;
  sourceUrl?: string;
  videoPreviewUrl?: string;
};

function LookupImagePreviewViewer({
  authToken,
  onClose,
  preview,
}: {
  authToken?: string;
  onClose: () => void;
  preview: {
    cacheKey?: string;
    fileName: string;
    src: string;
  };
}) {
  const { displaySrc } = useCachedImageMediaUrl(preview.src, authToken, preview.cacheKey);
  return (
    <ImagePreviewViewer
      fileName={preview.fileName}
      onClosePreview={onClose}
      src={displaySrc || preview.src}
    />
  );
}

function groupLookupMediaPreviewItems({
  assetBaseUrl,
  filter,
  messages,
  thisMonthLabel,
  thisWeekLabel,
  todayLabel,
}: {
  assetBaseUrl?: string;
  filter: HistoryFilterKey;
  messages: MessageItemDto[];
  thisMonthLabel: string;
  thisWeekLabel: string;
  todayLabel: string;
}) {
  const groups = new Map<string, LookupMediaPreviewItem[]>();
  messages.forEach((message) => {
    lookupMediaPreviewItemsFromMessage({ assetBaseUrl, filter, message }).forEach((item) => {
      const label = lookupMediaDateLabel(message.sentAt, {
        thisMonthLabel,
        thisWeekLabel,
        todayLabel,
      });
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
      localOpenUrl: item.localOpenUrl,
      media: item.media,
      message,
      openUrl:
        item.localOpenUrl ||
        item.remoteSourceUrl ||
        (item.kind === "image" ? compactUniqueMediaUrls(item.imageSourceUrls ?? [])[0] : item.sourceUrl),
      posterUrl: item.kind === "video" ? item.posterUrl : undefined,
      previewUrl:
        item.kind === "video"
          ? item.posterUrl
          : compactUniqueMediaUrls([
              ...(item.imageSourceUrls ?? []),
              item.localPreviewUrl,
              item.localOpenUrl,
              item.remoteSourceUrl,
            ])[0],
      previewUrls:
        item.kind === "image"
          ? compactUniqueMediaUrls([
              ...(item.imageSourceUrls ?? []),
              item.localPreviewUrl,
              item.localOpenUrl,
              item.remoteSourceUrl,
            ])
          : item.posterUrl
            ? [item.posterUrl]
            : [],
      previewCacheKey:
        item.kind === "image"
          ? item.imageCacheKey
          : item.posterUrl
            ? `lookup-poster:${message.messageId}:${index}:${item.posterUrl}`
            : undefined,
      remoteSourceUrl: item.remoteSourceUrl,
      sourceUrl: item.sourceUrl,
      videoPreviewUrl:
        item.kind === "video"
          ? item.localPreviewUrl || item.localOpenUrl || item.sourceUrl || item.remoteSourceUrl
          : undefined,
    }));
}

function fileLookupItemsFromMessages({
  assetBaseUrl,
  messages,
}: {
  assetBaseUrl?: string;
  messages: MessageItemDto[];
}): LookupFileItem[] {
  return messages.flatMap((message) =>
    chatMediaItemsFromMessage({ assetBaseUrl, message })
      .filter((item) => item.kind === "file")
      .map((item, index) => ({
        fileName: item.fileName || messageMediaFileName(message),
        index,
        media: item.media,
        message,
        sizeBytes: item.media?.sizeBytes,
      })),
  );
}

function compactUniqueMediaUrls(urls: Array<string | undefined>) {
  const seen = new Set<string>();
  return urls.filter((url): url is string => {
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

function LookupMediaThumbnail({
  accountId,
  authToken,
  conversationId,
  item,
}: {
  accountId?: string;
  authToken?: string;
  conversationId?: string;
  item: LookupMediaPreviewItem;
}) {
  if (item.kind === "video") {
    return (
      <LookupVideoThumbnail
        accountId={accountId}
        authToken={authToken}
        conversationId={conversationId}
        item={item}
      />
    );
  }
  return <LookupImageThumbnail authToken={authToken} item={item} />;
}

function LookupImageThumbnail({
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
  const src = displaySrc || previewUrl || "";
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
      <FileImage size={22} />
    </span>
  );
}

function LookupVideoThumbnail({
  accountId,
  authToken,
  conversationId,
  item,
}: {
  accountId?: string;
  authToken?: string;
  conversationId?: string;
  item: LookupMediaPreviewItem;
}) {
  const posterUrls =
    item.previewUrls?.length
      ? item.previewUrls
      : item.previewUrl
        ? [item.previewUrl]
        : [];
  const posterUrlsKey = posterUrls.join("\n");
  const [activePosterIndex, setActivePosterIndex] = useState(0);
  const posterUrl = posterUrls[activePosterIndex] ?? posterUrls[0];
  const hasNextPoster = activePosterIndex < posterUrls.length - 1;
  const { displaySrc, failed, loadCachedMedia } = useCachedImageMediaUrl(
    posterUrl,
    authToken,
    item.previewCacheKey,
  );
  const videoCacheKey = mediaMaterializationCacheKey(
    "video",
    item.media,
    item.remoteSourceUrl || item.sourceUrl,
  );
  const [localVideoSrc, setLocalVideoSrc] = useState<string | null>(
    () => getMaterializedMediaFileUrl(videoCacheKey) ?? null,
  );
  const [localVideoDisplaySrc, setLocalVideoDisplaySrc] = useState<string | null>(
    () => getMaterializedMediaDisplayUrl(videoCacheKey) ?? null,
  );
  const { canOpenVideoPlayer, canReadMediaFileAsDataUrl } = getCurrentMediaActionCapabilities();
  const previewSource = localVideoDisplaySrc || item.localOpenUrl || item.videoPreviewUrl;
  const videoDisplaySrc = inlineVideoPreviewSrc(previewSource, {
    allowDesktopFile: canOpenVideoPlayer || canReadMediaFileAsDataUrl,
  });
  const explicitPoster = displaySrc || posterUrl || undefined;
  const { posterSrc: resolvedPosterSrc } = useVideoPosterSource({
    authToken,
    displaySrc: videoDisplaySrc,
    explicitPoster,
    media: item.media,
    mediaCacheContext: { accountId, conversationId },
  });
  const posterSrc = resolvedPosterSrc || "";
  const [posterBroken, setPosterBroken] = useState(false);
  const showPoster = Boolean(posterSrc && !posterBroken);

  useEffect(() => {
    setActivePosterIndex(0);
  }, [posterUrlsKey]);

  useEffect(() => {
    setPosterBroken(false);
  }, [posterSrc]);

  useEffect(() => {
    const materialized = getMaterializedMediaFileUrl(videoCacheKey);
    const display = getMaterializedMediaDisplayUrl(videoCacheKey);
    setLocalVideoSrc(materialized ?? null);
    setLocalVideoDisplaySrc(display ?? null);
    const unsubscribeFile = subscribeMaterializedMediaFile(videoCacheKey, setLocalVideoSrc);
    const unsubscribeDisplay = subscribeMaterializedMediaDisplayUrl(
      videoCacheKey,
      setLocalVideoDisplaySrc,
    );
    return () => {
      unsubscribeFile();
      unsubscribeDisplay();
    };
  }, [videoCacheKey]);

  useEffect(() => {
    let disposed = false;
    const display = getMaterializedMediaDisplayUrl(videoCacheKey);
    if (display) {
      setLocalVideoDisplaySrc(display);
      return undefined;
    }
    if (!localVideoSrc || !videoCacheKey) {
      setLocalVideoDisplaySrc(null);
      return undefined;
    }
    void ensureMaterializedMediaDisplayUrl({
      accountId,
      authToken,
      cacheIdentity: mediaStableCacheIdentity(item.media, item.remoteSourceUrl || item.sourceUrl),
      cacheKey: videoCacheKey,
      conversationId,
      fileName: item.fileName || "video.mp4",
      fileUrl: localVideoSrc,
      kind: "video",
    })
      .then((displayUrl) => {
        if (!disposed && displayUrl) setLocalVideoDisplaySrc(displayUrl);
      })
      .catch(() => {
        if (!disposed) setLocalVideoDisplaySrc(null);
      });
    return () => {
      disposed = true;
    };
  }, [
    accountId,
    authToken,
    conversationId,
    item.fileName,
    item.media,
    item.remoteSourceUrl,
    item.sourceUrl,
    localVideoSrc,
    videoCacheKey,
  ]);

  useEffect(() => {
    if (!failed || !hasNextPoster) return;
    setActivePosterIndex((current) =>
      current < posterUrls.length - 1 ? current + 1 : current,
    );
  }, [failed, hasNextPoster, posterUrls.length]);

  return (
    <span
      className={`chat-history-video-frame ${
        showPoster ? "has-poster poster-ready" : "no-poster"
      }`}
    >
      {showPoster && (
        <img
          className="chat-history-video-poster"
          src={posterSrc}
          alt={item.fileName}
          loading="lazy"
          onError={() => {
            setPosterBroken(true);
            if (!failed) loadCachedMedia();
            if (hasNextPoster) {
              setActivePosterIndex((current) =>
                current < posterUrls.length - 1 ? current + 1 : current,
              );
            }
          }}
        />
      )}
      {!showPoster && <span className="chat-history-video-placeholder" aria-hidden="true" />}
      <span className="chat-history-video-play" aria-hidden="true">
        <Play size={26} fill="currentColor" />
      </span>
    </span>
  );
}

function lookupMediaDateLabel(
  sentAt: string | undefined,
  labels: {
    thisMonthLabel: string;
    thisWeekLabel: string;
    todayLabel: string;
  },
) {
  if (!sentAt) return labels.todayLabel;
  const date = new Date(sentAt);
  if (Number.isNaN(date.getTime())) return formatChatTime(sentAt);
  const now = new Date();
  if (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  ) {
    return labels.todayLabel;
  }
  if (isSameLocalWeek(date, now)) return labels.thisWeekLabel;
  if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) {
    return labels.thisMonthLabel;
  }
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

function formatLookupMediaDuration(durationSeconds?: number) {
  if (!durationSeconds || durationSeconds <= 0) return "";
  const totalSeconds = Math.round(durationSeconds);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatLookupFullDateTime(value: string | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatChatTime(value);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${String(
    date.getHours(),
  ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatLookupShortDate(value: string | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatChatTime(value);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatLookupFileSize(size: number | undefined, unknownSizeText: string) {
  if (!size || size <= 0) return unknownSizeText;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function localDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function parseLocalDateValue(value: string | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return undefined;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function messageMatchesLocalDate(sentAt: string | undefined, selectedDate: string) {
  const date = sentAt ? new Date(sentAt) : undefined;
  if (!date || Number.isNaN(date.getTime())) return false;
  return localDateInputValue(date) === selectedDate;
}

function calendarDaysForMonth(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const leadingEmptyDays = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return [
    ...Array.from({ length: leadingEmptyDays }, () => 0),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
}

function isSameLocalWeek(left: Date, right: Date) {
  const startOfWeek = (date: Date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    return start;
  };
  return startOfWeek(left).getTime() === startOfWeek(right).getTime();
}
