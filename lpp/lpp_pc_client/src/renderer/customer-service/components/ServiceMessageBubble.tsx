import type { MouseEvent } from "react";

import { ChatMessageBubble } from "../../components/ChatMessageBubble";
import type { MessageItemDto } from "../../data/api-client";
import { customerServiceMessageReadReceiptState } from "../../data/customer-service/cs-message-read-status";
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
  const customerReadReceiptText = customerServiceReadReceiptText(
    customerServiceMessageReadReceiptState(message, mine, threadType),
    message.readAt,
  );
  const messageViewModel = createChatMessageViewModel({
    conversationFallbackName,
    conversationType: threadType,
    message,
    mine,
    mineAvatarUrl,
    senderAvatarUrl,
    senderFallback: fallbackSender,
    statusText: customerReadReceiptText,
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
      statusText={customerReadReceiptText}
      timeText={formatChatMessageTime(message.sentAt)}
      translationText={translationText}
      viewModel={messageViewModel}
    />
  );
}

function customerServiceReadReceiptText(
  state: ReturnType<typeof customerServiceMessageReadReceiptState>,
  readAt?: string | null,
) {
  if (!state) return undefined;
  if (state === "unread") return "客户未读";
  if (state === "unknown") return "客户已读时间未知";
  const timeText = formatChatMessageTime(readAt);
  return timeText ? `客户已读 ${timeText}` : "客户已读时间未知";
}
