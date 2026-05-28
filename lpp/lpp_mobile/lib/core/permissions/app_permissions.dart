import 'package:lpp_mobile/core/space/space_context.dart';

enum GroupMemberRole { owner, admin, member }

class PermissionDecision {
  final bool allowed;
  final String? reason;

  const PermissionDecision.allow()
      : allowed = true,
        reason = null;

  const PermissionDecision.deny(this.reason) : allowed = false;
}

class GroupPermissionSet {
  final GroupMemberRole role;
  final bool isAllMuted;
  final bool canManage;
  final bool canDismiss;
  final bool canSpeak;
  final bool canInviteMembers;
  final bool canModifyTitle;
  final bool canAtAll;
  final bool canViewMembers;
  final bool canAddFriendFromGroup;
  final String? muteReason;

  const GroupPermissionSet({
    required this.role,
    required this.isAllMuted,
    required this.canManage,
    required this.canDismiss,
    required this.canSpeak,
    required this.canInviteMembers,
    required this.canModifyTitle,
    required this.canAtAll,
    required this.canViewMembers,
    required this.canAddFriendFromGroup,
    this.muteReason,
  });
}

class AppPermissions {
  static const groupManageDeniedReason = '仅群主/管理员可修改群管理设置';
  static const groupNameDeniedReason = '仅群主/管理员可修改群名称';
  static const groupMutedReason = '已开启仅群主或特定成员可发言';

  const AppPermissions._();

  static GroupMemberRole parseGroupRole(Object? value) {
    final source = value?.toString().trim().toLowerCase() ?? '';
    final raw = source.contains('.') ? source.split('.').last : source;
    if (raw == 'owner' || raw == 'superadmin' || raw == 'super_admin') {
      return GroupMemberRole.owner;
    }
    if (raw == 'admin' || raw == 'administrator') {
      return GroupMemberRole.admin;
    }
    return GroupMemberRole.member;
  }

  static bool isGroupManager(Object? role) {
    final parsed = parseGroupRole(role);
    return parsed == GroupMemberRole.owner || parsed == GroupMemberRole.admin;
  }

  static bool isGroupOwner(Object? role) =>
      parseGroupRole(role) == GroupMemberRole.owner;

  static PermissionDecision canManageGroup(Object? role) {
    return isGroupManager(role)
        ? const PermissionDecision.allow()
        : const PermissionDecision.deny(groupManageDeniedReason);
  }

  static GroupPermissionSet group({
    required Object? myRole,
    required bool isAllMuted,
    required bool allowMemberInvite,
    required bool allowMemberModifyTitle,
    required bool allowMemberAtAll,
    required bool allowMemberViewMemberList,
    required bool allowMemberAddFriend,
    SpaceContext? space,
  }) {
    final role = parseGroupRole(myRole);
    final isTenantAdminOrOwner = space?.isAdminOrAbove ?? false;
    final canManage = role == GroupMemberRole.owner ||
        role == GroupMemberRole.admin ||
        isTenantAdminOrOwner;
    final isCustomerService = space?.isCustomerService ?? false;
    final canSpeak = !isAllMuted || canManage || isCustomerService;
    final isMember = role == GroupMemberRole.member;

    return GroupPermissionSet(
      role: role,
      isAllMuted: isAllMuted,
      canManage: canManage,
      canDismiss: role == GroupMemberRole.owner,
      canSpeak: canSpeak,
      canInviteMembers: canManage || allowMemberInvite,
      canModifyTitle: canManage || allowMemberModifyTitle,
      canAtAll: canManage || allowMemberAtAll,
      canViewMembers: canManage || allowMemberViewMemberList,
      canAddFriendFromGroup: !isMember || allowMemberAddFriend,
      muteReason: canSpeak ? null : groupMutedReason,
    );
  }

  static bool canSeeCustomers(SpaceContext? space) =>
      space != null && space.isEmployee;

  static bool canSeeAllCustomers(SpaceContext? space) =>
      space != null && space.isAdminOrAbove;

  static bool canSeeCustomerGroups(SpaceContext? space) =>
      space != null &&
      space.isEmployee &&
      (space.membershipRole == 2 ||
          space.membershipRole == 3 ||
          space.membershipRole == 4);

  static bool canSeeJoinApplications(SpaceContext? space) =>
      space != null && space.isEmployee && space.isAdminOrAbove;

  static bool canSeeCustomerOverview(SpaceContext? space) =>
      space != null && space.isEmployee && space.isAdminOrAbove;

  static bool canSeeWorkbench(SpaceContext? space) =>
      space != null && space.isEmployee;

  static bool canUseCustomerWorkbench(SpaceContext? space) =>
      space != null && space.isEmployee && space.membershipRole == 2;

  static bool canUseOwnerWorkbench(SpaceContext? space) =>
      space != null && space.isEmployee && space.isOwner;

  static bool canBeAssignedAsCustomerService({
    int? membershipRole,
    String? roleTag,
  }) {
    if (membershipRole != null) return membershipRole == 2;
    return roleTag == '客服';
  }

  static bool canCreateGroup(SpaceContext? space) {
    if (space == null) return false;
    if (space.isCustomer) return false;
    if (space.isEmployee) return space.isAdminOrAbove;
    return true;
  }

  static bool canJoinSpaceFromHome(SpaceContext? space) =>
      space != null && space.isEmployee && space.isAdminOrAbove;

  static bool canDirectMessageProfile({
    required SpaceContext? space,
    required bool adminCustomerView,
    required bool targetIsFriend,
    required bool targetIsEmployee,
  }) {
    if (adminCustomerView) return false;
    return (space?.isEmployee ?? false) || targetIsFriend || targetIsEmployee;
  }

  static PermissionDecision canSendFriendRequest({
    required SpaceContext? space,
    required bool groupAllowsFriendRequest,
  }) {
    if (!groupAllowsFriendRequest) {
      return const PermissionDecision.deny('该群已关闭群成员互加好友');
    }
    if (space?.canAddFriend == false) {
      return const PermissionDecision.deny('当前企业已开启客户隔离，暂不支持添加客户好友');
    }
    return const PermissionDecision.allow();
  }
}
