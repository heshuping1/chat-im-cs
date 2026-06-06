import 'package:lpp_mobile/features/chat/domain/entities/conversation_page.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/domain/entities/scheduled_message.dart';

abstract class ChatRepository {
  Future<ConversationsPage> getConversations({String? cursor, int limit = 50});
  Future<void> pinConversation(String conversationId, bool pinned);
  Future<void> muteConversation(String conversationId, bool muted);

  /// 获取历史消息（分页）
  Future<List<Message>> getMessages(
    String conversationId, {
    bool isGroup = false,
    int? beforeSeq,
    int limit = 50,
  });

  /// 发送消息
  Future<Message> sendMessage({
    required String conversationId,
    required bool isGroup,
    required String clientMsgId,
    required MessageType type,
    required MessageBody body,
    String? replyToMessageId,
    List<Mention>? mentions,
  });

  Future<ScheduledMessage> createScheduledMessage({
    required String conversationId,
    required bool isGroup,
    required MessageType type,
    required MessageBody body,
    required DateTime scheduledAt,
    String? replyToMessageId,
  });

  Future<List<ScheduledMessage>> getScheduledMessages(
    String conversationId,
  );

  Future<void> cancelScheduledMessage(String scheduledMessageId);

  /// 上传媒体文件
  Future<MediaResource> uploadMedia(
    String filePath, {
    MediaUploadProgressCallback? onProgress,
  });

  /// 撤回消息
  Future<void> recallMessage(String messageId);

  /// 标记已读
  Future<void> markRead(String conversationId, bool isGroup, int readSeq);
}
