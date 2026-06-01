import type {
  Dispatch,
  PointerEvent as ReactPointerEvent,
  Ref,
  SetStateAction,
} from "react";

import type { ConversationListItem, GroupMemberDto, MessageItemDto } from "../../data/api-client";
import type { MessageComposerHandle } from "../../components/MessageComposer";
import type { PcSettings } from "../../data/settings/pc-settings";
import { startVerticalPaneResize } from "../../lib/paneResize";
import type { MessageCenterCommandModel } from "../hooks/useMessageCenterCommandModel";
import { clampComposerHeight } from "../models/messageComposerLayoutModel";
import { buildMentionOptions, type ReplyTarget } from "../models/messageComposerModel";
import {
  MultiSelectActionBar,
  ReplyPreviewBar,
} from "./MessageComposerChrome";
import { MessageComposerSurface } from "./MessageComposerSurface";

export function MessageComposerDock({
  activeConversation,
  activeConversationDraft,
  activeConversationType,
  composerHeight,
  draftEditorState,
  groupMembers,
  isMessageStageNearBottom,
  messageCenterCommands,
  messages,
  multiSelectMode,
  replyTarget,
  composerRef,
  screenshotShortcut,
  dragUpload,
  enterToSend,
  shortcutHints,
  selectedMessageIds,
  showAiTools,
  showKnowledgeTools,
  getChatPanelHeight,
  onAiDraft,
  onDraftChange,
  onDraftEditorStateChange,
  onDraftPreviewChange,
  onKnowledgeBase,
  onQuickReply,
  onTranslateDraft,
  scrollMessagesToBottom,
  setComposerHeight,
  setForwardTargetMessages,
  setMultiSelectMode,
  setReplyTarget,
  setSelectedMessageIds,
}: {
  activeConversation: ConversationListItem;
  activeConversationDraft?: string;
  activeConversationType?: "direct" | "group";
  composerHeight: number;
  draftEditorState?: string;
  groupMembers: GroupMemberDto[];
  isMessageStageNearBottom: (distance?: number) => boolean;
  messageCenterCommands: MessageCenterCommandModel;
  messages: MessageItemDto[];
  multiSelectMode: boolean;
  replyTarget: ReplyTarget;
  composerRef?: Ref<MessageComposerHandle>;
  screenshotShortcut: PcSettings["screenshotShortcut"];
  dragUpload: PcSettings["dragUpload"];
  enterToSend: PcSettings["enterToSend"];
  shortcutHints: PcSettings["shortcutHints"];
  selectedMessageIds: Set<string>;
  showAiTools: boolean;
  showKnowledgeTools: boolean;
  getChatPanelHeight: () => number | null;
  onAiDraft: () => void;
  onDraftChange: (conversationId: string, value: string) => void;
  onDraftEditorStateChange: (conversationId: string, value: string) => void;
  onDraftPreviewChange: (conversationId: string, value: string) => void;
  onKnowledgeBase: () => void;
  onQuickReply: () => void;
  onTranslateDraft: (content: string) => Promise<string | undefined>;
  scrollMessagesToBottom: (behavior?: ScrollBehavior) => void;
  setComposerHeight: Dispatch<SetStateAction<number>>;
  setForwardTargetMessages: Dispatch<SetStateAction<MessageItemDto[]>>;
  setMultiSelectMode: Dispatch<SetStateAction<boolean>>;
  setReplyTarget: Dispatch<SetStateAction<ReplyTarget>>;
  setSelectedMessageIds: Dispatch<SetStateAction<Set<string>>>;
}) {
  const conversationId = activeConversation.conversationId;
  return (
    <>
      {replyTarget && (
        <ReplyPreviewBar reply={replyTarget} onCancel={() => setReplyTarget(null)} />
      )}

      {multiSelectMode && (
        <MultiSelectActionBar
          selectedCount={selectedMessageIds.size}
          onCancel={() => {
            setMultiSelectMode(false);
            setSelectedMessageIds(new Set());
          }}
          onDelete={() => void messageCenterCommands.deleteSelectedMessages()}
          onForward={() => {
            setForwardTargetMessages(
              messages.filter((item) => selectedMessageIds.has(item.messageId)),
            );
          }}
        />
      )}

      <MessageComposerSurface
        ref={composerRef}
        attachmentScopeKey={conversationId}
        draftValue={activeConversationDraft}
        dragUpload={dragUpload}
        enterToSend={enterToSend}
        draftEditorState={draftEditorState}
        mentionOptions={
          activeConversationType === "group" ? buildMentionOptions(groupMembers) : []
        }
        screenshotShortcut={screenshotShortcut}
        shortcutHints={shortcutHints}
        onAiDraft={onAiDraft}
        onDraftChange={(value) => onDraftChange(conversationId, value)}
        onDraftPreviewChange={(value) => onDraftPreviewChange(conversationId, value)}
        onDraftEditorStateChange={(value) =>
          onDraftEditorStateChange(conversationId, value)
        }
        onKnowledgeBase={onKnowledgeBase}
        onQuickReply={onQuickReply}
        onOpenContactCardPicker={messageCenterCommands.openContactCardPicker}
        onResizeStart={(event) =>
          resizeComposerFromPointer({
            composerHeight,
            event,
            getChatPanelHeight,
            isMessageStageNearBottom,
            scrollMessagesToBottom,
            setComposerHeight,
          })
        }
        onSendText={messageCenterCommands.sendText}
        showAiTools={showAiTools}
        showKnowledgeTools={showKnowledgeTools}
        onTranslateDraft={onTranslateDraft}
        onSendMedia={messageCenterCommands.sendMedia}
      />
    </>
  );
}

function resizeComposerFromPointer({
  composerHeight,
  event,
  getChatPanelHeight,
  isMessageStageNearBottom,
  scrollMessagesToBottom,
  setComposerHeight,
}: {
  composerHeight: number;
  event: ReactPointerEvent<HTMLElement>;
  getChatPanelHeight: () => number | null;
  isMessageStageNearBottom: (distance?: number) => boolean;
  scrollMessagesToBottom: (behavior?: ScrollBehavior) => void;
  setComposerHeight: Dispatch<SetStateAction<number>>;
}) {
  const keepBottomAligned = isMessageStageNearBottom(96);
  startVerticalPaneResize(event, {
    initialHeight: composerHeight,
    onResize: (height) => {
      setComposerHeight(clampComposerHeight(height, getChatPanelHeight()));
      if (keepBottomAligned) scrollMessagesToBottom("auto");
    },
  });
}
