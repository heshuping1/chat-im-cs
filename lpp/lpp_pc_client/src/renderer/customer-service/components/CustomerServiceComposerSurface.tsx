import {
  ClipboardList,
  Languages,
  MessageSquareQuote,
  Sparkles,
} from "lucide-react";
import { forwardRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import { MessageComposer } from "../../components/MessageComposer";
import type { MessageComposerHandle } from "../../components/MessageComposer";
import type { ComposerMediaKind } from "../../composer/domain/detectComposerMediaKind";

export const CustomerServiceComposerSurface = forwardRef<
  MessageComposerHandle,
  {
    disabled: boolean;
    dragUpload: boolean;
    enterToSend: boolean;
    onAiDraft: () => void;
    onKnowledgeBase: () => void;
    onQuickReply: () => void;
    onResizeStart: (event: ReactPointerEvent<HTMLElement>) => void;
    onSendMedia: (file: File, kind: ComposerMediaKind) => void | Promise<void>;
    onSendText: (content: string) => void | Promise<void>;
    onTranslateDraft: (content: string) => Promise<string | undefined>;
    shortcutHints: boolean;
  }
>(function CustomerServiceComposerSurface({
  disabled,
  dragUpload,
  enterToSend,
  onAiDraft,
  onKnowledgeBase,
  onQuickReply,
  onResizeStart,
  onSendMedia,
  onSendText,
  onTranslateDraft,
  shortcutHints,
}, ref) {
  return (
    <MessageComposer
      ref={ref}
      dense
      placeholder="输入回复..."
      disabled={disabled}
      dragUpload={dragUpload}
      enterToSend={enterToSend}
      shortcutHints={shortcutHints}
      showDefaultQuickReplyTool={false}
      onResizeStart={onResizeStart}
      leadingTools={
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
});
