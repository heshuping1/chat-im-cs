import {
  $applyNodeReplacement,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $insertNodes,
  $isElementNode,
  $isLineBreakNode,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  DecoratorNode,
  DROP_COMMAND,
  KEY_ENTER_COMMAND,
  PASTE_COMMAND,
  type EditorState,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type MutableRefObject,
} from "react";
import type { ComposerMediaKind } from "./MessageComposer";

export type LexicalPendingAttachment = {
  id: string;
  file: File;
  kind: ComposerMediaKind;
  previewUrl?: string;
  status?: "ready" | "failed";
  error?: string;
};

type AttachmentPayload = {
  id: string;
  kind: ComposerMediaKind;
  fileName: string;
  size: number;
  previewUrl?: string;
  status?: "ready" | "failed";
  error?: string;
};

type SerializedAttachmentNode = Spread<
  AttachmentPayload & {
    type: "composer-attachment";
    version: 1;
  },
  SerializedLexicalNode
>;

export type LexicalSendPart =
  | { type: "text"; text: string }
  | { type: "attachment"; attachment: LexicalPendingAttachment };

export type LexicalDraftPart =
  | { type: "text"; text: string }
  | { type: "attachment"; payload: AttachmentPayload };

export type LexicalChatInputHandle = {
  focus: () => void;
  insertText: (text: string) => void;
  insertAttachments: (attachments: LexicalPendingAttachment[]) => void;
  getSendableParts: () => LexicalSendPart[];
  replaceWithDraftParts: (parts: LexicalDraftPart[]) => void;
  markAttachmentFailed: (attachmentId: string, error: string) => void;
  clear: () => void;
};

export const LexicalChatInput = forwardRef<
  LexicalChatInputHandle,
  {
    scopeKey: string;
    placeholder: string;
    disabled?: boolean;
    editorState?: string;
    attachments: LexicalPendingAttachment[];
    onDraftChange: (snapshot: {
      editorState: string;
      text: string;
      preview: string;
      attachmentIds: string[];
    }) => void;
    onSend: () => void;
    onFiles: (files: FileList | File[]) => void;
    onPreviewAttachment: (attachmentId: string) => void;
    onRemoveAttachment: (attachmentId: string) => void;
    onAttachmentIdsChange: (attachmentIds: string[]) => void;
    onReady?: () => void;
  }
