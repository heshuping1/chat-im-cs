import {
  FileImage,
  Folder,
  Mic,
  Paperclip,
  Plus,
  Scissors,
  Smile,
  Video,
  X,
} from "lucide-react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
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
  wechatEmojiItems,
} from "../lib/wechatEmoji";
import {
  LexicalChatInput,
  type LexicalChatInputHandle,
  type LexicalPendingAttachment,
} from "./LexicalChatInput";

export type ComposerMediaKind = "image" | "video" | "file";
export type ScreenshotShortcut = "Alt+A" | "Ctrl+Alt+A" | "Ctrl+Shift+A" | "None";

interface PendingAttachment {
  id: string;
  file: File;
  kind: ComposerMediaKind;
  previewUrl?: string;
  status?: "ready" | "failed";
  error?: string;
}

type ComposerPart =
  | { id: string; type: "text"; text: string }
  | { id: string; type: "attachment"; attachmentId: string };

export function MessageComposer({
  placeholder,
  disabled = false,
  dense = false,
  attachmentUi = "legacy",
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
  onSendText,
  onSendMedia,
}: {
  placeholder: string;
  disabled?: boolean;
  dense?: boolean;
  attachmentUi?: "legacy" | "compact";
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
  const [partsByScope, setPartsByScope] = useState<Record<string, ComposerPart[]>>({});
  const [richHasText, setRichHasText] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<PendingAttachment | null>(
    null,
  );
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string | null>(null);
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
  const richEditorRef = useRef<HTMLDivElement | null>(null);
  const lexicalInputRef = useRef<LexicalChatInputHandle | null>(null);
  const composerRef = useRef<HTMLElement | null>(null);
  const previewUrlsRef = useRef<string[]>([]);
  const activeTextPartIdRef = useRef<string | null>(null);

  const draft = draftValue ?? internalDraft;
  const attachmentScope = attachmentScopeKey || "__default__";
  const attachments = attachmentsByScope[attachmentScope] ?? [];
  const lexicalAttachments = lexicalAttachmentsByScope[attachmentScope] ?? [];
  const compactComposer = attachmentUi === "compact";
  const richParts = partsByScope[attachmentScope] ?? [
    { id: `${attachmentScope}-text-root`, type: "text", text: draft },
  ];
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

  const getSyncedRichParts = () =>
    compactComposer
      ? readRichPartsFromEditor(richEditorRef.current, richParts)
      : richParts;

  const syncRichDraftState = () => {
    const nextParts = getSyncedRichParts();
    const text = richTextFromParts(nextParts);
    const preview = richPreviewFromParts(nextParts, attachments);
    setPartsByScope((current) => ({
      ...current,
      [attachmentScope]: nextParts,
    }));
    setRichHasText(text.trim().length > 0);
    updateDraft(text);
    onDraftPreviewChange?.(preview);
    return { nextParts, text, preview };
  };

  const updateRichParts = (updater: (current: ComposerPart[]) => ComposerPart[]) => {
    setPartsByScope((current) => ({
      ...current,
      [attachmentScope]: ensureTrailingTextPart(updater(getSyncedRichParts())),
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
    setSelectedAttachmentId(null);
    setRichHasText(
      compactComposer
        ? draft.trim().length > 0
        : richTextFromParts(richParts).trim().length > 0,
    );
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
    try {
      if (content) {
        void Promise.resolve(onSendText(content)).catch((err) => setError(formatError(err)));
      }
      for (const item of queued) {
        void Promise.resolve(onSendMedia(item.file, item.kind)).catch((err) => setError(formatError(err)));
      }
    } catch (err) {
      setError(formatError(err));
    }
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
    setSelectedAttachmentId(null);
    focusComposerInput(textareaRef, richEditorRef, compactComposer, lexicalInputRef);
    try {
      for (const part of sendableParts) {
        if (part.type === "text") {
          void Promise.resolve(onSendText(part.text)).catch((err) => setError(formatError(err)));
          continue;
        }
        const item = part.attachment;
        void Promise.resolve(onSendMedia(item.file, item.kind)).catch((err) => setError(formatError(err)));
      }
    } catch (err) {
      setError(formatError(err));
    } finally {
      attachmentPreviewUrls.forEach((previewUrl) => revokePreviewUrl(previewUrl, previewUrlsRef));
      focusComposerInput(textareaRef, richEditorRef, compactComposer, lexicalInputRef);
    }
  };

  const addFiles = (fileList: FileList | File[]) => {
    if (disabled) return;
    setError(null);
    const nextItems = Array.from(fileList).map((file) => {
      const kind = composerMediaKindFromFile(file);
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
    });
    if (compactComposer) {
      updateLexicalAttachments((current) => [...current, ...nextItems]);
      lexicalInputRef.current?.insertAttachments(nextItems);
      setSelectedAttachmentId(nextItems.at(-1)?.id ?? null);
      setMoreOpen(false);
      return;
    }
    updateAttachments((current) => [...current, ...nextItems]);
    setSelectedAttachmentId(nextItems.at(-1)?.id ?? null);
    setMoreOpen(false);
  };

  const captureScreenshot = async () => {
    if (disabled || !enableScreenshot) return;
    setError(null);
    try {
      if (!window.desktopApi?.captureScreenshot) {
        setError("截图仅在 Electron 客户端可用。");
        return;
      }
      const result = await window.desktopApi.captureScreenshot();
      addFiles([dataUrlToFile(result.dataUrl, result.fileName || "截图.png")]);
    } catch (err) {
      const message = formatError(err);
      if (message.includes("已取消截图")) return;
      setError(message);
    }
  };

  const removeAttachment = (item: PendingAttachment) => {
    updateAttachments((current) =>
      current.filter((attachment) => attachment.id !== item.id),
    );
    if (compactComposer) {
      const nextParts = ensureTrailingTextPart(
        getSyncedRichParts().filter(
          (part) => part.type !== "attachment" || part.attachmentId !== item.id,
        ),
      );
      setPartsByScope((current) => ({
        ...current,
        [attachmentScope]: nextParts,
      }));
      setRichHasText(richTextFromParts(nextParts).trim().length > 0);
      updateDraft(richTextFromParts(nextParts));
      onDraftPreviewChange?.(richPreviewFromParts(
        nextParts,
        attachments.filter((attachment) => attachment.id !== item.id),
      ));
    }
    if (item.previewUrl) revokePreviewUrl(item.previewUrl, previewUrlsRef);
    if (previewAttachment?.id === item.id) setPreviewAttachment(null);
    if (selectedAttachmentId === item.id) setSelectedAttachmentId(null);
  };

  const removeLexicalAttachment = (attachmentId: string) => {
    updateLexicalAttachments((current) => {
      const target = current.find((item) => item.id === attachmentId);
      if (target?.previewUrl) revokePreviewUrl(target.previewUrl, previewUrlsRef);
      return current.filter((item) => item.id !== attachmentId);
    });
    if (previewAttachment?.id === attachmentId) setPreviewAttachment(null);
    if (selectedAttachmentId === attachmentId) setSelectedAttachmentId(null);
  };

  const removeSelectedOrLastAttachment = () => {
    const target =
      attachments.find((item) => item.id === selectedAttachmentId) ??
      attachments.at(-1);
    if (!target) return false;
    removeAttachment(target);
    return true;
  };

  const handleAttachmentKeyDown = (
    event: ReactKeyboardEvent<HTMLElement>,
    item: PendingAttachment,
  ) => {
    if (event.key !== "Delete" && event.key !== "Backspace") return;
    event.preventDefault();
    removeAttachment(item);
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
            截图
            {enableScreenshot && screenshotShortcut !== "None" && (
              <em className="tool-shortcut">{screenshotShortcut}</em>
            )}
          </span>
        </button>
        <span className="composer-tool-separator" aria-hidden="true" />
        {leadingTools}
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
        <EmojiPanel
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
          </div>
          <p>位置、名片等发送能力需要完整选择器和服务端联调后再开放。</p>
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
      <input
        ref={attachmentInputRef}
        className="hidden-file-input"
        data-testid="composer-attachment-input"
        type="file"
        multiple
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = "";
          if (files.length) addFiles(files);
        }}
      />
      <input
        ref={imageInputRef}
        className="hidden-file-input"
        data-testid="composer-image-input"
        type="file"
        accept="image/*"
        multiple
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = "";
          if (files.length) addFiles(files);
        }}
      />
      <input
        ref={fileInputRef}
        className="hidden-file-input"
        data-testid="composer-file-input"
        type="file"
        multiple
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = "";
          if (files.length) addFiles(files);
        }}
      />
      {attachments.length > 0 && attachmentUi === "legacy" && (
        <div className="composer-attachments" aria-label="待发送附件">
          {attachments.map((item) => (
            <article className="composer-attachment" key={item.id}>
              {item.kind === "image" && item.previewUrl ? (
                <img src={item.previewUrl} alt={item.file.name || "待发送图片"} />
              ) : (
                <span
                  className={`composer-attachment-icon ${fileAttachmentVisual(item.file.name).kind}`}
                  aria-hidden="true"
                >
                  <span className="file-type-glyph">
                    {fileAttachmentVisual(item.file.name).label}
                  </span>
                </span>
              )}
              <span>
                <strong>{item.file.name || composerMediaKindLabel(item.kind)}</strong>
                <small>{formatFileSize(item.file.size)}</small>
              </span>
              <button
                type="button"
                aria-label={`移除 ${item.file.name || "附件"}`}
                onClick={() => removeAttachment(item)}
              >
                <X size={13} />
              </button>
            </article>
          ))}
        </div>
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
      {compactComposer && lexicalAttachments.length > 0 && (
        <div className="composer-top-attachments" aria-label="待发送附件">
          {lexicalAttachments.map((item) => (
            <article className={`composer-top-attachment ${item.kind}`} key={item.id}>
              {item.kind === "image" && item.previewUrl ? (
                <button
                  className="composer-top-attachment-thumb"
                  type="button"
                  aria-label={`预览待发送图片 ${item.file.name}`}
                  onClick={() => setPreviewAttachment(item)}
                >
                  <img src={item.previewUrl} alt={item.file.name || "待发送图片"} />
                </button>
              ) : (
                <>
                  <span className="composer-top-attachment-copy">
                    <strong>{item.file.name || "文件"}</strong>
                    <small>{item.error || formatFileSize(item.file.size)}</small>
                  </span>
                  <span
                    className={`composer-top-attachment-icon ${
                      fileAttachmentVisual(item.file.name).kind
                    }`}
                    aria-hidden="true"
                  >
                    <span className="file-type-glyph">
                      {fileAttachmentVisual(item.file.name).label}
                    </span>
                  </span>
                </>
              )}
              <button
                className="composer-top-attachment-remove"
                type="button"
                aria-label={`移除 ${item.file.name || "附件"}`}
                onClick={() => removeLexicalAttachment(item.id)}
              >
                <X size={12} />
              </button>
            </article>
          ))}
        </div>
      )}
      <div
        className={`${dense ? "h-input-row" : "composer-input"} ${
          compactComposer && lexicalAttachments.length > 0
            ? "has-rich-attachments"
            : ""
        }`}
      >
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
              if (
                (event.key === "Delete" || event.key === "Backspace") &&
                !draft &&
                attachments.length > 0
              ) {
                event.preventDefault();
                removeSelectedOrLastAttachment();
                return;
              }
              if (event.key !== "Enter" || event.shiftKey) return;
              if (!event.ctrlKey && !event.metaKey && !event.altKey) {
                event.preventDefault();
                void sendDraft();
              }
            }}
          />
        )}
      </div>
      {previewAttachment?.previewUrl && (
        <div
          className="composer-attachment-preview"
          role="dialog"
          aria-modal="true"
          aria-label="待发送图片预览"
          onClick={() => setPreviewAttachment(null)}
        >
          <button
            className="composer-attachment-preview-close"
            type="button"
            aria-label="关闭待发送图片预览"
            onClick={() => setPreviewAttachment(null)}
          >
            <X size={18} />
          </button>
          <img
            src={previewAttachment.previewUrl}
            alt={previewAttachment.file.name || "待发送图片"}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </footer>
  );
}

