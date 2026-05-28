import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/diagnostics/app_diagnostics.dart';
import 'package:lpp_mobile/core/network/error_handler.dart';
import 'package:lpp_mobile/features/chat/data/datasources/chat_remote_datasource.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
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

  test('server business error fails once without offline retry', () async {
    repository.sendError = const ServerError(
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
      throwsA(isA<ServerError>()),
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

  test('network failures retry and enqueue pending message for recovery',
      () async {
    final queued = <Map<String, Object?>>[];
    repository.sendError = const NetworkError('offline');
    useCase = SendMessageUseCase(
      repository: repository,
      currentUserId: 'user-1',
      onPendingEnqueue: ({
        required clientMsgId,
        required conversationId,
        required isGroup,
        required type,
        required body,
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
      throwsA(isA<NetworkError>()),
    );

    expect(repository.sendCalls, 3);
    expect(failed?.status, MessageStatus.failed);
    expect(failed?.failureReason, 'offline');
    expect(queued, hasLength(1));
    expect(queued.single['conversationId'], 'chat-1');
    expect(queued.single['text'], 'hello');
  });

  test('duplicate client message id is treated as idempotent success',
      () async {
    repository.sendError = const ServerError(
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
}

class _FakeChatRepository implements ChatRepository {
  Object? sendError;
  int sendCalls = 0;

  @override
  Future<Message> sendMessage({
    required String conversationId,
    required bool isGroup,
    required String clientMsgId,
    required MessageType type,
    required MessageBody body,
    String? replyToMessageId,
  }) async {
    sendCalls++;
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
    );
  }

  @override
  Future<MediaResource> uploadMedia(String filePath) async {
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
      String conversationId, bool isGroup, int readSeq) async {}

  @override
  Future<void> muteConversation(String conversationId, bool muted) async {}

  @override
  Future<void> pinConversation(String conversationId, bool pinned) async {}

  @override
  Future<void> recallMessage(String messageId) async {}
}
