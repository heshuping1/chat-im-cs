import 'package:lpp_mobile/features/chat/domain/services/message_local_upload_state.dart';

export 'package:lpp_mobile/features/chat/domain/services/message_local_upload_state.dart';

enum MessageType {
  text,
  markdown,
  image,
  video,
  voice,
  file,
  event,
  contactCard,
  callLog,
  location
}

enum MessageStatus {
  sending,
  sent,
  delivered,
  read,
  failed,
  rejected,
  recalled,
  deletedLocal,
}

extension MessageStatusX on MessageStatus {
  bool get isSendFailure =>
      this == MessageStatus.failed || this == MessageStatus.rejected;

  bool get isServerUsable =>
      this == MessageStatus.sent ||
      this == MessageStatus.delivered ||
      this == MessageStatus.read;

  String get wireName {
    switch (this) {
      case MessageStatus.deletedLocal:
        return 'deleted_local';
      default:
        return name;
    }
  }
}

MessageStatus parseMessageStatus(String? value) {
  switch (value) {
    case 'sending':
      return MessageStatus.sending;
    case 'delivered':
      return MessageStatus.delivered;
    case 'read':
      return MessageStatus.read;
    case 'failed':
      return MessageStatus.failed;
    case 'rejected':
      return MessageStatus.rejected;
    case 'recalled':
      return MessageStatus.recalled;
    case 'deleted_local':
    case 'deletedLocal':
      return MessageStatus.deletedLocal;
    case 'sent':
    default:
      return MessageStatus.sent;
  }
}

class Message {
  final String messageId;
  final String? clientMsgId;
  final String conversationId;
  final int conversationSeq;
  final String senderUserId;
  final MessageType type;
  final MessageBody body;
  final bool isRecalled;
  final DateTime sentAt;
  final String? replyToMessageId;
  final String? forwardFromMessageId;
  final List<Mention>? mentions;
  final MessageStatus status;
  final String? translation; // 翻译内容（对照 figma message.translation）
  final bool isTranslating; // 翻译请求进行中，防重复触发
  final int readCount; // 群聊已读人数（服务端返回）
  final bool isReadByPeer; // 单聊：对方已读（由 msg.read 事件驱动）
  final String? failureReason; // 发送失败原因（本地状态，用于重试/诊断）
  final bool isSelf; // 服务端/Gateway 明确标记为当前账号发送
  final MessageLocalUploadState? localUploadState; // 本地上传展示状态，不进入发送 body

  const Message({
    required this.messageId,
    this.clientMsgId,
    required this.conversationId,
    required this.conversationSeq,
    required this.senderUserId,
    required this.type,
    required this.body,
    this.isRecalled = false,
    required this.sentAt,
    this.replyToMessageId,
    this.forwardFromMessageId,
    this.mentions,
    this.status = MessageStatus.sent,
    this.translation,
    this.isTranslating = false,
    this.readCount = 0,
    this.isReadByPeer = false,
    this.failureReason,
    this.isSelf = false,
    this.localUploadState,
  });

  Message copyWith({
    String? messageId,
    String? clientMsgId,
    String? conversationId,
    int? conversationSeq,
    String? senderUserId,
    MessageType? type,
    MessageBody? body,
    bool? isRecalled,
    DateTime? sentAt,
    String? replyToMessageId,
    String? forwardFromMessageId,
    List<Mention>? mentions,
    MessageStatus? status,
    String? translation,
    bool? isTranslating,
    int? readCount,
    bool? isReadByPeer,
    String? failureReason,
    bool? isSelf,
    MessageLocalUploadState? localUploadState,
    bool clearLocalUploadState = false,
  }) {
    return Message(
      messageId: messageId ?? this.messageId,
      clientMsgId: clientMsgId ?? this.clientMsgId,
      conversationId: conversationId ?? this.conversationId,
      conversationSeq: conversationSeq ?? this.conversationSeq,
      senderUserId: senderUserId ?? this.senderUserId,
      type: type ?? this.type,
      body: body ?? this.body,
      isRecalled: isRecalled ?? this.isRecalled,
      sentAt: sentAt ?? this.sentAt,
      replyToMessageId: replyToMessageId ?? this.replyToMessageId,
      forwardFromMessageId: forwardFromMessageId ?? this.forwardFromMessageId,
      mentions: mentions ?? this.mentions,
      status: status ?? this.status,
      translation: translation ?? this.translation,
      isTranslating: isTranslating ?? this.isTranslating,
      readCount: readCount ?? this.readCount,
      isReadByPeer: isReadByPeer ?? this.isReadByPeer,
      failureReason: failureReason ?? this.failureReason,
      isSelf: isSelf ?? this.isSelf,
      localUploadState: clearLocalUploadState
          ? null
          : localUploadState ?? this.localUploadState,
    );
  }
}

