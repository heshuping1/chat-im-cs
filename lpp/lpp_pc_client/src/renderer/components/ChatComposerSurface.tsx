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
} from "./MessageComposer";
import type { ComposerMediaKind } from "../composer/domain/detectComposerMediaKind";

export type { MessageComposerHandle };

export type ChatComposerSurfaceToolMode = "im" | "customerService";

export const ChatComposerSurface = forwardRef<
  MessageComposerHandle,
  {
    attachmentScopeKey: string;
    disabled?: boolean;
    draftEditorState?: string;
    draftValue?: string;
    dragUpload: boolean;
    enterToSend: boolean;
    mentionOptions?: Array<{ id: string; label: string }>;
    placeholder?: string;
    screenshotShortcut: ScreenshotShortcut;
    shortcutHints: boolean;
    toolMode?: ChatComposerSurfaceToolMode;
    onAiDraft?: () => void;
    onDraftChange?: (value: string) => void;
    onDraftEditorStateChange?: (value: string) => void;
    onDraftPreviewChange?: (value: string) => void;
    onKnowledgeBase?: () => void;
    onOpenContactCardPicker?: () => void;
    onQuickReply?: () => void;
    onResizeStart: (event: ReactPointerEvent<HTMLElement>) => void;
    onSendMedia: (file: File, kind: ComposerMediaKind) => void | Promise<void>;
    onSendText: (content: string) => void | Promise<void>;
    onTranslateDraft: (content: string) => Promise<string | undefined>;
    showAiTools?: boolean;
    showKnowledgeTools?: boolean;
  }
>(function ChatComposerSurface({
  attachmentScopeKey,
  disabled = false,
  draftEditorState,
  draftValue,
  dragUpload,
  enterToSend,
  mentionOptions = [],
  placeholder,
  screenshotShortcut,
  shortcutHints,
  toolMode = "im",
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
  showAiTools = false,
  showKnowledgeTools = false,
}, ref) {
  const serviceMode = toolMode === "customerService";
  const showServiceTools = serviceMode || showKnowledgeTools;
  const showServiceAiTool = serviceMode || showAiTools;
  const quickReplyLabel = serviceMode ? "快捷话术" : "快捷话术";

  return (
    <MessageComposer
      ref={ref}
      dense
      attachmentUi="compact"
      attachmentScopeKey={attachmentScopeKey}
      combinedAttachmentTool
      disabled={disabled}
      dragUpload={dragUpload}
      enableScreenshot
      enterToSend={enterToSend}
      mentionOptions={mentionOptions}
      placeholder={placeholder ?? (serviceMode ? "输入回复..." : "输入消息...")}
      screenshotShortcut={screenshotShortcut}
      shortcutHints={shortcutHints}
      showDefaultQuickReplyTool={!showServiceTools}
      draftValue={draftValue}
      draftEditorState={draftEditorState}
      onDraftChange={onDraftChange}
      onDraftPreviewChange={onDraftPreviewChange}
      onDraftEditorStateChange={onDraftEditorStateChange}
      onResizeStart={onResizeStart}
      leadingTools={
        <>
          {showServiceTools && (
            <>
              <button
                className="composer-advanced-tool"
                type="button"
                aria-label={quickReplyLabel}
                title={quickReplyLabel}
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
          {showServiceAiTool && (
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
