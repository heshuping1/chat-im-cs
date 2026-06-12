import {
  customerServicePreviewFromBody,
  isMeaningfulCustomerServicePreview,
  normalizeCustomerServiceMessageType,
} from "./cs-message-preview";
import {
  customerServiceClientMessageId,
  readNonEmptyString,
} from "./cs-message-identity";
import type { CustomerServiceMessage } from "./cs-message-types";

export function mergeCustomerServiceMessage(
  current: CustomerServiceMessage | undefined,
  incoming: CustomerServiceMessage,
): CustomerServiceMessage {
  if (!current) {
    return normalizeIncomingMessage(incoming);
  }
  const messageType =
    incoming.messageType || current.messageType || normalizeCustomerServiceMessageType(undefined);
  const body = mergeCustomerServiceBody(messageType, current.body ?? {}, incoming.body ?? {});
  const preview = mergeCustomerServicePreview(messageType, body, current.preview, incoming.preview);
  const clientMsgId = customerServiceClientMessageId(current) || customerServiceClientMessageId(incoming);
  const currentLocal = current as CustomerServiceLocalMessageFields;
  const incomingLocal = incoming as CustomerServiceLocalMessageFields;

  return normalizeIncomingMessage({
    ...current,
    ...incoming,
    ...(clientMsgId ? { clientMsgId } : {}),
    ...(current.clientMessageId && !incoming.clientMessageId
      ? { clientMessageId: current.clientMessageId }
      : {}),
    ...(currentLocal.localTaskId && !incomingLocal.localTaskId
      ? { localTaskId: currentLocal.localTaskId }
      : {}),
    ...(typeof currentLocal.localSendStartedAt === "number" &&
    typeof incomingLocal.localSendStartedAt !== "number"
      ? { localSendStartedAt: currentLocal.localSendStartedAt }
      : {}),
    body,
    messageType,
    preview,
  });
}

export function hasRenderableCustomerServiceMessageContent(
  message: CustomerServiceMessage,
) {
  const type = normalizeCustomerServiceMessageType(message.messageType, message.body ?? {});
  return (
    hasMeaningfulCustomerServiceBody(type, message.body ?? {}) ||
    isMeaningfulCustomerServicePreview(message.preview) ||
    Boolean(customerServicePreviewFromBody(type, message.body ?? {}))
  );
}

type CustomerServiceLocalMessageFields = CustomerServiceMessage & {
  localSendStartedAt?: number;
  localTaskId?: string;
};

export function mergeCustomerServiceBody(
  messageType: unknown,
  currentBody: Record<string, unknown>,
  incomingBody: Record<string, unknown>,
) {
  const type = normalizeCustomerServiceMessageType(messageType, {
    ...currentBody,
    ...incomingBody,
  });
  const currentMeaningful = hasMeaningfulCustomerServiceBody(type, currentBody);
  const incomingMeaningful = hasMeaningfulCustomerServiceBody(type, incomingBody);
  if (incomingMeaningful && currentMeaningful) {
    return { ...currentBody, ...incomingBody };
  }
  if (incomingMeaningful) return incomingBody;
  if (currentMeaningful) return currentBody;
  return { ...currentBody, ...incomingBody };
}

export function mergeCustomerServicePreview(
  messageType: unknown,
  body: Record<string, unknown>,
  currentPreview: unknown,
  incomingPreview: unknown,
) {
  if (isMeaningfulCustomerServicePreview(incomingPreview)) {
    return readNonEmptyString(incomingPreview);
  }
  if (isMeaningfulCustomerServicePreview(currentPreview)) {
    return readNonEmptyString(currentPreview);
  }
  return customerServicePreviewFromBody(messageType, body) || "";
}

function normalizeIncomingMessage(message: CustomerServiceMessage): CustomerServiceMessage {
  const body = message.body ?? {};
  return {
    ...message,
    body,
    preview:
      isMeaningfulCustomerServicePreview(message.preview)
        ? message.preview
        : customerServicePreviewFromBody(message.messageType, body) || "",
  };
}

function hasMeaningfulCustomerServiceBody(
  messageType: string,
  body: Record<string, unknown>,
) {
  if (messageType === "text") {
    return Boolean(readNonEmptyString(body.text));
  }
  if (messageType === "image" || messageType === "video" || messageType === "file") {
    return Boolean(body[messageType]);
  }
  return Object.keys(body).some((key) => key !== "messageType" && body[key] !== undefined);
}
