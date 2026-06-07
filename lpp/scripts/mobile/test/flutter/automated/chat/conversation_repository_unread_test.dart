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
        expect(
          local.cachedConversations.single.lastMessage?.mentions,
          isNotNull,
        );
      },
    );

    test(
      'uses cached group conversation type when route extra is lost',
      () async {
        final local = _FakeLocalDataSource(
          cached: [_conversation(type: ConversationType.group)],
        );
        final remote = _FakeRemoteDataSource(
          const [],
          groupMessages: [
            Message(
              messageId: 'video-1',
              conversationId: 'chat-1',
              conversationSeq: 1,
              senderUserId: 'user-2',
              type: MessageType.video,
              body: const MessageBody(
                video: MediaResource(
                  url: '/media/videos/video-1.mp4',
                  thumbnailUrl: '/media/videos/video-1.jpg',
                ),
              ),
              sentAt: DateTime.utc(2026, 6, 7),
            ),
          ],
        );
        final repo = ChatRepositoryImpl(
          remote: remote,
          local: local,
          spaceId: 'space-1',
        );

        final messages = await repo.getMessages('chat-1', isGroup: false);

        expect(remote.directMessageRequests, isEmpty);
        expect(remote.groupMessageRequests, ['chat-1']);
        expect(messages.single.type, MessageType.video);
        expect(
          messages.single.body.video?.thumbnailUrl,
          '/media/videos/video-1.jpg',
        );
      },
    );

    test(
      'syncs group messages from remote when cached conversation is group',
      () async {
        final local = _FakeLocalDataSource(
          cached: [_conversation(type: ConversationType.group)],
        );
        final remote = _FakeRemoteDataSource(
          const [],
          groupMessages: [
            Message(
              messageId: 'video-2',
              conversationId: 'chat-1',
              conversationSeq: 10,
              senderUserId: 'user-2',
              type: MessageType.video,
              body: const MessageBody(
                video: MediaResource(url: '/media/videos/video-2.mp4'),
              ),
              sentAt: DateTime.utc(2026, 6, 7),
            ),
          ],
        );
        final repo = ChatRepositoryImpl(
          remote: remote,
          local: local,
          spaceId: 'space-1',
        );

        final messages = await repo.syncMessagesFromRemote(
          'chat-1',
          isGroup: false,
        );

        expect(remote.directMessageRequests, isEmpty);
        expect(remote.groupMessageRequests, ['chat-1']);
        expect(messages.single.messageId, 'video-2');
        expect(local.upsertedMessages.single.messageId, 'video-2');
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
  final List<Message> directMessages;
  final List<Message> groupMessages;
  final directMessageRequests = <String>[];
  final groupMessageRequests = <String>[];

  _FakeRemoteDataSource(
    this.conversations, {
    this.directMessages = const [],
    this.groupMessages = const [],
  });

  @override
  Future<ConversationsPage> getConversations({
    String? cursor,
    int limit = 50,
  }) async {
    return ConversationsPage(items: conversations);
  }

  @override
  Future<List<Message>> getDirectChatMessages(
    String chatId, {
    int? beforeSeq,
    int limit = 50,
  }) async {
    directMessageRequests.add(chatId);
    return directMessages;
  }

  @override
  Future<List<Message>> getGroupMessages(
    String groupId, {
    int? beforeSeq,
    int limit = 50,
  }) async {
    groupMessageRequests.add(groupId);
    return groupMessages;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _FakeLocalDataSource implements ChatLocalDataSource {
  final List<Conversation> cached;
  List<Conversation> cachedConversations = const [];
  List<Message> cachedMessages = const [];
  List<Message> upsertedMessages = const [];

  _FakeLocalDataSource({required this.cached});

  @override
  Future<List<Conversation>> getConversations(String spaceId) async => cached;

  @override
  Future<List<Conversation>?> getCachedConversations(String spaceId) async =>
      cached;

  @override
  Future<List<Message>?> getCachedMessages(
    String spaceId,
    String conversationId,
  ) async => cachedMessages;

  @override
  Future<int> getLocalMaxSeq(String spaceId, String conversationId) async =>
      cachedMessages.isEmpty
      ? 0
      : cachedMessages
            .map((message) => message.conversationSeq)
            .reduce((a, b) => a > b ? a : b);

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
  Future<void> cacheMessages(
    String spaceId,
    String conversationId,
    List<Message> messages,
  ) async {
    cachedMessages = messages;
  }

  @override
  Future<void> upsertMessages(
    String spaceId,
    String conversationId,
    List<Message> messages,
  ) async {
    upsertedMessages = messages;
    cachedMessages = messages;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
