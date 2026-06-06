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
}

class _FakeChatRepository implements ChatRepository {
  Object? sendError;
  void Function()? onUploadStarted;
  int sendCalls = 0;
  List<Mention>? lastMentions;

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
    MediaUploadProgressCallback? onProgress,
  }) async {
    onUploadStarted?.call();
    onProgress?.call(const MediaUploadProgressEvent(loaded: 1, total: 2));
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
}
