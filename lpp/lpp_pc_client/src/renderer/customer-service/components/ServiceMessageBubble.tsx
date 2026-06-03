import type { MouseEvent } from "react";

import { ChatMessageBubble } from "../../components/ChatMessageBubble";
import type { MessageItemDto } from "../../data/api-client";
import { createChatMessageViewModel } from "../../data/message/message-view-model";
import { formatChatMessageTime } from "../../lib/format";

export function ServiceMessageBubble({
  assetBaseUrl,
  authToken,
  conversationFallbackName,
  mediaCacheContext,
  message,
  mine,
  onContextMenu,
  onUploadAction,
  senderFallback,
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
  onContextMenu?: (event: MouseEvent<HTMLElement>, message: MessageItemDto) => void;
  onUploadAction?: (localTaskId: string, action: "pause" | "resume" | "cancel" | "retry") => void;
  senderFallback: string;
  translationText?: string;
  threadType?: string;
}) {
  const messageViewModel = createChatMessageViewModel({
    conversationFallbackName,
    conversationType: threadType,
    message,
    mine,
    senderFallback: senderFallback || "访客",
    timeText: formatChatMessageTime(message.sentAt),
    translationText,
  });

  return (
    <ChatMessageBubble
      assetBaseUrl={assetBaseUrl}
      conversationFallbackName={conversationFallbackName}
      message={message}
      mine={mine}
      authToken={authToken}
      mediaCacheContext={mediaCacheContext}
      onContextMenu={onContextMenu}
      onUploadAction={onUploadAction}
      senderFallback={senderFallback || "访客"}
      timeText={formatChatMessageTime(message.sentAt)}
      translationText={translationText}
      viewModel={messageViewModel}
    />
  );
}
