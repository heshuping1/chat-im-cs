import {
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
  DROP_COMMAND,
  INSERT_LINE_BREAK_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_ENTER_COMMAND,
  PASTE_COMMAND,
  type EditorState,
  type LexicalEditor,
  type LexicalNode,
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
import {
  appendComposerTextPart,
  composerDocumentAttachmentIds,
  composerDocumentPreview,
  composerDocumentText,
  composerSendPartsFromDocument,
  normalizeComposerDocumentParts,
  type ComposerDocumentPart,
} from "../composer/domain/composerDocument";
import {
  $createAttachmentNode,
  $createAttachmentNodeFromPayload,
  $isAttachmentNode,
  AttachmentNode,
  type LexicalPendingAttachment,
} from "./LexicalAttachmentNode";

export type { LexicalPendingAttachment } from "./LexicalAttachmentNode";

export type LexicalSendPart =
  | { type: "text"; text: string }
  | { type: "attachment"; attachment: LexicalPendingAttachment };

export type LexicalDraftPart = ComposerDocumentPart;

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
    onFiles: (files: FileList | File[]) => void | Promise<void>;
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
          const nodes = items.map((item) => $createAttachmentNode(item));
          $insertNodes(nodes);
          const lastNode = nodes.at(-1);
          if ($isAttachmentNode(lastNode)) {
            placeCaretAroundAttachment(lastNode, "after");
          }
        });
        editor.focus();
      },
      getSendableParts: () => {
        const editor = editorRef.current;
        if (!editor) return [];
        let parts: LexicalSendPart[] = [];
        editor.getEditorState().read(() => {
          parts = composerSendPartsFromDocument({
            parts: collectDraftParts(),
            attachmentById,
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
      <AttachmentCursorPlugin onRemoveAttachment={onRemoveAttachment} />
    </LexicalComposer>
  );
});

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

function isShiftEnterEvent(event: KeyboardEvent) {
  return (
    event.key === "Enter" &&
    event.shiftKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey
  );
}

function insertLineBreakAtSelection() {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return false;
  selection.insertLineBreak(false);
  return true;
}

function insertComposerLineBreak(editor: LexicalEditor) {
  editor.update(() => {
    ensureRangeSelection();
    insertLineBreakAtSelection();
  });
  editor.focus();
}

function ComposerCommandPlugin({
  onSend,
  onFiles,
}: {
  onSend: () => void;
  onFiles: (files: FileList | File[]) => void | Promise<void>;
}) {
  const [editor] = useLexicalComposerContext();
  useEffect(
    () =>
      editor.registerCommand(
        INSERT_LINE_BREAK_COMMAND,
        () => insertLineBreakAtSelection(),
        COMMAND_PRIORITY_HIGH,
      ),
    [editor],
  );
  useEffect(
    () =>
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => {
          if (!event) return false;
          if (isShiftEnterEvent(event)) {
            event.preventDefault();
            return insertLineBreakAtSelection();
          }
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

function AttachmentCursorPlugin({
  onRemoveAttachment,
}: {
  onRemoveAttachment: (attachmentId: string) => void;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(
    () =>
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        (event) => {
          const removed = removeAdjacentAttachment("backward", onRemoveAttachment);
          if (!removed) return false;
          event?.preventDefault();
          return true;
        },
        COMMAND_PRIORITY_HIGH,
      ),
    [editor, onRemoveAttachment],
  );

  useEffect(
    () =>
      editor.registerCommand(
        KEY_DELETE_COMMAND,
        (event) => {
          const removed = removeAdjacentAttachment("forward", onRemoveAttachment);
          if (!removed) return false;
          event?.preventDefault();
          return true;
        },
        COMMAND_PRIORITY_HIGH,
      ),
    [editor, onRemoveAttachment],
  );

  useEffect(() => {
    const root = editor.getRootElement();
    if (!root) return undefined;

    const placeFromPointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const attachmentElement = target.closest<HTMLElement>("[data-attachment-id]");
      if (attachmentElement && root.contains(attachmentElement)) {
        event.preventDefault();
        const rect = attachmentElement.getBoundingClientRect();
        const side = event.clientX < rect.left + rect.width / 2 ? "before" : "after";
        editor.focus();
        editor.update(() => {
          const node = findAttachmentNode(attachmentElement.dataset.attachmentId);
          if (node) placeCaretAroundAttachment(node, side);
        });
        return;
      }

      const lineAttachment = findAttachmentBeforeBlankClick(root, event);
      if (!lineAttachment) return;
      event.preventDefault();
      editor.focus();
      editor.update(() => {
        const node = findAttachmentNode(lineAttachment.dataset.attachmentId);
        if (node) placeCaretAroundAttachment(node, "after");
      });
    };

    root.addEventListener("pointerdown", placeFromPointer);
    return () => root.removeEventListener("pointerdown", placeFromPointer);
  }, [editor]);

  return null;
}

function removeAdjacentAttachment(
  direction: "backward" | "forward",
  onRemoveAttachment: (attachmentId: string) => void,
) {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;
  const node = adjacentAttachmentFromSelection(selection, direction);
  if (!node) return false;
  const attachmentId = node.getPayload().id;
  const parent = node.getParent();
  const index = node.getIndexWithinParent();
  node.remove();
  if (parent && $isElementNode(parent)) {
    const offset = Math.max(0, Math.min(index, parent.getChildrenSize()));
    parent.select(offset, offset);
  }
  onRemoveAttachment(attachmentId);
  return true;
}

function adjacentAttachmentFromSelection(
  selection: ReturnType<typeof $getSelection>,
  direction: "backward" | "forward",
) {
  if (!$isRangeSelection(selection)) return null;
  const anchor = selection.anchor;
  const anchorNode = anchor.getNode();

  if (anchor.type === "element" && $isElementNode(anchorNode)) {
    const offset = anchor.offset + (direction === "backward" ? -1 : 0);
    const candidate = anchorNode.getChildAtIndex(offset);
    return $isAttachmentNode(candidate) ? candidate : null;
  }

  if (anchor.type !== "text" || !$isTextNode(anchorNode)) return null;
  if (direction === "backward") {
    if (anchor.offset !== 0) return null;
    const candidate = anchorNode.getPreviousSibling();
    return $isAttachmentNode(candidate) ? candidate : null;
  }
  if (anchor.offset !== anchorNode.getTextContentSize()) return null;
  const candidate = anchorNode.getNextSibling();
  return $isAttachmentNode(candidate) ? candidate : null;
}

function findAttachmentNode(attachmentId?: string) {
  if (!attachmentId) return null;
  return collectAttachmentNodes().find((node) => node.getPayload().id === attachmentId) ?? null;
}

function placeCaretAroundAttachment(
  node: AttachmentNode,
  side: "before" | "after",
) {
  const parent = node.getParent();
  if (!parent || !$isElementNode(parent)) return;
  const index = node.getIndexWithinParent();
  const offset = side === "before" ? index : index + 1;
  parent.select(offset, offset);
}

function findAttachmentBeforeBlankClick(root: HTMLElement, event: PointerEvent) {
  const target = event.target;
  if (!(target instanceof Node) || !root.contains(target)) return null;
  if (target instanceof Element && target.closest("[data-attachment-id]")) return null;
  if (!isEditorSurfaceClick(root, target)) return null;
  const nativeCaret = caretRangeFromPoint(event.clientX, event.clientY);
  if (nativeCaret?.startContainer.nodeType === Node.TEXT_NODE) return null;

  const attachments = Array.from(
    root.querySelectorAll<HTMLElement>("[data-attachment-id]"),
  );
  let closest: HTMLElement | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;
  for (const item of attachments) {
    const rect = item.getBoundingClientRect();
    const withinLine = event.clientY >= rect.top - 4 && event.clientY <= rect.bottom + 4;
    if (!withinLine || event.clientX < rect.right) continue;
    const distance = event.clientX - rect.right;
    if (distance < closestDistance) {
      closest = item;
      closestDistance = distance;
    }
  }
  return closest;
}

function isEditorSurfaceClick(root: HTMLElement, target: Node) {
  if (target === root) return true;
  return target instanceof HTMLElement && target.classList.contains("lexical-chat-paragraph");
}

function caretRangeFromPoint(clientX: number, clientY: number) {
  if (document.caretRangeFromPoint) {
    return document.caretRangeFromPoint(clientX, clientY);
  }
  const caretPosition = document.caretPositionFromPoint?.(clientX, clientY);
  if (!caretPosition) return null;
  const range = document.createRange();
  range.setStart(caretPosition.offsetNode, caretPosition.offset);
  range.collapse(true);
  return range;
}

function createDraftSnapshot(state: EditorState) {
  let parts: LexicalDraftPart[] = [];
  state.read(() => {
    parts = collectDraftParts();
  });
  return {
    editorState: JSON.stringify(state.toJSON()),
    text: composerDocumentText(parts),
    preview: composerDocumentPreview(parts),
    attachmentIds: composerDocumentAttachmentIds(parts),
  };
}

function collectDraftParts() {
  const root = $getRoot();
  const parts: LexicalDraftPart[] = [];
  root.getChildren().forEach((child, index, children) => {
    collectNodeParts(child, parts);
    if (index < children.length - 1) appendTextPart(parts, "\n");
  });
  return normalizeComposerDocumentParts(parts);
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
  appendComposerTextPart(parts, text);
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
