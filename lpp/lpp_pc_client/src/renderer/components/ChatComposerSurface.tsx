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
import { useI18n } from "../i18n/useI18n";

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
  const { t } = useI18n();
  const serviceMode = toolMode === "customerService";
  const showServiceTools = serviceMode || showKnowledgeTools;
  const showServiceAiTool = serviceMode || showAiTools;
  const quickReplyLabel = t("composer.quickReply");

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
      placeholder={placeholder ?? (serviceMode ? t("composer.replyPlaceholder") : t("composer.messagePlaceholder"))}
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
                disabled={disabled}
                onClick={() => {
                  if (!disabled) onQuickReply?.();
                }}
              >
                <MessageSquareQuote size={16} />
                <span>{t("composer.quickReplyShort")}</span>
              </button>
              <button
                className="composer-advanced-tool"
                type="button"
                aria-label={t("knowledge.title")}
                title={t("knowledge.title")}
                disabled={disabled}
                onClick={() => {
                  if (!disabled) onKnowledgeBase?.();
                }}
              >
                <ClipboardList size={16} />
                <span>{t("knowledge.title")}</span>
              </button>
            </>
          )}
          {showServiceAiTool && (
            <button
              className="composer-advanced-tool"
              type="button"
              aria-label={t("composer.aiDraft")}
              title={t("composer.aiDraft")}
              disabled={disabled}
              onClick={() => {
                if (!disabled) onAiDraft?.();
              }}
            >
              <Sparkles size={16} />
              <span>{t("composer.aiDraftCompact")}</span>
            </button>
          )}
        </>
      }
      extraTools={
        <button
          className="composer-advanced-tool"
          type="button"
          aria-label={t("composer.translate")}
          title={t("composer.translate")}
        >
          <Languages size={16} />
          <span>{t("composer.translate")}</span>
        </button>
      }
      onSendText={onSendText}
      onTranslateDraft={onTranslateDraft}
      onOpenContactCardPicker={onOpenContactCardPicker}
      onSendMedia={onSendMedia}
    />
  );
});
