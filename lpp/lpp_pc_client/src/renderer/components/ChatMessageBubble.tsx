import { MessageBodyView, type UploadActionHandler } from "./MessageBodyView";
import { PcAvatar } from "./PcAvatar";
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
  onGroupReadReceiptClick,
  senderFallback,
  senderAvatarUrl,
  mineAvatarUrl,
  mediaCacheContext,
  onUploadAction,
  showSenderName = true,
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
  onGroupReadReceiptClick?: (
    message: MessageItemDto,
    anchor: HTMLElement,
  ) => void;
  onUploadAction?: UploadActionHandler;
  senderFallback: string;
  senderAvatarUrl?: string | null;
  mineAvatarUrl?: string | null;
  mediaCacheContext?: {
    accountId?: string;
    conversationId?: string;
  };
  statusText?: string;
  showSenderName?: boolean;
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
    ? { ...viewModel, actions: computedModel.actions }
    : computedModel;
  const senderName = model.sender.name;
  const reply = model.bubble.reply;
  const directReadReceipt =
    mine && (model.status.receipt === "read" || model.status.receipt === "group_all");
  const groupReadReceipt =
    mine &&
    model.status.groupReadReceipt &&
    model.status.receipt !== "group_all" &&
    model.status.groupReadReceiptClickable &&
    Boolean(onGroupReadReceiptClick);
  const groupReadVisualRatio = 0.42;
  const groupReadLabel = groupReadReceiptLabel(model.status.groupReadReceipt);
  const statusReceipt = directReadReceipt ? (
    <span
      aria-label="已读"
      className="pc-chat-bubble-receipt pc-chat-direct-read-receipt"
      role="img"
    >
      <DirectReadReceiptIcon />
    </span>
  ) : groupReadReceipt ? (
    <button
      aria-label={groupReadLabel}
      className="pc-chat-bubble-receipt pc-chat-group-read-pie-button"
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onGroupReadReceiptClick?.(message, event.currentTarget);
      }}
    >
      <GroupReadPieIcon ratio={groupReadVisualRatio} />
    </button>
  ) : null;
  const inlineStatusText = model.status.statusText ? (
    <span className="pc-chat-inline-status">{model.status.statusText}</span>
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
        {!mine && showSenderName && <div className="pc-chat-sender">{senderName}</div>}
        <div className="pc-chat-bubble-row">
          {sendStatusSlot}
          <div className={`pc-chat-bubble-shell${statusReceipt ? " has-receipt" : ""}`}>
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
            {statusReceipt}
          </div>
        </div>
        {model.content.translationText && (
          <div className="pc-message-translation">{model.content.translationText}</div>
        )}
        <time className="pc-chat-time">
          <span>{model.status.timeText}</span>
          {inlineStatusText && (
            <>
              <span className="pc-chat-time-separator" aria-hidden="true">
                ·
              </span>
              {inlineStatusText}
            </>
          )}
        </time>
      </div>
      {mine && avatar}
    </article>
  );
}

function DirectReadReceiptIcon() {
  return (
    <svg
      aria-hidden="true"
      className="pc-chat-direct-read-receipt-icon"
      focusable="false"
      height="13"
      viewBox="0 0 14 14"
      width="13"
    >
      <circle
        className="pc-chat-direct-read-receipt-ring"
        cx="7"
        cy="7"
        r="5.45"
      />
      <path
        className="pc-chat-direct-read-receipt-check"
        d="M4.45 7.05L6.12 8.68L9.58 5.28"
      />
    </svg>
  );
}

function GroupReadPieIcon({ ratio }: { ratio: number }) {
  const center = 7;
  const outerRadius = 5.35;
  const pieRadius = 3.25;
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  const wedgePath = groupReadPiePath(center, pieRadius, clampedRatio);
  return (
    <svg
      aria-hidden="true"
      className="pc-chat-group-read-pie-icon"
      focusable="false"
      height="13"
      viewBox="0 0 14 14"
      width="13"
    >
      <circle cx={center} cy={center} r={outerRadius} className="pc-chat-group-read-pie-ring" />
      <circle cx={center} cy={center} r={pieRadius} className="pc-chat-group-read-pie-track" />
      {clampedRatio >= 0.995 ? (
        <circle cx={center} cy={center} r={pieRadius} className="pc-chat-group-read-pie-fill" />
      ) : wedgePath ? (
        <path className="pc-chat-group-read-pie-fill" d={wedgePath} />
      ) : null}
    </svg>
  );
}

function groupReadPiePath(center: number, radius: number, ratio: number) {
  if (ratio <= 0) return undefined;
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + ratio * Math.PI * 2;
  const startX = center + radius * Math.cos(startAngle);
  const startY = center + radius * Math.sin(startAngle);
  const endX = center + radius * Math.cos(endAngle);
  const endY = center + radius * Math.sin(endAngle);
  const largeArc = ratio > 0.5 ? 1 : 0;
  return [
    `M ${center} ${center}`,
    `L ${startX.toFixed(3)} ${startY.toFixed(3)}`,
    `A ${radius} ${radius} 0 ${largeArc} 1 ${endX.toFixed(3)} ${endY.toFixed(3)}`,
    "Z",
  ].join(" ");
}

function groupReadReceiptLabel(
  receipt: ChatMessageViewModel["status"]["groupReadReceipt"],
) {
  if (!receipt) return "已读详情";
  return receipt.totalCount !== undefined
    ? `已读 ${receipt.readCount} / ${receipt.totalCount}`
    : `已读 ${receipt.readCount}`;
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
