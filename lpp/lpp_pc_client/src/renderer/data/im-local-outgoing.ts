import type { MediaResourceDto, MessageItemDto } from "./api/types";

export function mergeLocalOutgoingMessages(
  serverMessages: MessageItemDto[],
  localMessages: MessageItemDto[],
) {
  if (localMessages.length === 0) return serverMessages;
  const localById = new Map(
    localMessages
      .filter((message) => message.messageId)
      .map((message) => [message.messageId, message] as const),
  );
  const mergedServerMessages = serverMessages.map((serverMessage) => {
    const localMessage = serverMessage.messageId
      ? localById.get(serverMessage.messageId)
      : undefined;
    return localMessage ? mergeServerAndLocalMessage(serverMessage, localMessage) : serverMessage;
  });
  const serverIds = new Set(serverMessages.map((message) => message.messageId).filter(Boolean));
  const matchedServerIndexes = new Set<number>();
  const localOnly = localMessages.filter((message) => {
    if (serverIds.has(message.messageId)) return false;
    const matchingServerIndex = serverMessages.findIndex(
      (serverMessage, index) =>
        !matchedServerIndexes.has(index) && isPendingLocalServerEcho(serverMessage, message),
    );
    if (matchingServerIndex >= 0) {
      matchedServerIndexes.add(matchingServerIndex);
      return false;
    }
    return true;
  });
  if (localOnly.length === 0) return mergedServerMessages;
  return [...mergedServerMessages, ...localOnly].sort(sortMessages);
}

function mergeServerAndLocalMessage(
  serverMessage: MessageItemDto,
  localMessage: MessageItemDto,
): MessageItemDto {
  const serverBody = serverMessage.body ?? {};
  const localBody = localMessage.body ?? {};
  const body = { ...localBody, ...serverBody };
  let changed = false;

  for (const key of ["image", "video", "file"] as const) {
    if (!(key in localBody)) continue;
    const mergedMedia = mergeServerAndLocalMedia(serverBody[key], localBody[key]);
    if (mergedMedia !== serverBody[key]) {
      body[key] = mergedMedia;
      changed = true;
    }
  }

  if (!changed && serverMessage.body) return serverMessage;
  return {
    ...localMessage,
    ...serverMessage,
    body,
    preview: serverMessage.preview || localMessage.preview,
  };
}

function mergeServerAndLocalMedia(serverValue: unknown, localValue: unknown) {
  if (!hasRenderableMedia(serverValue)) return localValue;
  if (!localValue) return serverValue;

  if (Array.isArray(serverValue) || Array.isArray(localValue)) {
    const serverList = Array.isArray(serverValue) ? serverValue : [serverValue];
    const localList = Array.isArray(localValue) ? localValue : [localValue];
    return serverList.map((item, index) =>
      mergeServerAndLocalMediaRecord(item, localList[index]),
    );
  }

  return mergeServerAndLocalMediaRecord(serverValue, localValue);
}

function mergeServerAndLocalMediaRecord(serverValue: unknown, localValue: unknown) {
  const serverRecord = mediaRecord(serverValue);
  const localRecord = mediaRecord(localValue);
  if (!serverRecord) return localValue;
  if (!localRecord) return serverValue;

  const merged: Record<string, unknown> = { ...localRecord, ...serverRecord };
  for (const key of [
    "localPreviewUrl",
    "localOpenUrl",
    "localPosterUrl",
    "posterUrl",
    "thumbnailUrl",
    "width",
    "height",
    "durationSeconds",
    "sizeBytes",
  ]) {
    if (isEmptyMediaValue(merged[key]) && !isEmptyMediaValue(localRecord[key])) {
      merged[key] = localRecord[key];
    }
  }
  if (!hasRenderableMedia(merged)) {
    return localValue;
  }
  return merged as MediaResourceDto;
}

function isEmptyMediaValue(value: unknown) {
  return value === undefined || value === null || (typeof value === "string" && !value.trim());
}

function mediaRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === "string" && value.trim()) return { url: value };
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function hasRenderableMedia(value: unknown) {
  if (typeof value === "string") return Boolean(value.trim());
  if (Array.isArray(value)) return value.some(hasRenderableMedia);
  const record = mediaRecord(value);
  if (!record) return false;
  return [
    "url",
    "localPreviewUrl",
    "downloadUrl",
    "signedUrl",
    "fileUrl",
    "resourceUrl",
    "mediaUrl",
    "objectUrl",
    "uri",
    "path",
  ].some((key) => typeof record[key] === "string" && String(record[key]).trim());
}

function isPendingLocalServerEcho(serverMessage: MessageItemDto, localMessage: MessageItemDto) {
  if (localMessage.status !== "sending" && localMessage.status !== "uploading") return false;
  if (
    serverMessage.conversationId &&
    localMessage.conversationId &&
    serverMessage.conversationId !== localMessage.conversationId
  ) {
    return false;
  }
  if (!isOutgoing(serverMessage) || !isOutgoing(localMessage)) return false;
  if (messageKind(serverMessage) !== messageKind(localMessage)) return false;
  return messageSignature(serverMessage) === messageSignature(localMessage);
}

function isOutgoing(message: MessageItemDto) {
  return (
    message.isMine === true ||
    message.isSelf === true ||
    message.direction === "out" ||
    message.direction === "outgoing"
  );
}

function messageKind(message: MessageItemDto) {
  return String(message.messageType ?? (message as { type?: unknown }).type ?? "").toLowerCase();
}

function messageSignature(message: MessageItemDto) {
  const body = message.body ?? {};
  const text = typeof body.text === "string" ? body.text : "";
  if (text.trim()) return `text:${text}`;
  for (const key of ["image", "video", "file"] as const) {
    const record = mediaRecord(body[key]);
    if (!record) continue;
    const fileName = typeof record.fileName === "string" ? record.fileName : "";
    const size = record.sizeBytes ?? record.fileSize ?? "";
    const mimeType = typeof record.mimeType === "string" ? record.mimeType : "";
    return `${key}:${fileName}:${size}:${mimeType}`;
  }
  return String(message.preview ?? "");
}

function sortMessages(left: MessageItemDto, right: MessageItemDto) {
  const leftSeq = Number(left.conversationSeq ?? Number.MAX_SAFE_INTEGER);
  const rightSeq = Number(right.conversationSeq ?? Number.MAX_SAFE_INTEGER);
  return (
    leftSeq - rightSeq ||
    new Date(left.sentAt ?? 0).getTime() - new Date(right.sentAt ?? 0).getTime()
  );
}
