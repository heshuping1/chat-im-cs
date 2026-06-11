import type {
  CustomerServiceThreadState,
} from "./cs-thread-state";

export type CustomerServiceAction =
  | "claim"
  | "takeover"
  | "close"
  | "reply"
  | "send_text"
  | "send_media"
  | "transfer"
  | "rate"
  | "view_readonly";

export type CustomerServiceActionReason =
  | "ok"
  | "no_thread"
  | "readonly"
  | "requires_claim"
  | "requires_takeover"
  | "not_claimable"
  | "not_takeoverable"
  | "unsupported";

export interface CustomerServiceActionPermission {
  action: CustomerServiceAction;
  enabled: boolean;
  reason: CustomerServiceActionReason;
  visible: boolean;
}

export interface CustomerServiceActionPermissionInput {
  hasThread: boolean;
  selectedState?: CustomerServiceThreadState;
  state: CustomerServiceThreadState;
}

export function getCustomerServiceActionPermission(
  action: CustomerServiceAction,
  input: CustomerServiceActionPermissionInput,
): CustomerServiceActionPermission {
  if (!input.hasThread) return permission(action, false, false, "no_thread");

  if (action === "view_readonly") {
    return permission(action, input.state.readOnly, input.state.readOnly, input.state.readOnly ? "ok" : "unsupported");
  }

  if (action === "rate") {
    return permission(action, false, false, "unsupported");
  }

  if (input.state.readOnly) return permission(action, false, false, "readonly");

  if (action === "claim") {
    const claimable =
      input.state.replyGate === "claim" || input.selectedState?.replyGate === "claim";
    return permission(action, claimable, claimable, claimable ? "ok" : "not_claimable");
  }

  if (action === "takeover") {
    const takeoverable =
      input.state.replyGate === "takeover" || input.selectedState?.replyGate === "takeover";
    return permission(action, takeoverable, takeoverable, takeoverable ? "ok" : "not_takeoverable");
  }

  if (action === "close") {
    const visible = input.state.replyGate === "open";
    return permission(action, visible, visible, visible ? "ok" : "unsupported");
  }

  if (action === "transfer") {
    const transferable = input.state.replyGate === "open";
    return permission(action, transferable, transferable, transferable ? "ok" : "unsupported");
  }

  if (input.state.replyGate === "claim") {
    return permission(action, false, true, "requires_claim");
  }

  if (input.state.replyGate === "takeover") {
    return permission(action, false, true, "requires_takeover");
  }

  return permission(action, true, true, "ok");
}

export function getCustomerServiceActionPermissions(
  actions: CustomerServiceAction[],
  input: CustomerServiceActionPermissionInput,
) {
  return Object.fromEntries(
    actions.map((action) => [action, getCustomerServiceActionPermission(action, input)]),
  ) as Record<CustomerServiceAction, CustomerServiceActionPermission>;
}

function permission(
  action: CustomerServiceAction,
  enabled: boolean,
  visible: boolean,
  reason: CustomerServiceActionReason,
): CustomerServiceActionPermission {
  return {
    action,
    enabled,
    reason,
    visible,
  };
}
