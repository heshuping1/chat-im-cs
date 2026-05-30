import type { QueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import type {
  ConversationListItem,
  MediaResourceDto,
  MessageItemDto,
} from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import { requireApiClient } from "../../data/runtime";
import {
  initialChatSendStatusForKind,
  logChatSendDiagnostic,
} from "../../data/send/send-state-machine";
import type { ComposerMediaKind } from "../../composer/domain/detectComposerMediaKind";
import { currentIsoTimestamp, formatError } from "../../lib/format";
import {
  createVideoPoster,
  registerVideoPosterForMedia,
} from "../../lib/videoPoster";
import {
  localMediaResourceForSend,
  requireVideoSendPayload,
  uploadVideoPosterForSend,
  videoSendDiagnosticsContext,
  withVideoPosterMedia,
} from "../../media/runtime/videoPosterMedia";
import {
  appendLocalMessage,
  invalidateMessages,
  localMediaPreviewKeys,
  patchLocalMediaMessage,
  replaceLocalMessageInCache,
  replaceLocalOutgoingMessage,
  upsertLocalOutgoingMessage,
} from "../models/messageCacheMutationModel";
import type { ImConversationType } from "../models/messageCacheMutationModel";
import {
  normalizeUploadedMedia,
  withReplyBody,
  type ReplyTarget,
} from "../models/messageComposerModel";
import type { useMediaUploadTaskRegistry } from "./useMediaUploadTaskRegistry";

export function useMessageMediaSendController({
  activeConversation,
  activeConversationType,
  localImagePreviewByMessageIdRef,
  mediaUploadTasks,
  queryClient,
  replyTarget,
  scrollMessagesToBottom,
  session,
  setLocalOutgoingMessagesByConversation,
  setReplyTarget,
}: {
  activeConversation?: ConversationListItem;
  activeConversationType?: ImConversationType;
  localImagePreviewByMessageIdRef: MutableRefObject<Map<string, string>>;
  mediaUploadTasks: ReturnType<typeof useMediaUploadTaskRegistry>;
  queryClient: QueryClient;
  replyTarget: ReplyTarget;
  scrollMessagesToBottom: (behavior?: ScrollBehavior) => void;
  session: AuthSession | null;
  setLocalOutgoingMessagesByConversation: Dispatch<
    SetStateAction<Record<string, MessageItemDto[]>>
  >;
  setReplyTarget: Dispatch<SetStateAction<ReplyTarget>>;
}) {
  const startMediaUpload = useCallback(
    (localTaskId: string) => {
      const task = mediaUploadTasks.getTask(localTaskId);
      if (!task || !session) return;
      const controller = new AbortController();
      task.controller = controller;
      task.controlState = undefined;
      let videoMediaForDiagnostics: MediaResourceDto | undefined;
      logChatSendDiagnostic({
        taskId: "P4-MSG-005C",
        channel: "im",
        phase: "upload",
        result: "ok",
        action: "start_upload",
        from: "queued",
        to: "uploading",
        context: {
          conversationId: task.conversation.conversationId,
          conversationType: task.conversationType,
          localMessageId: task.localMessageId,
          localTaskId,
          messageKind: task.kind,
        },
      });
      patchLocalMediaMessage(
        queryClient,
        session,
        task.conversation,
        task.conversationType,
        task.localMessageId,
        { status: "uploading", uploadProgress: 0, localError: undefined },
        setLocalOutgoingMessagesByConversation,
      );
      void (async () => {
        try {
          const client = requireApiClient(session);
          if (task.kind === "video" && !task.videoPoster) {
            const videoPoster = await createVideoPoster(task.file);
            if (!videoPoster) throw new Error("视频封面生成失败");
            task.videoPoster = videoPoster;
            const localMedia = localMediaResourceForSend({
              file: task.file,
              kind: task.kind,
              localPreviewUrl: task.localPreviewUrl,
              videoPoster,
            });
            task.body = withReplyBody({ [task.kind]: localMedia }, task.reply);
            patchLocalMediaMessage(
              queryClient,
              session,
              task.conversation,
              task.conversationType,
              task.localMessageId,
              {
                body: task.body,
                status: "uploading",
                uploadProgress: 0,
                localError: undefined,
              },
              setLocalOutgoingMessagesByConversation,
            );
          }
          const media = await client.uploadMedia(task.file, task.kind, {
            signal: controller.signal,
            onProgress: (progress) => {
              if (typeof progress.percent !== "number") return;
              patchLocalMediaMessage(
                queryClient,
                session,
                task.conversation,
                task.conversationType,
                task.localMessageId,
                { status: "uploading", uploadProgress: progress.percent },
                setLocalOutgoingMessagesByConversation,
              );
            },
          });
          const posterUpload = await uploadVideoPosterForSend({
            kind: task.kind,
            videoPoster: task.videoPoster,
            videoPosterPromise: task.videoPosterPromise,
            uploadPoster: (file) =>
              client
                .uploadMedia(file, "image", { signal: controller.signal })
                .then((posterMedia) => normalizeUploadedMedia(posterMedia, file)),
          });
          const videoPoster = posterUpload.videoPoster;
          task.videoPoster = videoPoster;
          const normalizedMedia = withVideoPosterMedia(
            normalizeUploadedMedia(media, task.file),
            videoPoster,
            posterUpload.uploadedPoster,
          );
          videoMediaForDiagnostics = normalizedMedia;
          registerVideoPosterForMedia(
            normalizedMedia as Record<string, unknown>,
            videoPoster?.url,
          );
          logChatSendDiagnostic({
            taskId: "P4-MSG-005C",
            channel: "im",
            phase: "upload",
            result: "ok",
            action: "upload_succeeded",
            from: "uploading",
            to: "sending",
            context: {
              conversationId: task.conversation.conversationId,
              conversationType: task.conversationType,
              localMessageId: task.localMessageId,
              localTaskId,
              messageKind: task.kind,
            },
          });
          const sent = await client.sendConversationMediaMessage(
            task.conversationType,
            task.conversation.conversationId,
            task.kind,
            task.kind === "video" ? requireVideoSendPayload(normalizedMedia) : normalizedMedia,
            task.reply?.messageId,
          );
          const serverMessageId = sent.messageId || task.localMessageId;
          if ((task.kind === "image" || task.kind === "video") && task.localPreviewUrl) {
            localMediaPreviewKeys(serverMessageId, normalizedMedia).forEach((key) => {
              localImagePreviewByMessageIdRef.current.set(key, task.localPreviewUrl!);
            });
          }
          const sentMessage = replaceLocalMessageInCache(
            queryClient,
            session,
            task.conversation,
            task.localMessageId,
            task.kind,
            withReplyBody(
              {
                [task.kind]:
                  (task.kind === "image" || task.kind === "video") && task.localPreviewUrl
                    ? {
                        ...normalizedMedia,
                        localPreviewUrl: task.localPreviewUrl,
                        ...(videoPoster?.url ? { localPosterUrl: videoPoster.url } : {}),
                      }
                    : normalizedMedia,
              },
              task.reply,
            ),
            sent,
          );
          logChatSendDiagnostic({
            taskId: "P4-MSG-005C",
            channel: "im",
            phase: "send",
            result: "ok",
            action: "send_succeeded",
            from: "sending",
            to: "sent",
            context: {
              conversationId: task.conversation.conversationId,
              conversationType: task.conversationType,
              localMessageId: task.localMessageId,
              localTaskId,
              messageId: sentMessage.messageId,
              messageKind: task.kind,
            },
          });
          setLocalOutgoingMessagesByConversation((current) =>
            replaceLocalOutgoingMessage(
              current,
              task.conversationType,
              task.conversation.conversationId,
              task.localMessageId,
              sentMessage,
            ),
          );
          mediaUploadTasks.deleteTask(localTaskId);
          void invalidateMessages(queryClient);
          scrollMessagesToBottom("smooth");
        } catch (error) {
          if (controller.signal.aborted && task.controlState) return;
          const reason = formatError(error);
          logChatSendDiagnostic({
            taskId: "P4-MSG-005C",
            channel: "im",
            phase: "send",
            result: "failed",
            action: "send_failed",
            from: "uploading",
            to: "failed",
            reason,
            context: {
              conversationId: task.conversation.conversationId,
              conversationType: task.conversationType,
              localMessageId: task.localMessageId,
              localTaskId,
              messageKind: task.kind,
              path: task.conversationType === "group"
                ? "/api/client/v1/groups/{conversationId}/messages"
                : "/api/client/v1/direct-chats/{conversationId}/messages",
              ...(task.kind === "video"
                ? { video: videoSendDiagnosticsContext(videoMediaForDiagnostics, error) }
                : {}),
            },
          });
          patchLocalMediaMessage(
            queryClient,
            session,
            task.conversation,
            task.conversationType,
            task.localMessageId,
            { status: "failed", localError: reason },
            setLocalOutgoingMessagesByConversation,
          );
        }
      })();
    },
    [
      localImagePreviewByMessageIdRef,
      mediaUploadTasks,
      queryClient,
      scrollMessagesToBottom,
      session,
      setLocalOutgoingMessagesByConversation,
    ],
  );

  const sendMediaOptimistically = useCallback(
    async (file: File, kind: ComposerMediaKind) => {
      if (!session || !activeConversation || !activeConversationType) {
        throw new Error("请选择一个普通 IM 会话");
      }
      const conversation = activeConversation;
      const conversationType = activeConversationType;
      const reply = replyTarget;
      const localMessageId = `pc-local-media-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const localTaskId = `pc-upload-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const localPreviewUrl =
        kind === "image" || kind === "video" ? URL.createObjectURL(file) : undefined;
      const videoPoster = kind === "video" ? await createVideoPoster(file) : undefined;
      const posterError = kind === "video" && !videoPoster ? "视频封面生成失败" : undefined;
      const initialStatus = posterError ? "failed" : initialChatSendStatusForKind(kind);
      const localMedia = localMediaResourceForSend({
        file,
        kind,
        localPreviewUrl,
        videoPoster,
      });
      const body = withReplyBody({ [kind]: localMedia }, reply);
      const localMessage = appendLocalMessage(
        queryClient,
        session,
        conversation,
        kind,
        body,
        {
          messageId: localMessageId,
          conversationId: conversation.conversationId,
          serverTime: currentIsoTimestamp(),
        },
        { status: initialStatus, uploadProgress: 0, localTaskId, localError: posterError },
      );
      logChatSendDiagnostic({
        taskId: "P4-MSG-005C",
        channel: "im",
        phase: "local_echo",
        result: posterError ? "failed" : "ok",
        action: "enqueue_media",
        to: initialStatus,
        context: {
          conversationId: conversation.conversationId,
          conversationType,
          localMessageId,
          localTaskId,
          messageKind: kind,
          ...(posterError ? { reason: posterError } : {}),
        },
      });
      setLocalOutgoingMessagesByConversation((current) =>
        upsertLocalOutgoingMessage(
          current,
          conversationType,
          conversation.conversationId,
          localMessage,
        ),
      );
      mediaUploadTasks.setTask({
        localTaskId,
        localMessageId,
        file,
        kind,
        conversation,
        conversationType,
        body,
        reply,
        localPreviewUrl,
        videoPoster,
      });
      setReplyTarget(null);
      scrollMessagesToBottom("smooth");
      if (!posterError) startMediaUpload(localTaskId);
    },
    [
      activeConversation,
      activeConversationType,
      mediaUploadTasks,
      queryClient,
      replyTarget,
      scrollMessagesToBottom,
      session,
      setLocalOutgoingMessagesByConversation,
      setReplyTarget,
      startMediaUpload,
    ],
  );

  const handleUploadAction = useCallback(
    (localTaskId: string, action: "pause" | "resume" | "cancel" | "retry") => {
      const task = mediaUploadTasks.getTask(localTaskId);
      if (!task || !session) return;
      if (action === "pause") {
        task.controlState = "paused";
        task.controller?.abort();
        logChatSendDiagnostic({
          taskId: "P4-MSG-005C",
          channel: "im",
          phase: "transition",
          result: "ok",
          action: "pause",
          from: "uploading",
          to: "paused",
          context: {
            conversationId: task.conversation.conversationId,
            conversationType: task.conversationType,
            localMessageId: task.localMessageId,
            localTaskId,
            messageKind: task.kind,
          },
        });
        patchLocalMediaMessage(
          queryClient,
          session,
          task.conversation,
          task.conversationType,
          task.localMessageId,
          { status: "paused", localError: undefined },
          setLocalOutgoingMessagesByConversation,
        );
        return;
      }
      if (action === "cancel") {
        task.controlState = "canceled";
        task.controller?.abort();
        logChatSendDiagnostic({
          taskId: "P4-MSG-005C",
          channel: "im",
          phase: "transition",
          result: "ok",
          action: "cancel",
          from: "uploading",
          to: "canceled",
          context: {
            conversationId: task.conversation.conversationId,
            conversationType: task.conversationType,
            localMessageId: task.localMessageId,
            localTaskId,
            messageKind: task.kind,
          },
        });
        patchLocalMediaMessage(
          queryClient,
          session,
          task.conversation,
          task.conversationType,
          task.localMessageId,
          { status: "canceled", localError: undefined },
          setLocalOutgoingMessagesByConversation,
        );
        return;
      }
      logChatSendDiagnostic({
        taskId: "P4-MSG-005C",
        channel: "im",
        phase: "transition",
        result: "ok",
        action: "retry_upload",
        from: action === "resume" ? "paused" : "failed",
        to: "uploading",
        context: {
          conversationId: task.conversation.conversationId,
          conversationType: task.conversationType,
          localMessageId: task.localMessageId,
          localTaskId,
          messageKind: task.kind,
        },
      });
      startMediaUpload(localTaskId);
    },
    [
      mediaUploadTasks,
      queryClient,
      session,
      setLocalOutgoingMessagesByConversation,
      startMediaUpload,
    ],
  );

  return {
    handleUploadAction,
    sendMediaOptimistically,
  };
}
