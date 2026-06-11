import type { CSSProperties, MouseEvent, Ref } from "react";

import { PanelState } from "../../components/PanelState";
import type { CustomerServiceThread } from "../../data/api-client";
import type { MessageItemDto } from "../../data/api-client";
import type { CustomerServiceTypingPreview } from "../../data/customer-service/cs-typing-preview";
import { useI18n } from "../../i18n/useI18n";
import { formatChatMessageTime } from "../../lib/format";
import { chatBackgroundStyleVariables } from "../../settings/models/chatBackgroundModel";
import {
  ServiceMessageContextMenu,
  type ServiceMessageContextAction,
} from "./ServiceMessageContextMenu";
import { ServiceMessageBubble } from "./ServiceMessageBubble";

type ServiceMessageMenuState = {
  canAiDraft?: boolean;
  message: MessageItemDto;
  x: number;
  y: number;
} | null;

type TranslatedWorkspaceInlineState = {
  kind: "empty" | "error" | "loading";
  text: string;
  tone: "error" | "muted";
};

export function CustomerServiceMessageStage({
  accountId,
  assetBaseUrl,
  authToken,
  chatBackgroundPreset,
  isMineMessage,
  jumpToLatest,
  messageAnnotations,
  messageMenu,
  mineAvatarUrl,
  messages,
  messageStageState,
  pendingNewMessageCount,
  peerAvatarUrl,
  selectedThread,
  stageRef,
  title,
  typingPreview,
  onContextMenu,
  onAvatarClick,
  onMenuAction,
  onScroll,
  onUploadAction,
}: {
  accountId?: string;
  assetBaseUrl?: string;
  authToken?: string;
  chatBackgroundPreset?: unknown;
  isMineMessage: (message: MessageItemDto) => boolean;
  jumpToLatest: () => void;
  messageAnnotations: Record<string, string>;
  messageMenu: ServiceMessageMenuState;
  mineAvatarUrl?: string | null;
  messages: MessageItemDto[];
  messageStageState?: TranslatedWorkspaceInlineState;
  pendingNewMessageCount: number;
  peerAvatarUrl?: string | null;
  selectedThread: CustomerServiceThread;
  stageRef: Ref<HTMLElement>;
  title: string;
  typingPreview?: CustomerServiceTypingPreview | null;
  onContextMenu: (event: MouseEvent<HTMLElement>, message: MessageItemDto) => void;
  onAvatarClick?: (event: MouseEvent<HTMLButtonElement>, message: MessageItemDto, mine: boolean) => void;
  onMenuAction: (action: ServiceMessageContextAction, message: MessageItemDto) => void;
  onScroll: () => void;
  onUploadAction: (localTaskId: string, action: "pause" | "resume" | "cancel" | "retry") => void;
}) {
  const { t } = useI18n();
  const showTypingPreview =
    messageStageState?.kind !== "loading" &&
    messageStageState?.kind !== "error" &&
    Boolean(typingPreview);
  return (
    <>
      <div
        className={`cs-message-stage-shell ${showTypingPreview ? "has-typing-preview" : ""}`}
        style={chatBackgroundStyleVariables(chatBackgroundPreset) as CSSProperties}
      >
        <section
          className="h-message-stage"
          aria-label={t("customerService.messageStage.aria")}
          onScroll={onScroll}
          ref={stageRef}
        >
          {pendingNewMessageCount > 0 && (
            <button
              className="pc-chat-latest-jump"
              type="button"
              onClick={jumpToLatest}
            >
              {t("customerService.messageStage.newMessages", { count: pendingNewMessageCount })}
            </button>
          )}
          {messageStageState && (
            <PanelState text={messageStageState.text} tone={messageStageState.tone} />
          )}
          {messageStageState?.kind !== "loading" &&
            messageStageState?.kind !== "error" &&
            messages.map((message) => {
              const system = isSystemServiceMessage(message);
              const mine = !system && isMineMessage(message);
              return (
                <div
                  key={message.messageId}
                  className={`cs-message-row ${system ? "system" : mine ? "mine" : "other"}`}
                  data-message-id={message.messageId}
                  data-message-render-key={
                    message.messageId ||
                    `${message.conversationSeq ?? ""}-${message.sentAt ?? ""}-${message.preview ?? ""}`
                  }
                >
                  {system ? (
                    <div className="cs-system-message" role="status">
                      <span>{serviceSystemMessageText(message)}</span>
                      {message.sentAt && <time>{formatChatMessageTime(message.sentAt)}</time>}
                    </div>
                  ) : (
                    <ServiceMessageBubble
                      message={message}
                      mine={mine}
                      translationText={message.messageId ? messageAnnotations[message.messageId] : undefined}
                      assetBaseUrl={assetBaseUrl}
                      authToken={authToken}
                      mediaCacheContext={{
                        accountId,
                        conversationId: selectedThread.threadId || selectedThread.conversationId,
                      }}
                      mineAvatarUrl={mineAvatarUrl}
                      conversationFallbackName={title || t("customerService.messageStage.customerFallback")}
                      senderFallback={title}
                      onContextMenu={onContextMenu}
                      onAvatarClick={onAvatarClick}
                      onUploadAction={onUploadAction}
                      senderAvatarUrl={!mine ? message.senderAvatarUrl || message.avatarUrl || peerAvatarUrl : undefined}
                      threadType={selectedThread.threadType}
                    />
                  )}
                </div>
              );
            })}
        </section>
        {showTypingPreview && typingPreview && (
          <div className="cs-typing-preview-dock" aria-live="polite">
            <div className="cs-typing-preview">
              <span>{t("customerService.messageStage.typingPreviewLabel")}</span>
              <p>
                {typingPreview.previewText ||
                  t("customerService.messageStage.typingPreviewEmpty")}
              </p>
            </div>
          </div>
        )}
      </div>

      {messageMenu && (
        <ServiceMessageContextMenu
          canAiDraft={messageMenu.canAiDraft}
          mine={isMineMessage(messageMenu.message)}
          message={messageMenu.message}
          onAction={(action) => onMenuAction(action, messageMenu.message)}
          position={{ x: messageMenu.x, y: messageMenu.y }}
        />
      )}
    </>
  );
}

function isSystemServiceMessage(message: MessageItemDto) {
  const type = String(message.messageType ?? "").trim().toLowerCase();
  const direction = String(message.direction ?? "").trim().toLowerCase();
  return (
    direction === "system" ||
    type === "event" ||
    type === "system" ||
    type === "notice"
  );
}

function serviceSystemMessageText(message: MessageItemDto) {
  const body = message.body ?? {};
  return (
    message.preview ||
    stringField(body, "text", "eventText", "notice", "message", "content") ||
    "[消息]"
  );
}

function stringField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}
