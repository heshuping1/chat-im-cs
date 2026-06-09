import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { ConversationListItem, MessageItemDto } from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import { useI18n } from "../../i18n/useI18n";
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
import {
  messageDangerConfirmationDescriptor,
  requestMessageDangerConfirmation,
  type MessageDangerConfirmAction,
} from "../runtime/messageConfirm";

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
  deleteMessage: (message: MessageItemDto) => void;
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
  const { t } = useI18n();

  return useCallback(
    async (action: MessageContextAction, message: MessageItemDto) => {
      setMessageMenu(null);
      setNotice(null);
      if (action === "multi_select") {
        setMultiSelectMode(true);
        setSelectedMessageIds(new Set([message.messageId]));
        setNotice(t("messages.menuActions.multiSelectEntered"));
        return;
      }
      if (action === "copy") {
        const text = extractMessageText(message);
        if (!text) {
          setNotice(t("messages.menuActions.noCopyableText"));
          return;
        }
        await navigator.clipboard.writeText(text);
        setNotice(t("common.copied"));
        return;
      }
      if (action === "copy_image" || action === "copy_media") {
        const url = resolveMessageMediaUrl(message, session?.apiBaseUrl);
        if (!url) {
          setNotice(t("messages.menuActions.noCopyableMedia"));
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
            setNotice(t("messages.mediaContent.imageCopied"));
          } else {
            await copyMessageMediaFile(message, url, session?.tenantToken, context);
            setNotice(t("messages.menuActions.fileCopied"));
          }
        } catch (error) {
          setNotice(t("common.copyFailed", { error: formatError(error) }));
        }
        return;
      }
      if (action === "reply") {
        setReplyTarget({
          messageId: message.messageId,
          sender: isMineMessage(message, session)
            ? t("messages.menuActions.me")
            : message.senderDisplayName || activeConversation?.title || t("messages.menuActions.peer"),
          preview: messageActionPreview(message),
        });
        return;
      }
      if (action === "translate") {
        setMessageAnnotations((current) => ({
          ...current,
          [message.messageId]: t("messages.menuActions.translatingAnnotation"),
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
          setNotice(t("messages.menuActions.noUsableMedia"));
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
            if (savedPath) setNotice(t("messages.menuActions.savedAs"));
          } else if (action === "reveal_in_folder") {
            await revealMessageMediaInFolder(message, url, session?.tenantToken, context);
            setNotice(
              isMacPlatform()
                ? t("messages.menuActions.revealedInFinder")
                : t("messages.mediaContent.revealedInFolder"),
            );
          } else if (action === "open_media") {
            const openedInVideoPlayer = isVideoMessage(message)
              ? await openMessageVideoPlayer(message, url, session?.tenantToken, context)
              : false;
            if (!openedInVideoPlayer) {
              await openMessageMediaFile(message, url, session?.tenantToken, context);
            }
            setNotice(t("messages.menuActions.opened"));
          } else {
            await editMessageMediaFile(message, url, session?.tenantToken, context);
            setNotice(t("messages.menuActions.editorOpened"));
          }
        } catch (error) {
          setNotice(
            t(`messages.menuActions.${mediaActionFailedKey(action)}`, {
              error: formatError(error),
            }),
          );
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
        if (!(await confirmMessageDanger("recall-message", t))) return;
        recallMessage(message.messageId);
        return;
      }
      if (action === "delete") {
        if (!(await confirmMessageDanger("delete-message", t))) return;
        deleteMessage(message);
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
      t,
      translateMessage,
      voiceToTextMessage,
    ],
  );
}

type MessageMenuTranslate = (key: string, params?: Record<string, string | number>) => string;

function confirmMessageDanger(
  action: MessageDangerConfirmAction,
  t: MessageMenuTranslate,
  count?: number,
) {
  const descriptor = messageDangerConfirmationDescriptor(action, count);
  return requestMessageDangerConfirmation({
    action,
    count,
    message: t(descriptor.key, descriptor.params),
  });
}

function mediaActionFailedKey(action: MessageContextAction) {
  if (action === "save_media_as") return "saveAsFailed";
  if (action === "reveal_in_folder") return "revealFailed";
  if (action === "open_media") return "openFailed";
  return "editFailed";
}
