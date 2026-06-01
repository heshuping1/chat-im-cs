import {
  Copy,
  Download,
  Edit3,
  FileImage,
  FileText,
  FolderOpen,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";

import type { MessageItemDto } from "../../data/api-client";
import { normalizeMessageType } from "../../data/im-message-normalize";
import { getCurrentMediaActionCapabilities } from "../../messages/runtime/mediaActionCapabilities";
import { revealInFolderLabel } from "../../messages/runtime/messageMediaActions";

export type ServiceMessageContextAction =
  | "ai_reply"
  | "copy_image"
  | "copy_media"
  | "open_media"
  | "edit_media"
  | "save_media_as"
  | "reveal_in_folder";

export function ServiceMessageContextMenu({
  message,
  onAction,
  canAiDraft = false,
  position,
}: {
  canAiDraft?: boolean;
  message: MessageItemDto;
  onAction: (action: ServiceMessageContextAction) => void;
  position: { x: number; y: number };
}) {
  const isImage = isImageMessage(message);
  const isVideo = isVideoMessage(message);
  const { canCopyMediaFile } = getCurrentMediaActionCapabilities();
  const items: Array<{
    action: ServiceMessageContextAction;
    label: string;
    icon: ReactNode;
  }> = [
    ...(canAiDraft && isTextMessage(message)
      ? [
          {
            action: "ai_reply" as const,
            label: "AI 起草",
            icon: <Sparkles size={15} />,
          },
        ]
      : []),
    ...(isImage || canCopyMediaFile
      ? [
          {
            action: isImage ? ("copy_image" as const) : ("copy_media" as const),
            label: "复制",
            icon: isImage ? <FileImage size={15} /> : <Copy size={15} />,
          },
        ]
      : []),
    {
      action: "save_media_as",
      label: "另存为...",
      icon: <Download size={15} />,
    },
    {
      action: "open_media",
      label: "打开",
      icon: <FileText size={15} />,
    },
    ...(!isVideo
      ? [
          {
            action: "edit_media" as const,
            label: "编辑",
            icon: <Edit3 size={15} />,
          },
        ]
      : []),
    {
      action: "reveal_in_folder",
      label: revealInFolderLabel(),
      icon: <FolderOpen size={15} />,
    },
  ];
  const visibleItems = items.filter(
    (item) => !isVideo || (item.action !== "copy_media" && item.action !== "save_media_as"),
  );
  return (
    <div
      className="message-context-menu"
      role="menu"
      style={{ left: position.x, top: position.y }}
      onClick={(event) => event.stopPropagation()}
    >
      {visibleItems.map((item) => (
        <button key={item.action} type="button" role="menuitem" onClick={() => onAction(item.action)}>
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

function isImageMessage(message: MessageItemDto) {
  const type = normalizeMessageType(message);
  return type.includes("image") || Boolean(message.body?.image);
}

function isVideoMessage(message: MessageItemDto) {
  const type = normalizeMessageType(message);
  return type.includes("video") || Boolean(message.body?.video);
}

export function isServiceAiDraftableMessage(message: MessageItemDto) {
  return isTextMessage(message);
}

function isTextMessage(message: MessageItemDto) {
  const type = normalizeMessageType(message);
  return (
    type.includes("text") ||
    typeof message.body?.text === "string" ||
    typeof message.body?.content === "string" ||
    typeof message.preview === "string"
  );
}
