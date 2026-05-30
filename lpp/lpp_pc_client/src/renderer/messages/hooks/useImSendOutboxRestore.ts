import { useEffect } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import type { ConversationListItem, MessageItemDto } from "../../data/api-client";
import type { AuthSession } from "../../data/auth/auth-session";
import type { ComposerMediaKind } from "../../composer/domain/detectComposerMediaKind";
import {
  createOutboxFile,
  getSendOutboxStorage,
  sendOutboxRecordToMessage,
  sendOutboxScopeKey,
  sendOutboxTargetKey,
  type SendOutboxRecord,
} from "../../data/send/send-outbox";
import { conversationKey } from "../../data/im-read-model";
import type { VideoPosterResult } from "../../lib/videoPoster";
import type { useMediaUploadTaskRegistry } from "./useMediaUploadTaskRegistry";

type ImConversationType = "direct" | "group";

export function useImSendOutboxRestore({
  activeConversation,
  activeConversationType,
  localImagePreviewByMessageIdRef,
  mediaUploadTasks,
  session,
  setLocalOutgoingMessagesByConversation,
}: {
  activeConversation?: ConversationListItem;
  activeConversationType?: ImConversationType;
  localImagePreviewByMessageIdRef: MutableRefObject<Map<string, string>>;
  mediaUploadTasks: ReturnType<typeof useMediaUploadTaskRegistry>;
  session: AuthSession | null;
  setLocalOutgoingMessagesByConversation: Dispatch<
    SetStateAction<Record<string, MessageItemDto[]>>
  >;
}) {
  useEffect(() => {
    if (!session || !activeConversation || !activeConversationType) return undefined;
    let canceled = false;
    const objectUrls: string[] = [];
    const storage = getSendOutboxStorage();
    const scopeKey = sendOutboxScopeKey(session);
    const targetKey = sendOutboxTargetKey(
      "im",
      activeConversationType,
      activeConversation.conversationId,
    );

    void (async () => {
      await storage.cleanupExpired();
      const records = await storage.listRecords({ scopeKey, targetKey });
      if (canceled) return;
      for (const record of records) {
        const restored = await restoreRecordMedia(storage, record, objectUrls);
        if (canceled) return;
        setLocalOutgoingMessagesByConversation((current) =>
          upsertRestoredLocalOutgoingMessage(current, activeConversationType, restored.message),
        );
        if (restored.localPreviewUrl) {
          localImagePreviewByMessageIdRef.current.set(
            `message:${record.localMessageId}`,
            restored.localPreviewUrl,
          );
        }
        if (restored.file && record.localTaskId && isMediaRecord(record)) {
          mediaUploadTasks.setTask({
            clientMsgId: record.clientMsgId,
            localTaskId: record.localTaskId,
            localMessageId: record.localMessageId,
            file: restored.file,
            kind: record.messageType,
            conversation: activeConversation,
            conversationType: activeConversationType,
            body: restored.message.body ?? record.body,
            reply: (record.reply as null) ?? null,
            localPreviewUrl: restored.localPreviewUrl,
            videoPoster: restored.videoPoster,
          });
        } else if (isMediaRecord(record) && record.localTaskId) {
          await storage.patchRecord(scopeKey, record.localMessageId, {
            localError: "本地文件已失效，请重新选择",
            status: "failed",
            updatedAt: Date.now(),
          });
        }
        if (["queued", "uploading", "sending", "paused"].includes(record.status)) {
          await storage.patchRecord(scopeKey, record.localMessageId, {
            localError: "发送中断，点击重试",
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
  }, [
    activeConversation,
    activeConversationType,
    localImagePreviewByMessageIdRef,
    mediaUploadTasks,
    session,
    setLocalOutgoingMessagesByConversation,
  ]);
}

async function restoreRecordMedia(
  storage: ReturnType<typeof getSendOutboxStorage>,
  record: SendOutboxRecord,
  objectUrls: string[],
) {
  const file = isMediaRecord(record) ? await createOutboxFile(storage, record) : null;
  const localPreviewUrl = file && (record.messageType === "image" || record.messageType === "video")
    ? URL.createObjectURL(file)
    : undefined;
  if (localPreviewUrl) objectUrls.push(localPreviewUrl);

  const posterBlob = record.posterBlobId ? await storage.getBlob(record.posterBlobId) : null;
  const posterUrl = posterBlob ? URL.createObjectURL(posterBlob) : undefined;
  if (posterUrl) objectUrls.push(posterUrl);

  const body = withRestoredLocalMedia(record.body, record.messageType, {
    localPreviewUrl,
    posterUrl,
  });
  const message = sendOutboxRecordToMessage({ ...record, body });
  const videoPoster = file && posterBlob && posterUrl
    ? {
        dataUrl: posterUrl,
        file: new File(
          [posterBlob],
          `${file.name.replace(/\.[^.]+$/, "") || "video"}-poster.jpg`,
          { type: posterBlob.type || "image/jpeg" },
        ),
        url: posterUrl,
      } satisfies VideoPosterResult
    : undefined;

  return { file, localPreviewUrl, message, videoPoster };
}

function withRestoredLocalMedia(
  body: Record<string, unknown>,
  messageType: SendOutboxRecord["messageType"],
  urls: { localPreviewUrl?: string; posterUrl?: string },
) {
  if (!urls.localPreviewUrl && !urls.posterUrl) return body;
  const value = body[messageType];
  if (!value || typeof value !== "object" || Array.isArray(value)) return body;
  return {
    ...body,
    [messageType]: {
      ...(value as Record<string, unknown>),
      ...(urls.localPreviewUrl ? { localPreviewUrl: urls.localPreviewUrl } : {}),
      ...(urls.posterUrl
        ? { localPosterUrl: urls.posterUrl, posterUrl: urls.posterUrl, thumbnailUrl: urls.posterUrl }
        : {}),
    },
  };
}

function isMediaRecord(
  record: SendOutboxRecord,
): record is SendOutboxRecord & { messageType: ComposerMediaKind } {
  return record.messageType === "image" || record.messageType === "video" || record.messageType === "file";
}

function upsertRestoredLocalOutgoingMessage(
  current: Record<string, MessageItemDto[]>,
  conversationType: ImConversationType,
  message: MessageItemDto,
) {
  const key = conversationKey(conversationType, message.conversationId ?? "");
  const existing = current[key] ?? [];
  const next = existing.some((item) => item.messageId === message.messageId)
    ? existing.map((item) => (item.messageId === message.messageId ? message : item))
    : [...existing, message];
  next.sort((left, right) => Date.parse(left.sentAt ?? "") - Date.parse(right.sentAt ?? ""));
  return { ...current, [key]: next };
}