class MessageBody {
  final String? text;
  final MediaResource? image;
  final MediaResource? video;
  final MediaResource? voice;
  final MediaResource? file;
  final ContactCardDto? contactCard; // contact_card 消息
  final CallLogDto? callLog; // call_log 消息
  final LocationDto? location; // location 消息
  final String? event; // event 系统消息（纯文本预览）
  final EventDto? eventData; // event 系统消息（结构化数据）

  const MessageBody({
    this.text,
    this.image,
    this.video,
    this.voice,
    this.file,
    this.contactCard,
    this.callLog,
    this.location,
    this.event,
    this.eventData,
  });

  factory MessageBody.fromJson(Map<String, dynamic> json) {
    final rawEvent = json['event'];
    final eventData = rawEvent is Map
        ? EventDto.fromJson(Map<String, dynamic>.from(rawEvent))
        : null;
    final eventText = _eventAwareText(
      json['text'] as String?,
      eventData,
      rawEvent is String ? rawEvent : null,
    );
    return MessageBody(
      text: eventText,
      image: json['image'] != null
          ? MediaResource.fromJson(json['image'] as Map<String, dynamic>)
          : null,
      video: json['video'] != null
          ? MediaResource.fromJson(json['video'] as Map<String, dynamic>)
          : null,
      voice: json['voice'] != null
          ? MediaResource.fromJson(json['voice'] as Map<String, dynamic>)
          : null,
      file: json['file'] != null
          ? MediaResource.fromJson(json['file'] as Map<String, dynamic>)
          : null,
      // API 返回 snake_case，兼容 camelCase（旧缓存）
      contactCard: (json['contact_card'] ?? json['contactCard']) != null
          ? ContactCardDto.fromJson((json['contact_card'] ??
              json['contactCard']) as Map<String, dynamic>)
          : null,
      callLog: (json['call_log'] ?? json['callLog']) != null
          ? CallLogDto.fromJson(
              (json['call_log'] ?? json['callLog']) as Map<String, dynamic>)
          : null,
      location: json['location'] != null
          ? LocationDto.fromJson(json['location'] as Map<String, dynamic>)
          : null,
      event: eventText,
      eventData: eventData,
    );
  }

  static String? _eventAwareText(
    String? bodyText,
    EventDto? eventData,
    String? rawEventText,
  ) {
    final formattedEventText = eventData?.text;
    if (formattedEventText == null || formattedEventText.isEmpty) {
      return bodyText ?? rawEventText;
    }
    final normalizedBodyText = bodyText?.trim();
    if (normalizedBodyText == null || normalizedBodyText.isEmpty) {
      return formattedEventText;
    }
    if (_isGenericEventText(normalizedBodyText)) {
      return formattedEventText;
    }
    return normalizedBodyText;
  }

  static bool _isGenericEventText(String text) {
    const genericTexts = {
      '成员已加入群聊',
      '成员加入群聊',
      '已加入群聊',
    };
    return genericTexts.contains(text);
  }

  Map<String, dynamic> toJson() {
    return {
      if (text != null) 'text': text,
      if (image != null) 'image': image!.toJson(),
      if (video != null) 'video': video!.toJson(),
      if (voice != null) 'voice': voice!.toJson(),
      if (file != null) 'file': file!.toJson(),
      // 最新 API 要求 body 内使用 camelCase；读取侧仍兼容旧缓存的 snake_case。
      if (contactCard != null) 'contactCard': contactCard!.toJson(),
      if (callLog != null) 'callLog': callLog!.toJson(),
      if (location != null) 'location': location!.toJson(),
      if (eventData != null) 'event': eventData!.toJson(),
      if (eventData == null && event != null) 'event': event,
    };
  }
}

// ---------------------------------------------------------------------------
// EventDto — 系统事件结构。保留原始字段，UI 可用 text 做兼容展示。
// ---------------------------------------------------------------------------

class EventDto {
  final String? type;
  final String? text;
  final Map<String, dynamic> raw;

  const EventDto({
    this.type,
    this.text,
    this.raw = const {},
  });

  factory EventDto.fromJson(Map<String, dynamic> json) {
    final type = json['type'] as String? ?? json['eventType'] as String?;
    final text = json['text'] as String? ??
        json['preview'] as String? ??
        json['content'] as String? ??
        _formatGroupMemberText(json, type) ??
        _formatTapTapText(json);
    return EventDto(
      type: type,
      text: text,
      raw: Map<String, dynamic>.from(json),
    );
  }

