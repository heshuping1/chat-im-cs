import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';

/// API 响应 → Domain 实体的映射模型
class ConversationModel {
  static ConversationType parseType(String? raw) {
    switch (raw) {
      case 'group':
        return ConversationType.group;
      case 'temp_session':
        return ConversationType.tempSession;
      default:
        return ConversationType.direct;
    }
  }

  static String typeToJson(ConversationType type) {
    return switch (type) {
      ConversationType.group => 'group',
      ConversationType.tempSession => 'temp_session',
      ConversationType.direct => 'direct',
    };
  }

  static Conversation fromJson(Map<String, dynamic> json) {
    final type = parseType(json['conversationType'] as String?);

    final lastMsgJson = json['lastMessage'] as Map<String, dynamic>?;
    final lastMessage = lastMsgJson != null
        ? LastMessage(
            messageId: lastMsgJson['messageId'] as String? ?? '',
            text: lastMsgJson['preview'] as String?,
            messageType: lastMsgJson['messageType'] as String? ?? 'text',
            senderUserId: _firstString(lastMsgJson, const [
                  'senderUserId',
                  'senderId',
                  'fromUserId',
                  'userId',
                  'senderPlatformUserId',
                  'platformUserId',
                  'senderLppId',
                  'lppId',
                ]) ??
                '',
            sentAt: DateTime.tryParse(lastMsgJson['sentAt'] as String? ?? '') ??
                DateTime.now(),
            isSelf: _boolValue(lastMsgJson['isSelf']) ||
                _boolValue(lastMsgJson['isMine']),
            direction: _firstString(lastMsgJson, const ['direction']),
          )
        : null;

    // lastActivityAt 优先取 lastMessage.sentAt，否则取顶层字段
    DateTime? lastActivityAt;
    if (lastMessage != null) {
      lastActivityAt = lastMessage.sentAt;
    } else {
      final raw = json['lastActivityAt'] as String?;
      if (raw != null) lastActivityAt = DateTime.tryParse(raw);
    }

    // draft 是对象 {draftText, updatedAt}，取 draftText 字段
    String? draftText;
    final draftJson = json['draft'];
    if (draftJson is Map<String, dynamic>) {
      draftText = draftJson['draftText'] as String?;
    } else if (draftJson is String) {
      // 兼容旧格式（直接是字符串）
      draftText = draftJson;
    }

    return Conversation(
      conversationId: json['conversationId'] as String,
      type: type,
      title: json['title'] as String? ?? '',
      avatarUrl: json['avatarUrl'] as String?,
      lastMessage: lastMessage,
      unreadCount: json['unreadCount'] as int? ?? 0,
      lastReadSeq: json['lastReadSeq'] as int? ?? 0,
      lastMessageSeq: json['lastMessageSeq'] as int? ?? 0,
      isPinned: json['isPinned'] as bool? ?? false,
      isMuted: json['isMuted'] as bool? ?? false,
      draft: draftText,
      lastActivityAt: lastActivityAt,
      peerUserId: json['peerUserId'] as String?,
      memberCount: json['memberCount'] as int?,
      ownerUserId: json['ownerUserId'] as String?,
      peerUserType: json['peerUserType'] as int?,
      // 群成员头像和名字（用于生成宫格群头像）
      memberAvatarUrls: _parseMemberAvatarUrls(json),
      memberNames: _parseMemberNames(json),
    );
  }

  /// 从 API 响应中提取群成员头像 URL（最多 9 个）
  static List<String?>? _parseMemberAvatarUrls(Map<String, dynamic> json) {
    final rawUrls = json['memberAvatarUrls'];
    if (rawUrls is List && rawUrls.isNotEmpty) {
      return rawUrls
          .take(9)
          .map((e) => e?.toString())
          .where((e) => e == null || e.trim().isNotEmpty)
          .toList();
    }

    final members = _memberPreviewList(json);
    if (members == null || members.isEmpty) return null;
    return members.take(9).map((m) {
      final user = _asStringMap(m['user']);
      return _firstString(m, const [
            'avatarUrl',
            'userAvatarUrl',
            'memberAvatarUrl',
            'profileAvatarUrl',
          ]) ??
          _firstString(user, const ['avatarUrl', 'userAvatarUrl']);
    }).toList();
  }

  /// 从 API 响应中提取群成员名字（最多 9 个）
  static List<String>? _parseMemberNames(Map<String, dynamic> json) {
    final rawNames = json['memberNames'];
    if (rawNames is List && rawNames.isNotEmpty) {
      return rawNames.take(9).map((e) => e?.toString() ?? '').toList();
    }

    final members = _memberPreviewList(json);
    if (members == null || members.isEmpty) return null;
    return members.take(9).map((m) {
      final user = _asStringMap(m['user']);
      return _firstString(m, const [
            'displayName',
            'name',
            'nickname',
            'memberName',
            'remarkName',
          ]) ??
          _firstString(user, const [
            'displayName',
            'name',
            'nickname',
            'remarkName',
          ]) ??
          '';
    }).toList();
  }

  static List<Map<String, dynamic>>? _memberPreviewList(
      Map<String, dynamic> json) {
    for (final key in const [
      'members',
      'memberProfiles',
      'memberPreviews',
      'groupMembers',
    ]) {
      final raw = json[key];
      if (raw is List && raw.isNotEmpty) {
        return raw.map(_asStringMap).whereType<Map<String, dynamic>>().toList();
      }
    }
    return null;
  }

  static Map<String, dynamic>? _asStringMap(Object? value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return Map<String, dynamic>.from(value);
    return null;
  }

  static String? _firstString(Map<String, dynamic>? json, List<String> keys) {
    if (json == null) return null;
    for (final key in keys) {
      final value = json[key];
      if (value == null) continue;
      final text = value.toString().trim();
      if (text.isNotEmpty) return text;
    }
    return null;
  }

  static Map<String, dynamic> toJson(Conversation c) {
    return {
      'conversationId': c.conversationId,
      'conversationType': typeToJson(c.type),
      'title': c.title,
      'avatarUrl': c.avatarUrl,
      'unreadCount': c.unreadCount,
      'lastReadSeq': c.lastReadSeq,
      'lastMessageSeq': c.lastMessageSeq,
      'isPinned': c.isPinned,
      'isMuted': c.isMuted,
      // draft 存为对象格式，与 API 保持一致
      if (c.draft != null) 'draft': {'draftText': c.draft},
      'lastActivityAt': c.lastActivityAt?.toIso8601String(),
      'peerUserId': c.peerUserId,
      'memberCount': c.memberCount,
      'ownerUserId': c.ownerUserId,
      if (c.lastMessage != null)
        'lastMessage': {
          'messageId': c.lastMessage!.messageId,
          'preview': c.lastMessage!.text,
          'messageType': c.lastMessage!.messageType,
          'senderUserId': c.lastMessage!.senderUserId,
          'sentAt': c.lastMessage!.sentAt.toIso8601String(),
          if (c.lastMessage!.isSelf) 'isSelf': true,
          if (c.lastMessage!.direction != null)
            'direction': c.lastMessage!.direction,
        },
    };
  }

  static bool _boolValue(Object? value) {
    return value == true || value == 'true' || value == 1 || value == '1';
  }
}
