import 'package:flutter/foundation.dart';

/// 空间类型枚举
enum SpaceType {
  personal, // 个人空间
  employee, // 企业员工端
  customerSocial, // 企业客户端（社交模式，可加好友）
  customerRestricted, // 企业客户端（隔离模式，禁止客户互加好友）
}

/// 当前空间上下文
/// 每个空间对应一个独立的租户级 accessToken
@immutable
class SpaceContext {
  final String spaceId; // tenantId 或 "personal"
  final String accessToken;
  final String refreshToken;
  final String userId;
  final SpaceType type;

  /// 租户成员角色：0=普通成员, 1=技术支持, 2=客服, 3=管理员, 4=所有者
  final int membershipRole;

  const SpaceContext({
    required this.spaceId,
    required this.accessToken,
    required this.refreshToken,
    required this.userId,
    required this.type,
    this.membershipRole = 0,
  });

  /// 是否为个人空间
  bool get isPersonal => type == SpaceType.personal;

  /// 是否为员工端
  bool get isEmployee => type == SpaceType.employee;

  /// 是否为客户端
  bool get isCustomer =>
      type == SpaceType.customerSocial || type == SpaceType.customerRestricted;

  /// 是否允许加好友（社交模式）
  bool get canAddFriend => type != SpaceType.customerRestricted;

  /// 是否为客服（membershipRole == 2）
  bool get isCustomerService => isEmployee && membershipRole == 2;

  /// 是否为管理员或所有者
  bool get isAdminOrAbove =>
      isEmployee && (membershipRole == 3 || membershipRole == 4);

  /// 是否为所有者（membershipRole == 4）
  bool get isOwner => isEmployee && membershipRole == 4;

  SpaceContext copyWith({
    String? spaceId,
    String? accessToken,
    String? refreshToken,
    String? userId,
    SpaceType? type,
    int? membershipRole,
  }) {
    return SpaceContext(
      spaceId: spaceId ?? this.spaceId,
      accessToken: accessToken ?? this.accessToken,
      refreshToken: refreshToken ?? this.refreshToken,
      userId: userId ?? this.userId,
      type: type ?? this.type,
      membershipRole: membershipRole ?? this.membershipRole,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SpaceContext &&
          runtimeType == other.runtimeType &&
          spaceId == other.spaceId &&
          accessToken == other.accessToken &&
          refreshToken == other.refreshToken &&
          userId == other.userId &&
          type == other.type &&
          membershipRole == other.membershipRole;

  @override
  int get hashCode =>
      spaceId.hashCode ^
      accessToken.hashCode ^
      refreshToken.hashCode ^
      userId.hashCode ^
      type.hashCode ^
      membershipRole.hashCode;

  @override
  String toString() =>
      'SpaceContext(spaceId: $spaceId, userId: $userId, type: $type, membershipRole: $membershipRole)';
}
