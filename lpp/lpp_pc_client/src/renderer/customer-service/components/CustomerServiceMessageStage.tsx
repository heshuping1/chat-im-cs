import type { CSSProperties, MouseEvent, Ref } from "react";
import { useEffect, useRef } from "react";

import { PanelState } from "../../components/PanelState";
import type { CustomerServiceThread } from "../../data/api-client";
import type { MessageItemDto } from "../../data/api-client";
import {
  auditCustomerServiceMessage,
  customerServiceMessagePreviewKind,
} from "../../data/customer-service/cs-message-audit-diagnostics";
import { useI18n } from "../../i18n/useI18n";
import { formatFullDateTime } from "../../lib/format";
import { chatMessageRenderKey } from "../../messages/models/messageRenderKey";
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
  onContextMenu: (event: MouseEvent<HTMLElement>, message: MessageItemDto) => void;
  onAvatarClick?: (event: MouseEvent<HTMLButtonElement>, message: MessageItemDto, mine: boolean) => void;
  onMenuAction: (action: ServiceMessageContextAction, message: MessageItemDto) => void;
  onScroll: () => void;
  onUploadAction: (localTaskId: string, action: "pause" | "resume" | "cancel" | "retry") => void;
}) {
  const { t } = useI18n();
  const renderedAuditKeysRef = useRef(new Set<string>());
  useEffect(() => {
    const duplicateMessageIds = countMessageValues(messages, (message) => message.messageId);
    const duplicateClientIds = countMessageValues(messages, customerServiceClientMessageId);
    for (const message of messages) {
      const renderKey = chatMessageRenderKey(message);
      const clientMsgId = customerServiceClientMessageId(message);
      const duplicateMessageIdCount = message.messageId
        ? duplicateMessageIds.get(message.messageId) ?? 0
        : 0;
      const duplicateClientMsgIdCount = clientMsgId
        ? duplicateClientIds.get(clientMsgId) ?? 0
        : 0;
      const suspicious =
        customerServiceMessagePreviewKind(message.preview) === "generic_message" ||
        duplicateMessageIdCount > 1 ||
        duplicateClientMsgIdCount > 1;
      const auditKey = `${selectedThread.threadId}:${renderKey}:${duplicateMessageIdCount}:${duplicateClientMsgIdCount}`;
      if (!suspicious || renderedAuditKeysRef.current.has(auditKey)) continue;
      renderedAuditKeysRef.current.add(auditKey);
      auditCustomerServiceMessage({
        source: "ui",
        stage: "ui.render.observed",
        traceId: clientMsgId || message.messageId || renderKey,
        clientMsgId,
        messageId: message.messageId,
        threadId: selectedThread.threadId,
        threadType: selectedThread.threadType,
        conversationId: message.conversationId || selectedThread.conversationId,
        conversationSeq: message.conversationSeq,
        message,
        duplicateClientMsgIdCount,
        duplicateMessageIdCount,
        context: {
          renderKey,
          visibleMessageCount: messages.length,
        },
      });
    }
  }, [messages, selectedThread.conversationId, selectedThread.threadId, selectedThread.threadType]);
  return (
    <>
      <div
        className="cs-message-stage-shell"
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
              const renderKey = chatMessageRenderKey(message);
              return (
                <div
                  key={renderKey}
                  className={`cs-message-row ${system ? "system" : mine ? "mine" : "other"}`}
                  data-message-id={message.messageId}
                  data-message-render-key={renderKey}
                >
                  {system ? (
                    <div className="cs-system-message" role="status">
                      <span>{serviceSystemMessageText(message)}</span>
                      {message.sentAt && <time>{formatFullDateTime(message.sentAt)}</time>}
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

function countMessageValues(
  messages: MessageItemDto[],
  readValue: (message: MessageItemDto) => string | undefined,
) {
  const counts = new Map<string, number>();
  for (const message of messages) {
    const value = readValue(message);
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function customerServiceClientMessageId(message: MessageItemDto) {
  return readNonEmptyString(message.clientMsgId) || readNonEmptyString(message.clientMessageId);
}

function readNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
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
