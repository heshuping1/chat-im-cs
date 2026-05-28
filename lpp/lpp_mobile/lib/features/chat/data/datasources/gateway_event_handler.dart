import 'package:lpp_mobile/features/chat/data/models/message_model.dart';
import 'package:lpp_mobile/features/chat/data/models/conversation_model.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';

/// 处理 Gateway 下行事件，将原始 JSON 转换为 Domain 实体并回调给上层。
class GatewayEventHandler {
  /// 处理 msg.new 事件
  ///
  /// [data] 为 Gateway 推送的 `msg.new` 事件 data 字段。
  /// [onMessage] 收到新消息时回调（spaceId、conversationId、Message）。
  /// [onConversationUpdate] 需要更新会话列表时回调（spaceId、Conversation）。
  Future<void> onNewMessage(
    Map<String, dynamic> data, {
    required String spaceId,
    required void Function(
      String spaceId,
      String conversationId,
      Message message,
    ) onMessage,
    required void Function(
      String spaceId,
      Conversation conversation,
    ) onConversationUpdate,
  }) async {
    final conversationId = data['conversationId'] as String?;
    if (conversationId == null) return;

    // 将 msg.new data 转换为 Message 实体
    final message = MessageModel.fromJson(data);

    // 回调消息
    onMessage(spaceId, conversationId, message);

    // 构建最小化的 Conversation 更新（仅更新 lastMessage 和 lastActivityAt）
    final conversationType = _conversationTypeFromGatewayData(data);

    final updatedConversation = Conversation(
      conversationId: conversationId,
      type: conversationType,
      title: '',
      lastMessage: LastMessage(
        messageId: message.messageId,
        text: message.body.text,
        messageType: messageTypeToApiString(message.type),
        senderUserId: message.senderUserId,
        sentAt: message.sentAt,
      ),
      lastActivityAt: message.sentAt,
      lastMessageSeq: message.conversationSeq,
    );

    onConversationUpdate(spaceId, updatedConversation);
  }

  static String messageTypeToApiString(MessageType type) {
    switch (type) {
      case MessageType.text:
        return 'text';
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
    }
  }
}

ConversationType _conversationTypeFromGatewayData(Map<String, dynamic> data) {
  final rawValues = <String?>[
    _stringValue(data['threadType']),
    _stringValue(_mapValue(data['thread'])?['threadType']),
    _stringValue(_mapValue(data['conversation'])?['threadType']),
    _stringValue(data['conversationType']),
    _stringValue(data['type']),
    _stringValue(_mapValue(data['conversation'])?['conversationType']),
  ];
  if (rawValues.any((value) => _normalizeType(value) == 'temp_session')) {
    return ConversationType.tempSession;
  }
  final raw = rawValues.firstWhere(
    (value) => value != null && value.trim().isNotEmpty,
    orElse: () => null,
  );
  return ConversationModel.parseType(raw);
}

String _normalizeType(String? value) =>
    (value ?? '').trim().toLowerCase().replaceAll('-', '_');

String? _stringValue(Object? value) {
  if (value == null) return null;
  final text = value.toString().trim();
  return text.isEmpty ? null : text;
}

Map<String, dynamic>? _mapValue(Object? value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) {
    return value.map((key, value) => MapEntry(key.toString(), value));
  }
  return null;
}
