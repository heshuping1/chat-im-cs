import { useMemo } from "react";

import type { ComposerMediaKind } from "../../composer/domain/detectComposerMediaKind";
import type { MessageItemDto } from "../../data/api/types";
import { logMessageCenterDiagnostic } from "../diagnostics/message-center-diagnostics";
import type { MessageContextAction } from "../models/messageContextMenuModel";

export interface MessageCenterCommandModel {
  deleteSelectedMessages: () => Promise<void>;
  menuAction: (action: MessageContextAction, message: MessageItemDto) => Promise<void>;
  sendMedia: (file: File, kind: ComposerMediaKind) => Promise<void>;
  sendText: (content: string) => void;
  unreadJump: () => void;
  uploadAction: (localTaskId: string, action: "pause" | "resume" | "cancel" | "retry") => void;
}

export function useMessageCenterCommandModel(
  commands: MessageCenterCommandModel,
): MessageCenterCommandModel {
  return useMemo(
    () => ({
      deleteSelectedMessages: async () => {
        logMessageCenterDiagnostic({
          event: "command.invoked",
          phase: "command",
          result: "ok",
          reason: "delete_selected_messages",
        });
        return commands.deleteSelectedMessages().catch((error) => {
          logCommandFailed("delete_selected_messages", error);
          throw error;
        });
      },
      menuAction: async (action, message) => {
        logMessageCenterDiagnostic({
          event: "command.invoked",
          phase: "command",
          result: "ok",
          reason: `menu.${action}`,
          context: {
            messageId: message.messageId,
            messageType: message.messageType,
            conversationId: message.conversationId,
          },
        });
        return commands.menuAction(action, message).catch((error) => {
          logCommandFailed(`menu.${action}`, error, {
            messageId: message.messageId,
            messageType: message.messageType,
            conversationId: message.conversationId,
          });
          throw error;
        });
      },
      sendMedia: async (file, kind) => {
        logMessageCenterDiagnostic({
          event: "command.invoked",
          phase: "command",
          result: "ok",
          reason: "send_media",
          context: {
            kind,
            mimeType: file.type,
            sizeBytes: file.size,
          },
        });
        return commands.sendMedia(file, kind).catch((error) => {
          logCommandFailed("send_media", error, {
            kind,
            mimeType: file.type,
            sizeBytes: file.size,
          });
          throw error;
        });
      },
      sendText: (content) => {
        logMessageCenterDiagnostic({
          event: "command.invoked",
          phase: "command",
          result: "ok",
          reason: "send_text",
          context: {
            length: content.length,
          },
        });
        return commands.sendText(content);
      },
      unreadJump: () => {
        logMessageCenterDiagnostic({
          event: "command.invoked",
          phase: "command",
          result: "ok",
          reason: "unread_jump",
        });
        return commands.unreadJump();
      },
      uploadAction: (localTaskId, action) => {
        logMessageCenterDiagnostic({
          event: "command.invoked",
          phase: "command",
          result: "ok",
          reason: `upload.${action}`,
          context: {
            localTaskId,
          },
        });
        return commands.uploadAction(localTaskId, action);
      },
    }),
    [
      commands.deleteSelectedMessages,
      commands.menuAction,
      commands.sendMedia,
      commands.sendText,
      commands.unreadJump,
      commands.uploadAction,
    ],
  );
}

function logCommandFailed(
  reason: string,
  error: unknown,
  context: Record<string, unknown> = {},
) {
  logMessageCenterDiagnostic({
    event: "command.failed",
    phase: "command",
    result: "failed",
    reason,
    context: {
      ...context,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message }
          : { message: String(error) },
    },
  });
}
