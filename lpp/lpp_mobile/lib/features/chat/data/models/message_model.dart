import 'package:lpp_mobile/features/chat/domain/entities/message.dart';

/// API 响应 → Message 实体的映射模型
class MessageModel {
  static Message fromJson(Map<String, dynamic> json) {
    final isRecalled = json['isRecalled'] as bool? ?? false;
    final direction = _stringValue(json['direction']);
    return Message(
      messageId: json['messageId'] as String,
      clientMsgId: json['clientMsgId'] as String?,
      conversationId: json['conversationId'] as String,
      conversationSeq: json['conversationSeq'] as int? ?? 0,
      senderUserId: _firstNonEmptyString(json, const [
        'senderUserId',
        'senderId',
        'fromUserId',
        'userId',
        'senderPlatformUserId',
        'platformUserId',
        'senderLppId',
        'lppId',
      ]),
      type: _parseType(json['messageType'] as String? ?? 'text'),
      body: MessageBody.fromJson(json['body'] as Map<String, dynamic>? ?? {}),
      isRecalled: isRecalled,
      sentAt:
          DateTime.tryParse(json['sentAt'] as String? ?? '') ?? DateTime.now(),
      replyToMessageId: json['replyToMessageId'] as String?,
      forwardFromMessageId: json['forwardFromMessageId'] as String?,
      mentions: (json['mentions'] as List<dynamic>?)
          ?.map((e) => Mention.fromJson(e as Map<String, dynamic>))
          .toList(),
      status: isRecalled
          ? MessageStatus.recalled
          : parseMessageStatus(json['status'] as String?),
      readCount: json['readCount'] as int? ?? 0,
      failureReason: json['failureReason'] as String?,
      isSelf: _boolValue(json['isSelf']) ||
          _boolValue(json['isMine']) ||
          const {'out', 'outgoing', 'sent', 'self'}.contains(direction),
    );
  }

  /// 从发送接口响应构建 Message（服务端只返回 messageId/conversationSeq/serverTime）
  static Message fromSendResponse(
    Map<String, dynamic> json, {
    required String clientMsgId,
    required MessageType type,
    required MessageBody body,
    required String conversationId,
    String? replyToMessageId,
    String? senderUserId,
  }) {
    return Message(
      messageId: json['messageId'] as String,
      clientMsgId: clientMsgId,
      conversationId: json['conversationId'] as String? ?? conversationId,
      conversationSeq: json['conversationSeq'] as int? ?? 0,
      // 发送接口不返回 senderUserId，由调用方传入（当前用户 userId）
      senderUserId: senderUserId ?? '',
      type: type,
      body: body,
      isRecalled: false,
      sentAt: DateTime.tryParse(json['serverTime'] as String? ?? '') ??
          DateTime.now(),
      replyToMessageId: replyToMessageId,
      status: MessageStatus.sent,
      isSelf: true,
    );
  }

  static Map<String, dynamic> toJson(Message m) {
    return {
      'messageId': m.messageId,
      'clientMsgId': m.clientMsgId,
      'conversationId': m.conversationId,
      'conversationSeq': m.conversationSeq,
      'senderUserId': m.senderUserId,
      'messageType': _typeToString(m.type),
      'body': m.body.toJson(),
      'isRecalled': m.isRecalled,
      'sentAt': m.sentAt.toIso8601String(),
      'replyToMessageId': m.replyToMessageId,
      'forwardFromMessageId': m.forwardFromMessageId,
      'mentions': m.mentions?.map((e) => e.toJson()).toList(),
      'status': m.status.wireName,
      'readCount': m.readCount,
      'isSelf': m.isSelf,
      if (m.failureReason != null) 'failureReason': m.failureReason,
    };
  }

  static String _firstNonEmptyString(
    Map<String, dynamic> json,
    List<String> keys,
  ) {
    for (final key in keys) {
      final value = _stringValue(json[key]);
      if (value.isNotEmpty) return value;
    }
    return '';
  }

  static String _stringValue(Object? value) {
    if (value == null) return '';
    final text = value.toString().trim();
    return text;
  }

  static bool _boolValue(Object? value) {
    return value == true || value == 'true' || value == 1 || value == '1';
  }

  static MessageType _parseType(String raw) {
    switch (raw) {
      case 'markdown':
        return MessageType.markdown;
      case 'image':
        return MessageType.image;
      case 'video':
        return MessageType.video;
      case 'voice':
        return MessageType.voice;
      case 'file':
        return MessageType.file;
      case 'event':
        return MessageType.event;
      case 'contact_card':
        return MessageType.contactCard;
      case 'call_log':
        return MessageType.callLog;
      case 'location':
        return MessageType.location;
      default:
        return MessageType.text;
    }
  }

  static String _typeToString(MessageType type) {
    switch (type) {
      case MessageType.markdown:
        return 'markdown';
      case MessageType.image:
        return 'image';
      case MessageType.video:
        return 'video';
      case MessageType.voice:
        return 'voice';
      case MessageType.file:
        return 'file';
      case MessageType.event:
        return 'event';
      case MessageType.contactCard:
        return 'contact_card';
      case MessageType.callLog:
        return 'call_log';
      case MessageType.location:
        return 'location';
      default:
        return 'text';
    }
  }
}
