/// 群聊相关实体，对应 API GroupMemberDto / GroupDetailV2Dto
class GroupMemberEntity {
  final String userId;
  final String displayName;
  final String? avatarUrl;
  final String role; // owner/admin/member
  final DateTime? joinedAt;

  const GroupMemberEntity({
    required this.userId,
    required this.displayName,
    this.avatarUrl,
    required this.role,
    this.joinedAt,
  });

  factory GroupMemberEntity.fromJson(Map<String, dynamic> json) =>
      GroupMemberEntity(
        userId: json['userId'] as String,
        displayName: json['displayName'] as String? ?? '',
        avatarUrl: json['avatarUrl'] as String?,
        role: json['role'] as String? ?? 'member',
        joinedAt: json['joinedAt'] != null
            ? DateTime.tryParse(json['joinedAt'] as String)
            : null,
      );
}

class GroupDetailEntity {
  final String groupId;
  final String title;
  final String? avatarUrl;
  final String? ownerUserId;
  final int memberCount;
  final String muteMode; // normal/all_muted
  final String myRole; // owner/admin/member
  final bool isPinned;
  final bool isMuted;
  final int unreadCount;
  final int lastMessageSeq;
  final int lastReadSeq;
  final bool allowMemberAddFriend;
  final bool allowMemberAtAll;

  const GroupDetailEntity({
    required this.groupId,
    required this.title,
    this.avatarUrl,
    this.ownerUserId,
    required this.memberCount,
    required this.muteMode,
    required this.myRole,
    required this.isPinned,
    required this.isMuted,
    required this.unreadCount,
    required this.lastMessageSeq,
    required this.lastReadSeq,
    required this.allowMemberAddFriend,
    required this.allowMemberAtAll,
  });

  factory GroupDetailEntity.fromJson(Map<String, dynamic> json) {
    final settings = json['settings'] as Map<String, dynamic>? ?? {};
    return GroupDetailEntity(
      groupId: json['groupId'] as String,
      title: json['title'] as String? ?? '',
      avatarUrl: json['avatarUrl'] as String?,
      ownerUserId: json['ownerUserId'] as String?,
      memberCount: json['memberCount'] as int? ?? 0,
      muteMode: _parseMuteMode(json['muteMode']),
      myRole: json['myRole'] as String? ?? 'member',
      isPinned: json['isPinned'] as bool? ?? false,
      isMuted: json['isMuted'] as bool? ?? false,
      unreadCount: json['unreadCount'] as int? ?? 0,
      lastMessageSeq: json['lastMessageSeq'] as int? ?? 0,
      lastReadSeq: json['lastReadSeq'] as int? ?? 0,
      allowMemberAddFriend: settings['allowMemberAddFriend'] as bool? ?? true,
      allowMemberAtAll: settings['allowMemberAtAll'] as bool? ?? false,
    );
  }

  static String _parseMuteMode(Object? value) {
    if (value == 1 || value == true || value == '1' || value == 'all_muted') {
      return 'all_muted';
    }
    return 'normal';
  }
}
