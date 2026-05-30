import {
  $applyNodeReplacement,
  DecoratorNode,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import type { ComposerMediaKind } from "../composer/domain/detectComposerMediaKind";
import { composerMediaKindLabel } from "../composer/presentation/composerAttachmentPresentation";
import type { ComposerAttachmentPayload } from "../composer/domain/composerDocument";
import { LexicalAttachmentNodeView } from "./LexicalAttachmentNodeView";

export type LexicalPendingAttachment = {
  id: string;
  file: File;
  kind: ComposerMediaKind;
  previewUrl?: string;
  status?: "ready" | "failed";
  error?: string;
};

type AttachmentPayload = ComposerAttachmentPayload;

type SerializedAttachmentNode = Spread<
  AttachmentPayload & {
    type: "composer-attachment";
    version: 1;
  },
  SerializedLexicalNode
>;

export class AttachmentNode extends DecoratorNode<JSX.Element> {
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

  isKeyboardSelectable(): false {
    return false;
  }

  getPayload(): AttachmentPayload {
    return this.__payload;
  }

  setStatus(status: "ready" | "failed", error?: string) {
    const writable = this.getWritable();
    writable.__payload = { ...writable.__payload, status, error };
  }

  decorate(): JSX.Element {
    return <LexicalAttachmentNodeView payload={this.__payload} />;
  }
}

export function $createAttachmentNode(item: LexicalPendingAttachment) {
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

export function $createAttachmentNodeFromPayload(payload: AttachmentPayload) {
  return $applyNodeReplacement(new AttachmentNode(payload));
}

export function $isAttachmentNode(
  node: LexicalNode | null | undefined,
): node is AttachmentNode {
  return node instanceof AttachmentNode;
}
