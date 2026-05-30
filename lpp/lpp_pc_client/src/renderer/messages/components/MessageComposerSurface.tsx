import {
  ClipboardList,
  Languages,
  MessageSquareQuote,
  Sparkles,
} from "lucide-react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { MessageComposer, type ScreenshotShortcut } from "../../components/MessageComposer";
import type { ComposerMediaKind } from "../../composer/domain/detectComposerMediaKind";

export function MessageComposerSurface({
  attachmentScopeKey,
  draftEditorState,
  draftValue,
  mentionOptions,
  screenshotShortcut,
  onAiDraft,
  onDraftChange,
  onDraftEditorStateChange,
  onDraftPreviewChange,
  onKnowledgeBase,
  onResizeStart,
  onSendMedia,
  onSendText,
  onTranslateDraft,
}: {
  attachmentScopeKey: string;
  draftEditorState?: string;
  draftValue?: string;
  mentionOptions: Array<{ id: string; label: string }>;
  screenshotShortcut: ScreenshotShortcut;
  onAiDraft: () => void;
  onDraftChange: (value: string) => void;
  onDraftEditorStateChange: (value: string) => void;
  onDraftPreviewChange: (value: string) => void;
  onKnowledgeBase: () => void;
  onResizeStart: (event: ReactPointerEvent<HTMLElement>) => void;
  onSendMedia: (file: File, kind: ComposerMediaKind) => void | Promise<void>;
  onSendText: (content: string) => void | Promise<void>;
  onTranslateDraft: (content: string) => Promise<string | undefined>;
}) {
  return (
    <MessageComposer
      dense
      attachmentUi="compact"
      attachmentScopeKey={attachmentScopeKey}
      combinedAttachmentTool
      enableScreenshot
      screenshotShortcut={screenshotShortcut}
      placeholder="输入消息..."
      disabled={false}
      draftValue={draftValue}
      draftEditorState={draftEditorState}
      mentionOptions={mentionOptions}
      onDraftChange={onDraftChange}
      onDraftPreviewChange={onDraftPreviewChange}
      onDraftEditorStateChange={onDraftEditorStateChange}
      onResizeStart={onResizeStart}
      leadingTools={
        <>
          <button
            className="composer-advanced-tool"
            type="button"
            aria-label="快捷话术"
            title="快捷话术"
            onClick={onKnowledgeBase}
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
      onSendMedia={onSendMedia}
    />
  );
}
