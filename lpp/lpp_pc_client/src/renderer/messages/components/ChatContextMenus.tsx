import {
  BellOff,
  CheckSquare,
  Copy,
  Download,
  Edit3,
  FileImage,
  FileText,
  FolderOpen,
  Forward,
  Languages,
  Reply,
  Star,
  Pin,
  TextCursorInput,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import type { ReactNode } from "react";

import {
  getMessageContextActionAvailability,
  type MessageContextAction,
  type MessageContextMenuState,
} from "../models/messageContextMenuModel";
import type { ConversationContextAction } from "../models/messageConversationActionModel";
import { useI18n } from "../../i18n/useI18n";

type Translate = ReturnType<typeof useI18n>["t"];

type MessageMenuItem = {
  action: MessageContextAction;
  danger?: boolean;
  icon: ReactNode;
  label: string;
};

export function MessageContextMenu({
  onAction,
  position,
  state,
}: {
  onAction: (action: MessageContextAction) => void;
  position: { x: number; y: number };
  state: MessageContextMenuState;
}) {
  const { t } = useI18n();
  const items = buildMessageContextMenuItems(state, t);

  return (
    <div
      className="message-context-menu"
      role="menu"
      style={{ left: position.x, top: position.y }}
      onClick={(event) => event.stopPropagation()}
    >
      {items.map((item) => (
        <button
          className={item.danger ? "danger" : ""}
          key={item.action}
          type="button"
          role="menuitem"
          onClick={() => onAction(item.action)}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

export function ConversationContextMenu({
  isPinned,
  isMuted,
  onAction,
  position,
}: {
  isPinned: boolean;
  isMuted: boolean;
  onAction: (action: ConversationContextAction) => void;
  position: { x: number; y: number };
}) {
  const { t } = useI18n();

  return (
    <div
      className="message-context-menu"
      role="menu"
      style={{ left: position.x, top: position.y }}
      onClick={(event) => event.stopPropagation()}
    >
      <button type="button" role="menuitem" onClick={() => onAction("pin")}>
        <Pin size={15} />
        <span>
          {isPinned
            ? t("messages.conversationInfo.actions.unpin")
            : t("messages.conversationInfo.actions.pin")}
        </span>
      </button>
      <button type="button" role="menuitem" onClick={() => onAction("mute")}>
        <BellOff size={15} />
        <span>
          {isMuted
            ? t("messages.contextMenu.conversation.unmute")
            : t("messages.contextMenu.conversation.mute")}
        </span>
      </button>
      <button type="button" role="menuitem" onClick={() => onAction("hide")}>
        <X size={15} />
        <span>{t("messages.contextMenu.conversation.hide")}</span>
      </button>
      <button className="danger" type="button" role="menuitem" onClick={() => onAction("delete")}>
        <Trash2 size={15} />
        <span>{t("messages.contextMenu.conversation.delete")}</span>
      </button>
    </div>
  );
}

function buildMessageContextMenuItems(state: MessageContextMenuState, t: Translate) {
  const actions = getMessageContextActionAvailability(state);
  const fallbackItems: MessageMenuItem[] = [
    ...(actions.multi_select
      ? [
          {
            action: "multi_select" as const,
            label: t("messages.contextMenu.action.multiSelect"),
            icon: <CheckSquare size={15} />,
          },
          { action: "reply" as const, label: t("messages.contextMenu.action.reply"), icon: <Reply size={15} /> },
        ]
      : []),
    ...(actions.copy
      ? [
          { action: "copy" as const, label: t("messages.contextMenu.action.copy"), icon: <Copy size={15} /> },
          {
            action: "translate" as const,
            label: t("messages.contextMenu.action.translate"),
            icon: <Languages size={15} />,
          },
        ]
      : []),
    ...(actions.copy_image
      ? [
          {
            action: "copy_image" as const,
            label: t("messages.contextMenu.action.copyImage"),
            icon: <FileImage size={15} />,
          },
        ]
      : []),
    ...(actions.voice_to_text
      ? [
          {
            action: "voice_to_text" as const,
            label: t("messages.contextMenu.action.voiceToText"),
            icon: <TextCursorInput size={15} />,
          },
        ]
      : []),
    ...(actions.save_media_as
      ? [
          {
            action: "save_media_as" as const,
            label: t("messages.contextMenu.action.saveAs"),
            icon: <Download size={15} />,
          },
          {
            action: "reveal_in_folder" as const,
            label: t("messages.contextMenu.action.revealInFolder"),
            icon: <FolderOpen size={15} />,
          },
        ]
      : []),
    ...(actions.forward
      ? [
          { action: "forward" as const, label: t("messages.contextMenu.action.forward"), icon: <Forward size={15} /> },
          { action: "favorite" as const, label: t("messages.contextMenu.action.favorite"), icon: <Star size={15} /> },
        ]
      : []),
    ...(actions.recall
      ? [
          {
            action: "recall" as const,
            label: t("messages.contextMenu.action.recall"),
            icon: <Undo2 size={15} />,
            danger: true,
          },
        ]
      : []),
    { action: "delete", label: t("messages.contextMenu.action.delete"), icon: <Trash2 size={15} />, danger: true },
  ];
  const mediaItems: MessageMenuItem[] = [
    ...(actions.copy_image || actions.copy_media
      ? [
          {
            action: state.isImage ? ("copy_image" as const) : ("copy_media" as const),
            label: t("messages.contextMenu.action.copy"),
            icon: state.isImage ? <FileImage size={15} /> : <Copy size={15} />,
          },
        ]
      : []),
    ...(actions.save_media_as
      ? [
          {
            action: "save_media_as" as const,
            label: t("messages.contextMenu.action.saveAsEllipsis"),
            icon: <Download size={15} />,
          },
        ]
      : []),
    ...(actions.open_media
      ? [{ action: "open_media" as const, label: t("messages.contextMenu.action.open"), icon: <FileText size={15} /> }]
      : []),
    ...(actions.edit_media
      ? [{ action: "edit_media" as const, label: t("messages.contextMenu.action.edit"), icon: <Edit3 size={15} /> }]
      : []),
    ...(actions.reveal_in_folder
      ? [
          {
            action: "reveal_in_folder" as const,
            label: t("messages.contextMenu.action.revealInFolder"),
            icon: <FolderOpen size={15} />,
          },
        ]
      : []),
    ...(actions.forward
      ? [
          {
            action: "forward" as const,
            label: t("messages.contextMenu.action.forwardEllipsis"),
            icon: <Forward size={15} />,
          },
          { action: "favorite" as const, label: t("messages.contextMenu.action.favorite"), icon: <Star size={15} /> },
          {
            action: "multi_select" as const,
            label: t("messages.contextMenu.action.multiSelect"),
            icon: <CheckSquare size={15} />,
          },
          { action: "reply" as const, label: t("messages.contextMenu.action.reply"), icon: <Reply size={15} /> },
        ]
      : []),
    ...(actions.recall
      ? [
          {
            action: "recall" as const,
            label: t("messages.contextMenu.action.recall"),
            icon: <Undo2 size={15} />,
            danger: true,
          },
        ]
      : []),
    { action: "delete", label: t("messages.contextMenu.action.delete"), icon: <Trash2 size={15} />, danger: true },
  ];

  if (!state.hasMedia) return fallbackItems;
  return mediaItems;
}
