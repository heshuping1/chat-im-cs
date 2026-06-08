import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/network/error_handler.dart';
import 'package:lpp_mobile/features/chat/data/datasources/chat_remote_datasource.dart';
import 'package:lpp_mobile/features/chat/data/datasources/pending_message_queue.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation_page.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/domain/entities/scheduled_message.dart';
import 'package:lpp_mobile/features/chat/presentation/controllers/customer_service_chat_controller.dart';
import 'package:lpp_mobile/features/customer_service/data/models/customer_service_models.dart';
import 'package:lpp_mobile/features/customer_service/data/repositories/customer_service_repository.dart';

void main() {
  group('CustomerServiceChatController', () {
    test('loads thread detail through repository', () async {
      final repository = _FakeCustomerServiceRepository(
        detail: _detail(status: 'active'),
      );
      final controller = _controller(repository);
      final thread = _thread();

      final detail = await controller.fetchThread(thread);

      expect(detail.status, 'active');
      expect(repository.loadedThreads, [thread.threadId]);
    });

    test('takeover thread through repository', () async {
      final repository = _FakeCustomerServiceRepository(
        takeoverDetail: _detail(
          status: 'active',
          currentResponderType: 'staff',
        ),
      );
      final controller = _controller(repository);
      final thread = _thread();

      final detail = await controller.takeoverThread(thread);

      expect(detail.currentResponderType, 'staff');
      expect(repository.takeoverThreads, [thread.threadId]);
    });

    test(
      'sends staff message and persists confirmed message locally',
      () async {
        final repository = _FakeCustomerServiceRepository(
          sentMessage: _message(
            messageId: 'server-message-1',
            senderUserId: 'staff-1',
          ),
        );
        final localWriter = _FakeLocalWriter();
        final pendingStore = _FakePendingStore();
        final controller = _controller(
          repository,
          localWriter: localWriter,
          pendingStore: pendingStore,
        );
        final thread = _detail(status: 'active', currentResponderType: 'staff');

        final sent = await controller.sendMessage(
          spaceId: 'space-1',
          currentUserId: 'staff-1',
          thread: thread,
          conversationId: 'conversation-1',
          type: MessageType.text,
          body: const MessageBody(text: '你好'),
          clientMsgId: 'client-1',
        );

        expect(sent.messageId, 'server-message-1');
        expect(repository.sentThreadIds, ['thread-1']);
        expect(localWriter.writes.single.spaceId, 'space-1');
        expect(localWriter.writes.single.conversationId, 'conversation-1');
        expect(localWriter.writes.single.message.messageId, 'server-message-1');
        expect(pendingStore.enqueued, isEmpty);
      },
    );

    test('rejects closed thread before sending', () async {
      final repository = _FakeCustomerServiceRepository();
      final controller = _controller(repository);

      await expectLater(
        controller.sendMessage(
          spaceId: 'space-1',
          currentUserId: 'staff-1',
          thread: _detail(status: 'closed_by_staff'),
          conversationId: 'conversation-1',
          type: MessageType.text,
          body: const MessageBody(text: '你好'),
        ),
        throwsA(
          isA<ServerError>().having(
            (error) => error.code,
            'code',
            'TEMP_SESSION_CLOSED',
          ),
        ),
      );

      expect(repository.sentThreadIds, isEmpty);
    });

    test('rejects queued thread until staff claims it', () async {
      final repository = _FakeCustomerServiceRepository();
      final controller = _controller(repository);

      await expectLater(
        controller.sendMessage(
          spaceId: 'space-1',
          currentUserId: 'staff-1',
          thread: _detail(status: 'queued'),
          conversationId: 'conversation-1',
          type: MessageType.text,
          body: const MessageBody(text: '你好'),
        ),
        throwsA(
          isA<ServerError>().having(
            (error) => error.code,
            'code',
            'TEMP_SESSION_NOT_CLAIMED',
          ),
        ),
      );

      expect(repository.sentThreadIds, isEmpty);
    });

    test(
      'queues customer service message with thread identity on network error',
      () async {
        final repository = _FakeCustomerServiceRepository(
          sendError: const NetworkError('offline'),
        );
        final pendingStore = _FakePendingStore();
        final controller = _controller(repository, pendingStore: pendingStore);

        await expectLater(
          controller.sendMessage(
            spaceId: 'space-1',
            currentUserId: 'staff-1',
            thread: _detail(status: 'active', currentResponderType: 'staff'),
            conversationId: 'conversation-1',
            type: MessageType.text,
            body: const MessageBody(text: '你好'),
            clientMsgId: 'client-1',
          ),
          throwsA(isA<NetworkError>()),
        );

        expect(pendingStore.enqueued, hasLength(1));
        expect(pendingStore.enqueued.single.spaceId, 'space-1');
        expect(pendingStore.enqueued.single.userId, 'staff-1');
        expect(pendingStore.enqueued.single.threadType, 'temp_session');
        expect(pendingStore.enqueued.single.threadId, 'thread-1');
      },
    );
  });
}

