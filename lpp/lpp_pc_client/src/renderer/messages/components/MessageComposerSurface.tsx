import {
  ClipboardList,
  Languages,
  MessageSquareQuote,
  Sparkles,
} from "lucide-react";
import { forwardRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  MessageComposer,
  type MessageComposerHandle,
  type ScreenshotShortcut,
} from "../../components/MessageComposer";
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
    <MessageComposer
      ref={ref}
      dense
      attachmentUi="compact"
      attachmentScopeKey={attachmentScopeKey}
      combinedAttachmentTool
      dragUpload={dragUpload}
      enterToSend={enterToSend}
      enableScreenshot
      screenshotShortcut={screenshotShortcut}
      shortcutHints={shortcutHints}
      placeholder="输入消息..."
      disabled={false}
      showDefaultQuickReplyTool={!showKnowledgeTools}
      draftValue={draftValue}
      draftEditorState={draftEditorState}
      mentionOptions={mentionOptions}
      onDraftChange={onDraftChange}
      onDraftPreviewChange={onDraftPreviewChange}
      onDraftEditorStateChange={onDraftEditorStateChange}
      onResizeStart={onResizeStart}
      leadingTools={
        <>
          {showKnowledgeTools && (
            <>
              <button
                className="composer-advanced-tool"
                type="button"
                aria-label="快捷话术"
                title="快捷话术"
                onClick={onQuickReply}
              >
                <MessageSquareQuote size={16} />
                <span>话术</span>
              </button>
              <button
                className="composer-advanced-tool"
                type="button"
                aria-label="知识库"
                title="知识库"
                onClick={onKnowledgeBase}
              >
                <ClipboardList size={16} />
                <span>知识库</span>
              </button>
            </>
          )}
          {showAiTools && (
            <button
              className="composer-advanced-tool"
              type="button"
              aria-label="AI 起草"
              title="AI 起草"
              onClick={onAiDraft}
            >
              <Sparkles size={16} />
              <span>AI起草</span>
            </button>
          )}
        </>
      }
      extraTools={
        <button
          className="composer-advanced-tool"
          type="button"
          aria-label="翻译"
          title="翻译"
        >
          <Languages size={16} />
          <span>翻译</span>
        </button>
      }
      onSendText={onSendText}
      onTranslateDraft={onTranslateDraft}
      onOpenContactCardPicker={onOpenContactCardPicker}
      onSendMedia={onSendMedia}
    />
  );
});
