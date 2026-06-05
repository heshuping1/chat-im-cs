import { forwardRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  ChatComposerSurface,
  type MessageComposerHandle,
} from "../../components/ChatComposerSurface";
import type { ScreenshotShortcut } from "../../components/MessageComposer";
import type { ComposerMediaKind } from "../../composer/domain/detectComposerMediaKind";
import { useI18n } from "../../i18n/useI18n";

export const MessageComposerSurface = forwardRef<
  MessageComposerHandle,
  {
    attachmentScopeKey: string;
    disabled?: boolean;
    draftEditorState?: string;
    draftValue?: string;
    dragUpload: boolean;
    enterToSend: boolean;
    mentionOptions: Array<{ id: string; label: string }>;
    placeholder?: string;
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
  disabled = false,
  draftEditorState,
  draftValue,
  dragUpload,
  enterToSend,
  mentionOptions,
  placeholder,
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
  const { t } = useI18n();

  return (
    <ChatComposerSurface
      ref={ref}
      attachmentScopeKey={attachmentScopeKey}
      dragUpload={dragUpload}
      enterToSend={enterToSend}
      screenshotShortcut={screenshotShortcut}
      shortcutHints={shortcutHints}
      placeholder={placeholder ?? t("composer.messagePlaceholder")}
      disabled={disabled}
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
