enum CustomerServiceRoleKind {
  customer,
  basicEmployee,
  customerService,
  admin,
  owner,
  incomplete,
  unknown,
}

enum CustomerServiceAction {
  claim,
  takeover,
  close,
  reply,
  sendText,
  sendMedia,
  transfer,
  silentRecall,
  viewReadonly,
  monitorRealtime,
}

enum CustomerServiceActionReplyGate {
  claim,
  takeover,
  open,
  readonly,
}

enum CustomerServiceActionReason {
  ok,
  noThread,
  readonly,
  requiresClaim,
  requiresTakeover,
  roleDenied,
  notClaimable,
  notTakeoverable,
  unsupported,
}

class CustomerServiceRoleCapabilities {
  final CustomerServiceRoleKind roleKind;
  final bool canUseStaffEndpoints;
  final bool canControlReception;
  final bool canReadHistory;
  final bool canUseManagementReadonly;
  final bool canSuperviseTransfer;
  final bool canSuperviseClose;
  final bool canMonitorRealtime;

  const CustomerServiceRoleCapabilities({
    required this.roleKind,
    required this.canUseStaffEndpoints,
    required this.canControlReception,
    required this.canReadHistory,
    required this.canUseManagementReadonly,
    required this.canSuperviseTransfer,
    required this.canSuperviseClose,
    required this.canMonitorRealtime,
  });
}

class CustomerServiceActionPermissionInput {
  final bool hasThread;
  final CustomerServiceRoleCapabilities capabilities;
  final CustomerServiceActionReplyGate replyGate;

  const CustomerServiceActionPermissionInput({
    required this.hasThread,
    required this.capabilities,
    required this.replyGate,
  });
}

class CustomerServiceActionPermission {
  final CustomerServiceAction action;
  final bool enabled;
  final bool visible;
  final CustomerServiceActionReason reason;

  const CustomerServiceActionPermission({
    required this.action,
    required this.enabled,
    required this.visible,
    required this.reason,
  });
}

CustomerServiceRoleCapabilities customerServiceRoleCapabilities({
  int? membershipRole,
  String? roleLabel,
}) {
  final role = _resolveCustomerServiceRole(
    membershipRole: membershipRole,
    roleLabel: roleLabel,
  );
  final staff = role == CustomerServiceRoleKind.customerService;
  final management = role == CustomerServiceRoleKind.admin ||
      role == CustomerServiceRoleKind.owner;
  final history =
      staff || management || role == CustomerServiceRoleKind.incomplete;
  return CustomerServiceRoleCapabilities(
    roleKind: role,
    canUseStaffEndpoints: staff,
    canControlReception: staff,
    canReadHistory: history,
    canUseManagementReadonly: management,
    canSuperviseTransfer: management,
    canSuperviseClose: management,
    canMonitorRealtime: management,
  );
}

CustomerServiceActionPermission customerServiceActionPermission(
  CustomerServiceAction action,
  CustomerServiceActionPermissionInput input,
) {
  if (!input.hasThread) {
    return _permission(
        action, false, false, CustomerServiceActionReason.noThread);
  }

  if (action == CustomerServiceAction.viewReadonly) {
    final readonly =
        input.replyGate == CustomerServiceActionReplyGate.readonly ||
            input.capabilities.canUseManagementReadonly;
    return _permission(
      action,
      readonly,
      readonly,
      readonly
          ? CustomerServiceActionReason.ok
          : CustomerServiceActionReason.unsupported,
    );
  }

  if (action == CustomerServiceAction.monitorRealtime) {
    return _permission(
      action,
      input.capabilities.canMonitorRealtime,
      input.capabilities.canMonitorRealtime,
      input.capabilities.canMonitorRealtime
          ? CustomerServiceActionReason.ok
          : CustomerServiceActionReason.roleDenied,
    );
  }

  if (!input.capabilities.canControlReception) {
    return _permission(
      action,
      false,
      false,
      CustomerServiceActionReason.roleDenied,
    );
  }

  if (input.replyGate == CustomerServiceActionReplyGate.readonly) {
    return _permission(
      action,
      false,
      false,
      CustomerServiceActionReason.readonly,
    );
  }

  if (action == CustomerServiceAction.claim) {
    final claimable = input.replyGate == CustomerServiceActionReplyGate.claim;
    return _permission(
      action,
      claimable,
      claimable,
      claimable
          ? CustomerServiceActionReason.ok
          : CustomerServiceActionReason.notClaimable,
    );
  }

  if (action == CustomerServiceAction.takeover) {
    final takeoverable =
        input.replyGate == CustomerServiceActionReplyGate.takeover;
    return _permission(
      action,
      takeoverable,
      takeoverable,
      takeoverable
          ? CustomerServiceActionReason.ok
          : CustomerServiceActionReason.notTakeoverable,
    );
  }

  if (input.replyGate == CustomerServiceActionReplyGate.claim) {
    return _permission(
      action,
      false,
      true,
      CustomerServiceActionReason.requiresClaim,
    );
  }

  if (input.replyGate == CustomerServiceActionReplyGate.takeover) {
    return _permission(
      action,
      false,
      true,
      CustomerServiceActionReason.requiresTakeover,
    );
  }

  return _permission(action, true, true, CustomerServiceActionReason.ok);
}

CustomerServiceRoleKind _resolveCustomerServiceRole({
  int? membershipRole,
  String? roleLabel,
}) {
  if (membershipRole != null) {
    return switch (membershipRole) {
      0 => CustomerServiceRoleKind.customer,
      1 => CustomerServiceRoleKind.basicEmployee,
      2 => CustomerServiceRoleKind.customerService,
      3 => CustomerServiceRoleKind.admin,
      4 => CustomerServiceRoleKind.owner,
      _ => CustomerServiceRoleKind.unknown,
    };
  }
  final normalized =
      (roleLabel ?? '').trim().toLowerCase().replaceAll(RegExp(r'[-_\s]'), '');
  if (normalized.isEmpty) return CustomerServiceRoleKind.incomplete;
  if (_isCustomerServiceRoleLabel(normalized)) {
    return CustomerServiceRoleKind.customerService;
  }
  if (['owner', '所有者'].any(normalized.contains)) {
    return CustomerServiceRoleKind.owner;
  }
  if (['admin', '管理员'].any(normalized.contains)) {
    return CustomerServiceRoleKind.admin;
  }
  if (['customer', 'visitor', '客户', '访客'].any(normalized.contains)) {
    return CustomerServiceRoleKind.customer;
  }
  return CustomerServiceRoleKind.unknown;
}

bool _isCustomerServiceRoleLabel(String roleLabel) {
  return [
    '客服',
    'customerservice',
    'agent',
    'staff',
    'kefu',
  ].any(roleLabel.contains);
}

CustomerServiceActionPermission _permission(
  CustomerServiceAction action,
  bool enabled,
  bool visible,
  CustomerServiceActionReason reason,
) {
  return CustomerServiceActionPermission(
    action: action,
    enabled: enabled,
    visible: visible,
    reason: reason,
  );
}
