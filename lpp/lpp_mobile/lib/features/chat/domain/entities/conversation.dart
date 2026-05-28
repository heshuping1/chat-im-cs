enum ConversationType { direct, group, tempSession }

class Conversation {
  final String conversationId;
  final ConversationType type;
  final String title;
  final String? avatarUrl;
  final LastMessage? lastMessage;
  final int unreadCount;
  final int lastReadSeq;
  final int lastMessageSeq;
  final bool isPinned;
  final bool isMuted;
  final String? draft;
  final DateTime? lastActivityAt;
  final String? peerUserId;
  final int? memberCount;
  final String? ownerUserId;
  /// 单聊对方的 userType：1=客户, 2=员工（来自 API peerUserType 字段）
  final int? peerUserType;
  /// 群成员头像 URL 列表（用于生成微信宫格群头像，最多 9 个）
  final List<String?>? memberAvatarUrls;
  /// 群成员名字列表（无头像时显示首字母）
  final List<String>? memberNames;

  const Conversation({
    required this.conversationId,
    required this.type,
    required this.title,
    this.avatarUrl,
    this.lastMessage,
    this.unreadCount = 0,
    this.lastReadSeq = 0,
    this.lastMessageSeq = 0,
    this.isPinned = false,
    this.isMuted = false,
    this.draft,
    this.lastActivityAt,
    this.peerUserId,
    this.memberCount,
    this.ownerUserId,
    this.peerUserType,
    this.memberAvatarUrls,
    this.memberNames,
  });

  Conversation copyWith({
    String? conversationId,
    ConversationType? type,
    String? title,
    String? avatarUrl,
    LastMessage? lastMessage,
    int? unreadCount,
    int? lastReadSeq,
    int? lastMessageSeq,
    bool? isPinned,
    bool? isMuted,
    String? draft,
    DateTime? lastActivityAt,
    String? peerUserId,
    int? memberCount,
    String? ownerUserId,
    int? peerUserType,
    List<String?>? memberAvatarUrls,
    List<String>? memberNames,
  }) {
    return Conversation(
      conversationId: conversationId ?? this.conversationId,
      type: type ?? this.type,
      title: title ?? this.title,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      lastMessage: lastMessage ?? this.lastMessage,
      unreadCount: unreadCount ?? this.unreadCount,
      lastReadSeq: lastReadSeq ?? this.lastReadSeq,
      lastMessageSeq: lastMessageSeq ?? this.lastMessageSeq,
      isPinned: isPinned ?? this.isPinned,
      isMuted: isMuted ?? this.isMuted,
      draft: draft ?? this.draft,
      lastActivityAt: lastActivityAt ?? this.lastActivityAt,
      peerUserId: peerUserId ?? this.peerUserId,
      memberCount: memberCount ?? this.memberCount,
      ownerUserId: ownerUserId ?? this.ownerUserId,
      peerUserType: peerUserType ?? this.peerUserType,
      memberAvatarUrls: memberAvatarUrls ?? this.memberAvatarUrls,
      memberNames: memberNames ?? this.memberNames,
    );
  }
}

class LastMessage {
  final String messageId;
  final String? text;
  final String messageType;
  final String senderUserId;
  final DateTime sentAt;
  final bool isSelf;
  final String? direction;

  const LastMessage({
    required this.messageId,
    this.text,
    required this.messageType,
    required this.senderUserId,
    required this.sentAt,
    this.isSelf = false,
    this.direction,
  });
}
