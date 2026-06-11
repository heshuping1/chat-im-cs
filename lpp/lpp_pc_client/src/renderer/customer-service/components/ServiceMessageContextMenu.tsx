import {
  Copy,
  Download,
  Edit3,
  FileImage,
  FileText,
  FolderOpen,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";

import type { MessageItemDto } from "../../data/api-client";
import { normalizeMessageType } from "../../data/im-message-normalize";
import { useI18n } from "../../i18n/useI18n";
import {
  createMessageContextMenuState,
  getMessageContextActionAvailability,
} from "../../messages/models/messageContextMenuModel";
import { getCurrentMediaActionCapabilities } from "../../messages/runtime/mediaActionCapabilities";
import { revealInFolderLabel } from "../../messages/runtime/messageMediaActions";

export type ServiceMessageContextAction =
  | "ai_reply"
  | "copy_image"
  | "copy_media"
  | "open_media"
  | "edit_media"
  | "save_media_as"
  | "reveal_in_folder"
  | "recall";

export function ServiceMessageContextMenu({
  mine,
  message,
  onAction,
  canAiDraft = false,
  position,
}: {
  canAiDraft?: boolean;
  mine?: boolean;
  message: MessageItemDto;
  onAction: (action: ServiceMessageContextAction) => void;
  position: { x: number; y: number };
}) {
  const { t } = useI18n();
  const isImage = isImageMessage(message);
  const isVideo = isVideoMessage(message);
  const { canCopyMediaFile } = getCurrentMediaActionCapabilities();
  const availability = getMessageContextActionAvailability(
    createMessageContextMenuState({
      canCopyMediaFile,
      message,
      mine: Boolean(mine),
      recallWindowMinutes: Number.POSITIVE_INFINITY,
      revealInFolderLabel: revealInFolderLabel(),
    }),
  );
  const items: Array<{
    action: ServiceMessageContextAction;
    label: string;
    icon: ReactNode;
  }> = [
    ...(availability.recall
      ? [
          {
            action: "recall" as const,
            label: t("messages.contextMenu.action.silentRecall"),
            icon: <RotateCcw size={15} />,
          },
        ]
      : []),
    ...(canAiDraft && isTextMessage(message)
      ? [
          {
            action: "ai_reply" as const,
            label: t("composer.aiDraft"),
            icon: <Sparkles size={15} />,
          },
        ]
      : []),
    ...(availability.copy_image || availability.copy_media
      ? [
          {
            action: isImage ? ("copy_image" as const) : ("copy_media" as const),
            label: t("common.copy"),
            icon: isImage ? <FileImage size={15} /> : <Copy size={15} />,
          },
        ]
      : []),
    ...(availability.save_media_as
      ? [
          {
            action: "save_media_as" as const,
            label: t("common.saveAs"),
            icon: <Download size={15} />,
          },
        ]
      : []),
    ...(availability.open_media
      ? [
          {
            action: "open_media" as const,
            label: t("common.open"),
            icon: <FileText size={15} />,
          },
        ]
      : []),
    ...(availability.edit_media && !isVideo
      ? [
          {
            action: "edit_media" as const,
            label: t("common.edit"),
            icon: <Edit3 size={15} />,
          },
        ]
      : []),
    ...(availability.reveal_in_folder
      ? [
          {
            action: "reveal_in_folder" as const,
            label: revealInFolderLabel(),
            icon: <FolderOpen size={15} />,
          },
        ]
      : []),
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

export function isServiceSilentRecallableMessage(message: MessageItemDto, mine: boolean) {
  return getMessageContextActionAvailability(
    createMessageContextMenuState({
      canCopyMediaFile: false,
      message,
      mine,
      recallWindowMinutes: Number.POSITIVE_INFINITY,
      revealInFolderLabel: "",
    }),
  ).recall;
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
