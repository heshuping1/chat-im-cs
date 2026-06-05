export type MessageBatchFailedItem = {
  messageId: string;
  message?: string;
};

export type MessageBatchActionResult = {
  failedItems: MessageBatchFailedItem[];
  requestedIds: string[];
  successIds: string[];
};

export function normalizeMessageBatchActionResult(
  value: unknown,
  requestedIds: string[],
): MessageBatchActionResult {
  const record = isRecord(value) ? value : {};
  const failedItems = normalizeFailedItems(record.failedItems);
  const failedIds = new Set(failedItems.map((item) => item.messageId.toLowerCase()));
  const explicitSuccessIds = normalizeStringArray(record.successIds);
  const successIds =
    explicitSuccessIds.length > 0
      ? explicitSuccessIds
      : requestedIds.filter((messageId) => !failedIds.has(messageId.toLowerCase()));
  return {
    failedItems,
    requestedIds,
    successIds: uniqueIds(successIds),
  };
}

export function messageBatchSucceededCount(result: MessageBatchActionResult) {
  return result.successIds.length;
}

export function messageBatchFailedCount(result: MessageBatchActionResult) {
  const knownFailedIds = new Set(result.failedItems.map((item) => item.messageId.toLowerCase()));
  const successIds = new Set(result.successIds.map((item) => item.toLowerCase()));
  const missingFailures = result.requestedIds.filter(
    (messageId) =>
      !successIds.has(messageId.toLowerCase()) &&
      !knownFailedIds.has(messageId.toLowerCase()),
  );
  return result.failedItems.length + missingFailures.length;
}

function normalizeFailedItems(value: unknown): MessageBatchFailedItem[] {
  if (!Array.isArray(value)) return [];
  const failedItems: MessageBatchFailedItem[] = [];
  value.forEach((item) => {
    if (!isRecord(item)) return;
    const messageId = stringField(item, "messageId", "id");
    if (!messageId) return;
    failedItems.push({
      messageId,
      message: stringField(item, "message", "reason", "error") || undefined,
    });
  });
  return failedItems;
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return uniqueIds(value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean));
}

function uniqueIds(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((value) => {
    const id = value.trim();
    const key = id.toLowerCase();
    if (!id || seen.has(key)) return;
    seen.add(key);
    result.push(id);
  });
  return result;
}

function stringField(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
