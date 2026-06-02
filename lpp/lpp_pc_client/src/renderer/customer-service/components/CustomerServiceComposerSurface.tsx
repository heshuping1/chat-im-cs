import { forwardRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import {
  ChatComposerSurface,
  type MessageComposerHandle,
} from "../../components/ChatComposerSurface";
import type { ScreenshotShortcut } from "../../components/MessageComposer";
import type { ComposerMediaKind } from "../../composer/domain/detectComposerMediaKind";

export const CustomerServiceComposerSurface = forwardRef<
  MessageComposerHandle,
  {
    attachmentScopeKey: string;
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
    screenshotShortcut: ScreenshotShortcut;
    shortcutHints: boolean;
  }
>(function CustomerServiceComposerSurface({
  attachmentScopeKey,
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
  screenshotShortcut,
  shortcutHints,
}, ref) {
  return (
    <ChatComposerSurface
      ref={ref}
      attachmentScopeKey={attachmentScopeKey}
      disabled={disabled}
      dragUpload={dragUpload}
      enterToSend={enterToSend}
      screenshotShortcut={screenshotShortcut}
      shortcutHints={shortcutHints}
      toolMode="customerService"
      onResizeStart={onResizeStart}
      onAiDraft={onAiDraft}
      onKnowledgeBase={onKnowledgeBase}
      onQuickReply={onQuickReply}
      onSendText={onSendText}
      onTranslateDraft={onTranslateDraft}
      onSendMedia={onSendMedia}
    />
  );
});
