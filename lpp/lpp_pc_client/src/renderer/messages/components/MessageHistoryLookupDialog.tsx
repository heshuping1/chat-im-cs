import {
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
import { useEffect, useMemo, useState } from "react";

import { PanelState } from "../../components/PanelState";
import type { ConversationListItem, MediaResourceDto, MessageItemDto } from "../../data/api-client";
import { mediaStableCacheIdentity } from "../../data/im-message-normalize";
import { useI18n } from "../../i18n/useI18n";
import { formatChatTime } from "../../lib/format";
import { ImagePreviewViewer } from "../../media/components/ImageMessageFrame";
import { chatMediaItemsFromMessage, type ChatMediaItem } from "../../media/domain/mediaMessage";
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
  historyCounts: Record<HistoryFilterKey, number>;
  historyFilter: HistoryFilterKey;
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

export function MessageHistoryLookupDialog({
  accountId,
  assetBaseUrl,
  authToken,
  conversation,
  historyCounts,
  historyFilter,
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
  const lookupKeywordActive = Boolean(messageSearchKeyword.trim());
  const showLookupOverview = historyFilter === "all" && !lookupKeywordActive;
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
  const lookupResultMessages = useMemo(() => messages.slice().reverse(), [messages]);
  const lookupOverviewMessages = lookupResultMessages;
  const lookupOverviewMediaGroups = useMemo(
    () =>
      showLookupOverview
        ? groupLookupMediaPreviewItems({
            assetBaseUrl,
            filter: "image",
            messages: messages.slice(-24),
            todayLabel: t("messages.listPanel.today"),
          }).map((group) => ({ ...group, items: group.items.slice(-6).reverse() }))
        : [],
    [assetBaseUrl, messages, showLookupOverview, t],
  );
  const lookupOverviewHasMedia = lookupOverviewMediaGroups.some((group) => group.items.length > 0);
  const lookupOverviewCategoryKeys = historyFilterTabs
    .map((tab) => tab.key)
    .filter((key) => key !== "all" && (historyCounts[key] ?? 0) > 0);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      if (lookupImagePreview) {
        setLookupImagePreview(null);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [lookupImagePreview, onClose]);

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
            <input
              value={messageSearchKeyword}
              onChange={(event) => onMessageSearchKeywordChange(event.target.value)}
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
        <div className="chat-lookup-summary">
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
            {lookupScope.limitedToLoadedRange
              ? ` · ${t(lookupScope.labelKey)}`
              : ` · ${t("messages.listPanel.syncedRange")}`}
          </span>
        </div>
        <div className="message-history-lookup-results-shell">
        {showLookupOverview && (
          <div
            className="chat-history-results chat-history-overview"
            aria-label={t("messages.listPanel.resultsAria")}
          >
            {lookupOverviewCategoryKeys.length > 0 && (
              <section className="chat-history-overview-section">
                <h3>{t("messages.listPanel.overviewCategories")}</h3>
                <div className="chat-history-overview-categories">
                  {lookupOverviewCategoryKeys.map((key) => {
                    const tab = historyFilterTabs.find((item) => item.key === key);
                    if (!tab) return null;
                    const Icon = tab.icon;
                    return (
                      <button
                        className="chat-history-overview-category"
                        type="button"
                        key={key}
                        onClick={() => onHistoryFilterChange(key)}
                      >
                        <span>
                          <Icon size={15} />
                          {t(tab.labelKey)}
                        </span>
                        <em>{historyCounts[key] ?? 0}</em>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
            {lookupOverviewHasMedia && (
              <section className="chat-history-overview-section">
                <header>
                  <h3>{t("messages.listPanel.overviewMedia")}</h3>
                  <button type="button" onClick={() => onHistoryFilterChange("image")}>
                    {t("messages.listPanel.viewMore")}
                  </button>
                </header>
                <div className="chat-history-media-results chat-history-media-results-overview">
                  {lookupOverviewMediaGroups.map((group) => (
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
              </section>
            )}
            {lookupOverviewMessages.length > 0 && (
              <section className="chat-history-overview-section">
                <h3>{t("messages.listPanel.overviewRecent")}</h3>
                <div className="chat-history-overview-list">
                  {lookupOverviewMessages.map((message) => (
                    <button
                      type="button"
                      key={message.messageId}
                      onClick={() => selectMessage(message.messageId)}
                    >
                      <span>{formatChatTime(message.sentAt)}</span>
                      <strong>{messageActionPreview(message)}</strong>
                    </button>
                  ))}
                </div>
              </section>
            )}
            {messages.length === 0 && <PanelState text={t("messages.listPanel.noMatches")} />}
          </div>
        )}
        {!showLookupOverview && (
          <div
            className="chat-history-results"
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
            ) : (
              lookupResultMessages.map((message) => (
                <button
                  type="button"
                  key={message.messageId}
                  onClick={() => selectMessage(message.messageId)}
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
