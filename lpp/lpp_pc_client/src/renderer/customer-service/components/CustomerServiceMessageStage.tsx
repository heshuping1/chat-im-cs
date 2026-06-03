import type { MouseEvent, Ref } from "react";

import { PanelState } from "../../components/PanelState";
import type { CustomerServiceThread } from "../../data/api-client";
import type { MessageItemDto } from "../../data/api-client";
import type { CustomerServiceWorkspaceInlineState } from "../../data/customer-service/cs-workspace-view-model";
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

export function CustomerServiceMessageStage({
  accountId,
  assetBaseUrl,
  authToken,
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
  isMineMessage: (message: MessageItemDto) => boolean;
  jumpToLatest: () => void;
  messageAnnotations: Record<string, string>;
  messageMenu: ServiceMessageMenuState;
  messages: MessageItemDto[];
  messageStageState?: CustomerServiceWorkspaceInlineState;
  pendingNewMessageCount: number;
  selectedThread: CustomerServiceThread;
  stageRef: Ref<HTMLElement>;
  title: string;
  onContextMenu: (event: MouseEvent<HTMLElement>, message: MessageItemDto) => void;
  onMenuAction: (action: ServiceMessageContextAction, message: MessageItemDto) => void;
  onScroll: () => void;
  onUploadAction: (localTaskId: string, action: "pause" | "resume" | "cancel" | "retry") => void;
}) {
  return (
    <>
      <section
        className="h-message-stage"
        aria-label="在线客服聊天"
        onScroll={onScroll}
        ref={stageRef}
      >
        {pendingNewMessageCount > 0 && (
          <button
            className="pc-chat-latest-jump"
            type="button"
            onClick={jumpToLatest}
          >
            ↓ {pendingNewMessageCount} 条新消息
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
              conversationFallbackName={title || "客"}
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
