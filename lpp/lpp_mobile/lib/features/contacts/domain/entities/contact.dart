class Contact {
  final String userId;
  final String name;
  final String? avatarUrl;
  final String? remark;
  final bool isOnline;
  final String? customerTag;

  /// userType: 1=客户, 2=员工/客服（来自 API）
  final int? userType;

  const Contact({
    required this.userId,
    required this.name,
    this.avatarUrl,
    this.remark,
    this.isOnline = false,
    this.customerTag,
    this.userType,
  });

  String get displayName => remark?.isNotEmpty == true ? remark! : name;

  bool get isEmployee => userType == 2;
  bool get isCustomer => userType == 1;
}

class Department {
  final String departmentId;
  final String departmentName;
  final String? parentId;
  final String? leaderUserId;
  final int memberCount;
  final List<Department> children;

  const Department({
    required this.departmentId,
    required this.departmentName,
    this.parentId,
    this.leaderUserId,
    this.memberCount = 0,
    this.children = const [],
  });
}

class DepartmentMember {
  final String userId;
  final String displayName;
  final String? avatarUrl;
  final bool isPrimary;
  final String? position;
  final int? userType;
  final int? membershipRole;
  final String? customerTag;

  const DepartmentMember({
    required this.userId,
    required this.displayName,
    this.avatarUrl,
    this.isPrimary = false,
    this.position,
    this.userType,
    this.membershipRole,
    this.customerTag,
  });

  bool get isCustomer => userType == 1 || customerTag == '客户';
}

/// 好友申请
class FriendRequest {
  final String requestId;
  final String fromUserId;
  final String fromDisplayName;
  final String? fromAvatarUrl;
  final String toUserId;
  final String toDisplayName;
  final String? toAvatarUrl;
  final String? message;
  final String status; // 'pending'
  final DateTime createdAt;

  const FriendRequest({
    required this.requestId,
    required this.fromUserId,
    required this.fromDisplayName,
    this.fromAvatarUrl,
    this.toUserId = '',
    this.toDisplayName = '',
    this.toAvatarUrl,
    this.message,
    required this.status,
    required this.createdAt,
  });
}

/// 黑名单用户
class BlockedUser {
  final String userId;
  final String displayName;
  final String? avatarUrl;

  const BlockedUser({
    required this.userId,
    required this.displayName,
    this.avatarUrl,
  });
}