function composerMediaKindFromFile(file: File): ComposerMediaKind {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "file";
}

function composerMediaKindLabel(kind: ComposerMediaKind) {
  if (kind === "image") return "图片";
  if (kind === "video") return "视频";
  return "文件";
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

function formatFileSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function fileAttachmentVisual(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (["mp4", "mov", "m4v", "webm", "avi", "mkv"].includes(extension)) {
    return { kind: "video", label: "▶" };
  }
  if (["zip", "rar", "7z", "tar", "gz"].includes(extension)) {
    return { kind: "archive", label: "ZIP" };
  }
  if (["xls", "xlsx", "csv"].includes(extension)) return { kind: "sheet", label: "X" };
  if (extension === "pdf") return { kind: "pdf", label: "PDF" };
  if (["doc", "docx"].includes(extension)) return { kind: "word", label: "W" };
  if (["ppt", "pptx"].includes(extension)) return { kind: "slide", label: "P" };
  if (["txt", "log", "md"].includes(extension)) return { kind: "document", label: "TXT" };
  return { kind: "document", label: extension ? extension.slice(0, 3).toUpperCase() : "DOC" };
}

function dataUrlToFile(dataUrl: string, fileName: string) {
  const [meta = "", data = ""] = dataUrl.split(",");
  const mime = /data:([^;]+);base64/i.exec(meta)?.[1] ?? "image/png";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new File([bytes], fileName, { type: mime });
}

function matchesScreenshotShortcut(
  event: KeyboardEvent,
  shortcut: ScreenshotShortcut,
) {
  const key = event.key.toLowerCase();
  const ctrl = event.ctrlKey || event.metaKey;
  if (shortcut === "Alt+A") {
    return key === "a" && event.altKey && !ctrl && !event.shiftKey;
  }
  if (shortcut === "Ctrl+Alt+A") {
    return key === "a" && ctrl && event.altKey && !event.shiftKey;
  }
  if (shortcut === "Ctrl+Shift+A") {
    return key === "a" && ctrl && event.shiftKey && !event.altKey;
  }
  return false;
}

function revokePreviewUrl(
  url: string,
  ref: MutableRefObject<string[]>,
) {
  URL.revokeObjectURL(url);
  ref.current = ref.current.filter((item) => item !== url);
}

function ensureTrailingTextPart(parts: ComposerPart[]) {
  const normalized: ComposerPart[] = [];
  for (const part of parts) {
    if (part.type === "text") {
      const previous = normalized.at(-1);
      if (previous?.type === "text") {
        previous.text += part.text;
      } else {
        normalized.push(part);
      }
      continue;
    }
    normalized.push(part);
  }
  if (normalized.length === 0 || normalized.at(-1)?.type !== "text") {
    normalized.push({
      id: `composer-text-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: "text",
      text: "",
    });
  }
  return normalized;
}

function richTextFromParts(parts: ComposerPart[]) {
  return parts
    .filter((part): part is Extract<ComposerPart, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function richPreviewFromParts(parts: ComposerPart[], attachments: PendingAttachment[]) {
  return parts
    .map((part) => {
      if (part.type === "text") return part.text;
      const attachment = attachments.find((item) => item.id === part.attachmentId);
      return attachment?.kind === "file" ? "[文件]" : "[图片]";
    })
    .join("")
    .trim();
}

function readRichPartsFromEditor(
  editor: HTMLDivElement | null,
  fallback: ComposerPart[],
) {
  if (!editor) return ensureTrailingTextPart(fallback);
  const childNodes = Array.from(editor.childNodes);
  const markedNodes = Array.from(
    editor.querySelectorAll<HTMLElement>("[data-composer-part]"),
  );
  if (childNodes.length === 0 || markedNodes.length === 0) {
    const fallbackTextPart = fallback.find(
      (part): part is Extract<ComposerPart, { type: "text" }> => part.type === "text",
    );
    return ensureTrailingTextPart([
      {
        id: fallbackTextPart?.id ?? `composer-text-${Date.now()}`,
        type: "text",
        text: editor.textContent ?? "",
      },
    ]);
  }
  const fallbackTextIds = fallback
    .filter((part): part is Extract<ComposerPart, { type: "text" }> => part.type === "text")
    .map((part) => part.id);
  let textIndex = 0;
  const parts = childNodes.flatMap((node): ComposerPart[] => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      return text
        ? [
            {
              id:
                fallbackTextIds[textIndex++] ??
                `composer-text-${Date.now()}-${textIndex}`,
              type: "text",
              text,
            },
          ]
        : [];
    }
    if (!(node instanceof HTMLElement)) return [];
    if (node.dataset.composerPart === "attachment") {
      const attachmentId = node.dataset.attachmentId;
      return attachmentId
        ? [{ id: `part-${attachmentId}`, type: "attachment", attachmentId }]
        : [];
    }
    if (node.dataset.composerPart !== "text") {
      const text = node.textContent ?? "";
      return text
        ? [
            {
              id:
                fallbackTextIds[textIndex++] ??
                `composer-text-${Date.now()}-${textIndex}`,
              type: "text",
              text,
            },
          ]
        : [];
    }
    const fallbackPart = fallback.find(
      (part) => part.type === "text" && part.id === node.dataset.textPartId,
    );
    textIndex += 1;
    return [
      {
        id:
          node.dataset.textPartId ||
          fallbackPart?.id ||
          `composer-text-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        type: "text",
        text: node.textContent ?? "",
      },
    ];
  });
  return ensureTrailingTextPart(parts);
}

