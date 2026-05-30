import type { ComposerMediaKind } from "../../composer/domain/detectComposerMediaKind";
import type { AuthSession } from "../auth/auth-session";
import {
  createOutboxFile,
  sendOutboxRecordToMessage,
  type SendOutboxRecord,
} from "../send/send-outbox";
import type { getSendOutboxStorage } from "../send/send-outbox";
import type { VideoPosterResult } from "../../lib/videoPoster";

export async function restoreCustomerServiceOutboxRecord(
  storage: ReturnType<typeof getSendOutboxStorage>,
  record: SendOutboxRecord,
  objectUrls: string[],
  session: AuthSession,
) {
  const file = isCustomerServiceMediaRecord(record) ? await createOutboxFile(storage, record) : null;
  const localPreviewUrl = file && (record.messageType === "image" || record.messageType === "video")
    ? URL.createObjectURL(file)
    : undefined;
  if (localPreviewUrl) objectUrls.push(localPreviewUrl);

  const posterBlob = record.posterBlobId ? await storage.getBlob(record.posterBlobId) : null;
  const posterUrl = posterBlob ? URL.createObjectURL(posterBlob) : undefined;
  if (posterUrl) objectUrls.push(posterUrl);

  const body = withRestoredCustomerServiceLocalMedia(record.body, record.messageType, {
    localPreviewUrl,
    posterUrl,
  });
  const message = sendOutboxRecordToMessage({ ...record, body }, session);
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

export function isCustomerServiceMediaRecord(
  record: SendOutboxRecord,
): record is SendOutboxRecord & { messageType: ComposerMediaKind } {
  return record.messageType === "image" || record.messageType === "video" || record.messageType === "file";
}

function withRestoredCustomerServiceLocalMedia(
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
