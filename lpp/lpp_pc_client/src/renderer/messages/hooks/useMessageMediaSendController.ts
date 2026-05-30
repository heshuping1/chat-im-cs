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
  chatSendFailureContext,
  createUploadProgressDiagnosticTracker,
  initialChatSendStatusForKind,
  logChatSendDiagnostic,
  logUploadProgressDiagnosticFromTracker,
} from "../../data/send/send-state-machine";
import {
  getSendOutboxStorage,
  sendOutboxBlobId,
  sendOutboxScopeKey,
  type SendOutboxStatus,
} from "../../data/send/send-outbox";
import type { ComposerMediaKind } from "../../composer/domain/detectComposerMediaKind";
import { currentIsoTimestamp, formatError } from "../../lib/format";
import {
  createVideoPoster,
  registerVideoPosterForMedia,
} from "../../lib/videoPoster";
import { cacheLocalSentMediaForDesktop } from "../../media/runtime/localMediaCache";
import {
  localMediaResourceForSend,
  requireVideoSendPayload,
  uploadVideoPosterForSend,
  videoSendDiagnosticsContext,
  withVideoPosterMedia,
} from "../../media/runtime/videoPosterMedia";
import {
  createVideoUploadDisplayProgressTicker,
  mediaUploadProgressPercent,
} from "../../media/runtime/uploadState";
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
      const storage = getSendOutboxStorage();
      const scopeKey = sendOutboxScopeKey(session);
      const controller = new AbortController();
      task.controller = controller;
      task.controlState = undefined;
      let videoMediaForDiagnostics: MediaResourceDto | undefined;
      let failureStage: "upload" | "poster_upload" | "send" = "upload";
      const videoDisplayProgressTicker = task.kind === "video"
        ? createVideoUploadDisplayProgressTicker(({ phase, progress }) => {
            const status = phase === "sending" ? "sending" : "uploading";
            patchLocalMediaMessage(
              queryClient,
              session,
              task.conversation,
              task.conversationType,
              task.localMessageId,
              {
                status,
                uploadPhase: phase,
                uploadProgress: progress,
                localError: undefined,
              },
              setLocalOutgoingMessagesByConversation,
            );
            void storage.patchRecord(scopeKey, task.localMessageId, {
              localError: undefined,
              status,
              updatedAt: Date.now(),
              uploadPhase: phase,
              uploadProgress: progress,
            });
          })
        : undefined;
      controller.signal.addEventListener(
        "abort",
        () => videoDisplayProgressTicker?.stop(),
        { once: true },
      );
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
        {
          status: "uploading",
          uploadPhase: "uploading_media",
          uploadProgress: 0,
          localError: undefined,
        },
        setLocalOutgoingMessagesByConversation,
      );
      void storage.patchRecord(scopeKey, task.localMessageId, {
        localError: undefined,
        status: "uploading",
        updatedAt: Date.now(),
        uploadPhase: "uploading_media",
        uploadProgress: 0,
      });
      videoDisplayProgressTicker?.start("uploading_media");
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
              localOpenUrl: task.localOpenUrl,
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
                uploadPhase: "uploading_media",
                uploadProgress: videoDisplayProgressTicker?.current() ?? 0,
                localError: undefined,
              },
              setLocalOutgoingMessagesByConversation,
            );
            void storage.patchRecord(scopeKey, task.localMessageId, {
              body: task.body,
              localError: undefined,
              status: "uploading",
              updatedAt: Date.now(),
              uploadPhase: "uploading_media",
              uploadProgress: videoDisplayProgressTicker?.current() ?? 0,
            });
          }
          const mediaProgress = createUploadProgressDiagnosticTracker();
          const media = await client.uploadMedia(task.file, task.kind, {
            signal: controller.signal,
            onProgress: (progress) => {
              const percent = mediaUploadProgressPercent(progress, task.file.size);
              if (typeof percent !== "number") return;
              mediaProgress.track(percent);
              if (videoDisplayProgressTicker) {
                videoDisplayProgressTicker.setRawProgress("uploading_media", percent);
                return;
              }
              patchLocalMediaMessage(
                queryClient,
                session,
                task.conversation,
                task.conversationType,
                task.localMessageId,
                {
                  status: "uploading",
                  uploadPhase: "uploading_media",
                  uploadProgress: percent,
                },
                setLocalOutgoingMessagesByConversation,
              );
              void storage.patchRecord(scopeKey, task.localMessageId, {
                status: "uploading",
                updatedAt: Date.now(),
                uploadPhase: "uploading_media",
                uploadProgress: percent,
              });
            },
          });
          if (task.kind === "video") {
            logUploadProgressDiagnosticFromTracker({
              taskId: "P4-MSG-005C",
              channel: "im",
              fileSize: task.file.size,
              localTaskId,
              messageKind: task.kind,
              phase: "uploading_media",
              tracker: mediaProgress,
            });
          }
          failureStage = "poster_upload";
          let posterFileSize = 0;
          let posterProgress = createUploadProgressDiagnosticTracker(0);
          videoDisplayProgressTicker?.setPhase("uploading_poster");
          const posterUpload = await uploadVideoPosterForSend({
            kind: task.kind,
            videoPoster: task.videoPoster,
            videoPosterPromise: task.videoPosterPromise,
            uploadPoster: (file) => {
              posterProgress = createUploadProgressDiagnosticTracker();
              posterFileSize = file.size;
              return client
                .uploadMedia(file, "image", {
                  signal: controller.signal,
                  onProgress: (progress) => {
                    const percent = mediaUploadProgressPercent(progress, file.size);
                    if (typeof percent !== "number") return;
                    posterProgress.track(percent);
                    if (videoDisplayProgressTicker) {
                      videoDisplayProgressTicker.setRawProgress("uploading_poster", percent);
                      return;
                    }
                    patchLocalMediaMessage(
                      queryClient,
                      session,
                      task.conversation,
                      task.conversationType,
                      task.localMessageId,
                      {
                        status: "uploading",
                        uploadPhase: "uploading_poster",
                        uploadProgress: percent,
                      },
                      setLocalOutgoingMessagesByConversation,
                    );
                    void storage.patchRecord(scopeKey, task.localMessageId, {
                      status: "uploading",
                      updatedAt: Date.now(),
                      uploadPhase: "uploading_poster",
                      uploadProgress: percent,
                    });
                  },
                })
                .then((posterMedia) => normalizeUploadedMedia(posterMedia, file));
            },
          });
          if (task.kind === "video" && posterUpload.uploadedPoster) {
            logUploadProgressDiagnosticFromTracker({
              taskId: "P4-MSG-005C",
              channel: "im",
              fileSize: posterFileSize,
              localTaskId,
              messageKind: task.kind,
              phase: "uploading_poster",
              tracker: posterProgress,
            });
          }
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
          failureStage = "send";
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
          videoDisplayProgressTicker?.setPhase("sending");
          videoDisplayProgressTicker?.stop();
          patchLocalMediaMessage(
            queryClient,
            session,
            task.conversation,
            task.conversationType,
            task.localMessageId,
            { status: "sending", uploadPhase: "sending", uploadProgress: 95 },
            setLocalOutgoingMessagesByConversation,
          );
          void storage.patchRecord(scopeKey, task.localMessageId, {
            status: "sending",
            updatedAt: Date.now(),
            uploadPhase: "sending",
            uploadProgress: 95,
          });
          const sent = await client.sendConversationMediaMessage(
            task.conversationType,
            task.conversation.conversationId,
            task.kind,
            task.kind === "video" ? requireVideoSendPayload(normalizedMedia) : normalizedMedia,
            task.reply?.messageId,
            { clientMsgId: task.clientMsgId || task.localMessageId },
          );
          const localOpenForSent =
            (await task.localCachedMediaPromise?.catch(() => undefined)) ??
            task.localOpenUrl;
          if (localOpenForSent) task.localOpenUrl = localOpenForSent;
          const localPreviewForSent = task.localPreviewUrl;
          const serverMessageId = sent.messageId || task.localMessageId;
          if ((task.kind === "image" || task.kind === "video") && localPreviewForSent) {
            localMediaPreviewKeys(serverMessageId, normalizedMedia).forEach((key) => {
              localImagePreviewByMessageIdRef.current.set(key, localPreviewForSent);
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
                  localOpenForSent || ((task.kind === "image" || task.kind === "video") && localPreviewForSent)
                    ? {
                        ...normalizedMedia,
                        ...(localOpenForSent ? { localOpenUrl: localOpenForSent } : {}),
                        ...((task.kind === "image" || task.kind === "video") && localPreviewForSent
                          ? { localPreviewUrl: localPreviewForSent }
                          : {}),
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
          void storage.deleteRecord(scopeKey, task.localMessageId);
          void invalidateMessages(queryClient);
          scrollMessagesToBottom("smooth");
        } catch (error) {
          videoDisplayProgressTicker?.stop();
          if (controller.signal.aborted && task.controlState) return;
          const failedAt = Date.now();
          const reason = formatError(error);
          logChatSendDiagnostic({
            taskId: "P4-MSG-005C",
            channel: "im",
            phase: failureStage === "send" ? "send" : "upload",
            result: "failed",
            action: "send_failed",
            from: "uploading",
            to: "failed",
            reason,
            context: chatSendFailureContext(error, {
              conversationId: task.conversation.conversationId,
              conversationType: task.conversationType,
              failureStage,
              localMessageId: task.localMessageId,
              localTaskId,
              messageKind: task.kind,
              path: task.conversationType === "group"
                ? "/api/client/v1/groups/{conversationId}/messages"
                : "/api/client/v1/direct-chats/{conversationId}/messages",
              ...(task.kind === "video"
                ? { video: videoSendDiagnosticsContext(videoMediaForDiagnostics, error) }
                : {}),
            }),
          });
          patchLocalMediaMessage(
            queryClient,
            session,
            task.conversation,
            task.conversationType,
            task.localMessageId,
            { status: "failed", uploadPhase: "failed", localError: reason, localFailedAt: failedAt },
            setLocalOutgoingMessagesByConversation,
          );
          void storage.patchRecord(scopeKey, task.localMessageId, {
            localFailedAt: failedAt,
            localError: reason,
            status: "failed",
            updatedAt: failedAt,
            uploadPhase: "failed",
          });
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
      const clientMsgId = localMessageId;
      const storage = getSendOutboxStorage();
      const scopeKey = sendOutboxScopeKey(session);
      const localPreviewUrl =
        kind === "image" || kind === "video" ? URL.createObjectURL(file) : undefined;
      const localCachedMediaPromise = cacheLocalSentMediaForDesktop({
        accountId: session.userId || session.platformUserId || session.lppId,
        conversationId: conversation.conversationId,
        file,
        kind,
        localMessageId,
        localPreviewUrl,
      })
        .then((result) => result?.fileUrl)
        .catch((error) => {
          logChatSendDiagnostic({
            taskId: "P4-MSG-005C",
            channel: "im",
            phase: "cache",
            result: "failed",
            action: "cache_local_media",
            context: {
              conversationId: conversation.conversationId,
              conversationType,
              cacheResult: "failed",
              localMessageId,
              localTaskId,
              messageKind: kind,
              sourceKind: "file",
              reason: formatError(error),
            },
          });
          return undefined;
        });
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
        {
          status: initialStatus,
          uploadPhase: posterError ? "failed" : "preparing",
          uploadProgress: 0,
          localTaskId,
          localError: posterError,
        },
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
      const fileBlobId = sendOutboxBlobId(scopeKey, localMessageId, "file");
      const posterBlobId = videoPoster
        ? sendOutboxBlobId(scopeKey, localMessageId, "poster")
        : undefined;
      void storage.putBlob(fileBlobId, file);
      if (posterBlobId && videoPoster) void storage.putBlob(posterBlobId, videoPoster.file);
      void storage.upsertRecord({
        body,
        channel: "im",
        clientMsgId,
        createdAt: Date.now(),
        fileBlobId,
        fileName: file.name,
        localError: posterError || undefined,
        localMessageId,
        localTaskId,
        messageType: kind,
        mimeType: file.type,
        posterBlobId,
        reply,
        scopeKey,
        status: initialStatus as SendOutboxStatus,
        targetId: conversation.conversationId,
        targetType: conversationType,
        updatedAt: Date.now(),
        uploadPhase: posterError ? "failed" : "preparing",
        uploadProgress: 0,
      });
      mediaUploadTasks.setTask({
        clientMsgId,
        localTaskId,
        localMessageId,
        file,
        kind,
        conversation,
        conversationType,
        body,
        reply,
        localPreviewUrl,
        localCachedMediaPromise,
        videoPoster,
      });
      if (localCachedMediaPromise) {
        void localCachedMediaPromise.then((cachedOpenUrl) => {
          if (!cachedOpenUrl) return;
          const task = mediaUploadTasks.getTask(localTaskId);
          if (!task) return;
          task.localOpenUrl = cachedOpenUrl;
          task.body = withReplyBody(
            {
              [kind]: localMediaResourceForSend({
                file,
                kind,
                localOpenUrl: cachedOpenUrl,
                localPreviewUrl: task.localPreviewUrl,
                videoPoster: task.videoPoster,
              }),
            },
            reply,
          );
          patchLocalMediaMessage(
            queryClient,
            session,
            conversation,
            conversationType,
            localMessageId,
            { body: task.body },
            setLocalOutgoingMessagesByConversation,
          );
          void storage.patchRecord(scopeKey, localMessageId, {
            body: task.body,
            updatedAt: Date.now(),
          });
        });
      }
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
        void getSendOutboxStorage().patchRecord(
          sendOutboxScopeKey(session),
          task.localMessageId,
          { localError: undefined, status: "paused", updatedAt: Date.now() },
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
        void getSendOutboxStorage().patchRecord(
          sendOutboxScopeKey(session),
          task.localMessageId,
          { localError: undefined, status: "canceled", updatedAt: Date.now() },
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
