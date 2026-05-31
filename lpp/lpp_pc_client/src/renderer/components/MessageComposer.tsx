import {
  FileImage,
  Folder,
  MessageSquareQuote,
  Mic,
  Paperclip,
  Plus,
  Scissors,
  Smile,
  UserRound,
  Video,
} from "lucide-react";
import type {
  MouseEvent as ReactMouseEvent,
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
  ReactElement,
  ReactNode,
} from "react";
import { cloneElement, isValidElement, useEffect, useRef, useState } from "react";
import { formatError } from "../lib/format";
import {
  type WechatEmojiItem,
} from "../lib/wechatEmoji";
import {
  LexicalChatInput,
  type LexicalChatInputHandle,
  type LexicalPendingAttachment,
} from "./LexicalChatInput";
import { MessageComposerEmojiPanel } from "./MessageComposerEmojiPanel";
import {
  MessageComposerAttachmentList,
  MessageComposerAttachmentPreview,
  MessageComposerFileInputs,
  type PendingAttachment,
} from "./MessageComposerAttachments";
import {
  detectComposerMediaKind,
  type ComposerMediaKind,
} from "../composer/domain/detectComposerMediaKind";
import {
  matchesScreenshotShortcut,
  type ScreenshotShortcut,
} from "../composer/runtime/composerScreenshot";
import { sendComposerPartsInOrder } from "../media/runtime/sendQueue";
import {
  captureScreenshotFile,
  isCaptureScreenshotCancelError,
} from "../messages/runtime/screenshotCapture";

export type { ScreenshotShortcut };