>(function LexicalChatInput(
  {
    scopeKey,
    placeholder,
    disabled = false,
    editorState,
    attachments,
    onDraftChange,
    onSend,
    onFiles,
    onPreviewAttachment,
    onRemoveAttachment,
    onAttachmentIdsChange,
    onReady,
  },
  ref,
) {
  const editorRef = useRef<LexicalEditor | null>(null);
  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;

  const attachmentById = useCallback(
    (attachmentId: string) =>
      attachmentsRef.current.find((item) => item.id === attachmentId),
    [],
  );

  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        editorRef.current?.focus();
      },
      insertText: (text) => {
        const editor = editorRef.current;
        if (!editor) return;
        editor.update(() => {
          ensureRangeSelection();
          $insertNodes([$createTextNode(text)]);
        });
        editor.focus();
      },
      insertAttachments: (items) => {
        const editor = editorRef.current;
        if (!editor || items.length === 0) return;
        editor.update(() => {
          ensureRangeSelection();
          $insertNodes(items.map((item) => $createAttachmentNode(item)));
          $insertNodes([$createTextNode("")]);
        });
        editor.focus();
      },
      getSendableParts: () => {
        const editor = editorRef.current;
        if (!editor) return [];
        let parts: LexicalSendPart[] = [];
        editor.getEditorState().read(() => {
          parts = collectDraftParts().flatMap((part): LexicalSendPart[] => {
            if (part.type === "text") {
              const text = part.text.trim();
              return text ? [{ type: "text", text }] : [];
            }
            const attachment = attachmentById(part.payload.id);
            return attachment ? [{ type: "attachment", attachment }] : [];
          });
        });
        return parts;
      },
      replaceWithDraftParts: (parts) => {
        const editor = editorRef.current;
        if (!editor) return;
        editor.update(() => {
          rebuildDocument(parts);
        });
        editor.focus();
      },
      markAttachmentFailed: (attachmentId, error) => {
        const editor = editorRef.current;
        if (!editor) return;
        editor.update(() => {
          for (const node of collectAttachmentNodes()) {
            if (node.getPayload().id === attachmentId) {
              node.setStatus("failed", error);
            }
          }
        });
      },
      clear: () => {
        const editor = editorRef.current;
        if (!editor) return;
        editor.update(() => {
          rebuildDocument([]);
        });
        editor.focus();
      },
    }),
    [attachmentById],
  );

  const initialConfig = {
    namespace: `pc-im-composer-${scopeKey}`,
    editable: !disabled,
    editorState: editorState || undefined,
    nodes: [AttachmentNode],
    onError(error: Error) {
      throw error;
    },
    theme: {
      paragraph: "lexical-chat-paragraph",
      text: {
        bold: "lexical-chat-text-bold",
      },
    },
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <EditorBridgePlugin
        disabled={disabled}
        editorRef={editorRef}
        onReady={onReady}
      />
      <HistoryPlugin />
      <RichTextPlugin
        contentEditable={
          <ContentEditable
            className="composer-lexical-editor"
            aria-label={placeholder}
          />
        }
        placeholder={
          <div className="composer-lexical-placeholder">{placeholder}</div>
        }
        ErrorBoundary={LexicalErrorBoundary}
      />
      <OnChangePlugin
        onChange={(state) => {
          const snapshot = createDraftSnapshot(state);
          onDraftChange(snapshot);
          onAttachmentIdsChange(snapshot.attachmentIds);
        }}
      />
      <ComposerCommandPlugin onSend={onSend} onFiles={onFiles} />
      <AttachmentEventPlugin
        onPreviewAttachment={onPreviewAttachment}
        onRemoveAttachment={onRemoveAttachment}
      />
    </LexicalComposer>
  );
});

class AttachmentNode extends DecoratorNode<JSX.Element> {
  __payload: AttachmentPayload;

  static getType(): string {
    return "composer-attachment";
  }

  static clone(node: AttachmentNode): AttachmentNode {
    return new AttachmentNode(node.__payload, node.__key);
  }

  static importJSON(serializedNode: SerializedAttachmentNode): AttachmentNode {
    const { type: _type, version: _version, ...payload } = serializedNode;
    return $createAttachmentNodeFromPayload(payload);
  }

  constructor(payload: AttachmentPayload, key?: NodeKey) {
    super(key);
    this.__payload = payload;
  }

  exportJSON(): SerializedAttachmentNode {
    return {
      ...this.__payload,
      type: "composer-attachment",
      version: 1,
    };
  }

  createDOM(): HTMLElement {
    const element = document.createElement("span");
    element.className = "composer-lexical-attachment-shell";
    return element;
  }

  updateDOM(): false {
    return false;
  }

  isInline(): true {
    return true;
  }

  getPayload(): AttachmentPayload {
    return this.__payload;
  }

  setStatus(status: "ready" | "failed", error?: string) {
    const writable = this.getWritable();
    writable.__payload = { ...writable.__payload, status, error };
  }

  decorate(): JSX.Element {
    return <AttachmentNodeView payload={this.__payload} />;
  }
}

function $createAttachmentNode(item: LexicalPendingAttachment) {
  return $applyNodeReplacement(
    new AttachmentNode({
      id: item.id,
      kind: item.kind,
      fileName: item.file.name || composerMediaKindLabel(item.kind),
      size: item.file.size,
      previewUrl: item.previewUrl,
      status: item.status ?? "ready",
      error: item.error,
    }),
  );
}

function $createAttachmentNodeFromPayload(payload: AttachmentPayload) {
  return $applyNodeReplacement(new AttachmentNode(payload));
}

