import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/diagnostics/app_diagnostics.dart';
import 'package:lpp_mobile/features/chat/domain/services/message_send_failure.dart';
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

  test('records send lifecycle for successful text message', () async {
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

    final lifecycle = AppDiagnostics.instance.events
        .where((event) => event.category == 'chat.send.lifecycle')
        .map((event) => event.message)
        .toList();
    expect(lifecycle, ['queued', 'sending', 'sent']);
  });

  test(
    'does not retry server business errors and records failure context',
    () async {
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
            event.category == 'chat.send.lifecycle' &&
            event.message == 'failed',
      );
      expect(failed.context['conversationType'], 'group');
      expect(failed.context['status'], MessageStatus.rejected.name);
      expect(failed.context['code'], 'MSG_GROUP_MUTED');
      expect(failed.context['requestId'], 'req-1');
    },
  );

  test(
    'persists failure reason and enqueues network failures for retry',
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

  test('treats duplicate client message id as idempotent success', () async {
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
  });

  test(
    'preserves local preview when replacing uploaded image resource',
    () async {
      final sent = await useCase.execute(
        conversationId: 'chat-1',
        isGroup: false,
        type: MessageType.image,
        body: const MessageBody(
          image: MediaResource(
            url: '/tmp/local-image.jpg',
            mimeType: 'image/jpeg',
            localPreviewUrl: '/tmp/local-image.jpg',
          ),
        ),
      );

      expect(sent.body.image?.url, 'https://cdn.example.com/file.png');
      expect(sent.body.image?.localPreviewUrl, '/tmp/local-image.jpg');
    },
  );

  test(
    'preserves local poster when replacing uploaded video resource',
    () async {
      final sent = await useCase.execute(
        conversationId: 'chat-1',
        isGroup: false,
        type: MessageType.video,
        body: const MessageBody(
          video: MediaResource(
            url: '/tmp/local-video.mp4',
            mimeType: 'video/mp4',
            localPosterUrl: '/tmp/local-video-poster.jpg',
          ),
        ),
      );

      expect(sent.body.video?.url, 'https://cdn.example.com/file.png');
      expect(sent.body.video?.localPosterUrl, '/tmp/local-video-poster.jpg');
    },
  );

  test('emits local upload progress before file send is confirmed', () async {
    repository.uploadProgressEvents = const [
      MediaUploadProgressEvent(loaded: 512, total: 1024),
      MediaUploadProgressEvent(percent: 100),
    ];
    final updates = <Message>[];

    final sent = await useCase.execute(
      conversationId: 'chat-1',
      isGroup: false,
      type: MessageType.file,
      body: const MessageBody(
        file: MediaResource(
          url: '/tmp/manual.pdf',
          fileName: 'manual.pdf',
          sizeBytes: 1024,
        ),
      ),
      onMessageUpdate: (_, message) => updates.add(message),
    );

    expect(sent.localUploadState, isNull);
    expect(
      updates.map((message) => message.localUploadState?.status).toList(),
      containsAllInOrder([
        MessageLocalUploadStatus.uploading,
        MessageLocalUploadStatus.uploading,
        MessageLocalUploadStatus.sending,
        null,
      ]),
    );
    expect(
      updates
          .where(
            (message) =>
                message.localUploadState?.phase ==
                MessageLocalUploadPhase.uploadingMedia,
          )
          .map((message) => message.localUploadState?.progress)
          .toList(),
      containsAllInOrder([50, 100]),
    );
  });

  test(
    'keeps local video visible with upload progress until send is confirmed',
    () async {
      repository.uploadProgressEvents = const [
        MediaUploadProgressEvent(loaded: 512, total: 1024),
        MediaUploadProgressEvent(percent: 100),
      ];
      final optimisticMessages = <Message>[];
      final updates = <Message>[];

      final sent = await useCase.execute(
        conversationId: 'chat-1',
        isGroup: false,
        type: MessageType.video,
        body: const MessageBody(
          video: MediaResource(
            url: '/tmp/local-video.mp4',
            mimeType: 'video/mp4',
            sizeBytes: 1024,
          ),
        ),
        onOptimisticInsert: optimisticMessages.add,
        onMessageUpdate: (_, message) => updates.add(message),
      );

      expect(sent.status, MessageStatus.sent);
      expect(sent.localUploadState, isNull);
      expect(optimisticMessages, hasLength(1));
      expect(optimisticMessages.single.status, MessageStatus.sending);
      expect(optimisticMessages.single.body.video?.url, '/tmp/local-video.mp4');
      expect(optimisticMessages.single.localUploadState, isNull);
      expect(
        updates.map((message) => message.localUploadState?.status).toList(),
        containsAllInOrder([
          MessageLocalUploadStatus.uploading,
          MessageLocalUploadStatus.uploading,
          MessageLocalUploadStatus.sending,
          null,
        ]),
      );
    },
  );
}

class _FakeChatRepository implements ChatRepository {
  Object? sendError;
  int sendCalls = 0;
  List<MediaUploadProgressEvent> uploadProgressEvents = const [];

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
    final error = sendError;
    if (error != null) {
      throw error;
    }
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
    for (final event in uploadProgressEvents) {
      onProgress?.call(event);
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
