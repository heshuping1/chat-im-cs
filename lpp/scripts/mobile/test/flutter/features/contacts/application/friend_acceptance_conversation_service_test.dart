import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/contacts/application/friend_acceptance_conversation_service.dart';

void main() {
  group('FriendAcceptanceConversationService', () {
    test('creates local acceptance conversation events and summary', () async {
      final gateway = _FakeGateway(conversationId: 'chat-1');
      final store = _FakeStore();
      final service = FriendAcceptanceConversationService(
        gateway: gateway,
        store: store,
        now: () => DateTime.utc(2026, 6, 6, 10),
      );

      final result = await service.ensureConversation(
        spaceId: 'space-1',
        currentUserId: 'me',
        draft: const FriendAcceptanceConversationDraft(
          requestId: 'req-1',
          peerUserId: 'peer-1',
          peerDisplayName: 'Alice',
          peerAvatarUrl: 'https://example.com/a.png',
          requestMessage: '你好，我是 Alice',
        ),
      );

      expect(result?.conversationId, 'chat-1');
      expect(gateway.peerUserIds, ['peer-1']);
      expect(store.messagesByConversation['chat-1'], hasLength(2));

      final requestEvent = store.messagesByConversation['chat-1']![0];
      expect(requestEvent.type, MessageType.event);
      expect(requestEvent.body.text, '好友申请：你好，我是 Alice');
      expect(requestEvent.senderUserId, 'peer-1');

      final acceptedEvent = store.messagesByConversation['chat-1']![1];
      expect(acceptedEvent.body.text, '我通过了你的朋友验证请求，现在我们可以开始聊天了');
      expect(acceptedEvent.senderUserId, 'me');

      final conversation = store.conversationsById['chat-1']!;
      expect(conversation.title, 'Alice');
      expect(conversation.avatarUrl, 'https://example.com/a.png');
      expect(conversation.peerUserId, 'peer-1');
      expect(conversation.lastMessage?.messageType, 'event');
      expect(conversation.lastMessage?.text, acceptedEvent.body.text);
    });

    test(
      'keeps existing conversation metadata when updating summary',
      () async {
        final store = _FakeStore(
          existing: [
            Conversation(
              conversationId: 'chat-1',
              type: ConversationType.direct,
              title: '备注名',
              avatarUrl: 'https://example.com/old.png',
              peerUserId: 'peer-1',
              lastMessageSeq: 8,
              unreadCount: 3,
            ),
          ],
        );
        final service = FriendAcceptanceConversationService(
          gateway: _FakeGateway(conversationId: 'chat-1'),
          store: store,
          now: () => DateTime.utc(2026, 6, 6, 10),
        );

        await service.ensureConversation(
          spaceId: 'space-1',
          currentUserId: 'me',
          draft: const FriendAcceptanceConversationDraft(
            requestId: 'req-1',
            peerUserId: 'peer-1',
            peerDisplayName: 'Alice',
            peerAvatarUrl: 'https://example.com/a.png',
            acceptedText: '对方通过了你的朋友验证请求，现在我们可以开始聊天了',
          ),
        );

        final conversation = store.conversationsById['chat-1']!;
        expect(conversation.title, '备注名');
        expect(conversation.avatarUrl, 'https://example.com/old.png');
        expect(conversation.lastMessageSeq, 8);
        expect(conversation.unreadCount, 3);
        expect(conversation.lastMessage?.text, '对方通过了你的朋友验证请求，现在我们可以开始聊天了');
      },
    );
  });
}

class _FakeGateway implements FriendAcceptanceConversationGateway {
  final String? conversationId;
  final peerUserIds = <String>[];

  _FakeGateway({required this.conversationId});

  @override
  Future<String?> createDirectConversation(String peerUserId) async {
    peerUserIds.add(peerUserId);
    return conversationId;
  }
}

class _FakeStore implements FriendAcceptanceConversationStore {
  final conversationsById = <String, Conversation>{};
  final messagesByConversation = <String, List<Message>>{};

  _FakeStore({List<Conversation> existing = const []}) {
    for (final conversation in existing) {
      conversationsById[conversation.conversationId] = conversation;
    }
  }

  @override
  Future<List<Conversation>> getConversations(String spaceId) async {
    return conversationsById.values.toList();
  }

  @override
  Future<void> upsertConversation(
    String spaceId,
    Conversation conversation,
  ) async {
    conversationsById[conversation.conversationId] = conversation;
  }

  @override
  Future<void> upsertMessages(
    String spaceId,
    String conversationId,
    List<Message> messages,
  ) async {
    messagesByConversation[conversationId] = messages;
  }
}