function $isAttachmentNode(node: LexicalNode | null | undefined): node is AttachmentNode {
  return node instanceof AttachmentNode;
}

function AttachmentNodeView({ payload }: { payload: AttachmentPayload }) {
  const failed = payload.status === "failed";
  const fileIcon = fileAttachmentVisual(payload.fileName);
  return (
    <span
      className={`composer-attachment-card ${payload.kind} ${failed ? "failed" : ""}`}
      data-composer-part="attachment"
      data-attachment-id={payload.id}
      role="group"
      aria-label={`待发送${composerMediaKindLabel(payload.kind)} ${
        payload.fileName
      }`}
    >
      {payload.kind === "image" && payload.previewUrl ? (
        <button
          className="composer-attachment-thumb"
          type="button"
          aria-label={`预览待发送图片 ${payload.fileName}`}
          onClick={() => dispatchAttachmentEvent("preview", payload.id)}
        >
          <img src={payload.previewUrl} alt={payload.fileName} />
        </button>
      ) : (
        <>
          <span className="composer-attachment-copy">
            <strong>{payload.fileName || "文件"}</strong>
            <small>{payload.error || formatFileSize(payload.size) || "待发送"}</small>
          </span>
          <span
            className={`composer-attachment-file-icon ${fileIcon.kind}`}
            aria-hidden="true"
          >
            <span className="file-type-glyph">{fileIcon.label}</span>
          </span>
        </>
      )}
    </span>
  );
}

function composerMediaKindLabel(kind: ComposerMediaKind) {
  if (kind === "image") return "图片";
  if (kind === "video") return "视频";
  return "文件";
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

function EditorBridgePlugin({
  disabled,
  editorRef,
  onReady,
}: {
  disabled: boolean;
  editorRef: MutableRefObject<LexicalEditor | null>;
  onReady?: () => void;
}) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editorRef.current = editor;
    onReady?.();
    return () => {
      if (editorRef.current === editor) editorRef.current = null;
    };
  }, [editor, editorRef, onReady]);
  useEffect(() => {
    editor.setEditable(!disabled);
  }, [disabled, editor]);
  return null;
}

function ComposerCommandPlugin({
  onSend,
  onFiles,
}: {
  onSend: () => void;
  onFiles: (files: FileList | File[]) => void;
}) {
  const [editor] = useLexicalComposerContext();
  useEffect(
    () =>
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => {
          if (!event || event.shiftKey) return false;
          if (event.ctrlKey || event.metaKey || event.altKey) return false;
          event.preventDefault();
          onSend();
          return true;
        },
        COMMAND_PRIORITY_HIGH,
      ),
    [editor, onSend],
  );
  useEffect(
    () =>
      editor.registerCommand(
        PASTE_COMMAND,
        (event) => {
          if (!(event instanceof ClipboardEvent) || !event.clipboardData?.files.length) {
            return false;
          }
          event.preventDefault();
          onFiles(event.clipboardData.files);
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
    [editor, onFiles],
  );
  useEffect(
    () =>
      editor.registerCommand(
        DROP_COMMAND,
        (event) => {
          if (!event.dataTransfer?.files.length) return false;
          event.preventDefault();
          onFiles(event.dataTransfer.files);
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
    [editor, onFiles],
  );
  return null;
}

function AttachmentEventPlugin({
  onPreviewAttachment,
  onRemoveAttachment,
}: {
  onPreviewAttachment: (attachmentId: string) => void;
  onRemoveAttachment: (attachmentId: string) => void;
}) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    const handleEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ action: string; attachmentId: string }>).detail;
      if (!detail?.attachmentId) return;
      if (detail.action === "preview") {
        onPreviewAttachment(detail.attachmentId);
        return;
      }
      if (detail.action !== "remove") return;
      editor.update(() => {
        for (const node of collectAttachmentNodes()) {
          if (node.getPayload().id === detail.attachmentId) {
            node.remove();
          }
        }
      });
      onRemoveAttachment(detail.attachmentId);
    };
    window.addEventListener("pc-im-composer-attachment", handleEvent);
    return () => window.removeEventListener("pc-im-composer-attachment", handleEvent);
  }, [editor, onPreviewAttachment, onRemoveAttachment]);
  return null;
}

