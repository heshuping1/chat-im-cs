export type MessageDangerConfirmAction =
  | "recall-message"
  | "delete-message"
  | "delete-conversation"
  | "batch-delete-messages"
  | "delete-friend"
  | "block-user";

export interface MessageConfirmDescriptor {
  key: string;
  params?: Record<string, string | number>;
}

export async function requestMessageDangerConfirmation({
  action,
  count,
  message,
}: {
  action: MessageDangerConfirmAction;
  count?: number;
  message?: string;
}) {
  return requestMessageCustomConfirmation(
    message ?? messageDangerConfirmationFallback(action, count),
    {
      confirmText: messageDangerConfirmationConfirmText(action),
      tone: "danger",
      title: messageDangerConfirmationTitle(action),
    },
  );
}

export function requestMessageCustomConfirmation(
  message: string,
  options: {
    cancelText?: string;
    confirmText?: string;
    title?: string;
    tone?: "danger" | "default";
  } = {},
) {
  if (typeof document === "undefined") {
    return Promise.resolve(
      typeof window === "undefined" || typeof window.confirm !== "function"
        ? false
        : window.confirm(message),
    );
  }
  return renderMessageConfirmationDialog({
    cancelText: options.cancelText ?? "取消",
    confirmText: options.confirmText ?? "确定",
    message,
    title: options.title ?? "确认操作",
    tone: options.tone ?? "default",
  });
}

export function messageDangerConfirmationDescriptor(
  action: MessageDangerConfirmAction,
  count?: number,
): MessageConfirmDescriptor {
  if (action === "recall-message") return { key: "messages.confirm.recallMessage" };
  if (action === "delete-message") return { key: "messages.confirm.deleteMessage" };
  if (action === "delete-conversation") return { key: "messages.confirm.deleteConversation" };
  if (action === "delete-friend") return { key: "messages.confirm.deleteFriend" };
  if (action === "block-user") return { key: "messages.confirm.blockUser" };
  return { key: "messages.confirm.batchDeleteMessages", params: { count: count ?? 0 } };
}

export function messageDangerConfirmationFallback(
  action: MessageDangerConfirmAction,
  count?: number,
) {
  if (action === "recall-message") return "确定撤回这条消息？";
  if (action === "delete-message") {
    return "确定删除这条消息？它会从当前会话中移除。";
  }
  if (action === "delete-conversation") {
    return "确定从当前 PC 会话列表删除这个会话？服务端持久化删除需要接口支持。";
  }
  if (action === "delete-friend") {
    return "确定删除这个好友？该联系人会从好友列表移除。";
  }
  if (action === "block-user") {
    return "确定把该用户加入黑名单？对方将无法与你正常互动。";
  }
  return `确定删除选中的 ${count ?? 0} 条消息？`;
}

export const messageDangerConfirmationText = messageDangerConfirmationFallback;

function messageDangerConfirmationTitle(action: MessageDangerConfirmAction) {
  if (action === "recall-message") return "撤回消息";
  if (action === "delete-message") return "删除消息";
  if (action === "delete-conversation") return "删除会话";
  if (action === "batch-delete-messages") return "批量删除消息";
  if (action === "delete-friend") return "删除好友";
  if (action === "block-user") return "加入黑名单";
  return "确认操作";
}

function messageDangerConfirmationConfirmText(action: MessageDangerConfirmAction) {
  if (action === "recall-message") return "确认撤回";
  if (action === "block-user") return "加入黑名单";
  return "确认删除";
}

function renderMessageConfirmationDialog({
  cancelText,
  confirmText,
  message,
  title,
  tone,
}: {
  cancelText: string;
  confirmText: string;
  message: string;
  title: string;
  tone: "danger" | "default";
}) {
  return new Promise<boolean>((resolve) => {
    const previousActiveElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const backdrop = document.createElement("div");
    const dialog = document.createElement("section");
    const header = document.createElement("header");
    const icon = document.createElement("span");
    const copy = document.createElement("div");
    const heading = document.createElement("h2");
    const body = document.createElement("p");
    const footer = document.createElement("footer");
    const cancelButton = document.createElement("button");
    const confirmButton = document.createElement("button");

    backdrop.className = "message-confirm-backdrop";
    backdrop.setAttribute("role", "presentation");
    dialog.className = `message-confirm-dialog ${tone}`;
    dialog.setAttribute("role", "alertdialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "message-confirm-title");
    dialog.setAttribute("aria-describedby", "message-confirm-body");
    icon.className = "message-confirm-icon";
    icon.textContent = "!";
    heading.id = "message-confirm-title";
    heading.textContent = title;
    body.id = "message-confirm-body";
    body.textContent = message;
    cancelButton.type = "button";
    cancelButton.className = "message-confirm-secondary";
    cancelButton.textContent = cancelText;
    confirmButton.type = "button";
    confirmButton.className = "message-confirm-primary";
    confirmButton.textContent = confirmText;

    copy.append(heading, body);
    header.append(icon, copy);
    footer.append(cancelButton, confirmButton);
    dialog.append(header, footer);
    backdrop.append(dialog);
    document.body.append(backdrop);

    let settled = false;
    const settle = (confirmed: boolean) => {
      if (settled) return;
      settled = true;
      document.removeEventListener("keydown", onKeyDown, true);
      backdrop.remove();
      previousActiveElement?.focus();
      resolve(confirmed);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        settle(false);
      }
      if (event.key === "Enter") {
        event.preventDefault();
        settle(true);
      }
    };
    cancelButton.addEventListener("click", () => settle(false));
    confirmButton.addEventListener("click", () => settle(true));
    document.addEventListener("keydown", onKeyDown, true);
    const focusConfirmButton = () => confirmButton.focus();
    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(focusConfirmButton);
    } else {
      setTimeout(focusConfirmButton, 0);
    }
  });
}
