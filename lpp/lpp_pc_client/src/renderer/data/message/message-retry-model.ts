import type { MessageItemDto } from "../api/types";
import { normalizeMessageType } from "../im-message-normalize";

export type FailedMessageRetryAction =
  | {
      type: "text";
      content: string;
      replyToMessageId?: string;
    }
  | {
      type: "contact_card";
      body: Record<string, unknown>;
      replyToMessageId?: string;
    }
  | {
      type: "upload";
      localTaskId: string;
    };

export type SendFailurePresentationKind = "retryable" | "blocked" | "unknown";

export interface SendFailurePresentation {
  dialogHint?: string;
  kind: SendFailurePresentationKind;
  markerTooltip: string;
}

const sendFailureMarkerTooltip = "发送失败，点击重试";
const blockedSendDialogHint = "当前会话暂不可发送";

export function failedMessageRetryAction(
  message: MessageItemDto,
): FailedMessageRetryAction | undefined {
  if (message.status !== "failed" && message.status !== "canceled") return undefined;

  const localTaskId = localTaskIdFromMessage(message);
  if (localTaskId) return { type: "upload", localTaskId };

  const type = normalizeMessageType(message) || "text";
  if (type === "contact_card" && message.body?.contactCard) {
    return {
      type: "contact_card",
      body: message.body,
      replyToMessageId: replyToMessageIdFromBody(message.body),
    };
  }
  if (type !== "text") return undefined;

  const content = textContentFromMessage(message);
  if (!content) return undefined;
  return {
    type: "text",
    content,
    replyToMessageId: replyToMessageIdFromBody(message.body),
  };
}

export function resendConfirmPreview(message: MessageItemDto) {
  const failure = sendFailurePresentation(localErrorFromMessage(message));
  if (failure.kind === "blocked" && failure.dialogHint) return failure.dialogHint;

  const action = failedMessageRetryAction(message);
  if (!action) return "该消息暂时无法重发";
  if (action.type === "text") return action.content;
  if (action.type === "contact_card") return "重新发送这张个人名片";
  return "重新上传并发送这条媒体消息";
}

export function sendFailurePresentation(reason?: string): SendFailurePresentation {
  const text = String(reason ?? "").trim();
  if (isBlockedSendFailure(text)) {
    return {
      dialogHint: blockedSendDialogHint,
      kind: "blocked",
      markerTooltip: sendFailureMarkerTooltip,
    };
  }
  if (isRetryableSendFailure(text)) {
    return {
      kind: "retryable",
      markerTooltip: sendFailureMarkerTooltip,
    };
  }
  return {
    kind: "unknown",
    markerTooltip: sendFailureMarkerTooltip,
  };
}

function textContentFromMessage(message: MessageItemDto) {
  const text = message.body?.text;
  if (typeof text === "string" && text.trim()) return text.trim();
  if (typeof message.preview === "string" && message.preview.trim()) {
    return message.preview.trim();
  }
  return "";
}

function replyToMessageIdFromBody(body?: Record<string, unknown>) {
  const reply = body?.reply;
  if (!reply || typeof reply !== "object") return undefined;
  const messageId = (reply as Record<string, unknown>).messageId;
  return typeof messageId === "string" && messageId.trim()
    ? messageId.trim()
    : undefined;
}

function localTaskIdFromMessage(message: MessageItemDto) {
  const value = (message as unknown as Record<string, unknown>).localTaskId;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function localErrorFromMessage(message: MessageItemDto) {
  const value = (message as unknown as Record<string, unknown>).localError;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isBlockedSendFailure(reason: string) {
  if (!reason) return false;
  const upper = reason.toUpperCase();
  return (
    upper.includes("403") ||
    upper.includes("FORBIDDEN") ||
    upper.includes("MSG_MEMBER_FORBIDDEN") ||
    upper.includes("MSG_CONVERSATION_FROZEN") ||
    upper.includes("MSG_GROUP_MUTED") ||
    upper.includes("MSG_MEMBER_MUTED") ||
    upper.includes("MSG_USER_MUTED") ||
    reason.includes("\u6743\u9650") ||
    reason.includes("\u4e0d\u5728\u8be5\u4f1a\u8bdd") ||
    reason.includes("\u7981\u8a00") ||
    reason.includes("\u51bb\u7ed3") ||
    reason.includes("\u4e0d\u53ef\u56de\u590d") ||
    reason.includes("\u4e0d\u53ef\u53d1\u9001")
  );
}

function isRetryableSendFailure(reason: string) {
  if (!reason) return false;
  const upper = reason.toUpperCase();
  return (
    upper.includes("NETWORK") ||
    upper.includes("OFFLINE") ||
    upper.includes("TIMEOUT") ||
    upper.includes("ABORT") ||
    upper.includes("SERVER") ||
    upper.includes("502") ||
    upper.includes("503") ||
    upper.includes("504") ||
    reason.includes("\u7f51\u7edc") ||
    reason.includes("\u8d85\u65f6") ||
    reason.includes("\u4e2d\u65ad") ||
    reason.includes("\u670d\u52a1\u6682\u4e0d\u53ef\u7528")
  );
}
