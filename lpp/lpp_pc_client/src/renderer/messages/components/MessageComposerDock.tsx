import type { Dispatch, PointerEvent as ReactPointerEvent, SetStateAction } from "react";

import type { ConversationListItem, GroupMemberDto, MessageItemDto } from "../../data/api-client";
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
  screenshotShortcut,
  selectedMessageIds,
  getChatPanelHeight,
  onAiDraft,
  onDraftChange,
  onDraftEditorStateChange,
  onDraftPreviewChange,
  onKnowledgeBase,
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
  screenshotShortcut: PcSettings["screenshotShortcut"];
  selectedMessageIds: Set<string>;
  getChatPanelHeight: () => number | null;
  onAiDraft: () => void;
  onDraftChange: (conversationId: string, value: string) => void;
  onDraftEditorStateChange: (conversationId: string, value: string) => void;
  onDraftPreviewChange: (conversationId: string, value: string) => void;
  onKnowledgeBase: () => void;
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
        attachmentScopeKey={conversationId}
        draftValue={activeConversationDraft}
        draftEditorState={draftEditorState}
        mentionOptions={
          activeConversationType === "group" ? buildMentionOptions(groupMembers) : []
        }
        screenshotShortcut={screenshotShortcut}
        onAiDraft={onAiDraft}
        onDraftChange={(value) => onDraftChange(conversationId, value)}
        onDraftPreviewChange={(value) => onDraftPreviewChange(conversationId, value)}
        onDraftEditorStateChange={(value) =>
          onDraftEditorStateChange(conversationId, value)
        }
        onKnowledgeBase={onKnowledgeBase}
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