  static String? _formatGroupMemberText(
    Map<String, dynamic> json,
    String? type,
  ) {
    if (type != 'members_added' &&
        type != 'member_added' &&
        type != 'group_member_added' &&
        type != 'group_member_joined' &&
        type != 'member_joined' &&
        type != 'join_group' &&
        type != 'joined_group') {
      return null;
    }

    final names = _memberNames(json);
    if (names.isEmpty) return null;
    return '${_joinNames(names)} 加入群聊';
  }

  static List<String> _memberNames(Map<String, dynamic> json) {
    final names = <String>[];
    void addName(Object? value) {
      final text = value?.toString().trim();
      if (text != null && text.isNotEmpty && !names.contains(text)) {
        names.add(text);
      }
    }

    for (final key in const [
      'addedUserDisplayNames',
      'addedUserNames',
      'addedDisplayNames',
      'memberDisplayNames',
      'memberNames',
    ]) {
      final value = json[key];
      if (value is Iterable) {
        for (final item in value) {
          addName(item);
        }
      }
    }

    for (final key in const [
      'addedUsers',
      'addedMembers',
      'members',
      'users',
    ]) {
      final value = json[key];
      if (value is Iterable) {
        for (final item in value) {
          if (item is Map) {
            addName(_firstText(Map<String, dynamic>.from(item), const [
              'displayName',
              'name',
              'nickname',
              'userName',
              'loginName',
            ]));
          }
        }
      }
    }

    addName(_firstText(json, const [
      'addedUserDisplayName',
      'addedUserName',
      'memberDisplayName',
      'memberName',
      'targetDisplayName',
      'targetName',
      'displayName',
      'userName',
    ]));

    return names;
  }

  static String _joinNames(List<String> names) {
    if (names.length <= 3) return names.join('、');
    return '${names.take(3).join('、')}等${names.length}人';
  }

  static String? _formatTapTapText(Map<String, dynamic> json) {
    final type = json['type']?.toString();
    if (type != 'tap_tap' && type != 'tapTap' && type != 'tap-tap') {
      return null;
    }

    final actor = _firstText(json, const [
          'actorDisplayName',
          'senderDisplayName',
          'fromDisplayName',
          'actorName',
          'senderName',
          'fromName',
        ]) ??
        '有人';
    final target = _firstText(json, const [
          'targetDisplayName',
          'receiverDisplayName',
          'toDisplayName',
          'targetName',
          'receiverName',
          'toName',
        ]) ??
        '对方';
    final customText = _firstText(json, const ['tapTapText', 'actionText']);
    if (customText != null && customText.isNotEmpty) {
      return '$actor $customText';
    }
    return '$actor 拍了拍 $target';
  }

  static String? _firstText(Map<String, dynamic> json, List<String> keys) {
    for (final key in keys) {
      final value = json[key]?.toString().trim();
      if (value != null && value.isNotEmpty) {
        return value;
      }
    }
    return null;
  }

  Map<String, dynamic> toJson() => raw.isNotEmpty
      ? Map<String, dynamic>.from(raw)
      : {
          if (type != null) 'type': type,
          if (text != null) 'text': text,
        };
}

class MediaResource {
  final String url;
  final String? fileName;
  final String? mimeType;
  final int? sizeBytes;
  final int? width;
  final int? height;
  final int? durationSeconds;
  final String? thumbnailUrl;
  final String? localPreviewUrl;
  final String? localPosterUrl;

  const MediaResource({
    required this.url,
    this.fileName,
    this.mimeType,
    this.sizeBytes,
    this.width,
    this.height,
    this.durationSeconds,
    this.thumbnailUrl,
    this.localPreviewUrl,
    this.localPosterUrl,
  });

  factory MediaResource.fromJson(Map<String, dynamic> json) {
    return MediaResource(
      url: json['url'] as String,
      fileName: json['fileName'] as String?,
      mimeType: json['mimeType'] as String?,
      sizeBytes: json['sizeBytes'] as int?,
      width: json['width'] as int?,
      height: json['height'] as int?,
      durationSeconds: json['durationSeconds'] as int?,
      thumbnailUrl: json['thumbnailUrl'] as String?,
    );
  }

  MediaResource copyWith({
    String? url,
    String? fileName,
    String? mimeType,
    int? sizeBytes,
    int? width,
    int? height,
    int? durationSeconds,
    String? thumbnailUrl,
    String? localPreviewUrl,
    String? localPosterUrl,
  }) {
    return MediaResource(
      url: url ?? this.url,
      fileName: fileName ?? this.fileName,
      mimeType: mimeType ?? this.mimeType,
      sizeBytes: sizeBytes ?? this.sizeBytes,
      width: width ?? this.width,
      height: height ?? this.height,
      durationSeconds: durationSeconds ?? this.durationSeconds,
      thumbnailUrl: thumbnailUrl ?? this.thumbnailUrl,
      localPreviewUrl: localPreviewUrl ?? this.localPreviewUrl,
      localPosterUrl: localPosterUrl ?? this.localPosterUrl,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'url': url,
      'fileName': fileName,
      'mimeType': mimeType,
      'sizeBytes': sizeBytes,
      'width': width,
      'height': height,
      'durationSeconds': durationSeconds,
      'thumbnailUrl': thumbnailUrl,
    };
  }
}

