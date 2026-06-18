import type { MouseEvent } from "react";

import { ChatMessageBubble } from "../../components/ChatMessageBubble";
import type { MessageItemDto } from "../../data/api-client";
import { createChatMessageViewModel } from "../../data/message/message-view-model";
import { formatFullDateTime } from "../../lib/format";

export function ServiceMessageBubble({
  assetBaseUrl,
  authToken,
  conversationFallbackName,
  mediaCacheContext,
  message,
  mine,
  mineAvatarUrl,
  onContextMenu,
  onAvatarClick,
  onUploadAction,
  senderAvatarUrl,
  senderFallbackName,
  translationText,
  threadType,
}: {
  assetBaseUrl?: string;
  authToken?: string;
  conversationFallbackName: string;
  mediaCacheContext?: {
    accountId?: string;
    conversationId?: string;
  };
  message: MessageItemDto;
  mine: boolean;
  mineAvatarUrl?: string | null;
  onContextMenu?: (event: MouseEvent<HTMLElement>, message: MessageItemDto) => void;
  onAvatarClick?: (event: MouseEvent<HTMLButtonElement>, message: MessageItemDto, mine: boolean) => void;
  onUploadAction?: (localTaskId: string, action: "pause" | "resume" | "cancel" | "retry") => void;
  senderAvatarUrl?: string | null;
  senderFallbackName?: string | null;
  translationText?: string;
  threadType?: string;
}) {
  const timeText = formatFullDateTime(message.sentAt);
  const messageViewModel = createChatMessageViewModel({
    conversationFallbackName,
    conversationType: threadType,
    message,
    mine,
    mineAvatarUrl,
    mineSenderName: mine ? senderFallbackName : undefined,
    senderAvatarUrl,
    senderFallback: "",
    suppressMissingSenderNameFallback: true,
    timeText,
    translationText,
  });

  return (
    <ChatMessageBubble
      assetBaseUrl={assetBaseUrl}
      conversationFallbackName={conversationFallbackName}
      message={message}
      mine={mine}
      mineAvatarUrl={mineAvatarUrl}
      senderAvatarUrl={senderAvatarUrl}
      authToken={authToken}
      mediaCacheContext={mediaCacheContext}
      onContextMenu={onContextMenu}
      onAvatarClick={onAvatarClick}
      onUploadAction={onUploadAction}
      senderFallback=""
      showSenderName={Boolean(message.senderDisplayName)}
      timeText={timeText}
      translationText={translationText}
      viewModel={messageViewModel}
    />
  );
}
