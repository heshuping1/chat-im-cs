import 'package:lpp_mobile/features/chat/data/datasources/chat_remote_datasource.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation_page.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/domain/entities/scheduled_message.dart';
import 'package:lpp_mobile/features/chat/domain/repositories/chat_repository.dart';
import 'package:lpp_mobile/features/customer_service/data/repositories/customer_service_repository.dart';

/// Bridges customer-service thread sending into the shared chat send lifecycle.
///
/// Customer service keeps its own business routes and permissions, while media
/// upload/progress/local recovery are handled by [SendMessageUseCase].
class CustomerServiceChatRepositoryAdapter implements ChatRepository {
  final CustomerServiceRepository customerServiceRepository;
  final ChatRemoteDataSource mediaRemote;
  final String threadType;
  final String threadId;
  final String senderUserId;

  const CustomerServiceChatRepositoryAdapter({
    required this.customerServiceRepository,
    required this.mediaRemote,
    required this.threadType,
    required this.threadId,
    required this.senderUserId,
  });

  @override
  Future<Message> sendMessage({
    required String conversationId,
    required bool isGroup,
    required String clientMsgId,
    required MessageType type,
    required MessageBody body,
    String? replyToMessageId,
    List<Mention>? mentions,
  }) {
    return customerServiceRepository.sendThreadMessage(
      threadType: threadType,
      threadId: threadId,
      conversationId: conversationId,
      clientMsgId: clientMsgId,
      type: type,
      body: body,
      replyToMessageId: replyToMessageId,
      senderUserId: senderUserId,
    );
  }

  @override
  Future<MediaResource> uploadMedia(
    String filePath, {
    String? mediaKind,
    MediaUploadProgressCallback? onProgress,
  }) {
    return mediaRemote.uploadMedia(
      filePath,
      mediaKind: mediaKind,
      onProgress: onProgress,
    );
  }

  @override
  Future<ConversationsPage> getConversations({
    String? cursor,
    int limit = 50,
  }) {
    throw UnsupportedError('Customer service adapter does not list chats.');
  }

  @override
  Future<List<Message>> getMessages(
    String conversationId, {
    bool isGroup = false,
    int? beforeSeq,
    int limit = 50,
  }) {
    throw UnsupportedError('Customer service adapter does not load history.');
  }

  @override
  Future<void> pinConversation(String conversationId, bool pinned) {
    throw UnsupportedError('Customer service adapter does not pin chats.');
  }

  @override
  Future<void> muteConversation(String conversationId, bool muted) {
    throw UnsupportedError('Customer service adapter does not mute chats.');
  }

  @override
  Future<ScheduledMessage> createScheduledMessage({
    required String conversationId,
    required bool isGroup,
    required MessageType type,
    required MessageBody body,
    required DateTime scheduledAt,
    String? replyToMessageId,
  }) {
    throw UnsupportedError(
      'Customer service adapter does not schedule messages.',
    );
  }

  @override
  Future<List<ScheduledMessage>> getScheduledMessages(String conversationId) {
    throw UnsupportedError(
      'Customer service adapter does not load scheduled messages.',
    );
  }

  @override
  Future<void> cancelScheduledMessage(String scheduledMessageId) {
    throw UnsupportedError(
      'Customer service adapter does not cancel scheduled messages.',
    );
  }

  @override
  Future<ScheduledMessage> updateScheduledMessage({
    required String scheduledMessageId,
    MessageBody? body,
    DateTime? scheduledAt,
  }) {
    throw UnsupportedError(
      'Customer service adapter does not update scheduled messages.',
    );
  }

  @override
  Future<void> recallMessage(String messageId) {
    throw UnsupportedError(
        'Customer service adapter does not recall messages.');
  }

  @override
  Future<void> markRead(String conversationId, bool isGroup, int readSeq) {
    throw UnsupportedError('Customer service adapter does not mark read.');
  }
}
