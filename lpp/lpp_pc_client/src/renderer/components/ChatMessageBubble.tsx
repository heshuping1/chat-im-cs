import { MessageBodyView, type UploadActionHandler } from "./MessageBodyView";
import { PcAvatar } from "./PcAvatar";
import { Check } from "lucide-react";
import type { MessageItemDto } from "../data/api-client";
import {
  createChatMessageViewModel,
  type ChatMessageViewModel,
} from "../data/message/message-view-model";
import { nextChatMessageStatusRefreshDelay } from "../data/message/message-status-model";
import { useI18n } from "../i18n/useI18n";
import { useEffect, useState, type MouseEvent } from "react";

export function ChatMessageBubble({
  assetBaseUrl,
  authToken,
  conversationFallbackName,
  message,
  mine,
  onContextMenu,
  onAvatarClick,
  onContactClick,
  onFailedMessageClick,
  senderFallback,
  senderAvatarUrl,
  mineAvatarUrl,
  mediaCacheContext,
  onUploadAction,
  statusText,
  timeText,
  translationText,
  viewModel,
}: {
  assetBaseUrl?: string;
  authToken?: string;
  conversationFallbackName: string;
  message: MessageItemDto;
  mine: boolean;
  onContextMenu?: (event: MouseEvent<HTMLElement>, message: MessageItemDto) => void;
  onAvatarClick?: (event: MouseEvent<HTMLButtonElement>, message: MessageItemDto, mine: boolean) => void;
  onContactClick?: (event: MouseEvent<HTMLElement>, value: Record<string, unknown>) => void;
  onFailedMessageClick?: (message: MessageItemDto) => void;
  onUploadAction?: UploadActionHandler;
  senderFallback: string;
  senderAvatarUrl?: string | null;
  mineAvatarUrl?: string | null;
  mediaCacheContext?: {
    accountId?: string;
    conversationId?: string;
  };
  statusText?: string;
  timeText: string;
  translationText?: string;
  viewModel?: ChatMessageViewModel;
}) {
  const { t } = useI18n();
  const [statusNowMs, setStatusNowMs] = useState(() => Date.now());
  const localSendStartedAt = localSendStartedAtMs(message);
  const localFailedAt = localFailedAtMs(message);

  useEffect(() => {
    if (!mine || !isLocalSendStatus(message.status)) return undefined;
    const now = Date.now();
    setStatusNowMs((current) => (current < now ? now : current));
    const remaining = nextChatMessageStatusRefreshDelay({ message, nowMs: now });
    if (remaining === undefined) return undefined;
    const timer = window.setTimeout(() => {
      setStatusNowMs(Date.now());
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [localFailedAt, localSendStartedAt, message, message.messageId, message.status, mine]);

  const computedModel = createChatMessageViewModel({
    contextMenuEnabled: Boolean(onContextMenu),
    conversationFallbackName,
    message,
    mine,
    mineAvatarUrl,
    senderAvatarUrl,
    senderFallback,
    statusText,
    timeText,
    translationText,
    nowMs: statusNowMs,
  });
  const model = viewModel
    ? { ...viewModel, actions: computedModel.actions, status: computedModel.status }
    : computedModel;
  const senderName = model.sender.name;
  const reply = model.bubble.reply;
  const readReceipt = model.status.receipt === "read";
  const statusReceipt = model.status.statusText ? (
    <span className={`pc-chat-receipt${readReceipt ? " read" : ""}`}>
      {readReceipt && (
        <Check
          aria-hidden="true"
          className="pc-chat-receipt-icon"
          size={12}
          strokeWidth={3}
        />
      )}
      <span>{model.status.statusText}</span>
    </span>
  ) : null;
  const sendStatusSlot = mine && model.status.sendStatusSlot !== "none" ? (
    <MessageSendStatusSlot
      failed={model.status.showFailureMarker}
      onRetry={
        model.status.showFailureMarker &&
        model.actions.failureRetryAction &&
        onFailedMessageClick
          ? () => onFailedMessageClick(message)
          : undefined
      }
      tooltip={model.status.failureTooltip || t("chat.sendFailedRetry")}
    />
  ) : null;
  const avatar = (
    <button
      className="pc-chat-avatar-button"
      type="button"
      aria-label={mine ? t("chat.viewMyProfile") : t("chat.viewTheirProfile")}
      title={mine ? t("chat.viewMyProfile") : t("chat.viewSenderProfile", { name: senderName })}
      onClick={(event) => onAvatarClick?.(event, message, mine)}
    >
      <PcAvatar
        avatarUrl={model.sender.avatarUrl}
        className="pc-chat-avatar"
        name={model.sender.fallbackName}
      />
    </button>
  );
  return (
    <article
      className={model.bubble.className}
      onContextMenu={(event) => onContextMenu?.(event, message)}
    >
      {!mine && avatar}
      <div className="pc-chat-message-main">
        {!mine && <div className="pc-chat-sender">{senderName}</div>}
        <div className="pc-chat-bubble-row">
          {sendStatusSlot}
          <div className="pc-chat-bubble">
            {reply && (
              <div className="pc-chat-reply-quote">
                <span>{reply.sender}</span>
                <strong>{reply.preview}</strong>
              </div>
            )}
            <MessageBodyView
              assetBaseUrl={assetBaseUrl}
              authToken={authToken}
              mediaCacheContext={mediaCacheContext}
              message={message}
              onContactClick={onContactClick}
              onUploadAction={onUploadAction}
            />
          </div>
        </div>
        {model.content.translationText && (
          <div className="pc-message-translation">{model.content.translationText}</div>
        )}
        <time className="pc-chat-time">
          <span>{model.status.timeText}</span>
          {statusReceipt && (
            <>
              <span className="pc-chat-time-separator" aria-hidden="true">
                ·
              </span>
              {statusReceipt}
            </>
          )}
        </time>
      </div>
      {mine && avatar}
    </article>
  );
}

function MessageSendStatusSlot({
  failed,
  onRetry,
  tooltip,
}: {
  failed: boolean;
  onRetry?: () => void;
  tooltip: string;
}) {
  return (
    <span className="pc-chat-send-status-slot">
      {failed ? (
        <FailureStatusMarker onRetry={onRetry} tooltip={tooltip} />
      ) : (
        <SendingStatusMarker />
      )}
    </span>
  );
}

function SendingStatusMarker() {
  const { t } = useI18n();
  return (
    <span
      aria-label={t("chat.sending")}
      className="pc-chat-sending-marker"
      role="status"
      title={t("chat.sending")}
    >
      <span aria-hidden="true" />
    </span>
  );
}

function FailureStatusMarker({
  onRetry,
  tooltip,
}: {
  onRetry?: () => void;
  tooltip: string;
}) {
  const className = `pc-chat-failed-marker${onRetry ? " actionable" : ""}`;
  const content = (
    <>
      <span aria-hidden="true">!</span>
      <em>{tooltip}</em>
    </>
  );
  if (onRetry) {
    return (
      <button
        aria-label={tooltip}
        className={className}
        title={tooltip}
        type="button"
        onClick={onRetry}
      >
        {content}
      </button>
    );
  }
  return (
    <span aria-label={tooltip} className={className} role="img" title={tooltip}>
      {content}
    </span>
  );
}

function localSendStartedAtMs(message: MessageItemDto) {
  const value = (message as unknown as Record<string, unknown>).localSendStartedAt;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function localFailedAtMs(message: MessageItemDto) {
  const value = (message as unknown as Record<string, unknown>).localFailedAt;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function isLocalSendStatus(status?: string) {
  return ["failed", "queued", "sending", "uploading"].includes(
    String(status ?? "").trim().toLowerCase(),
  );
}