function getCaretOffsetInTextPart(
  editor: HTMLDivElement | null,
  partId: string,
  options: { coerceZeroToEnd?: boolean } = { coerceZeroToEnd: true },
) {
  const textNode = queryTextPart(editor, partId);
  if (!textNode) return editor?.textContent?.length ?? 0;
  const textLength = textNode.textContent?.length ?? 0;
  const activeElement = document.activeElement;
  if (activeElement !== textNode && !textNode.contains(activeElement)) {
    return textLength;
  }
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return textLength;
  const range = selection.getRangeAt(0);
  if (!textNode.contains(range.startContainer)) return textLength;
  const before = range.cloneRange();
  before.selectNodeContents(textNode);
  before.setEnd(range.startContainer, range.startOffset);
  const offset = before.toString().length;
  return options.coerceZeroToEnd && offset === 0 && textLength > 0 ? textLength : offset;
}

function findAdjacentAttachmentAtCaret(
  editor: HTMLDivElement | null,
  parts: ComposerPart[],
  key: "Backspace" | "Delete",
) {
  if (!editor) return undefined;
  const activeText = parts.find(
    (part): part is Extract<ComposerPart, { type: "text" }> =>
      part.type === "text" &&
      document.activeElement === queryTextPart(editor, part.id),
  );
  if (!activeText) return undefined;
  const offset = getCaretOffsetInTextPart(editor, activeText.id, {
    coerceZeroToEnd: false,
  });
  const partIndex = parts.findIndex((part) => part.id === activeText.id);
  if (key === "Backspace" && offset === 0) {
    const previous = parts[partIndex - 1];
    return previous?.type === "attachment" ? previous : undefined;
  }
  if (key === "Delete" && offset >= activeText.text.length) {
    const next = parts[partIndex + 1];
    return next?.type === "attachment" ? next : undefined;
  }
  return undefined;
}

