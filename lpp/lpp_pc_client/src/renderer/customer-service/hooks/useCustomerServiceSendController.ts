import { useMutation, type QueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

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
  isCustomerServiceMediaRecord,
  restoreCustomerServiceOutboxRecord,
} from "../../data/customer-service/cs-send-outbox-restore";
import {
  createUploadProgressDiagnosticTracker,
  initialChatSendStatusForKind,
  logChatSendDiagnostic,
  logUploadProgressDiagnosticFromTracker,
} from "../../data/send/send-state-machine";
import { createChatSendRuntime } from "../../data/send/chat-send-runtime";
import {
  getSendOutboxStorage,
  sendOutboxScopeKey,
  sendOutboxTargetKey,
  type SendOutboxStatus,
} from "../../data/send/send-outbox";
import { currentIsoTimestamp, formatError } from "../../lib/format";
import { useI18n } from "../../i18n/useI18n";
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
import { cacheLocalSentMediaForDesktop } from "../../media/runtime/localMediaCache";
import {
  createVideoUploadDisplayProgressTicker,
  mediaUploadProgressPercent,
} from "../../media/runtime/uploadState";
import {
  normalizeUploadedMedia,
} from "../../messages/models/messageComposerModel";

type LocalServiceUploadTask = {
  clientMsgId?: string;
  localTaskId: string;
  localMessageId: string;
  file: File;
  kind: ComposerMediaKind;
  thread: CustomerServiceThread;
  body: Record<string, unknown>;
  localOpenUrl?: string;
  localPreviewUrl?: string;
  localCachedMediaPromise?: Promise<string | undefined>;
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
  const { t } = useI18n();
  const mediaUploadTasksRef = useRef(new Map<string, LocalServiceUploadTask>());
  useEffect(() => {
    if (!selectedThread || !session) return undefined;
    let canceled = false;
    const objectUrls: string[] = [];
    const storage = getSendOutboxStorage();
    const scopeKey = sendOutboxScopeKey(session);
    const targetKey = sendOutboxTargetKey(
      "customer_service",
      selectedThread.threadType,
      selectedThread.threadId,
    );
    void (async () => {
      await storage.cleanupExpired();
      const records = await storage.listRecords({ scopeKey, targetKey });
      if (canceled) return;
      for (const record of records) {
        const restored = await restoreCustomerServiceOutboxRecord(
          storage,
          record,
          objectUrls,
          session,
        );
        if (canceled) return;
        appendCustomerServiceLocalMessage(queryClient, selectedThread, restored.message);
        if (restored.file && record.localTaskId && isCustomerServiceMediaRecord(record)) {
          mediaUploadTasksRef.current.set(record.localTaskId, {
            clientMsgId: record.clientMsgId,
            localTaskId: record.localTaskId,
            localMessageId: record.localMessageId,
            file: restored.file,
            kind: record.messageType,
            thread: selectedThread,
            body: restored.message.body ?? record.body,
            localPreviewUrl: restored.localPreviewUrl,
            videoPoster: restored.videoPoster,
          });
        } else if (isCustomerServiceMediaRecord(record) && record.localTaskId) {
          await storage.patchRecord(scopeKey, record.localMessageId, {
            localError: t("customerService.send.localFileExpired"),
            status: "failed",
            updatedAt: Date.now(),
          });
        }
        if (["queued", "uploading", "sending", "paused"].includes(record.status)) {
          await storage.patchRecord(scopeKey, record.localMessageId, {
            localError: t("customerService.send.sendInterruptedRetry"),
            status: "failed",
            updatedAt: Date.now(),
            uploadProgress: undefined,
          });
        }
      }
    })();
    return () => {
      canceled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [queryClient, selectedThread, session, t]);

  const sendTextMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!client || !selectedThread || !session) {
        throw new Error(t("customerService.send.selectThread"));
      }
      const runtime = createChatSendRuntime({
        channel: "customer_service",
        session,
        taskId: "P4-MSG-005D",
      });
      const { clientMsgId, createdAt, localMessageId } =
        runtime.createLocalIdentity("pc-cs-local-text");
      const body = { text: content };
      const sendStartedAt = createdAt;
      const localMessage = {
        ...customerServiceMessageFromSendResult({
          thread: selectedThread,
          result: { messageId: localMessageId, sentAt: currentIsoTimestamp() },
          messageType: "text",
          body,
          identity: session,
        }),
        localSendStartedAt: sendStartedAt,
        status: "sending",
      } as MessageItemDto;
      appendCustomerServiceLocalMessage(queryClient, selectedThread, localMessage);
      await runtime.upsertOutboxRecord({
        body,
        clientMsgId,
        createdAt: sendStartedAt,
        localMessageId,
        messageType: "text",
        status: "sending",
        targetId: selectedThread.threadId,
        targetType: selectedThread.threadType,
        updatedAt: sendStartedAt,
      });
      try {
        const result = await client.sendWorkbenchTextMessage(
          selectedThread.threadType,
          selectedThread.threadId,
          content,
          { clientMsgId },
        );
        return { body, localMessageId, result, runtime, thread: selectedThread };
      } catch (error) {
        const failedAt = Date.now();
        const reason = formatError(error);
        patchCustomerServiceLocalMessage(queryClient, selectedThread, localMessageId, {
          localFailedAt: failedAt,
          localError: reason,
          status: "failed",
        });
        await runtime.patchOutboxRecord(localMessageId, {
          localFailedAt: failedAt,
          localError: reason,
          status: "failed",
          updatedAt: failedAt,
        });
        throw error;
      }
    },
    onSuccess: async ({ body, localMessageId, result, runtime, thread }) => {
      if (thread) {
        runtime.log({
          phase: "send",
          result: "ok",
          action: "send_succeeded",
          from: "sending",
          to: "sent",
          context: {
            threadId: thread.threadId,
            threadType: thread.threadType,
            messageId: result.messageId,
            messageKind: "text",
          },
        });
        removeCustomerServiceLocalMessage(queryClient, thread, localMessageId);
        mergeSentCustomerServiceMessage(queryClient, {
          thread,
          result,
          messageType: "text",
          body,
          identity: session,
        });
        void runtime.deleteOutboxRecord(localMessageId);
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
        setNotice(t("customerService.send.threadClosedReadonly"));
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
      if (!client || !selectedThread) {
        throw new Error(t("customerService.send.selectThread"));
      }
      const videoPoster = kind === "video" ? await createVideoPoster(file) : undefined;
      if (kind === "video" && !videoPoster) {
        throw new Error(t("customerService.send.videoPosterFailed"));
      }
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
        setNotice(t("customerService.send.threadClosedReadonly"));
        void invalidateCustomerServiceQueries(queryClient);
      }
    },
  });

  const startServiceMediaUpload = useCallback(
    (localTaskId: string) => {
      const task = mediaUploadTasksRef.current.get(localTaskId);
      if (!task || !client || !session) return;
      const storage = getSendOutboxStorage();
      const scopeKey = sendOutboxScopeKey(session);
      const controller = new AbortController();
      task.controller = controller;
      task.controlState = undefined;
      let videoMediaForDiagnostics: MediaResourceDto | undefined;
      const patchLocalUpload = (patch: Parameters<typeof patchCustomerServiceLocalMessage>[3]) => {
        patchCustomerServiceLocalMessage(queryClient, task.thread, task.localMessageId, patch);
        void storage.patchRecord(scopeKey, task.localMessageId, {
          ...patch,
          updatedAt: patch.localFailedAt ?? Date.now(),
        } as Parameters<typeof storage.patchRecord>[2]);
      };
      const videoDisplayProgressTicker = task.kind === "video"
        ? createVideoUploadDisplayProgressTicker(({ phase, progress }) => {
            patchLocalUpload({
              status: phase === "sending" ? "sending" : "uploading",
              uploadPhase: phase,
              uploadProgress: progress,
              localError: undefined,
            });
          })
        : undefined;
      controller.signal.addEventListener(
        "abort",
        () => videoDisplayProgressTicker?.stop(),
        { once: true },
      );
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
      patchLocalUpload({
        status: "uploading",
        uploadPhase: "uploading_media",
        uploadProgress: 0,
        localError: undefined,
      });
      videoDisplayProgressTicker?.start("uploading_media");
      void (async () => {
        try {
          if (task.kind === "video" && !task.videoPoster) {
            const videoPoster = await createVideoPoster(task.file);
            if (!videoPoster) throw new Error(t("customerService.send.videoPosterFailed"));
            task.videoPoster = videoPoster;
            const localMedia = localMediaResourceForSend({
              file: task.file,
              kind: task.kind,
              localOpenUrl: task.localOpenUrl,
              localPreviewUrl: task.localPreviewUrl,
              videoPoster,
            });
            task.body = { [task.kind]: localMedia };
            patchLocalUpload({
              body: task.body,
              status: "uploading",
              uploadPhase: "uploading_media",
              uploadProgress: videoDisplayProgressTicker?.current() ?? 0,
              localError: undefined,
            });
          }
          const mediaProgress = createUploadProgressDiagnosticTracker();
          const uploadedMedia = normalizeUploadedMedia(
            await client.uploadMedia(task.file, task.kind, {
              signal: controller.signal,
              onProgress: (progress) => {
                const percent = mediaUploadProgressPercent(progress, task.file.size);
                if (typeof percent !== "number") return;
                mediaProgress.track(percent);
                if (videoDisplayProgressTicker) {
                  videoDisplayProgressTicker.setRawProgress("uploading_media", percent);
                  return;
                }
                patchLocalUpload({
                  status: "uploading",
                  uploadPhase: "uploading_media",
                  uploadProgress: percent,
                });
              },
            }),
            task.file,
          );
          if (task.kind === "video") {
            logUploadProgressDiagnosticFromTracker({
              taskId: "P4-MSG-005D",
              channel: "customer_service",
              fileSize: task.file.size,
              localTaskId,
              messageKind: task.kind,
              phase: "uploading_media",
              tracker: mediaProgress,
            });
          }
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
                    patchLocalUpload({
                      status: "uploading",
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
              taskId: "P4-MSG-005D",
              channel: "customer_service",
              fileSize: posterFileSize,
              localTaskId,
              messageKind: task.kind,
              phase: "uploading_poster",
              tracker: posterProgress,
            });
          }
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
          videoDisplayProgressTicker?.setPhase("sending");
          videoDisplayProgressTicker?.stop();
          patchLocalUpload({
            status: "sending",
            uploadPhase: "sending",
            uploadProgress: 95,
          });
          const result = await client.sendWorkbenchMediaMessage(
            task.thread.threadType,
            task.thread.threadId,
            task.kind,
            task.kind === "video" ? requireVideoSendPayload(media) : media,
            { clientMsgId: task.clientMsgId || task.localMessageId },
          );
          const localOpenForSent =
            (await task.localCachedMediaPromise?.catch(() => undefined)) ??
            task.localOpenUrl;
          if (localOpenForSent) task.localOpenUrl = localOpenForSent;
          const localPreviewForSent = task.localPreviewUrl;
          removeCustomerServiceLocalMessage(queryClient, task.thread, task.localMessageId);
          mergeSentCustomerServiceMessage(queryClient, {
            thread: task.thread,
            result,
            messageType: task.kind,
            body: {
              [task.kind]:
                localOpenForSent || ((task.kind === "image" || task.kind === "video") && localPreviewForSent)
                  ? {
                      ...media,
                      ...(localOpenForSent ? { localOpenUrl: localOpenForSent } : {}),
                      ...((task.kind === "image" || task.kind === "video") && localPreviewForSent
                        ? { localPreviewUrl: localPreviewForSent }
                        : {}),
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
          void storage.deleteRecord(scopeKey, task.localMessageId);
          setNotice(null);
          await invalidateCustomerServiceQueries(queryClient);
          scrollMessagesToBottom("smooth");
        } catch (error) {
          videoDisplayProgressTicker?.stop();
          if (controller.signal.aborted && task.controlState) return;
          const failedAt = Date.now();
          if (isTerminalCustomerServiceWriteError(error)) {
            setNotice(t("customerService.send.threadClosedReadonly"));
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
          patchLocalUpload({
            localFailedAt: failedAt,
            status: "failed",
            uploadPhase: "failed",
            localError: formatError(error),
          });
        }
      })();
    },
    [client, queryClient, scrollMessagesToBottom, session, setNotice],
  );

  const sendServiceMediaOptimistically = useCallback(
    async (file: File, kind: ComposerMediaKind) => {
      if (!selectedThread || !session) {
        throw new Error(t("customerService.send.selectThread"));
      }
      const runtime = createChatSendRuntime({
        channel: "customer_service",
        session,
        taskId: "P4-MSG-005D",
      });
      const { clientMsgId, createdAt, localMessageId } =
        runtime.createLocalIdentity("pc-cs-local-media");
      const localTaskId = `pc-cs-upload-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const storage = runtime.storage;
      const localPreviewUrl =
        kind === "image" || kind === "video" ? URL.createObjectURL(file) : undefined;
      const localCachedMediaPromise = cacheLocalSentMediaForDesktop({
        accountId: session.userId || session.platformUserId || session.lppId,
        conversationId: selectedThread.threadId,
        file,
        kind,
        localMessageId,
        localPreviewUrl,
      })
        .then((result) => result?.fileUrl)
        .catch((error) => {
          logChatSendDiagnostic({
            taskId: "P4-MSG-005D",
            channel: "customer_service",
            phase: "cache",
            result: "failed",
            action: "cache_local_media",
            context: {
              threadId: selectedThread.threadId,
              threadType: selectedThread.threadType,
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
      const posterError =
        kind === "video" && !videoPoster
          ? t("customerService.send.videoPosterFailed")
          : undefined;
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
        uploadPhase: posterError ? "failed" : "preparing",
        uploadProgress: 0,
        localTaskId,
        ...(posterError ? { localError: posterError } : {}),
      } as MessageItemDto;
      appendCustomerServiceLocalMessage(queryClient, selectedThread, localMessage);
      runtime.log({
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
      const fileBlobId = runtime.blobId(localMessageId, "file");
      const posterBlobId = videoPoster ? runtime.blobId(localMessageId, "poster") : undefined;
      void storage.putBlob(fileBlobId, file);
      if (posterBlobId && videoPoster) void storage.putBlob(posterBlobId, videoPoster.file);
      void runtime.upsertOutboxRecord({
        body,
        clientMsgId,
        createdAt,
        fileBlobId,
        fileName: file.name,
        localError: posterError || undefined,
        localMessageId,
        localTaskId,
        messageType: kind,
        mimeType: file.type,
        posterBlobId,
        status: initialStatus as SendOutboxStatus,
        targetId: selectedThread.threadId,
        targetType: selectedThread.threadType,
        updatedAt: createdAt,
        uploadPhase: posterError ? "failed" : "preparing",
        uploadProgress: 0,
      });
      mediaUploadTasksRef.current.set(localTaskId, {
        clientMsgId,
        localTaskId,
        localMessageId,
        file,
        kind,
        thread: selectedThread,
        body,
        localPreviewUrl,
        localCachedMediaPromise,
        videoPoster,
      });
      if (localCachedMediaPromise) {
        void localCachedMediaPromise.then((cachedOpenUrl) => {
          if (!cachedOpenUrl) return;
          const task = mediaUploadTasksRef.current.get(localTaskId);
          if (!task) return;
          task.localOpenUrl = cachedOpenUrl;
          task.body = {
            [kind]: localMediaResourceForSend({
              file,
              kind,
              localOpenUrl: cachedOpenUrl,
              localPreviewUrl: task.localPreviewUrl,
              videoPoster: task.videoPoster,
            }),
          };
          patchCustomerServiceLocalMessage(
            queryClient,
            selectedThread,
            localMessageId,
            { body: task.body },
          );
          void runtime.patchOutboxRecord(localMessageId, {
            body: task.body,
            updatedAt: Date.now(),
          });
        });
      }
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
        if (session) {
          void getSendOutboxStorage().patchRecord(
            sendOutboxScopeKey(session),
            task.localMessageId,
            { localError: undefined, status: "paused", updatedAt: Date.now() },
          );
        }
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
        if (session) {
          void getSendOutboxStorage().patchRecord(
            sendOutboxScopeKey(session),
            task.localMessageId,
            { localError: undefined, status: "canceled", updatedAt: Date.now() },
          );
        }
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