CustomerServiceChatController _controller(
  CustomerServiceRepository repository, {
  CustomerServiceLocalMessageWriter? localWriter,
  CustomerServicePendingMessageStore? pendingStore,
}) {
  return CustomerServiceChatController(
    repository,
    mediaRemote: _FakeChatRemoteDataSource(),
    localWriter: localWriter ?? _FakeLocalWriter(),
    pendingStore: pendingStore ?? _FakePendingStore(),
  );
}

CsThread _thread() {
  return const CsThread(
    threadType: 'temp_session',
    threadId: 'thread-1',
    conversationId: 'conversation-1',
    status: 'queued',
    title: '客户',
  );
}

CsThreadDetail _detail({required String status, String? currentResponderType}) {
  return CsThreadDetail(
    threadType: 'temp_session',
    threadId: 'thread-1',
    conversationId: 'conversation-1',
    status: status,
    title: '客户',
    currentResponderType: currentResponderType,
  );
}

class _FakeCustomerServiceRepository implements CustomerServiceRepository {
  final CsThreadDetail? detail;
  final CsThreadDetail? takeoverDetail;
  final Message? sentMessage;
  final Object? sendError;
  final loadedThreads = <String>[];
  final takeoverThreads = <String>[];
  final sentThreadIds = <String>[];

  _FakeCustomerServiceRepository({
    this.detail,
    this.takeoverDetail,
    this.sentMessage,
    this.sendError,
  });

  @override
  Future<CsThreadDetail> getThread(CsThread thread) async {
    loadedThreads.add(thread.threadId);
    return detail ?? _detail(status: 'active');
  }

  @override
  Future<CsThreadDetail> takeoverThread(CsThread thread) async {
    takeoverThreads.add(thread.threadId);
    return takeoverDetail ?? _detail(status: 'active');
  }

  @override
  Future<Message> sendThreadMessage({
    required String threadType,
    required String threadId,
    required String conversationId,
    required String clientMsgId,
    required MessageType type,
    required MessageBody body,
    String? replyToMessageId,
    String? senderUserId,
  }) async {
    sentThreadIds.add(threadId);
    final error = sendError;
    if (error != null) throw error;
    return sentMessage ??
        _message(
          messageId: 'server-message-1',
          conversationId: conversationId,
          senderUserId: senderUserId ?? 'staff-1',
          type: type,
          body: body,
        );
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

Message _message({
  required String messageId,
  String conversationId = 'conversation-1',
  String senderUserId = 'staff-1',
  MessageType type = MessageType.text,
  MessageBody body = const MessageBody(text: '你好'),
}) {
  return Message(
    messageId: messageId,
    conversationId: conversationId,
    conversationSeq: 1,
    senderUserId: senderUserId,
    type: type,
    body: body,
    sentAt: DateTime(2026, 6, 8),
  );
}

class _FakeLocalWriter implements CustomerServiceLocalMessageWriter {
  final writes = <_LocalWrite>[];

  @override
  Future<void> upsertMessage(
    String spaceId,
    String conversationId,
    Message message,
  ) async {
    writes.add(_LocalWrite(spaceId, conversationId, message));
  }
}

class _LocalWrite {
  final String spaceId;
  final String conversationId;
  final Message message;

  const _LocalWrite(this.spaceId, this.conversationId, this.message);
}

class _FakePendingStore implements CustomerServicePendingMessageStore {
  final enqueued = <PendingMessage>[];

  @override
  Future<void> enqueue(PendingMessage message) async {
    enqueued.add(message);
  }
}

class _FakeChatRemoteDataSource implements ChatRemoteDataSource {
  @override
  Future<MediaResource> uploadMedia(
    String filePath, {
    String? mediaKind,
    MediaUploadProgressCallback? onProgress,
  }) {
    throw UnimplementedError();
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
