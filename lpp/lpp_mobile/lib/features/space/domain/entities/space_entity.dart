import 'package:flutter/foundation.dart';
import 'package:lpp_mobile/core/space/space_context.dart';

/// Space 实体
@immutable
class Space {
  final String spaceId; // tenantId 或 "personal"
  final String name;
  final String? logoUrl;
  final SpaceType type;
  final int unreadCount;
  final int conversationCount;
  final bool isActive; // 是否为当前激活空间

  const Space({
    required this.spaceId,
    required this.name,
    this.logoUrl,
    required this.type,
    required this.unreadCount,
    required this.conversationCount,
    required this.isActive,
  });

  bool get isPersonal => type == SpaceType.personal;

  Space copyWith({
    String? spaceId,
    String? name,
    String? logoUrl,
    SpaceType? type,
    int? unreadCount,
    int? conversationCount,
    bool? isActive,
  }) {
    return Space(
      spaceId: spaceId ?? this.spaceId,
      name: name ?? this.name,
      logoUrl: logoUrl ?? this.logoUrl,
      type: type ?? this.type,
      unreadCount: unreadCount ?? this.unreadCount,
      conversationCount: conversationCount ?? this.conversationCount,
      isActive: isActive ?? this.isActive,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Space &&
          runtimeType == other.runtimeType &&
          spaceId == other.spaceId &&
          name == other.name &&
          logoUrl == other.logoUrl &&
          type == other.type &&
          unreadCount == other.unreadCount &&
          conversationCount == other.conversationCount &&
          isActive == other.isActive;

  @override
  int get hashCode =>
      spaceId.hashCode ^
      name.hashCode ^
      logoUrl.hashCode ^
      type.hashCode ^
      unreadCount.hashCode ^
      conversationCount.hashCode ^
      isActive.hashCode;

  @override
  String toString() =>
      'Space(spaceId: $spaceId, name: $name, type: $type, isActive: $isActive)';
}
