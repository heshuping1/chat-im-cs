import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/data/datasources/chat_local_datasource.dart';
import 'package:lpp_mobile/features/chat/data/datasources/chat_remote_datasource.dart';
import 'package:lpp_mobile/features/chat/data/repositories/chat_repository_impl.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation_page.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';

void main() {
  group('ChatRepositoryImpl unread normalization', () {
    test(
      'keeps local self last-message state when remote summary omits sender',
      () async {
        final localSelfConversation = _conversation(
          unreadCount: 0,
          lastReadSeq: 9,
          lastMessageSeq: 9,
          lastMessage: LastMessage(
            messageId: 'msg-9',
            text: '我发给员工的消息',
            messageType: 'text',
            senderUserId: 'me',
            sentAt: DateTime.utc(2026, 5, 26, 8),
            isSelf: true,
            direction: 'out',
          ),
        );
        final remoteWithWrongUnread = _conversation(
          unreadCount: 1,
          lastReadSeq: 8,
          lastMessageSeq: 9,
          lastMessage: LastMessage(
            messageId: 'msg-9',
            text: '我发给员工的消息',
            messageType: 'text',
            senderUserId: '',
            sentAt: DateTime.utc(2026, 5, 26, 8),
          ),
        );

        final local = _FakeLocalDataSource(cached: [localSelfConversation]);
        final repo = ChatRepositoryImpl(
          remote: _FakeRemoteDataSource([remoteWithWrongUnread]),
          local: local,
          spaceId: 'space-1',
        );

        final page = await repo.getConversations();
        final conversation = page.items.single;

        expect(conversation.unreadCount, 0);
        expect(conversation.lastReadSeq, 9);
        expect(conversation.lastMessage?.isSelf, isTrue);
        expect(conversation.lastMessage?.direction, 'out');
        expect(local.cachedConversations.single.unreadCount, 0);
      },
    );

    test(
      'preserves local last-message mentions when remote snapshot omits them',
      () async {
        final localMentionConversation = _conversation(
          type: ConversationType.group,
          unreadCount: 1,
          lastReadSeq: 8,
          lastMessageSeq: 9,
          lastMessage: LastMessage(
            messageId: 'msg-9',
            text: '@所有人 开会',
            messageType: 'text',
            senderUserId: 'other',
            sentAt: DateTime.utc(2026, 6, 6, 8),
            mentions: const [Mention.all(offset: 0, length: 4)],
          ),
        );
        final remoteWithoutMentions = _conversation(
          type: ConversationType.group,
          unreadCount: 1,
          lastReadSeq: 8,
          lastMessageSeq: 9,
          lastMessage: LastMessage(
            messageId: 'msg-9',
            text: '@所有人 开会',
            messageType: 'text',
            senderUserId: 'other',
            sentAt: DateTime.utc(2026, 6, 6, 8),
          ),
        );

        final local = _FakeLocalDataSource(cached: [localMentionConversation]);
        final repo = ChatRepositoryImpl(
          remote: _FakeRemoteDataSource([remoteWithoutMentions]),
          local: local,
          spaceId: 'space-1',
        );

        final page = await repo.getConversations();
        final conversation = page.items.single;

        expect(conversation.lastMessage?.mentions, isNotNull);
        expect(conversation.lastMessage?.mentions?.single.isAll, isTrue);
        expect(local.cachedConversations.single.lastMessage?.mentions, isNotNull);
      },
    );
  });
}

Conversation _conversation({
  ConversationType type = ConversationType.direct,
  int unreadCount = 0,
  int lastReadSeq = 0,
  int lastMessageSeq = 0,
  LastMessage? lastMessage,
}) {
  return Conversation(
    conversationId: 'chat-1',
    type: type,
    title: '同事',
    unreadCount: unreadCount,
    lastReadSeq: lastReadSeq,
    lastMessageSeq: lastMessageSeq,
    lastMessage: lastMessage,
  );
}

class _FakeRemoteDataSource implements ChatRemoteDataSource {
  final List<Conversation> conversations;

  _FakeRemoteDataSource(this.conversations);

  @override
  Future<ConversationsPage> getConversations({
    String? cursor,
    int limit = 50,
  }) async {
    return ConversationsPage(items: conversations);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _FakeLocalDataSource implements ChatLocalDataSource {
  final List<Conversation> cached;
  List<Conversation> cachedConversations = const [];

  _FakeLocalDataSource({required this.cached});

  @override
  Future<List<Conversation>> getConversations(String spaceId) async => cached;

  @override
  Future<List<Conversation>?> getCachedConversations(String spaceId) async =>
      cached;

  @override
  Future<void> cacheConversations(
    String spaceId,
    List<Conversation> conversations,
  ) async {
    cachedConversations = conversations;
  }

  @override
  Future<void> upsertConversations(
    String spaceId,
    List<Conversation> conversations,
  ) async {
    cachedConversations = conversations;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