function dispatchAttachmentEvent(action: "preview" | "remove", attachmentId: string) {
  window.dispatchEvent(
    new CustomEvent("pc-im-composer-attachment", {
      detail: { action, attachmentId },
    }),
  );
}

function createDraftSnapshot(state: EditorState) {
  let parts: LexicalDraftPart[] = [];
  state.read(() => {
    parts = collectDraftParts();
  });
  const text = parts
    .filter((part): part is Extract<LexicalDraftPart, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("");
  const preview = parts
    .map((part) =>
      part.type === "text"
        ? part.text
        : part.payload.kind === "image"
          ? "[图片]"
          : part.payload.kind === "video"
            ? "[视频]"
          : "[文件]",
    )
    .join("")
    .trim();
  return {
    editorState: JSON.stringify(state.toJSON()),
    text,
    preview,
    attachmentIds: parts.flatMap((part) =>
      part.type === "attachment" ? [part.payload.id] : [],
    ),
  };
}

function collectDraftParts() {
  const root = $getRoot();
  const parts: LexicalDraftPart[] = [];
  root.getChildren().forEach((child, index, children) => {
    collectNodeParts(child, parts);
    if (index < children.length - 1) appendTextPart(parts, "\n");
  });
  return mergeTextParts(parts);
}

function collectNodeParts(node: LexicalNode, parts: LexicalDraftPart[]) {
  if ($isTextNode(node)) {
    appendTextPart(parts, node.getTextContent());
    return;
  }
  if ($isLineBreakNode(node)) {
    appendTextPart(parts, "\n");
    return;
  }
  if ($isAttachmentNode(node)) {
    parts.push({ type: "attachment", payload: node.getPayload() });
    return;
  }
  if ($isElementNode(node)) {
    node.getChildren().forEach((child) => collectNodeParts(child, parts));
  }
}

function appendTextPart(parts: LexicalDraftPart[], text: string) {
  if (!text) return;
  const previous = parts.at(-1);
  if (previous?.type === "text") {
    previous.text += text;
    return;
  }
  parts.push({ type: "text", text });
}

function mergeTextParts(parts: LexicalDraftPart[]) {
  const merged: LexicalDraftPart[] = [];
  for (const part of parts) {
    if (part.type === "text") {
      appendTextPart(merged, part.text);
      continue;
    }
    merged.push(part);
  }
  return merged;
}

function collectAttachmentNodes() {
  const nodes: AttachmentNode[] = [];
  const visit = (node: LexicalNode) => {
    if ($isAttachmentNode(node)) {
      nodes.push(node);
      return;
    }
    if ($isElementNode(node)) {
      node.getChildren().forEach(visit);
    }
  };
  $getRoot().getChildren().forEach(visit);
  return nodes;
}

function rebuildDocument(parts: LexicalDraftPart[]) {
  const root = $getRoot();
  root.clear();
  const paragraph = $createParagraphNode();
  const nextParts = parts.length > 0 ? parts : [{ type: "text", text: "" } as const];
  nextParts.forEach((part) => {
    if (part.type === "text") {
      paragraph.append($createTextNode(part.text));
      return;
    }
    paragraph.append($createAttachmentNodeFromPayload(part.payload));
  });
  root.append(paragraph);
  paragraph.selectEnd();
}

function ensureRangeSelection() {
  const selection = $getSelection();
  if ($isRangeSelection(selection)) return;
  const root = $getRoot();
  if (root.getChildrenSize() === 0) {
    root.append($createParagraphNode());
  }
  root.getLastChild()?.selectEnd();
}

function formatFileSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