export function MessageComposer({
  placeholder,
  disabled = false,
  dense = false,
  attachmentUi = "stacked",
  attachmentScopeKey,
  combinedAttachmentTool = false,
  enableScreenshot = false,
  screenshotShortcut = "Alt+A",
  leadingTools,
  extraTools,
  draftValue,
  draftEditorState,
  mentionOptions = [],
  onResizeStart,
  onDraftChange,
  onDraftPreviewChange,
  onDraftEditorStateChange,
  onTranslateDraft,
  onOpenContactCardPicker,
  onSendText,
  onSendMedia,
}: {
  placeholder: string;
  disabled?: boolean;
  dense?: boolean;
  attachmentUi?: "stacked" | "compact";
  attachmentScopeKey?: string;
  combinedAttachmentTool?: boolean;
  enableScreenshot?: boolean;
  screenshotShortcut?: ScreenshotShortcut;
  leadingTools?: ReactNode;
  extraTools?: ReactNode;
  draftValue?: string;
  draftEditorState?: string;
  mentionOptions?: Array<{ id: string; label: string }>;
  onResizeStart?: (event: ReactPointerEvent<HTMLElement>) => void;
  onDraftChange?: (value: string) => void;
  onDraftPreviewChange?: (value: string) => void;
  onDraftEditorStateChange?: (value: string) => void;
  onTranslateDraft?: (content: string) => Promise<string | undefined>;
  onOpenContactCardPicker?: () => void;
  onSendText: (content: string) => void | Promise<void>;
  onSendMedia: (file: File, kind: ComposerMediaKind) => void | Promise<void>;
}) {
  const [internalDraft, setInternalDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [attachmentsByScope, setAttachmentsByScope] = useState<
    Record<string, PendingAttachment[]>
  >({});
  const [lexicalAttachmentsByScope, setLexicalAttachmentsByScope] = useState<
    Record<string, LexicalPendingAttachment[]>
  >({});
  const [richHasText, setRichHasText] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<PendingAttachment | null>(
    null,
  );
  const [moreOpen, setMoreOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [recentEmojis, setRecentEmojis] = useState<WechatEmojiItem[]>([]);
  const [draftTranslation, setDraftTranslation] = useState<{
    source: string;
    text: string;
  } | null>(null);
  const [translatingDraft, setTranslatingDraft] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lexicalInputRef = useRef<LexicalChatInputHandle | null>(null);
  const composerRef = useRef<HTMLElement | null>(null);
  const previewUrlsRef = useRef<string[]>([]);

  const draft = draftValue ?? internalDraft;
  const attachmentScope = attachmentScopeKey || "__default__";
  const attachments = attachmentsByScope[attachmentScope] ?? [];
  const lexicalAttachments = lexicalAttachmentsByScope[attachmentScope] ?? [];
  const compactComposer = attachmentUi === "compact";
  const mentionMatch = /(?:^|\s)@([^\s@]*)$/.exec(
    draft.slice(0, textareaRef.current?.selectionStart ?? draft.length),
  );
  const mentionCandidates = mentionMatch
    ? mentionOptions
        .filter((item) => item.label.toLowerCase().includes(mentionMatch[1].toLowerCase()))
        .slice(0, 6)
    : [];
  const updateDraft = (value: string) => {
    if (draftValue === undefined) {
      setInternalDraft(value);
    }
    onDraftChange?.(value);
  };

  const updateAttachments = (
    updater: (current: PendingAttachment[]) => PendingAttachment[],
  ) => {
    setAttachmentsByScope((current) => ({
      ...current,
      [attachmentScope]: updater(current[attachmentScope] ?? []),
    }));
  };

  const updateLexicalAttachments = (
    updater: (current: LexicalPendingAttachment[]) => LexicalPendingAttachment[],
  ) => {
    setLexicalAttachmentsByScope((current) => ({
      ...current,
      [attachmentScope]: updater(current[attachmentScope] ?? []),
    }));
  };

  const translateDraft = async () => {
    const content = draft.trim();
    if (!content || disabled || translatingDraft || !onTranslateDraft) return;
    setTranslatingDraft(true);
    setError(null);
    try {
      const text = (await onTranslateDraft(content))?.trim();
      if (!text) {
        setError("翻译服务没有返回内容。");
        setDraftTranslation(null);
        return;
      }
      setDraftTranslation({ source: content, text });
    } catch (err) {
      setError(`翻译失败：${formatError(err)}`);
      setDraftTranslation(null);
    } finally {
      setTranslatingDraft(false);
    }
  };

  useEffect(
    () => () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current = [];
    },
    [],
  );

  useEffect(() => {
    setPreviewAttachment(null);
    setRichHasText(draft.trim().length > 0);
  }, [attachmentScope]);

  useEffect(() => {
    if (!emojiOpen && !moreOpen) return undefined;
    const closeFloatingPanels = (event: globalThis.PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && composerRef.current?.contains(target)) return;
      setEmojiOpen(false);
      setMoreOpen(false);
    };
    window.addEventListener("pointerdown", closeFloatingPanels);
    return () => window.removeEventListener("pointerdown", closeFloatingPanels);
  }, [emojiOpen, moreOpen]);

  const sendDraft = async () => {
    if (compactComposer) {
      await sendRichDraft();
      return;
    }
    const content = draft.trim();
    const queued = attachments;
    if ((!content && queued.length === 0) || disabled) return;
    setError(null);
    updateDraft("");
    queued.forEach((item) => {
      if (item.previewUrl) revokePreviewUrl(item.previewUrl, previewUrlsRef);
    });
    updateAttachments(() => []);
    focusComposerInput(textareaRef);
    await sendComposerPartsInOrder<PendingAttachment>({
      parts: [
        ...(content ? [{ type: "text" as const, text: content }] : []),
        ...queued.map((attachment) => ({ type: "attachment" as const, attachment })),
      ],
      sendText: onSendText,
      sendAttachment: (item) => onSendMedia(item.file, item.kind),
      onFailure: ({ error: err }) => setError(formatError(err)),
    });
  };

  const sendRichDraft = async () => {
    const sendableParts = lexicalInputRef.current?.getSendableParts() ?? [];
    if (sendableParts.length === 0 || disabled) return;
    setError(null);
    const attachmentPreviewUrls = sendableParts
      .filter((part): part is Extract<typeof part, { type: "attachment" }> => part.type === "attachment")
      .map((part) => part.attachment.previewUrl)
      .filter((previewUrl): previewUrl is string => Boolean(previewUrl));
    lexicalInputRef.current?.clear();
    updateLexicalAttachments(() => []);
    updateDraft("");
    onDraftEditorStateChange?.("");
    onDraftPreviewChange?.("");
    setRichHasText(false);
    focusComposerInput(textareaRef, compactComposer, lexicalInputRef);
    try {
      await sendComposerPartsInOrder<LexicalPendingAttachment>({
        parts: sendableParts,
        sendText: onSendText,
        sendAttachment: (item) => onSendMedia(item.file, item.kind),
        onFailure: ({ error: err }) => setError(formatError(err)),
      });
    } finally {
      attachmentPreviewUrls.forEach((previewUrl) => revokePreviewUrl(previewUrl, previewUrlsRef));
      focusComposerInput(textareaRef, compactComposer, lexicalInputRef);
    }
  };

  const addFiles = async (fileList: FileList | File[]) => {
    if (disabled) return;
    setError(null);
    const nextItems = await Promise.all(Array.from(fileList).map(async (file) => {
      const kind = await detectComposerMediaKind(file);
      const previewUrl =
        kind === "image" || kind === "video" ? URL.createObjectURL(file) : undefined;
      if (previewUrl) previewUrlsRef.current.push(previewUrl);
      return {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        file,
        kind,
        previewUrl,
        status: "ready" as const,
      };
    }));
    if (compactComposer) {
      updateLexicalAttachments((current) => [...current, ...nextItems]);
      lexicalInputRef.current?.insertAttachments(nextItems);
      setMoreOpen(false);
      return;
    }
    updateAttachments((current) => [...current, ...nextItems]);
    setMoreOpen(false);
  };

  const captureScreenshot = async () => {
    if (disabled || !enableScreenshot) return;
    setError(null);
    try {
      addFiles([await captureScreenshotFile()]);
    } catch (err) {
      const message = formatError(err);
      if (isCaptureScreenshotCancelError(err)) return;
      setError(message);
    }
  };

  const removeAttachment = (item: PendingAttachment) => {
    updateAttachments((current) =>
      current.filter((attachment) => attachment.id !== item.id),
    );
    if (item.previewUrl) revokePreviewUrl(item.previewUrl, previewUrlsRef);
    if (previewAttachment?.id === item.id) setPreviewAttachment(null);
  };

  const removeLexicalAttachment = (attachmentId: string) => {
    updateLexicalAttachments((current) => {
      const target = current.find((item) => item.id === attachmentId);
      if (target?.previewUrl) revokePreviewUrl(target.previewUrl, previewUrlsRef);
      return current.filter((item) => item.id !== attachmentId);
    });
    if (previewAttachment?.id === attachmentId) setPreviewAttachment(null);
  };

  const insertEmoji = (item: WechatEmojiItem) => {
    setDraftTranslation(null);
    const emoji = item.value;
    if (compactComposer) {
      lexicalInputRef.current?.insertText(emoji);
      setRecentEmojis((current) => [
        item,
        ...current.filter((recent) => recent.id !== item.id),
      ].slice(0, 24));
      return;
    }
    let nextCursor = 0;
    const current = draft;
    const next = (() => {
      const textarea = textareaRef.current;
      const start = textarea?.selectionStart ?? current.length;
      const end = textarea?.selectionEnd ?? start;
      nextCursor = start + emoji.length;
      return `${current.slice(0, start)}${emoji}${current.slice(end)}`;
    })();
    updateDraft(next);
    setRecentEmojis((current) => [
      item,
      ...current.filter((emoji) => emoji.id !== item.id),
    ].slice(0, 24));
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const insertMention = (label: string) => {
    if (compactComposer) {
      lexicalInputRef.current?.insertText(`@${label} `);
      return;
    }
    const textarea = textareaRef.current;
    const cursor = textarea?.selectionStart ?? draft.length;
    const before = draft.slice(0, cursor);
    const after = draft.slice(cursor);
    const nextBefore = before.replace(/(?:^|\s)@([^\s@]*)$/, (match) => {
      const prefix = match.startsWith(" ") ? " " : "";
      return `${prefix}@${label} `;
    });
    updateDraft(`${nextBefore}${after}`);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  useEffect(() => {
    if (!enableScreenshot || screenshotShortcut === "None") return undefined;
    const handleShortcut = (event: KeyboardEvent) => {
      if (!matchesScreenshotShortcut(event, screenshotShortcut)) return;
      event.preventDefault();
      void captureScreenshot();
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [disabled, enableScreenshot, screenshotShortcut]);

  return (
    <footer
      ref={composerRef}
      className={`composer ${dense ? "e-composer" : ""}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        if (event.dataTransfer.files.length) {
          addFiles(event.dataTransfer.files);
        }
      }}
    >
      {onResizeStart && (
        <button
          className="composer-resize-handle"
          type="button"
          aria-label="调整输入区高度"
          title="拖动调整输入区高度"
          onPointerDown={onResizeStart}
        />
      )}
      <div className={dense ? "h-tool-row" : "tool-row"}>
        <button
          type="button"
          disabled={disabled}
          className={emojiOpen ? "active" : ""}
          onClick={() => {
            setEmojiOpen((open) => !open);
            setMoreOpen(false);
          }}
          aria-expanded={emojiOpen}
          aria-label="表情"
          title="表情"
        >
          <Smile size={16} />
          <span className={dense ? "tool-label" : ""}>表情</span>
        </button>
        {combinedAttachmentTool ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => attachmentInputRef.current?.click()}
            aria-label="文件"
            title="选择图片或文件"
          >
            <Paperclip size={16} />
            <span className={dense ? "tool-label" : ""}>文件</span>
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={disabled}
              onClick={() => imageInputRef.current?.click()}
              aria-label="图片"
              title="图片"
            >
              <FileImage size={16} />
              <span className={dense ? "tool-label" : ""}>图片</span>
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => fileInputRef.current?.click()}
              aria-label="文件"
              title="文件"
            >
              <Folder size={16} />
              <span className={dense ? "tool-label" : ""}>文件</span>
            </button>
          </>
        )}
        <button
          type="button"
          disabled={disabled}
          aria-label="截图"
          title={screenshotShortcut === "None" ? "截图" : `截图 ${screenshotShortcut}`}
          onClick={() => void captureScreenshot()}
        >
          <Scissors size={16} />
          <span className={dense ? "tool-label" : ""}>
            {enableScreenshot && screenshotShortcut !== "None" && (
              <em className="tool-shortcut">{screenshotShortcut}</em>
            )}
          </span>
        </button>
        <span className="composer-tool-separator" aria-hidden="true" />
        {leadingTools}
        <button
          type="button"
          disabled={disabled}
          aria-label="话术"
          title="话术"
        >
          <MessageSquareQuote size={16} />
          <span className={dense ? "tool-label" : ""}>话术</span>
        </button>
        {renderComposerExtraTools({
          extraTools,
          disabled: disabled || translatingDraft || !draft.trim(),
          onClick: onTranslateDraft ? () => void translateDraft() : undefined,
          title: translatingDraft ? "翻译中" : undefined,
        })}
        <button
          type="button"
          disabled={disabled}
          className={moreOpen ? "active" : ""}
          onClick={() => {
            setMoreOpen((open) => !open);
            setEmojiOpen(false);
          }}
          aria-expanded={moreOpen}
          aria-label="更多功能"
          title="更多功能"
        >
          <Plus size={16} />
          <span className={dense ? "tool-label" : ""}>更多</span>
        </button>
      </div>
      {emojiOpen && (
        <MessageComposerEmojiPanel
          onPick={insertEmoji}
          recentEmojis={recentEmojis}
        />
      )}
      {moreOpen && (
        <div className="composer-plus-panel composer-plus-note" role="menu" aria-label="更多发送功能">
          <strong>更多发送能力</strong>
          <div className="composer-plus-grid">
            <button className="composer-plus-item" type="button" disabled>
              <Mic size={17} />
              <span>语音</span>
              <em>待接入</em>
            </button>
            <button className="composer-plus-item" type="button" disabled>
              <Video size={17} />
              <span>视频</span>
              <em>待接入</em>
            </button>
            <button
              className="composer-plus-item"
              type="button"
              aria-label="名片"
              disabled={disabled}
              onClick={() => {
                setMoreOpen(false);
                onOpenContactCardPicker?.();
              }}
            >
              <UserRound size={17} />
              <span>名片</span>
              <em>联系人</em>
            </button>
          </div>
          <p>选择联系人后发送个人名片。</p>
        </div>
      )}
      {mentionCandidates.length > 0 && (
        <div className="composer-mention-panel" role="listbox" aria-label="选择提醒对象">
          {mentionCandidates.map((item) => (
            <button
              type="button"
              key={item.id}
              role="option"
              onClick={() => insertMention(item.label)}
            >
              @{item.label}
            </button>
          ))}
        </div>
      )}
      <MessageComposerFileInputs
        attachmentInputRef={attachmentInputRef}
        imageInputRef={imageInputRef}
        fileInputRef={fileInputRef}
        onFiles={(files) => void addFiles(files)}
      />
      {attachmentUi === "stacked" && (
        <MessageComposerAttachmentList
          attachments={attachments}
          onRemove={removeAttachment}
        />
      )}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      {draftTranslation && (
        <div className="composer-translation-preview" role="status">
          <span>{draftTranslation.text}</span>
          <button
            type="button"
            onClick={() => {
              updateDraft(draftTranslation.text);
              setDraftTranslation(null);
            }}
          >
            替换输入
          </button>
          <button type="button" onClick={() => setDraftTranslation(null)}>
            关闭
          </button>
        </div>
      )}
      <div className={dense ? "h-input-row" : "composer-input"}>
        {compactComposer ? (
          <LexicalChatInput
            key={attachmentScope}
            ref={lexicalInputRef}
            scopeKey={attachmentScope}
            placeholder={placeholder}
            disabled={disabled}
            editorState={draftEditorState}
            attachments={lexicalAttachments}
            onDraftChange={({ editorState: nextEditorState, text, preview }) => {
              setRichHasText(text.trim().length > 0);
              updateDraft(text);
              onDraftEditorStateChange?.(nextEditorState);
              onDraftPreviewChange?.(preview);
              if (draftTranslation && text.trim() !== draftTranslation.source) {
                setDraftTranslation(null);
              }
            }}
            onAttachmentIdsChange={(attachmentIds) => {
              const activeIds = new Set(attachmentIds);
              updateLexicalAttachments((current) => {
                current
                  .filter((item) => !activeIds.has(item.id))
                  .forEach((item) => {
                    if (item.previewUrl) revokePreviewUrl(item.previewUrl, previewUrlsRef);
                  });
                return current.filter((item) => activeIds.has(item.id));
              });
            }}
            onFiles={addFiles}
            onSend={() => void sendDraft()}
            onPreviewAttachment={(attachmentId) => {
              const target = lexicalAttachments.find((item) => item.id === attachmentId);
              if (target) setPreviewAttachment(target);
            }}
            onRemoveAttachment={removeLexicalAttachment}
          />
        ) : (
          <textarea
            ref={textareaRef}
            value={draft}
            disabled={disabled}
            onChange={(event) => {
              updateDraft(event.target.value);
              if (draftTranslation && event.target.value.trim() !== draftTranslation.source) {
                setDraftTranslation(null);
              }
            }}
            placeholder={placeholder}
            onPaste={(event) => {
              if (event.clipboardData.files.length) {
                event.preventDefault();
                addFiles(event.clipboardData.files);
              }
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.shiftKey) return;
              if (!event.ctrlKey && !event.metaKey && !event.altKey) {
                event.preventDefault();
                void sendDraft();
              }
            }}
          />
        )}
      </div>
      <MessageComposerAttachmentPreview
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />
    </footer>
  );
}

function renderComposerExtraTools({
  extraTools,
  disabled,
  onClick,
  title,
}: {
  extraTools: ReactNode;
  disabled: boolean;
  onClick?: () => void;
  title?: string;
}): ReactNode {
  if (!extraTools) return extraTools;
  if (!isValidElement(extraTools)) return extraTools;
  const element = extraTools as ReactElement<{
    disabled?: boolean;
    onClick?: (event: ReactMouseEvent) => void;
    title?: string;
  }>;
  return cloneElement(element, {
    disabled,
    onClick: (event: ReactMouseEvent) => {
      element.props.onClick?.(event);
      if (!event.defaultPrevented) onClick?.();
    },
    title: title ?? (disabled ? "请输入内容后翻译" : element.props.title),
  });
}

function revokePreviewUrl(
  url: string,
  ref: MutableRefObject<string[]>,
) {
  URL.revokeObjectURL(url);
  ref.current = ref.current.filter((item) => item !== url);
}

function focusComposerInput(
  ref: MutableRefObject<HTMLTextAreaElement | null>,
  compact = false,
  lexicalRef?: MutableRefObject<LexicalChatInputHandle | null>,
) {
  requestAnimationFrame(() => {
    if (compact && lexicalRef?.current) {
      lexicalRef.current.focus();
      window.setTimeout(() => lexicalRef.current?.focus(), 0);
      return;
    }
    ref.current?.focus();
    window.setTimeout(() => ref.current?.focus(), 0);
  });
}
