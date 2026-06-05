import type { MouseEvent } from "react";
import type { MessageItemDto } from "../data/api-client";
import {
  type NormalizedMessagePart,
  normalizeMessageType,
  normalizeMessageParts,
} from "../data/im-message-normalize";
import { useI18n } from "../i18n/useI18n";
import { renderWechatEmojiText } from "../lib/wechatEmoji";
import { normalizeMediaPart } from "../media/domain/mediaMessage";
import {
  type UploadActionHandler,
  fileMessageInlineStatusText,
  localUploadStateFromMessage,
} from "../media/runtime/uploadState";
import {
  FileMessageContent,
  type MessageMediaCacheContext,
} from "../messages/components/message-content/FileMessageContent";
import {
  ImagePart,
  VideoPart,
  VoicePart,
} from "../messages/components/message-content/MessageMediaParts";
import {
  CallPart,
  ContactPart,
  LocationPart,
} from "./MessageNonMediaParts";

export type { UploadAction, UploadActionHandler } from "../media/runtime/uploadState";

export function MessageBodyView({
  assetBaseUrl,
  authToken,
  mediaCacheContext,
  message,
  onContactClick,
  onUploadAction,
}: {
  assetBaseUrl?: string;
  authToken?: string;
  mediaCacheContext?: MediaCacheContext;
  message: MessageItemDto;
  onContactClick?: (event: MouseEvent<HTMLElement>, value: Record<string, unknown>) => void;
  onUploadAction?: UploadActionHandler;
}) {
  const { t } = useI18n();

  if (message.isRecalled || message.status === "recalled") {
    return <p className="message-recalled-text">{t("messages.body.recalled")}</p>;
  }
  const parts = normalizeMessageParts(message);

  if (parts.length === 0 && message.preview) {
    return <p>{renderWechatEmojiText(message.preview)}</p>;
  }

  return (
    <div className="message-body-stack">
      {parts.map((part, index) => (
        <MessagePartView
          assetBaseUrl={assetBaseUrl}
          authToken={authToken}
          mediaCacheContext={mediaCacheContext}
          key={`${part.type}-${index}`}
          message={message}
          part={part}
          fallback={message.preview}
          onContactClick={onContactClick}
          onUploadAction={onUploadAction}
        />
      ))}
      {parts.length === 0 && <UnsupportedPart message={message} />}
    </div>
  );
}

type MediaCacheContext = MessageMediaCacheContext;

function UnsupportedPart({ message }: { message: MessageItemDto }) {
  const { t } = useI18n();
  const type = normalizeMessageType(message) || message.messageType || "";
  const text = message.preview
    ? renderWechatEmojiText(message.preview)
    : t("messages.body.unsupported", { type });
  return <p>{text}</p>;
}

function MessagePartView({
  assetBaseUrl,
  authToken,
  mediaCacheContext,
  message,
  part,
  fallback,
  onContactClick,
  onUploadAction,
}: {
  assetBaseUrl?: string;
  authToken?: string;
  mediaCacheContext?: MediaCacheContext;
  message: MessageItemDto;
  part: NormalizedMessagePart;
  fallback?: string;
  onContactClick?: (event: MouseEvent<HTMLElement>, value: Record<string, unknown>) => void;
  onUploadAction?: UploadActionHandler;
}) {
  if (part.type === "text") return <p>{renderWechatEmojiText(part.text)}</p>;
  if (part.type === "markdown") return <MarkdownPart text={part.text} />;
  if (part.type === "event") return <div className="message-event-text">{part.text}</div>;
  if (part.type === "image") {
    const mediaItem = normalizeMediaPart({ assetBaseUrl, fallback, part });
    return (
      <ImagePart
        authToken={authToken}
        item={mediaItem}
        mediaCacheContext={mediaCacheContext}
        uploadState={localUploadStateFromMessage(message)}
        onUploadAction={onUploadAction}
      />
    );
  }
  if (part.type === "file") {
    const mediaItem = normalizeMediaPart({ assetBaseUrl, fallback, part });
    return (
      <FileMessageContent
        authToken={authToken}
        item={mediaItem}
        mediaCacheContext={mediaCacheContext}
        statusText={fileMessageInlineStatusText(message)}
        uploadState={localUploadStateFromMessage(message)}
        onUploadAction={onUploadAction}
      />
    );
  }
  if (part.type === "voice") {
    return (
      <VoicePart
        assetBaseUrl={assetBaseUrl}
        authToken={authToken}
        media={part.media}
      />
    );
  }
  if (part.type === "video") {
    const mediaItem = normalizeMediaPart({ assetBaseUrl, fallback, part });
    return (
      <VideoPart
        authToken={authToken}
        item={mediaItem}
        mediaCacheContext={mediaCacheContext}
        uploadState={localUploadStateFromMessage(message)}
        onUploadAction={onUploadAction}
      />
    );
  }
  if (part.type === "location") {
    return <LocationPart value={part.value} />;
  }
  if (part.type === "contact") {
    return <ContactPart onContactClick={onContactClick} value={part.value} />;
  }
  return <CallPart value={part.value} />;
}

function MarkdownPart({ text }: { text: string }) {
  return (
    <div className="message-markdown">
      {text.split(/\n+/).map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div className="message-markdown-list-item" key={`${trimmed}-${index}`}>
              <span aria-hidden="true">•</span>
              <p>{renderInlineMarkdown(trimmed.slice(2))}</p>
            </div>
          );
        }
        return <p key={`${trimmed}-${index}`}>{renderInlineMarkdown(trimmed)}</p>;
      })}
    </div>
  );
}

function renderInlineMarkdown(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((segment, index) => {
    if (segment.startsWith("**") && segment.endsWith("**")) {
      return <strong key={`${segment}-${index}`}>{segment.slice(2, -2)}</strong>;
    }
    return segment;
  });
}