function focusTextPart(editor: HTMLDivElement | null, partId?: string) {
  if (!editor) return;
  const target =
    (partId ? queryTextPart(editor, partId) : null) ??
    editor.querySelector<HTMLElement>("[data-composer-part='text']");
  if (!target) return;
  target.focus();
  const range = document.createRange();
  range.selectNodeContents(target);
  range.collapse(false);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function insertTextIntoRichEditor(editor: HTMLDivElement | null, text: string) {
  if (!editor) return;
  editor.focus();
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !editor.contains(selection.anchorNode)) {
    focusTextPart(editor);
  }
  const activeSelection = window.getSelection();
  if (!activeSelection || activeSelection.rangeCount === 0) return;
  activeSelection.deleteFromDocument();
  activeSelection.getRangeAt(0).insertNode(document.createTextNode(text));
  activeSelection.collapseToEnd();
  editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
}

function queryTextPart(editor: HTMLDivElement | null, partId: string) {
  if (!editor) return null;
  return editor.querySelector<HTMLElement>(
    `[data-text-part-id="${cssEscape(partId)}"]`,
  );
}

function cssEscape(value: string) {
  return globalThis.CSS?.escape ? globalThis.CSS.escape(value) : value.replace(/"/g, '\\"');
}

function focusComposerInput(
  ref: MutableRefObject<HTMLTextAreaElement | null>,
  richRef?: MutableRefObject<HTMLDivElement | null>,
  compact = false,
  lexicalRef?: MutableRefObject<LexicalChatInputHandle | null>,
) {
  requestAnimationFrame(() => {
    if (compact && lexicalRef?.current) {
      lexicalRef.current.focus();
      window.setTimeout(() => lexicalRef.current?.focus(), 0);
      return;
    }
    if (compact && richRef?.current) {
      focusTextPart(richRef.current);
      window.setTimeout(() => focusTextPart(richRef.current), 0);
      return;
    }
    ref.current?.focus();
    window.setTimeout(() => ref.current?.focus(), 0);
  });
}

function EmojiPanel({
  onPick,
  recentEmojis,
}: {
  onPick: (emoji: WechatEmojiItem) => void;
  recentEmojis: WechatEmojiItem[];
}) {
  return (
    <div className="composer-emoji-panel" role="dialog" aria-label="表情选择">
      <section>
        <h4>最近使用</h4>
        {recentEmojis.length > 0 && (
          <div className="composer-emoji-grid">
            {recentEmojis.slice(0, 8).map((emoji) => (
              <button
                type="button"
                key={emoji.id}
                aria-label={`表情 ${emoji.label}`}
                title={emoji.label}
                onClick={() => onPick(emoji)}
              >
                <span>{emoji.value}</span>
              </button>
            ))}
          </div>
        )}
      </section>
      <section>
        <h4>所有表情</h4>
        <div className="composer-emoji-grid">
          {wechatEmojiItems.map((emoji) => (
            <button
              type="button"
              key={emoji.id}
              aria-label={`表情 ${emoji.label}`}
              title={emoji.label}
              onClick={() => onPick(emoji)}
            >
              <span>{emoji.value}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
