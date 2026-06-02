import { forwardRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  ChatComposerSurface,
  type MessageComposerHandle,
} from "../../components/ChatComposerSurface";
import type { ScreenshotShortcut } from "../../components/MessageComposer";
import type { ComposerMediaKind } from "../../composer/domain/detectComposerMediaKind";

export const MessageComposerSurface = forwardRef<
  MessageComposerHandle,
  {
    attachmentScopeKey: string;
    draftEditorState?: string;
    draftValue?: string;
    dragUpload: boolean;
    enterToSend: boolean;
    mentionOptions: Array<{ id: string; label: string }>;
    screenshotShortcut: ScreenshotShortcut;
    shortcutHints: boolean;
    onAiDraft: () => void;
    onDraftChange: (value: string) => void;
    onDraftEditorStateChange: (value: string) => void;
    onDraftPreviewChange: (value: string) => void;
    onKnowledgeBase: () => void;
    onOpenContactCardPicker: () => void;
    onQuickReply: () => void;
    onResizeStart: (event: ReactPointerEvent<HTMLElement>) => void;
    onSendMedia: (file: File, kind: ComposerMediaKind) => void | Promise<void>;
    onSendText: (content: string) => void | Promise<void>;
    onTranslateDraft: (content: string) => Promise<string | undefined>;
    showAiTools: boolean;
    showKnowledgeTools: boolean;
  }
>(function MessageComposerSurface({
  attachmentScopeKey,
  draftEditorState,
  draftValue,
  dragUpload,
  enterToSend,
  mentionOptions,
  screenshotShortcut,
  shortcutHints,
  onAiDraft,
  onDraftChange,
  onDraftEditorStateChange,
  onDraftPreviewChange,
  onKnowledgeBase,
  onOpenContactCardPicker,
  onQuickReply,
  onResizeStart,
  onSendMedia,
  onSendText,
  onTranslateDraft,
  showAiTools,
  showKnowledgeTools,
}, ref) {
  return (
    <ChatComposerSurface
      ref={ref}
      attachmentScopeKey={attachmentScopeKey}
      dragUpload={dragUpload}
      enterToSend={enterToSend}
      screenshotShortcut={screenshotShortcut}
      shortcutHints={shortcutHints}
      placeholder="输入消息..."
      disabled={false}
      draftValue={draftValue}
      draftEditorState={draftEditorState}
      mentionOptions={mentionOptions}
      onDraftChange={onDraftChange}
      onDraftPreviewChange={onDraftPreviewChange}
      onDraftEditorStateChange={onDraftEditorStateChange}
      onResizeStart={onResizeStart}
      onSendText={onSendText}
      onTranslateDraft={onTranslateDraft}
      onAiDraft={onAiDraft}
      onKnowledgeBase={onKnowledgeBase}
      onQuickReply={onQuickReply}
      onOpenContactCardPicker={onOpenContactCardPicker}
      onSendMedia={onSendMedia}
      showAiTools={showAiTools}
      showKnowledgeTools={showKnowledgeTools}
    />
  );
});
