import 'package:dio/dio.dart';
import 'package:lpp_mobile/features/chat/data/datasources/chat_local_datasource.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/contacts/application/friend_acceptance_conversation_service.dart';

class DioFriendAcceptanceConversationGateway
    implements FriendAcceptanceConversationGateway {
  final Dio dio;

  const DioFriendAcceptanceConversationGateway(this.dio);

  @override
  Future<String?> createDirectConversation(String peerUserId) async {
    final response = await dio.post<Map<String, dynamic>>(
      '/api/client/v1/direct-chats',
      data: {'peerUserId': peerUserId},
    );
    final data = response.data?['data'] as Map<String, dynamic>? ?? {};
    return (data['chatId'] ?? data['conversationId']) as String?;
  }
}

class ChatLocalFriendAcceptanceConversationStore
    implements FriendAcceptanceConversationStore {
  final ChatLocalDataSource local;

  const ChatLocalFriendAcceptanceConversationStore(this.local);

  factory ChatLocalFriendAcceptanceConversationStore.create() {
    return ChatLocalFriendAcceptanceConversationStore(
        ChatLocalDataSourceImpl());
  }

  @override
  Future<List<Conversation>> getConversations(String spaceId) {
    return local.getConversations(spaceId);
  }

  @override
  Future<void> upsertConversation(
    String spaceId,
    Conversation conversation,
  ) {
    return local.upsertConversation(spaceId, conversation);
  }

  @override
  Future<void> upsertMessages(
    String spaceId,
    String conversationId,
    List<Message> messages,
  ) {
    return local.upsertMessages(spaceId, conversationId, messages);
  }
}
