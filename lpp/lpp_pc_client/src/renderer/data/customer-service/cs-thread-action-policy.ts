import type { CustomerServiceThreadAction } from "./cs-action-service";
import {
  type CustomerServiceActionReason,
  getCustomerServiceActionPermission,
} from "./cs-action-permissions";
import {
  canSuperviseCustomerServiceClose,
  canSuperviseCustomerServiceTransfer,
  canUseCustomerServiceStaffEndpoints,
} from "./cs-role-capabilities";
import type { CustomerServiceThreadState } from "./cs-thread-state";

type CustomerServiceRoleInput = Parameters<typeof canUseCustomerServiceStaffEndpoints>[0];

export type CustomerServiceThreadActionMode = "management" | "staff";
export type CustomerServiceThreadTransferDialogMode = "assign" | "transfer";

export type CustomerServiceThreadPolicyReason =
  | CustomerServiceActionReason
  | "requires_management"
  | "requires_staff";

export interface CustomerServiceThreadPolicyDecision {
  enabled: boolean;
  mode?: CustomerServiceThreadActionMode;
  reason: CustomerServiceThreadPolicyReason;
  visible: boolean;
}

export interface CustomerServiceThreadTransferDialogPolicy {
  enabled: boolean;
  mode: CustomerServiceThreadTransferDialogMode;
  reason: CustomerServiceThreadPolicyReason;
  visible: boolean;
}

export interface CustomerServiceThreadActionPolicy {
  assign: CustomerServiceThreadPolicyDecision;
  claim: CustomerServiceThreadPolicyDecision;
  close: CustomerServiceThreadPolicyDecision;
  staffActions: boolean;
  takeover: CustomerServiceThreadPolicyDecision;
  transfer: CustomerServiceThreadPolicyDecision;
  transferDialog: CustomerServiceThreadTransferDialogPolicy;
}

export interface ResolveCustomerServiceThreadActionPolicyInput {
  hasThread: boolean;
  selectedState?: CustomerServiceThreadState;
  session?: CustomerServiceRoleInput;
  state: CustomerServiceThreadState;
}

export function resolveCustomerServiceThreadActionPolicy({
  hasThread,
  selectedState,
  session,
  state,
}: ResolveCustomerServiceThreadActionPolicyInput): CustomerServiceThreadActionPolicy {
  const staffActions = canUseCustomerServiceStaffEndpoints(session);
  const canSuperviseClose = canSuperviseCustomerServiceClose(session);
  const canSuperviseTransfer = canSuperviseCustomerServiceTransfer(session);
  const liveThread = hasThread && !state.readOnly;
  const claimBase = getCustomerServiceActionPermission("claim", {
    hasThread,
    selectedState,
    state,
  });
  const takeoverBase = getCustomerServiceActionPermission("takeover", {
    hasThread,
    selectedState,
    state,
  });
  const closeBase = getCustomerServiceActionPermission("close", {
    hasThread,
    selectedState,
    state,
  });
  const transferBase = getCustomerServiceActionPermission("transfer", {
    hasThread,
    selectedState,
    state,
  });

  const claim = staffOnlyDecision(claimBase, staffActions);
  const takeover = staffOnlyDecision(takeoverBase, staffActions);
  const staffTransfer = staffOnlyDecision(transferBase, staffActions);
  const assign = managementDecision({
    enabled: liveThread && canSuperviseTransfer,
    mode: "management",
    reason: !hasThread
      ? "no_thread"
      : state.readOnly
        ? "readonly"
        : canSuperviseTransfer
          ? "ok"
          : "requires_management",
    visible: liveThread && canSuperviseTransfer,
  });
  const close = closeBase.enabled && staffActions
    ? decision({ ...closeBase, mode: "staff" })
    : managementDecision({
        enabled: liveThread && canSuperviseClose,
        mode: "management",
        reason: !hasThread
          ? "no_thread"
          : state.readOnly
            ? "readonly"
            : canSuperviseClose
              ? "ok"
              : "requires_management",
        visible: liveThread && canSuperviseClose,
      });
  const transferDialogMode = staffTransfer.enabled ? "transfer" : "assign";
  const transferDialogEnabled =
    transferDialogMode === "transfer" ? staffTransfer.enabled : assign.enabled;

  return {
    assign,
    claim,
    close,
    staffActions,
    takeover,
    transfer: staffTransfer,
    transferDialog: {
      enabled: transferDialogEnabled,
      mode: transferDialogMode,
      reason: transferDialogEnabled
        ? "ok"
        : transferDialogMode === "transfer"
          ? staffTransfer.reason
          : assign.reason,
      visible: staffTransfer.visible || assign.visible,
    },
  };
}

export function isCustomerServiceThreadActionEnabled(
  policy: CustomerServiceThreadActionPolicy,
  action: CustomerServiceThreadAction,
) {
  if (action === "claim") return policy.claim.enabled;
  if (action === "takeover") return policy.takeover.enabled;
  return policy.close.enabled;
}

function staffOnlyDecision(
  base: { enabled: boolean; reason: CustomerServiceActionReason; visible: boolean },
  staffActions: boolean,
) {
  if (!staffActions) {
    return decision({
      enabled: false,
      reason: base.visible ? "requires_staff" : base.reason,
      visible: false,
    });
  }
  return decision({
    ...base,
    mode: "staff",
  });
}

function managementDecision(input: CustomerServiceThreadPolicyDecision) {
  return decision(input);
}

function decision(input: CustomerServiceThreadPolicyDecision) {
  return input;
}
