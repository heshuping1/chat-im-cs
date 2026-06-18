import type { CSSProperties, MouseEvent, Ref } from "react";
import { useEffect, useRef } from "react";

import type { CustomerServiceThread } from "../../data/api-client";
import type { MessageItemDto } from "../../data/api-client";
import type { CustomerServiceTransferRecordViewModel } from "../../data/customer-service/cs-transfer-records";
import {
  auditCustomerServiceMessage,
  customerServiceMessagePreviewKind,
} from "../../data/customer-service/cs-message-audit-diagnostics";
import {
  isCustomerServiceStaffSideMessage,
  isCustomerServiceSystemMessage,
  resolveCustomerServiceMessageAvatarFallbackName,
  resolveCustomerServiceMessageAvatarUrl,
} from "../../data/customer-service/message-domain";
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
  resolveSenderAvatarUrl,
  selectedThread,
  stageRef,
  title,
  transferRemarks = [],
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
  resolveSenderAvatarUrl?: (message: MessageItemDto) => string | null | undefined;
  selectedThread: CustomerServiceThread;
  stageRef: Ref<HTMLElement>;
  title: string;
  transferRemarks?: CustomerServiceTransferRecordViewModel[];
  onContextMenu: (event: MouseEvent<HTMLElement>, message: MessageItemDto) => void;
  onAvatarClick?: (event: MouseEvent<HTMLButtonElement>, message: MessageItemDto, mine: boolean) => void;
  onMenuAction: (action: ServiceMessageContextAction, message: MessageItemDto) => void;
  onScroll: () => void;
  onUploadAction: (localTaskId: string, action: "pause" | "resume" | "cancel" | "retry") => void;
}) {
  const { t } = useI18n();
  const renderedAuditKeysRef = useRef(new Set<string>());
  const timelineItems = createCustomerServiceMessageTimelineItems({
    messages,
    transferRemarks,
  });
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
          {messageStageState && <MessageStageInlineState state={messageStageState} />}
          {messageStageState?.kind !== "loading" &&
            messageStageState?.kind !== "error" &&
            timelineItems.map((item) => {
              if (item.kind === "transfer_remark") {
                return (
                  <div
                    key={`transfer-remark:${item.record.recordId}`}
                    className="cs-message-row system internal-transfer-remark"
                    data-transfer-record-id={item.record.recordId}
                  >
                    <div className="cs-transfer-remark-event" role="note">
                      <span>
                        {t("customerService.transferRemarks.inlineLabel", {
                          reason: item.record.reason,
                        })}
                      </span>
                      {item.record.transferredAtText && (
                        <time>{item.record.transferredAtText}</time>
                      )}
                    </div>
                  </div>
                );
              }
              const message = item.message;
              const system = isSystemServiceMessage(message);
              const mine = !system && isCustomerServiceMineMessage(message, isMineMessage);
              const senderAvatarUrl = resolveMessageAvatarUrl({
                currentStaffAvatarUrl: mineAvatarUrl,
                customerAvatarUrl: peerAvatarUrl,
                message,
                senderProfileAvatarUrl: resolveSenderAvatarUrl?.(message),
              });
              const senderFallbackName = resolveMessageAvatarFallbackName(message);
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
                      conversationFallbackName={title || t("customerService.messageStage.customerFallback")}
                      onContextMenu={onContextMenu}
                      onAvatarClick={onAvatarClick}
                      onUploadAction={onUploadAction}
                      senderFallbackName={senderFallbackName}
                      senderAvatarUrl={!mine ? senderAvatarUrl : undefined}
                      mineAvatarUrl={mine ? senderAvatarUrl : undefined}
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
          mine={isCustomerServiceMineMessage(messageMenu.message, isMineMessage)}
          message={messageMenu.message}
          onAction={(action) => onMenuAction(action, messageMenu.message)}
          position={{ x: messageMenu.x, y: messageMenu.y }}
        />
      )}
    </>
  );
}

function resolveMessageAvatarUrl({
  currentStaffAvatarUrl,
  customerAvatarUrl,
  message,
  senderProfileAvatarUrl,
}: {
  currentStaffAvatarUrl?: string | null;
  customerAvatarUrl?: string | null;
  message: MessageItemDto;
  senderProfileAvatarUrl?: string | null;
}) {
  return resolveCustomerServiceMessageAvatarUrl({
    avatarUrl: message.avatarUrl,
    currentStaffAvatarUrl,
    customerAvatarUrl,
    direction: message.direction,
    fromRole: message.fromRole,
    isMine: message.isMine,
    isSelf: message.isSelf,
    messageType: message.messageType,
    senderAvatarUrl: message.senderAvatarUrl,
    senderDisplayName: message.senderDisplayName,
    senderProfileAvatarUrl,
    senderRole: message.senderRole,
    senderType: message.senderType,
    staffAvatarUrl: message.staffAvatarUrl,
  });
}

type CustomerServiceMessageTimelineItem =
  | { kind: "message"; message: MessageItemDto; order: number; time: number }
  | {
      kind: "transfer_remark";
      order: number;
      record: CustomerServiceTransferRecordViewModel & { reason: string };
      time: number;
    };

function createCustomerServiceMessageTimelineItems({
  messages,
  transferRemarks,
}: {
  messages: MessageItemDto[];
  transferRemarks: CustomerServiceTransferRecordViewModel[];
}): CustomerServiceMessageTimelineItem[] {
  return [
    ...messages.map((message, index) => ({
      kind: "message" as const,
      message,
      order: index * 2,
      time: timelineTime(message.sentAt),
    })),
    ...transferRemarks.flatMap((record, index) => {
      if (!record.reason) return [];
      return [{
        kind: "transfer_remark" as const,
        order: index * 2 + 1,
        record: record as CustomerServiceTransferRecordViewModel & { reason: string },
        time: timelineTime(record.transferredAt),
      }];
    }),
  ].sort((left, right) => left.time - right.time || left.order - right.order);
}

function timelineTime(value?: string | null) {
  const parsed = Date.parse(value ?? "");
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function resolveMessageAvatarFallbackName(message: MessageItemDto) {
  return resolveCustomerServiceMessageAvatarFallbackName({
    direction: message.direction,
    fromRole: message.fromRole,
    isMine: message.isMine,
    isSelf: message.isSelf,
    messageType: message.messageType,
    senderDisplayName: message.senderDisplayName,
    senderRole: message.senderRole,
    senderType: message.senderType,
  });
}

function isSystemServiceMessage(message: MessageItemDto) {
  return isCustomerServiceSystemMessage({
    direction: message.direction,
    fromRole: message.fromRole,
    messageType: message.messageType,
    senderDisplayName: message.senderDisplayName,
    senderRole: message.senderRole,
    senderType: message.senderType,
  });
}

function MessageStageInlineState({
  state,
}: {
  state: TranslatedWorkspaceInlineState;
}) {
  return (
    <div
      className={`cs-message-stage-inline-state ${state.tone}`}
      role={state.kind === "error" ? "alert" : "status"}
    >
      {state.text}
    </div>
  );
}

function isCustomerServiceMineMessage(
  message: MessageItemDto,
  fallback: (message: MessageItemDto) => boolean,
) {
  return (
    isCustomerServiceStaffSideMessage({
      direction: message.direction,
      fromRole: message.fromRole,
      isMine: message.isMine,
      isSelf: message.isSelf,
      messageType: message.messageType,
      senderDisplayName: message.senderDisplayName,
      senderRole: message.senderRole,
      senderType: message.senderType,
    }) || fallback(message)
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
