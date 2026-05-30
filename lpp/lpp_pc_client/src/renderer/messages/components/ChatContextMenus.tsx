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
  Sparkles,
  Star,
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
  const items = buildMessageContextMenuItems(state);

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
  isMuted,
  onAction,
  position,
}: {
  isMuted: boolean;
  onAction: (action: "mute" | "hide" | "delete") => void;
  position: { x: number; y: number };
}) {
  return (
    <div
      className="message-context-menu"
      role="menu"
      style={{ left: position.x, top: position.y }}
      onClick={(event) => event.stopPropagation()}
    >
      <button type="button" role="menuitem" onClick={() => onAction("mute")}>
        <BellOff size={15} />
        <span>{isMuted ? "取消免打扰" : "消息免打扰"}</span>
      </button>
      <button type="button" role="menuitem" onClick={() => onAction("hide")}>
        <X size={15} />
        <span>隐藏会话</span>
      </button>
      <button className="danger" type="button" role="menuitem" onClick={() => onAction("delete")}>
        <Trash2 size={15} />
        <span>删除会话</span>
      </button>
    </div>
  );
}

function buildMessageContextMenuItems(state: MessageContextMenuState) {
  const actions = getMessageContextActionAvailability(state);
  const fallbackItems: MessageMenuItem[] = [
    ...(actions.multi_select
      ? [
          {
            action: "multi_select" as const,
            label: "多选",
            icon: <CheckSquare size={15} />,
          },
          { action: "reply" as const, label: "引用", icon: <Reply size={15} /> },
        ]
      : []),
    ...(actions.copy
      ? [
          { action: "copy" as const, label: "复制", icon: <Copy size={15} /> },
          { action: "ai_reply" as const, label: "AI 回复", icon: <Sparkles size={15} /> },
          { action: "translate" as const, label: "翻译", icon: <Languages size={15} /> },
        ]
      : []),
    ...(actions.copy_image
      ? [
          {
            action: "copy_image" as const,
            label: "复制图片",
            icon: <FileImage size={15} />,
          },
        ]
      : []),
    ...(actions.voice_to_text
      ? [
          {
            action: "voice_to_text" as const,
            label: "语音转文字",
            icon: <TextCursorInput size={15} />,
          },
        ]
      : []),
    ...(actions.save_media_as
      ? [
          { action: "save_media_as" as const, label: "另存为", icon: <Download size={15} /> },
          {
            action: "reveal_in_folder" as const,
            label: state.revealInFolderLabel,
            icon: <FolderOpen size={15} />,
          },
        ]
      : []),
    ...(actions.forward
      ? [
          { action: "forward" as const, label: "转发", icon: <Forward size={15} /> },
          { action: "favorite" as const, label: "收藏", icon: <Star size={15} /> },
        ]
      : []),
    ...(actions.recall
      ? [
          {
            action: "recall" as const,
            label: "撤回",
            icon: <Undo2 size={15} />,
            danger: true,
          },
        ]
      : []),
    { action: "delete", label: "删除", icon: <Trash2 size={15} />, danger: true },
  ];
  const mediaItems: MessageMenuItem[] = [
    ...(actions.copy_image || actions.copy_media
      ? [
          {
            action: state.isImage ? ("copy_image" as const) : ("copy_media" as const),
            label: "复制",
            icon: state.isImage ? <FileImage size={15} /> : <Copy size={15} />,
          },
        ]
      : []),
    ...(actions.save_media_as
      ? [{ action: "save_media_as" as const, label: "另存为...", icon: <Download size={15} /> }]
      : []),
    ...(actions.open_media
      ? [{ action: "open_media" as const, label: "打开", icon: <FileText size={15} /> }]
      : []),
    ...(actions.edit_media
      ? [{ action: "edit_media" as const, label: "编辑", icon: <Edit3 size={15} /> }]
      : []),
    ...(actions.reveal_in_folder
      ? [
          {
            action: "reveal_in_folder" as const,
            label: state.revealInFolderLabel,
            icon: <FolderOpen size={15} />,
          },
        ]
      : []),
    ...(actions.forward
      ? [
          { action: "forward" as const, label: "转发...", icon: <Forward size={15} /> },
          { action: "favorite" as const, label: "收藏", icon: <Star size={15} /> },
          { action: "multi_select" as const, label: "多选", icon: <CheckSquare size={15} /> },
          { action: "reply" as const, label: "引用", icon: <Reply size={15} /> },
        ]
      : []),
    ...(actions.recall
      ? [
          {
            action: "recall" as const,
            label: "撤回",
            icon: <Undo2 size={15} />,
            danger: true,
          },
        ]
      : []),
    { action: "delete", label: "删除", icon: <Trash2 size={15} />, danger: true },
  ];

  if (!state.hasMedia) return fallbackItems;
  return mediaItems;
}
