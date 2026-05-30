import { useMutation, type QueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";

import type { ComposerMediaKind } from "../../composer/domain/detectComposerMediaKind";
import {
  isTerminalCustomerServiceWriteError,
  type ApiClient,
  type CustomerServiceThread,
  type MediaResourceDto,
  type MessageItemDto,
} from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import {
  appendCustomerServiceLocalMessage,
  customerServiceMessageFromSendResult,
  invalidateCustomerServiceQueries,
  mergeSentCustomerServiceMessage,
  patchCustomerServiceLocalMessage,
  removeCustomerServiceLocalMessage,
} from "../../data/customer-service/cs-cache-adapter";
import {
  initialChatSendStatusForKind,
  logChatSendDiagnostic,
} from "../../data/send/send-state-machine";
import { currentIsoTimestamp, formatError } from "../../lib/format";
import {
  createVideoPoster,
  registerVideoPosterForMedia,
  type VideoPosterResult,
} from "../../lib/videoPoster";
import {
  localMediaResourceForSend,
  requireVideoSendPayload,
  uploadVideoPosterForSend,
  videoSendDiagnosticsContext,
  withVideoPosterMedia,
} from "../../media/runtime/videoPosterMedia";
import {
  normalizeUploadedMedia,
} from "../../messages/models/messageComposerModel";

type LocalServiceUploadTask = {
  localTaskId: string;
  localMessageId: string;
  file: File;
  kind: ComposerMediaKind;
  thread: CustomerServiceThread;
  body: Record<string, unknown>;
  localPreviewUrl?: string;
  videoPoster?: VideoPosterResult;
  videoPosterPromise?: Promise<VideoPosterResult | undefined>;
  controller?: AbortController;
  controlState?: "paused" | "canceled";
};

export function useCustomerServiceSendController({
  client,
  queryClient,
  scrollMessagesToBottom,
  selectedThread,
  session,
  setNotice,
}: {
  client: ApiClient | null;
  queryClient: QueryClient;
  scrollMessagesToBottom: (behavior?: ScrollBehavior) => void;
  selectedThread?: CustomerServiceThread;
  session: AuthSession | null;
  setNotice: (notice: string | null) => void;
}) {
  const mediaUploadTasksRef = useRef(new Map<string, LocalServiceUploadTask>());

  const sendTextMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!client || !selectedThread) throw new Error("请选择在线客服会话");
      return client.sendWorkbenchTextMessage(
        selectedThread.threadType,
        selectedThread.threadId,
        content,
      );
    },
    onSuccess: async (result, content) => {
      if (selectedThread) {
        logChatSendDiagnostic({
          taskId: "P4-MSG-005D",
          channel: "customer_service",
          phase: "send",
          result: "ok",
          action: "send_succeeded",
          from: "sending",
          to: "sent",
          context: {
            threadId: selectedThread.threadId,
            threadType: selectedThread.threadType,
            messageId: result.messageId,
            messageKind: "text",
          },
        });
        mergeSentCustomerServiceMessage(queryClient, {
          thread: selectedThread,
          result,
          messageType: "text",
          body: { text: content },
          identity: session,
        });
      }
      setNotice(null);
      await invalidateCustomerServiceQueries(queryClient);
      scrollMessagesToBottom("smooth");
    },
    onError: (error) => {
      logChatSendDiagnostic({
        taskId: "P4-MSG-005D",
        channel: "customer_service",
        phase: "send",
        result: "failed",
        action: "send_failed",
        from: "sending",
        to: "failed",
        reason: formatError(error),
        context: {
          threadId: selectedThread?.threadId,
          threadType: selectedThread?.threadType,
          messageKind: "text",
        },
      });
      if (isTerminalCustomerServiceWriteError(error)) {
        setNotice("会话已结束，已切换为只读状态。");
        void invalidateCustomerServiceQueries(queryClient);
      }
    },
  });

  const sendMediaMutation = useMutation({
    mutationFn: async ({
      file,
      kind,
    }: {
      file: File;
      kind: ComposerMediaKind;
    }) => {
      if (!client || !selectedThread) throw new Error("请选择在线客服会话");
      const videoPoster = kind === "video" ? await createVideoPoster(file) : undefined;
      if (kind === "video" && !videoPoster) throw new Error("视频封面生成失败");
      const uploadedMedia = normalizeUploadedMedia(await client.uploadMedia(file, kind), file);
      const posterUpload = await uploadVideoPosterForSend({
        kind,
        videoPoster,
        uploadPoster: (posterFile) =>
          client
            .uploadMedia(posterFile, "image")
            .then((posterMedia) => normalizeUploadedMedia(posterMedia, posterFile)),
      });
      const media = withVideoPosterMedia(
        uploadedMedia,
        posterUpload.videoPoster,
        posterUpload.uploadedPoster,
      );
      registerVideoPosterForMedia(
        media as Record<string, unknown>,
        posterUpload.videoPoster?.url,
      );
      const result = await client.sendWorkbenchMediaMessage(
        selectedThread.threadType,
        selectedThread.threadId,
        kind,
        kind === "video" ? requireVideoSendPayload(media) : media,
      );
      return { result, media, kind };
    },
    onSuccess: async ({ result, media, kind }) => {
      if (selectedThread) {
        mergeSentCustomerServiceMessage(queryClient, {
          thread: selectedThread,
          result,
          messageType: kind,
          body: { [kind]: media },
          identity: session,
        });
      }
      setNotice(null);
      await invalidateCustomerServiceQueries(queryClient);
      scrollMessagesToBottom("smooth");
    },
    onError: (error) => {
      if (isTerminalCustomerServiceWriteError(error)) {
        setNotice("会话已结束，已切换为只读状态。");
        void invalidateCustomerServiceQueries(queryClient);
      }
    },
  });

  const startServiceMediaUpload = useCallback(
    (localTaskId: string) => {
      const task = mediaUploadTasksRef.current.get(localTaskId);
      if (!task || !client) return;
      const controller = new AbortController();
      task.controller = controller;
      task.controlState = undefined;
      let videoMediaForDiagnostics: MediaResourceDto | undefined;
      logChatSendDiagnostic({
        taskId: "P4-MSG-005D",
        channel: "customer_service",
        phase: "upload",
        result: "ok",
        action: "start_upload",
        from: "queued",
        to: "uploading",
        context: {
          threadId: task.thread.threadId,
          threadType: task.thread.threadType,
          localMessageId: task.localMessageId,
          localTaskId,
          messageKind: task.kind,
        },
      });
      patchCustomerServiceLocalMessage(queryClient, task.thread, task.localMessageId, {
        status: "uploading",
        uploadProgress: 0,
        localError: undefined,
      });
      void (async () => {
        try {
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
            task.body = { [task.kind]: localMedia };
            patchCustomerServiceLocalMessage(queryClient, task.thread, task.localMessageId, {
              body: task.body,
              status: "uploading",
              uploadProgress: 0,
              localError: undefined,
            });
          }
          const uploadedMedia = normalizeUploadedMedia(
            await client.uploadMedia(task.file, task.kind, {
              signal: controller.signal,
              onProgress: (progress) => {
                if (typeof progress.percent !== "number") return;
                patchCustomerServiceLocalMessage(queryClient, task.thread, task.localMessageId, {
                  status: "uploading",
                  uploadProgress: progress.percent,
                });
              },
            }),
            task.file,
          );
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
          const media = withVideoPosterMedia(
            uploadedMedia,
            videoPoster,
            posterUpload.uploadedPoster,
          );
          videoMediaForDiagnostics = media;
          registerVideoPosterForMedia(media as Record<string, unknown>, videoPoster?.url);
          logChatSendDiagnostic({
            taskId: "P4-MSG-005D",
            channel: "customer_service",
            phase: "upload",
            result: "ok",
            action: "upload_succeeded",
            from: "uploading",
            to: "sending",
            context: {
              threadId: task.thread.threadId,
              threadType: task.thread.threadType,
              localMessageId: task.localMessageId,
              localTaskId,
              messageKind: task.kind,
            },
          });
          const result = await client.sendWorkbenchMediaMessage(
            task.thread.threadType,
            task.thread.threadId,
            task.kind,
            task.kind === "video" ? requireVideoSendPayload(media) : media,
          );
          removeCustomerServiceLocalMessage(queryClient, task.thread, task.localMessageId);
          mergeSentCustomerServiceMessage(queryClient, {
            thread: task.thread,
            result,
            messageType: task.kind,
            body: {
              [task.kind]:
                (task.kind === "image" || task.kind === "video") && task.localPreviewUrl
                  ? {
                      ...media,
                      localPreviewUrl: task.localPreviewUrl,
                      ...(videoPoster?.url ? { localPosterUrl: videoPoster.url } : {}),
                    }
                  : media,
            },
            identity: session,
          });
          logChatSendDiagnostic({
            taskId: "P4-MSG-005D",
            channel: "customer_service",
            phase: "send",
            result: "ok",
            action: "send_succeeded",
            from: "sending",
            to: "sent",
            context: {
              threadId: task.thread.threadId,
              threadType: task.thread.threadType,
              localMessageId: task.localMessageId,
              localTaskId,
              messageId: result.messageId,
              messageKind: task.kind,
            },
          });
          mediaUploadTasksRef.current.delete(localTaskId);
          setNotice(null);
          await invalidateCustomerServiceQueries(queryClient);
          scrollMessagesToBottom("smooth");
        } catch (error) {
          if (controller.signal.aborted && task.controlState) return;
          if (isTerminalCustomerServiceWriteError(error)) {
            setNotice("会话已结束，已切换为只读状态。");
            void invalidateCustomerServiceQueries(queryClient);
          }
          logChatSendDiagnostic({
            taskId: "P4-MSG-005D",
            channel: "customer_service",
            phase: "send",
            result: "failed",
            action: "send_failed",
            from: "uploading",
            to: "failed",
            reason: formatError(error),
            context: {
              threadId: task.thread.threadId,
              threadType: task.thread.threadType,
              localMessageId: task.localMessageId,
              localTaskId,
              messageKind: task.kind,
              path:
                "/api/client/v1/customer-service/workbench/threads/{threadType}/{threadId}/messages",
              ...(task.kind === "video"
                ? { video: videoSendDiagnosticsContext(videoMediaForDiagnostics, error) }
                : {}),
            },
          });
          patchCustomerServiceLocalMessage(queryClient, task.thread, task.localMessageId, {
            status: "failed",
            localError: formatError(error),
          });
        }
      })();
    },
    [client, queryClient, scrollMessagesToBottom, session, setNotice],
  );

  const sendServiceMediaOptimistically = useCallback(
    async (file: File, kind: ComposerMediaKind) => {
      if (!selectedThread) throw new Error("请选择在线客服会话");
      const localMessageId = `pc-cs-local-media-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const localTaskId = `pc-cs-upload-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
      const body = { [kind]: localMedia };
      const message = customerServiceMessageFromSendResult({
        thread: selectedThread,
        result: { messageId: localMessageId, sentAt: currentIsoTimestamp() },
        messageType: kind,
        body,
        identity: session,
      });
      const localMessage = {
        ...message,
        status: initialStatus,
        uploadProgress: 0,
        localTaskId,
        ...(posterError ? { localError: posterError } : {}),
      } as MessageItemDto;
      appendCustomerServiceLocalMessage(queryClient, selectedThread, localMessage);
      logChatSendDiagnostic({
        taskId: "P4-MSG-005D",
        channel: "customer_service",
        phase: "local_echo",
        result: posterError ? "failed" : "ok",
        action: "enqueue_media",
        to: initialStatus,
        context: {
          threadId: selectedThread.threadId,
          threadType: selectedThread.threadType,
          localMessageId,
          localTaskId,
          messageKind: kind,
          ...(posterError ? { reason: posterError } : {}),
        },
      });
      mediaUploadTasksRef.current.set(localTaskId, {
        localTaskId,
        localMessageId,
        file,
        kind,
        thread: selectedThread,
        body,
        localPreviewUrl,
        videoPoster,
      });
      scrollMessagesToBottom("smooth");
      if (!posterError) startServiceMediaUpload(localTaskId);
    },
    [queryClient, scrollMessagesToBottom, selectedThread, session, startServiceMediaUpload],
  );

  const handleServiceUploadAction = useCallback(
    (localTaskId: string, action: "pause" | "resume" | "cancel" | "retry") => {
      const task = mediaUploadTasksRef.current.get(localTaskId);
      if (!task) return;
      if (action === "pause") {
        task.controlState = "paused";
        task.controller?.abort();
        logChatSendDiagnostic({
          taskId: "P4-MSG-005D",
          channel: "customer_service",
          phase: "transition",
          result: "ok",
          action: "pause",
          from: "uploading",
          to: "paused",
          context: {
            threadId: task.thread.threadId,
            threadType: task.thread.threadType,
            localMessageId: task.localMessageId,
            localTaskId,
            messageKind: task.kind,
          },
        });
        patchCustomerServiceLocalMessage(queryClient, task.thread, task.localMessageId, {
          status: "paused",
          localError: undefined,
        });
        return;
      }
      if (action === "cancel") {
        task.controlState = "canceled";
        task.controller?.abort();
        logChatSendDiagnostic({
          taskId: "P4-MSG-005D",
          channel: "customer_service",
          phase: "transition",
          result: "ok",
          action: "cancel",
          from: "uploading",
          to: "canceled",
          context: {
            threadId: task.thread.threadId,
            threadType: task.thread.threadType,
            localMessageId: task.localMessageId,
            localTaskId,
            messageKind: task.kind,
          },
        });
        patchCustomerServiceLocalMessage(queryClient, task.thread, task.localMessageId, {
          status: "canceled",
          localError: undefined,
        });
        return;
      }
      logChatSendDiagnostic({
        taskId: "P4-MSG-005D",
        channel: "customer_service",
        phase: "transition",
        result: "ok",
        action: "retry_upload",
        from: action === "resume" ? "paused" : "failed",
        to: "uploading",
        context: {
          threadId: task.thread.threadId,
          threadType: task.thread.threadType,
          localMessageId: task.localMessageId,
          localTaskId,
          messageKind: task.kind,
        },
      });
      startServiceMediaUpload(localTaskId);
    },
    [queryClient, startServiceMediaUpload],
  );

  return {
    handleServiceUploadAction,
    sendMediaMutation,
    sendServiceMediaOptimistically,
    sendTextMutation,
  };
}
