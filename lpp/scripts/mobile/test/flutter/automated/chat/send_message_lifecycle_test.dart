import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/diagnostics/app_diagnostics.dart';
import 'package:lpp_mobile/features/chat/domain/services/message_send_failure.dart';
import 'package:lpp_mobile/features/chat/domain/services/message_send_policy.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation_page.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/domain/entities/scheduled_message.dart';
import 'package:lpp_mobile/features/chat/domain/repositories/chat_repository.dart';
import 'package:lpp_mobile/features/chat/domain/usecases/send_message_usecase.dart';

void main() {
  late _FakeChatRepository repository;
  late SendMessageUseCase useCase;

  setUp(() {
    AppDiagnostics.instance.clear();
    repository = _FakeChatRepository();
    useCase = SendMessageUseCase(
      repository: repository,
      currentUserId: 'user-1',
    );
  });

  test('successful text send emits sending then sent state', () async {
    Message? optimistic;
    Message? updated;

    final sent = await useCase.execute(
      conversationId: 'chat-1',
      isGroup: false,
      type: MessageType.text,
      body: const MessageBody(text: 'hello'),
      onOptimisticInsert: (message) => optimistic = message,
      onMessageUpdate: (_, message) => updated = message,
    );

    expect(optimistic?.status, MessageStatus.sending);
    expect(updated?.status, MessageStatus.sent);
    expect(sent.senderUserId, 'user-1');
    expect(
      AppDiagnostics.instance.events
          .where((event) => event.category == 'chat.send.lifecycle')
          .map((event) => event.message),
      ['queued', 'sending', 'sent'],
    );
  });

  test('retry send can reuse existing client message id', () async {
    final sent = await useCase.execute(
      conversationId: 'chat-1',
      isGroup: false,
      type: MessageType.text,
      body: const MessageBody(text: 'retry'),
      clientMsgId: 'client-retry-1',
    );

    expect(sent.clientMsgId, 'client-retry-1');
    expect(repository.lastClientMsgId, 'client-retry-1');
  });

  test(
    'group text send preserves mentions in optimistic and sent messages',
    () async {
      const mentions = [
        Mention.all(offset: 0, length: 4),
        Mention.user(userId: 'user-2', offset: 8, length: 3),
      ];
      Message? optimistic;
      Message? updated;

      final sent = await useCase.execute(
        conversationId: 'group-1',
        isGroup: true,
        type: MessageType.text,
        body: const MessageBody(text: '@所有人 请 @张三 看一下'),
        mentions: mentions,
        onOptimisticInsert: (message) => optimistic = message,
        onMessageUpdate: (_, message) => updated = message,
      );

      expect(repository.lastMentions, mentions);
      expect(optimistic?.mentions, mentions);
      expect(updated?.mentions, mentions);
      expect(sent.mentions, mentions);
    },
  );

  test('server business error fails once without offline retry', () async {
    repository.sendError = const MessageSendFailure.serverRejected(
      code: 'MSG_GROUP_MUTED',
      message: 'group muted',
      statusCode: 403,
      requestId: 'req-1',
    );

    Message? rejected;
    await expectLater(
      useCase.execute(
        conversationId: 'group-1',
        isGroup: true,
        type: MessageType.text,
        body: const MessageBody(text: 'hello'),
        onMessageUpdate: (_, message) => rejected = message,
      ),
      throwsA(isA<MessageSendFailure>()),
    );

    expect(repository.sendCalls, 1);
    expect(rejected?.status, MessageStatus.rejected);
    expect(rejected?.failureReason, 'MSG_GROUP_MUTED');
    final failed = AppDiagnostics.instance.events.lastWhere(
      (event) =>
          event.category == 'chat.send.lifecycle' && event.message == 'failed',
    );
    expect(failed.context['conversationType'], 'group');
    expect(failed.context['status'], MessageStatus.rejected.name);
    expect(failed.context['code'], 'MSG_GROUP_MUTED');
    expect(failed.context['requestId'], 'req-1');
  });

  test(
    'all-member mention permission denial uses friendly failure reason',
    () async {
      repository.sendError = const MessageSendFailure.serverRejected(
        code: 'MSG_AT_ALL_NOT_ALLOWED',
        message: '@all not allowed',
        statusCode: 403,
        requestId: 'req-at-all',
      );

      Message? rejected;
      await expectLater(
        useCase.execute(
          conversationId: 'group-1',
          isGroup: true,
          type: MessageType.text,
          body: const MessageBody(text: '@所有人 集合'),
          mentions: const [Mention.all(offset: 0, length: 4)],
          onMessageUpdate: (_, message) => rejected = message,
        ),
        throwsA(isA<MessageSendFailure>()),
      );

      expect(rejected?.status, MessageStatus.rejected);
      expect(rejected?.failureReason, '当前群不允许普通成员 @所有人');
    },
  );

  test(
    'network failures retry and enqueue pending message for recovery',
    () async {
      final queued = <Map<String, Object?>>[];
      repository.sendError = const MessageSendFailure.network('offline');
      useCase = SendMessageUseCase(
        repository: repository,
        currentUserId: 'user-1',
        onPendingEnqueue:
            ({
              required clientMsgId,
              required conversationId,
              required isGroup,
              required type,
              required body,
              mentions,
            }) async {
              queued.add({
                'clientMsgId': clientMsgId,
                'conversationId': conversationId,
                'isGroup': isGroup,
                'type': type,
                'text': body.text,
              });
            },
      );

      Message? failed;
      await expectLater(
        useCase.execute(
          conversationId: 'chat-1',
          isGroup: false,
          type: MessageType.text,
          body: const MessageBody(text: 'hello'),
          onMessageUpdate: (_, message) => failed = message,
        ),
        throwsA(isA<MessageSendFailure>()),
      );

      expect(repository.sendCalls, 3);
      expect(failed?.status, MessageStatus.failed);
      expect(failed?.failureReason, 'offline');
      expect(queued, hasLength(1));
      expect(queued.single['conversationId'], 'chat-1');
      expect(queued.single['text'], 'hello');
    },
  );

  test(
    'local policy blocks exe files before upload send or pending recovery',
    () async {
      final queued = <Map<String, Object?>>[];
      useCase = SendMessageUseCase(
        repository: repository,
        currentUserId: 'user-1',
        sendPolicy: const MessageSendPolicy(
          context: MessageSendPolicyContext.enterpriseEmployee,
        ),
        onPendingEnqueue:
            ({
              required clientMsgId,
              required conversationId,
              required isGroup,
              required type,
              required body,
              mentions,
            }) async {
              queued.add({'clientMsgId': clientMsgId});
            },
      );

      Message? inserted;
      Message? updated;
      await expectLater(
        useCase.execute(
          conversationId: 'chat-1',
          isGroup: false,
          type: MessageType.file,
          body: const MessageBody(
            file: MediaResource(
              url: '/tmp/setup.EXE',
              fileName: 'setup.EXE',
              mimeType: 'application/x-msdownload',
              sizeBytes: 2048,
            ),
          ),
          onOptimisticInsert: (message) => inserted = message,
          onMessageUpdate: (_, message) => updated = message,
        ),
        throwsA(isA<MessageSendFailure>()),
      );

      expect(inserted?.status, MessageStatus.failed);
      expect(updated?.status, MessageStatus.failed);
      expect(inserted?.failureReason, 'LOCAL_POLICY_EXECUTABLE_FILE_BLOCKED');
      expect(repository.sendCalls, 0);
      expect(repository.uploadedPaths, isEmpty);
      expect(queued, isEmpty);
    },
  );

  test(
    'enterprise customer link text fails locally without repository send',
    () async {
      useCase = SendMessageUseCase(
        repository: repository,
        currentUserId: 'user-1',
        sendPolicy: const MessageSendPolicy(
          context: MessageSendPolicyContext.enterpriseCustomer,
        ),
      );

      Message? inserted;
      await expectLater(
        useCase.execute(
          conversationId: 'chat-1',
          isGroup: false,
          type: MessageType.text,
          body: const MessageBody(text: '看一下 https://example.com/a'),
          onOptimisticInsert: (message) => inserted = message,
        ),
        throwsA(isA<MessageSendFailure>()),
      );

      expect(inserted?.status, MessageStatus.failed);
      expect(inserted?.failureReason, 'LOCAL_POLICY_ENTERPRISE_LINK_BLOCKED');
      expect(repository.sendCalls, 0);
    },
  );

  test(
    'enterprise customer bare domains are links but emails are not',
    () async {
      useCase = SendMessageUseCase(
        repository: repository,
        currentUserId: 'user-1',
        sendPolicy: const MessageSendPolicy(
          context: MessageSendPolicyContext.enterpriseCustomer,
        ),
      );

      await expectLater(
        useCase.execute(
          conversationId: 'chat-1',
          isGroup: false,
          type: MessageType.text,
          body: const MessageBody(text: '官网 example.com/path'),
        ),
        throwsA(isA<MessageSendFailure>()),
      );
      expect(repository.sendCalls, 0);

      final sent = await useCase.execute(
        conversationId: 'chat-1',
        isGroup: false,
        type: MessageType.text,
        body: const MessageBody(text: '邮箱 help@example.com'),
      );
      expect(sent.status, MessageStatus.sent);
      expect(repository.sendCalls, 1);
    },
  );

  test('enterprise employee and personal contexts can send links', () async {
    useCase = SendMessageUseCase(
      repository: repository,
      currentUserId: 'user-1',
      sendPolicy: const MessageSendPolicy(
        context: MessageSendPolicyContext.enterpriseEmployee,
      ),
    );

    await useCase.execute(
      conversationId: 'chat-1',
      isGroup: false,
      type: MessageType.text,
      body: const MessageBody(text: 'https://example.com'),
    );

    useCase = SendMessageUseCase(
      repository: repository,
      currentUserId: 'user-1',
      sendPolicy: const MessageSendPolicy(
        context: MessageSendPolicyContext.personal,
      ),
    );
    await useCase.execute(
      conversationId: 'chat-1',
      isGroup: false,
      type: MessageType.text,
      body: const MessageBody(text: 'www.example.com'),
    );

    expect(repository.sendCalls, 2);
  });

  test(
    'media upload failures enqueue local body so optimistic media can recover',
    () async {
      final queued = <Map<String, Object?>>[];
      repository.uploadError = const MessageSendFailure.network(
        'upload offline',
      );
      useCase = SendMessageUseCase(
        repository: repository,
        currentUserId: 'user-1',
        onPendingEnqueue:
            ({
              required clientMsgId,
              required conversationId,
              required isGroup,
              required type,
              required body,
              mentions,
            }) async {
              queued.add({
                'clientMsgId': clientMsgId,
                'conversationId': conversationId,
                'type': type,
                'url': body.image?.url,
              });
            },
      );

      Message? failed;
      await expectLater(
        useCase.execute(
          conversationId: 'chat-1',
          isGroup: false,
          type: MessageType.image,
          body: const MessageBody(
            image: MediaResource(
              url: '/tmp/local-image.jpg',
              fileName: 'local-image.jpg',
              sizeBytes: 2048,
            ),
          ),
          onMessageUpdate: (_, message) => failed = message,
        ),
        throwsA(isA<MessageSendFailure>()),
      );

      expect(failed?.status, MessageStatus.failed);
      expect(failed?.body.image?.url, '/tmp/local-image.jpg');
      expect(queued, hasLength(1));
      expect(queued.single['type'], MessageType.image);
      expect(queued.single['url'], '/tmp/local-image.jpg');
    },
  );

  test(
    'duplicate client message id is treated as idempotent success',
    () async {
      repository.sendError = const MessageSendFailure.duplicateClientMsgId(
        code: 'MSG_DUPLICATE_CLIENT_MSG_ID',
        message: 'duplicate',
        statusCode: 409,
      );

      final sent = await useCase.execute(
        conversationId: 'chat-1',
        isGroup: false,
        type: MessageType.text,
        body: const MessageBody(text: 'hello'),
      );

      expect(sent.status, MessageStatus.sent);
      final sentEvent = AppDiagnostics.instance.events.lastWhere(
        (event) =>
            event.category == 'chat.send.lifecycle' && event.message == 'sent',
      );
      expect(sentEvent.context['idempotent'], true);
    },
  );

  test(
    'local video send inserts visible optimistic message before upload',
    () async {
      Message? optimistic;
      var uploadSawOptimisticMessage = false;
      repository.onUploadStarted = () {
        uploadSawOptimisticMessage = optimistic != null;
      };

      await useCase.execute(
        conversationId: 'chat-1',
        isGroup: false,
        type: MessageType.video,
        body: const MessageBody(
          video: MediaResource(
            url: '/tmp/local-video.mp4',
            fileName: 'local-video.mp4',
            sizeBytes: 4096,
            localPosterUrl: '/tmp/local-video-poster.jpg',
          ),
        ),
        onOptimisticInsert: (message) => optimistic = message,
      );

      expect(uploadSawOptimisticMessage, isTrue);
      expect(optimistic?.status, MessageStatus.sending);
      expect(optimistic?.type, MessageType.video);
      expect(optimistic?.body.video?.url, '/tmp/local-video.mp4');
    },
  );

  test(
    'local video send publishes uploaded poster as thumbnail for receivers',
    () async {
      repository.uploadResults = [
        const MediaResource(url: 'https://cdn.example.com/video.mp4'),
        const MediaResource(url: 'https://cdn.example.com/video-poster.jpg'),
      ];

      Message? sentUpdate;
      await useCase.execute(
        conversationId: 'chat-1',
        isGroup: false,
        type: MessageType.video,
        body: const MessageBody(
          video: MediaResource(
            url: '/tmp/local-video.mp4',
            fileName: 'local-video.mp4',
            sizeBytes: 4096,
            localPosterUrl: '/tmp/local-video-poster.jpg',
          ),
        ),
        onMessageUpdate: (_, message) => sentUpdate = message,
      );

      expect(repository.uploadedPaths, [
        '/tmp/local-video.mp4',
        '/tmp/local-video-poster.jpg',
      ]);
      expect(sentUpdate?.status, MessageStatus.sent);
      expect(sentUpdate?.body.video?.url, 'https://cdn.example.com/video.mp4');
      expect(
        sentUpdate?.body.video?.thumbnailUrl,
        'https://cdn.example.com/video-poster.jpg',
      );
      expect(
        sentUpdate?.body.video?.localPosterUrl,
        '/tmp/local-video-poster.jpg',
      );
    },
  );
}

