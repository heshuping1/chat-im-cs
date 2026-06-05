import type { CSSProperties, MouseEvent, Ref } from "react";

import { PanelState } from "../../components/PanelState";
import type { CustomerServiceThread } from "../../data/api-client";
import type { MessageItemDto } from "../../data/api-client";
import { useI18n } from "../../i18n/useI18n";
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
  messages,
  messageStageState,
  pendingNewMessageCount,
  selectedThread,
  stageRef,
  title,
  onContextMenu,
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
  messages: MessageItemDto[];
  messageStageState?: TranslatedWorkspaceInlineState;
  pendingNewMessageCount: number;
  selectedThread: CustomerServiceThread;
  stageRef: Ref<HTMLElement>;
  title: string;
  onContextMenu: (event: MouseEvent<HTMLElement>, message: MessageItemDto) => void;
  onMenuAction: (action: ServiceMessageContextAction, message: MessageItemDto) => void;
  onScroll: () => void;
  onUploadAction: (localTaskId: string, action: "pause" | "resume" | "cancel" | "retry") => void;
}) {
  const { t } = useI18n();
  return (
    <>
      <section
        className="h-message-stage"
        aria-label={t("customerService.messageStage.aria")}
        onScroll={onScroll}
        ref={stageRef}
        style={chatBackgroundStyleVariables(chatBackgroundPreset) as CSSProperties}
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
          messages.map((message) => (
            <ServiceMessageBubble
              key={message.messageId}
              message={message}
              mine={isMineMessage(message)}
              translationText={message.messageId ? messageAnnotations[message.messageId] : undefined}
              assetBaseUrl={assetBaseUrl}
              authToken={authToken}
              mediaCacheContext={{
                accountId,
                conversationId: selectedThread.threadId || selectedThread.conversationId,
              }}
              conversationFallbackName={title || t("customerService.messageStage.customerFallback")}
              senderFallback={title}
              onContextMenu={onContextMenu}
              onUploadAction={onUploadAction}
              threadType={selectedThread.threadType}
            />
          ))}
      </section>

      {messageMenu && (
        <ServiceMessageContextMenu
          canAiDraft={messageMenu.canAiDraft}
          message={messageMenu.message}
          onAction={(action) => onMenuAction(action, messageMenu.message)}
          position={{ x: messageMenu.x, y: messageMenu.y }}
        />
      )}
    </>
  );
}
