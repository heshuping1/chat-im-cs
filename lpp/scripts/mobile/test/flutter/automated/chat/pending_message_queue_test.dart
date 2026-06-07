import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:lpp_mobile/core/storage/hive_storage.dart';
import 'package:lpp_mobile/features/chat/data/datasources/pending_message_queue.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation_page.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/domain/entities/scheduled_message.dart';
import 'package:lpp_mobile/features/chat/domain/repositories/chat_repository.dart';

void main() {
  group('PendingMessageQueue', () {
    late Directory tempDir;

    setUp(() async {
      tempDir = await Directory.systemTemp.createTemp('lpp-pending-media-');
      Hive.init(tempDir.path);
      await Hive.openBox<dynamic>('pending_messages');
    });

    tearDown(() async {
      await Hive.close();
      if (await tempDir.exists()) {
        await tempDir.delete(recursive: true);
      }
    });

    test(
      'uploads local media before resending pending image messages',
      () async {
        final queue = PendingMessageQueue();
        final repository = _FakePendingRepository();
        PendingMessage? callbackPending;
        Message? callbackSent;
        await queue.enqueue(
          PendingMessage(
            clientMsgId: 'client-1',
            conversationId: 'chat-1',
            isGroup: false,
            messageType: 'image',
            body: const MessageBody(
              image: MediaResource(
                url: '/tmp/local-image.jpg',
                fileName: 'local-image.jpg',
              ),
            ).toLocalJson(),
            createdAt: DateTime(2026),
          ),
        );

        await queue.flushAll(
          repository,
          onMessageResent: (pending, sent) {
            callbackPending = pending;
            callbackSent = sent;
          },
        );

        expect(repository.uploadedPaths, ['/tmp/local-image.jpg']);
        expect(
          repository.sentBodies.single.image?.url,
          'https://cdn.example.com/media-1',
        );
        expect(callbackPending?.clientMsgId, 'client-1');
        expect(callbackSent?.clientMsgId, 'client-1');
        expect(callbackSent?.messageId, 'server-client-1');
        expect(HiveStorage.pendingMessagesBox.isEmpty, isTrue);
      },
    );

    test(
      'uploads local video poster before resending pending video messages',
      () async {
        final queue = PendingMessageQueue();
        final repository = _FakePendingRepository();
        await queue.enqueue(
          PendingMessage(
            clientMsgId: 'client-video',
            conversationId: 'chat-1',
            isGroup: false,
            messageType: 'video',
            body: const MessageBody(
              video: MediaResource(
                url: '/tmp/local-video.mp4',
                localPosterUrl: '/tmp/local-video-poster.jpg',
              ),
            ).toLocalJson(),
            createdAt: DateTime(2026),
          ),
        );

        await queue.flushAll(repository);

        expect(repository.uploadedPaths, [
          '/tmp/local-video.mp4',
          '/tmp/local-video-poster.jpg',
        ]);
        expect(
          repository.sentBodies.single.video?.url,
          'https://cdn.example.com/media-1',
        );
        expect(
          repository.sentBodies.single.video?.thumbnailUrl,
          'https://cdn.example.com/media-2',
        );
        expect(HiveStorage.pendingMessagesBox.isEmpty, isTrue);
      },
    );

    test(
      'uses resolved repository for customer service pending messages',
      () async {
        final queue = PendingMessageQueue();
        final defaultRepository = _FakePendingRepository();
        final customerRepository = _FakePendingRepository();
        await queue.enqueue(
          PendingMessage(
            clientMsgId: 'client-cs',
            conversationId: 'cs-chat-1',
            isGroup: false,
            messageType: 'text',
            body: const MessageBody(text: '客服回复').toLocalJson(),
            threadType: 'temp_session',
            threadId: 'thread-1',
            createdAt: DateTime(2026),
          ),
        );

        await queue.flushAll(
          defaultRepository,
          repositoryForMessage: (message) => message.threadId == 'thread-1'
              ? customerRepository
              : defaultRepository,
        );

        expect(defaultRepository.sentBodies, isEmpty);
        expect(customerRepository.sentBodies.single.text, '客服回复');
        expect(HiveStorage.pendingMessagesBox.isEmpty, isTrue);
      },
    );
  });
}

class _FakePendingRepository implements ChatRepository {
  final uploadedPaths = <String>[];
  final sentBodies = <MessageBody>[];
  int _uploadCount = 0;

  @override
  Future<MediaResource> uploadMedia(
    String filePath, {
    String? mediaKind,
    MediaUploadProgressCallback? onProgress,
  }) async {
    uploadedPaths.add(filePath);
    _uploadCount += 1;
    return MediaResource(url: 'https://cdn.example.com/media-$_uploadCount');
  }

  @override
  Future<Message> sendMessage({
    required String conversationId,
    required bool isGroup,
    required String clientMsgId,
    required MessageType type,
    required MessageBody body,
    String? replyToMessageId,
    List<Mention>? mentions,
  }) async {
    sentBodies.add(body);
    return Message(
      messageId: 'server-$clientMsgId',
      clientMsgId: clientMsgId,
      conversationId: conversationId,
      conversationSeq: 1,
      senderUserId: 'user-1',
      type: type,
      body: body,
      sentAt: DateTime(2026),
      mentions: mentions,
    );
  }

  @override
  Future<void> cancelScheduledMessage(String scheduledMessageId) async {}

  @override
  Future<ScheduledMessage> createScheduledMessage({
    required String conversationId,
    required bool isGroup,
    required MessageType type,
    required MessageBody body,
    required DateTime scheduledAt,
    String? replyToMessageId,
  }) {
    throw UnimplementedError();
  }

  @override
  Future<ConversationsPage> getConversations({
    String? cursor,
    int limit = 50,
  }) async {
    return const ConversationsPage(items: []);
  }

  @override
  Future<List<Message>> getMessages(
    String conversationId, {
    bool isGroup = false,
    int? beforeSeq,
    int limit = 50,
  }) async {
    return const [];
  }

  @override
  Future<List<ScheduledMessage>> getScheduledMessages(
    String conversationId,
  ) async {
    return const [];
  }

  @override
  Future<void> markRead(
    String conversationId,
    bool isGroup,
    int readSeq,
  ) async {}

  @override
  Future<void> muteConversation(String conversationId, bool muted) async {}

  @override
  Future<void> pinConversation(String conversationId, bool pinned) async {}

  @override
  Future<void> recallMessage(String messageId) async {}
}
