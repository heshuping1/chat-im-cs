import type { MouseEvent } from "react";

import { ChatMessageBubble } from "../../components/ChatMessageBubble";
import type { MessageItemDto } from "../../data/api-client";
import { createChatMessageViewModel } from "../../data/message/message-view-model";
import { useI18n } from "../../i18n/useI18n";
import { formatChatMessageTime } from "../../lib/format";

type ReadStatusTranslator = (
  key: "customerService.messageStage.read" | "customerService.messageStage.unread",
) => string;

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
  const customerReadAtText =
    mine && message.readAt
      ? t("customerService.messageStage.customerReadAt", {
          time: formatChatMessageTime(message.readAt),
        })
      : undefined;
  const customerMessageReadText = !mine ? messageReadStatusText(message, t) : undefined;
  const messageViewModel = createChatMessageViewModel({
    conversationFallbackName,
    conversationType: threadType,
    message,
    mine,
    mineAvatarUrl,
    readReceiptText: customerReadAtText,
    senderAvatarUrl,
    senderFallback: fallbackSender,
    statusText: customerMessageReadText,
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
      statusText={customerMessageReadText}
      timeText={formatChatMessageTime(message.sentAt)}
      translationText={translationText}
      viewModel={messageViewModel}
    />
  );
}

function messageReadStatusText(message: MessageItemDto, t: ReadStatusTranslator) {
  if (message.readAt) {
    return `${t("customerService.messageStage.read")} ${formatChatMessageTime(message.readAt)}`;
  }
  const record = message as MessageItemDto & Record<string, unknown>;
  const status = String(message.status ?? "").trim().toLowerCase();
  const readCount = Number(record.readCount ?? record.read_count);
  if (
    message.isRead ||
    status === "read" ||
    status === "seen" ||
    record.deliveryStatus === "read" ||
    (Number.isFinite(readCount) && readCount > 0)
  ) {
    return t("customerService.messageStage.read");
  }
  if (
    message.isRead === false ||
    status === "unread" ||
    (Number.isFinite(readCount) && readCount === 0)
  ) {
    return t("customerService.messageStage.unread");
  }
  return undefined;
}
