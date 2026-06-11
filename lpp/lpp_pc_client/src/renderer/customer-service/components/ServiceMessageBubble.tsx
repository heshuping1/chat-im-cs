import type { MouseEvent } from "react";

import { ChatMessageBubble } from "../../components/ChatMessageBubble";
import type { MessageItemDto } from "../../data/api-client";
import { createChatMessageViewModel } from "../../data/message/message-view-model";
import { useI18n } from "../../i18n/useI18n";
import { formatChatMessageTime } from "../../lib/format";

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
  senderFallback,
  senderAvatarUrl,
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
  senderFallback: string;
  senderAvatarUrl?: string | null;
  translationText?: string;
  threadType?: string;
}) {
  const { t } = useI18n();
  const fallbackSender = senderFallback || t("customerService.visitor");
  const messageViewModel = createChatMessageViewModel({
    conversationFallbackName,
    conversationType: threadType,
    message,
    mine,
    mineAvatarUrl,
    senderAvatarUrl,
    senderFallback: fallbackSender,
    timeText: formatChatMessageTime(message.sentAt),
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
      senderFallback={fallbackSender}
      timeText={formatChatMessageTime(message.sentAt)}
      translationText={translationText}
      viewModel={messageViewModel}
    />
  );
}
