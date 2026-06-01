import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { ConversationListItem, MessageItemDto } from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import { formatError } from "../../lib/format";
import {
  messageMediaFileName,
  resolveMessageMediaUrl,
} from "../../media/domain/mediaMessage";
import {
  extractMessageText,
  isMineMessage,
} from "../models/messageDisplayModel";
import type { ReplyTarget } from "../models/messageComposerModel";
import {
  isVideoMessage,
  type MessageContextAction,
} from "../models/messageContextMenuModel";
import { messageActionPreview } from "../models/messageListModel";
import {
  copyMessageImage,
  copyMessageMediaFile,
  editMessageMediaFile,
  isMacPlatform,
  openMessageMediaFile,
  openMessageVideoPlayer,
  revealMessageMediaInFolder,
  saveMessageMediaAs,
} from "../runtime/messageMediaActions";
import { requestMessageDangerConfirmation } from "../runtime/messageConfirm";

type MessageMenuState = {
  message: MessageItemDto;
  x: number;
  y: number;
} | null;

type MessageAnnotationMap = Record<string, string>;

export function useMessageMenuActionController({
  activeConversation,
  deleteMessage,
  favoriteMessage,
  session,
  setForwardTargetMessages,
  setMessageAnnotations,
  setMessageMenu,
  setMultiSelectMode,
  setNotice,
  setReplyTarget,
  setSelectedMessageIds,
  translateMessage,
  voiceToTextMessage,
  recallMessage,
}: {
  activeConversation?: ConversationListItem;
  deleteMessage: (messageId: string) => void;
  favoriteMessage: (message: MessageItemDto) => void;
  recallMessage: (messageId: string) => void;
  session: AuthSession | null;
  setForwardTargetMessages: Dispatch<SetStateAction<MessageItemDto[]>>;
  setMessageAnnotations: Dispatch<SetStateAction<MessageAnnotationMap>>;
  setMessageMenu: Dispatch<SetStateAction<MessageMenuState>>;
  setMultiSelectMode: Dispatch<SetStateAction<boolean>>;
  setNotice: Dispatch<SetStateAction<string | null>>;
  setReplyTarget: Dispatch<SetStateAction<ReplyTarget>>;
  setSelectedMessageIds: Dispatch<SetStateAction<Set<string>>>;
  translateMessage: (message: MessageItemDto) => void;
  voiceToTextMessage: (message: MessageItemDto) => void;
}) {
  return useCallback(
    async (action: MessageContextAction, message: MessageItemDto) => {
      setMessageMenu(null);
      setNotice(null);
      if (action === "multi_select") {
        setMultiSelectMode(true);
        setSelectedMessageIds(new Set([message.messageId]));
        setNotice("已进入多选模式");
        return;
      }
      if (action === "copy") {
        const text = extractMessageText(message);
        if (!text) {
          setNotice("当前消息没有可复制的文本");
          return;
        }
        await navigator.clipboard.writeText(text);
        setNotice("已复制");
        return;
      }
      if (action === "copy_image" || action === "copy_media") {
        const url = resolveMessageMediaUrl(message, session?.apiBaseUrl);
        if (!url) {
          setNotice("当前媒体消息没有可复制的文件地址");
          return;
        }
        try {
          const context = {
            accountId:
              session?.userId ||
              session?.platformUserId ||
              session?.lppId ||
              session?.tenantId,
            conversationId: activeConversation?.conversationId,
            fileName: messageMediaFileName(message),
          };
          if (action === "copy_image") {
            await copyMessageImage(url, session?.tenantToken, context);
            setNotice("图片已复制");
          } else {
            await copyMessageMediaFile(message, url, session?.tenantToken, context);
            setNotice("文件已复制");
          }
        } catch (error) {
          setNotice(`复制失败：${formatError(error)}`);
        }
        return;
      }
      if (action === "reply") {
        setReplyTarget({
          messageId: message.messageId,
          sender: isMineMessage(message, session)
            ? "我"
            : message.senderDisplayName || activeConversation?.title || "对方",
          preview: messageActionPreview(message),
        });
        return;
      }
      if (action === "translate") {
        setMessageAnnotations((current) => ({
          ...current,
          [message.messageId]: "译文：翻译中...",
        }));
        translateMessage(message);
        return;
      }
      if (action === "voice_to_text") {
        voiceToTextMessage(message);
        return;
      }
      if (
        action === "save_media_as" ||
        action === "reveal_in_folder" ||
        action === "open_media" ||
        action === "edit_media"
      ) {
        const url = resolveMessageMediaUrl(message, session?.apiBaseUrl);
        if (!url) {
          setNotice("当前媒体消息没有可用地址");
          return;
        }
        try {
          const context = {
            accountId:
              session?.userId ||
              session?.platformUserId ||
              session?.lppId ||
              session?.tenantId,
            conversationId: activeConversation?.conversationId,
          };
          if (action === "save_media_as") {
            const savedPath = await saveMessageMediaAs(message, url, session?.tenantToken, context);
            if (savedPath) setNotice("已另存为");
          } else if (action === "reveal_in_folder") {
            await revealMessageMediaInFolder(message, url, session?.tenantToken, context);
            setNotice(isMacPlatform() ? "已在 Finder 中显示" : "已在文件夹中显示");
          } else if (action === "open_media") {
            const openedInVideoPlayer = isVideoMessage(message)
              ? await openMessageVideoPlayer(message, url, session?.tenantToken, context)
              : false;
            if (!openedInVideoPlayer) {
              await openMessageMediaFile(message, url, session?.tenantToken, context);
            }
            setNotice("已打开");
          } else {
            await editMessageMediaFile(message, url, session?.tenantToken, context);
            setNotice("已打开编辑器");
          }
        } catch (error) {
          const prefix =
            action === "save_media_as"
              ? "另存为失败"
              : action === "reveal_in_folder"
                ? "在文件夹中显示失败"
                : action === "open_media"
                  ? "打开失败"
                  : "编辑失败";
          setNotice(`${prefix}：${formatError(error)}`);
        }
        return;
      }
      if (action === "forward") {
        setForwardTargetMessages([message]);
        return;
      }
      if (action === "favorite") {
        favoriteMessage(message);
        return;
      }
      if (action === "recall") {
        if (!requestMessageDangerConfirmation({ action: "recall-message" })) return;
        recallMessage(message.messageId);
        return;
      }
      if (action === "delete") {
        if (!requestMessageDangerConfirmation({ action: "delete-message" })) return;
        deleteMessage(message.messageId);
      }
    },
    [
      activeConversation?.conversationId,
      activeConversation?.title,
      deleteMessage,
      favoriteMessage,
      recallMessage,
      session,
      setForwardTargetMessages,
      setMessageAnnotations,
      setMessageMenu,
      setMultiSelectMode,
      setNotice,
      setReplyTarget,
      setSelectedMessageIds,
      translateMessage,
      voiceToTextMessage,
    ],
  );
}