class _FakeChatRepository implements ChatRepository {
  Object? sendError;
  Object? uploadError;
  void Function()? onUploadStarted;
  int sendCalls = 0;
  String? lastClientMsgId;
  List<Mention>? lastMentions;
  List<MediaResource>? uploadResults;
  final uploadedPaths = <String>[];

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
    sendCalls++;
    lastClientMsgId = clientMsgId;
    lastMentions = mentions;
    final error = sendError;
    if (error != null) throw error;
    return Message(
      messageId: 'server-$clientMsgId',
      clientMsgId: clientMsgId,
      conversationId: conversationId,
      conversationSeq: 7,
      senderUserId: 'server-user',
      type: type,
      body: body,
      sentAt: DateTime(2026),
      replyToMessageId: replyToMessageId,
      mentions: mentions,
    );
  }

  @override
  Future<MediaResource> uploadMedia(
    String filePath, {
    String? mediaKind,
    MediaUploadProgressCallback? onProgress,
  }) async {
    onUploadStarted?.call();
    uploadedPaths.add(filePath);
    final error = uploadError;
    if (error != null) throw error;
    onProgress?.call(const MediaUploadProgressEvent(loaded: 1, total: 2));
    final queuedResults = uploadResults;
    if (queuedResults != null && queuedResults.isNotEmpty) {
      return queuedResults.removeAt(0);
    }
    return const MediaResource(url: 'https://cdn.example.com/file.png');
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

  @override
  Future<ScheduledMessage> createScheduledMessage({
    required String conversationId,
    required bool isGroup,
    required MessageType type,
    required MessageBody body,
    required DateTime scheduledAt,
    String? replyToMessageId,
  }) {
    throw UnimplementedError('Scheduled messages are not used in this fake.');
  }

  @override
  Future<List<ScheduledMessage>> getScheduledMessages(
    String conversationId,
  ) async {
    return const [];
  }

  @override
  Future<void> cancelScheduledMessage(String scheduledMessageId) async {}

  @override
  Future<ScheduledMessage> updateScheduledMessage({
    required String scheduledMessageId,
    MessageBody? body,
    DateTime? scheduledAt,
  }) {
    throw UnimplementedError('Scheduled messages are not used in this fake.');
  }
}