enum MentionTargetType { user, all }

const mentionAllUserId = '00000000-0000-0000-0000-000000000000';

class Mention {
  final MentionTargetType type;
  final String? userId;
  final int offset;
  final int length;

  const Mention({
    required this.userId,
    required this.offset,
    required this.length,
  }) : type = MentionTargetType.user;

  const Mention.user({
    required this.userId,
    required this.offset,
    required this.length,
  }) : type = MentionTargetType.user;

  const Mention.all({
    required this.offset,
    required this.length,
  })  : type = MentionTargetType.all,
        userId = null;

  bool get isAll => type == MentionTargetType.all;

  factory Mention.fromJson(Map<String, dynamic> json) {
    final rawType = json['type'] as String?;
    final userId = json['userId'] as String?;
    if (rawType == 'all' || userId == mentionAllUserId) {
      return Mention.all(
        offset: json['offset'] as int,
        length: json['length'] as int,
      );
    }
    return Mention(
      userId: userId,
      offset: json['offset'] as int,
      length: json['length'] as int,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'type': type == MentionTargetType.all ? 'all' : 'user',
      if (userId != null && userId!.isNotEmpty) 'userId': userId,
      'offset': offset,
      'length': length,
    };
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        other is Mention &&
            other.type == type &&
            other.userId == userId &&
            other.offset == offset &&
            other.length == length;
  }

  @override
  int get hashCode => Object.hash(type, userId, offset, length);
}

// ---------------------------------------------------------------------------
// ContactCardDto — 对照 API client-api-reference.md ContactCardDto
// ---------------------------------------------------------------------------

class ContactCardDto {
  final String userId;
  final String displayName;
  final String? avatarUrl;
  final String? mobile;
  final String? email;

  const ContactCardDto({
    required this.userId,
    required this.displayName,
    this.avatarUrl,
    this.mobile,
    this.email,
  });

  factory ContactCardDto.fromJson(Map<String, dynamic> json) {
    return ContactCardDto(
      userId: json['userId'] as String? ?? '',
      displayName: json['displayName'] as String? ?? '',
      avatarUrl: json['avatarUrl'] as String?,
      mobile: json['mobile'] as String?,
      email: json['email'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'userId': userId,
        'displayName': displayName,
        if (avatarUrl != null) 'avatarUrl': avatarUrl,
        if (mobile != null) 'mobile': mobile,
        if (email != null) 'email': email,
      };
}

// ---------------------------------------------------------------------------
// CallLogDto — 对照 API client-api-reference.md CallLogDto
// ---------------------------------------------------------------------------

class CallLogDto {
  final String callId;
  final String mediaMode; // 'audio' | 'audioVideo'
  final int durationSeconds;
  final String endReason; // 'completed' | 'missed' | 'cancelled' | 'rejected'
  final bool isCaller;

  const CallLogDto({
    required this.callId,
    required this.mediaMode,
    required this.durationSeconds,
    required this.endReason,
    required this.isCaller,
  });

  factory CallLogDto.fromJson(Map<String, dynamic> json) {
    return CallLogDto(
      callId: json['callId'] as String? ?? '',
      mediaMode: json['mediaMode'] as String? ?? 'audio',
      durationSeconds: json['durationSeconds'] as int? ?? 0,
      endReason: json['endReason'] as String? ?? 'completed',
      isCaller: json['isCaller'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'callId': callId,
        'mediaMode': mediaMode,
        'durationSeconds': durationSeconds,
        'endReason': endReason,
        'isCaller': isCaller,
      };
}

// ---------------------------------------------------------------------------
// LocationDto — 对照 API client-api-reference.md LocationDto
// ---------------------------------------------------------------------------

class LocationDto {
  final double latitude;
  final double longitude;
  final String? title;
  final String? address;
  final int? zoomLevel;

  const LocationDto({
    required this.latitude,
    required this.longitude,
    this.title,
    this.address,
    this.zoomLevel,
  });

  factory LocationDto.fromJson(Map<String, dynamic> json) {
    final rawZoomLevel = json['zoomLevel'];
    return LocationDto(
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      title: json['title'] as String?,
      address: json['address'] as String?,
      zoomLevel: rawZoomLevel is num ? rawZoomLevel.toInt() : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'latitude': latitude,
        'longitude': longitude,
        if (title != null) 'title': title,
        if (address != null) 'address': address,
        if (zoomLevel != null) 'zoomLevel': zoomLevel,
      };
}
