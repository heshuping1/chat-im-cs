import { MessageBodyView, type UploadActionHandler } from "./MessageBodyView";
import { PcAvatar } from "./PcAvatar";
import type { MessageItemDto } from "../data/api-client";
import {
  createChatMessageViewModel,
  type ChatMessageViewModel,
} from "../data/message/message-view-model";
import type { MouseEvent } from "react";

export function ChatMessageBubble({
  assetBaseUrl,
  authToken,
  conversationFallbackName,
  message,
  mine,
  onContextMenu,
  onAvatarClick,
  onContactClick,
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
  const model =
    viewModel ??
    createChatMessageViewModel({
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
    });
  const senderName = model.sender.name;
  const reply = model.bubble.reply;
  const avatar = (
    <button
      className="pc-chat-avatar-button"
      type="button"
      aria-label={mine ? "查看我的资料" : "查看对方资料"}
      title={mine ? "查看我的资料" : `查看${senderName}资料`}
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
        {model.content.translationText && (
          <div className="pc-message-translation">{model.content.translationText}</div>
        )}
        <time className="pc-chat-time">
          {model.status.timeText}
          {model.status.statusText ? ` · ${model.status.statusText}` : ""}
        </time>
      </div>
      {mine && avatar}
    </article>
  );
}
