import { MessageBodyView, type UploadActionHandler } from "./MessageBodyView";
import { PcAvatar } from "./PcAvatar";
import type { MessageItemDto } from "../data/api-client";
import type { MouseEvent } from "react";

export function ChatMessageBubble({
  assetBaseUrl,
  authToken,
  fallbackInitial,
  message,
  mine,
  onContextMenu,
  onAvatarClick,
  onContactClick,
  senderFallback,
  senderAvatarUrlFallback,
  mineAvatarUrlFallback,
  mediaCacheContext,
  onUploadAction,
  statusText,
  timeText,
  translationText,
}: {
  assetBaseUrl?: string;
  authToken?: string;
  fallbackInitial: string;
  message: MessageItemDto;
  mine: boolean;
  onContextMenu?: (event: MouseEvent<HTMLElement>, message: MessageItemDto) => void;
  onAvatarClick?: (event: MouseEvent<HTMLButtonElement>, message: MessageItemDto, mine: boolean) => void;
  onContactClick?: (event: MouseEvent<HTMLElement>, value: Record<string, unknown>) => void;
  onUploadAction?: UploadActionHandler;
  senderFallback: string;
  senderAvatarUrlFallback?: string | null;
  mineAvatarUrlFallback?: string | null;
  mediaCacheContext?: {
    accountId?: string;
    conversationId?: string;
  };
  statusText?: string;
  timeText: string;
  translationText?: string;
}) {
  const senderName = mine ? "我" : senderFallback || message.senderDisplayName || "对方";
  const reply = replyPreviewFromMessage(message);
  const avatar = (
    <button
      className="pc-chat-avatar-button"
      type="button"
      aria-label={mine ? "查看我的资料" : "查看对方资料"}
      title={mine ? "查看我的资料" : `查看${senderName}资料`}
      onClick={(event) => onAvatarClick?.(event, message, mine)}
    >
      <PcAvatar
        avatarUrl={
          mine
            ? mineAvatarUrlFallback
            : message.senderAvatarUrl || message.avatarUrl || senderAvatarUrlFallback
        }
        className="pc-chat-avatar"
        name={mine ? senderName : senderName || fallbackInitial}
      />
    </button>
  );
  return (
    <article
      className={`pc-chat-message ${mine ? "mine" : "other"}`}
      onContextMenu={(event) => onContextMenu?.(event, message)}
    >
      {!mine && avatar}
      <div className="pc-chat-message-main">
        {!mine && <div className="pc-chat-sender">{senderName}</div>}
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
        {translationText && (
          <div className="pc-message-translation">{translationText}</div>
        )}
        <time className="pc-chat-time">
          {timeText}
          {statusText ? ` · ${statusText}` : ""}
        </time>
      </div>
      {mine && avatar}
    </article>
  );
}

function replyPreviewFromMessage(message: MessageItemDto) {
  const body = message.body ?? {};
  const record = (
    body.reply ||
    body.replyTo ||
    body.quotedMessage ||
    body.quote ||
    (message as unknown as Record<string, unknown>).reply
  ) as Record<string, unknown> | undefined;
  if (!record || typeof record !== "object") return undefined;
  const preview = stringField(record, "preview", "text", "content", "message");
  if (!preview) return undefined;
  return {
    sender: stringField(record, "sender", "senderDisplayName", "name") || "引用消息",
    preview,
  };
}

function stringField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}
