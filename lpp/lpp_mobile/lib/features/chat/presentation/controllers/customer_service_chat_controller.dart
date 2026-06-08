import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/network/error_handler.dart';
import 'package:lpp_mobile/features/chat/data/datasources/chat_local_datasource.dart';
import 'package:lpp_mobile/features/chat/data/datasources/chat_remote_datasource.dart';
import 'package:lpp_mobile/features/chat/data/datasources/gateway_event_handler.dart';
import 'package:lpp_mobile/features/chat/data/datasources/pending_message_queue.dart';
import 'package:lpp_mobile/features/chat/data/mappers/message_send_failure_mapper.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/domain/services/message_send_policy.dart';
import 'package:lpp_mobile/features/chat/domain/usecases/send_message_usecase.dart';
import 'package:lpp_mobile/features/chat/presentation/models/customer_service_chat_state_model.dart';
import 'package:lpp_mobile/features/customer_service/data/models/customer_service_models.dart';
import 'package:lpp_mobile/features/customer_service/data/repositories/customer_service_chat_repository_adapter.dart';
import 'package:lpp_mobile/features/customer_service/data/repositories/customer_service_repository.dart';
import 'package:lpp_mobile/features/customer_service/presentation/providers/customer_service_providers.dart';

final customerServiceChatControllerProvider =
    Provider<CustomerServiceChatController>((ref) {
  final space = ref.watch(currentSpaceProvider);
  return CustomerServiceChatController(
    ref.watch(customerServiceRepositoryProvider),
    mediaRemote: ChatRemoteDataSourceImpl(ref.watch(dioProvider)),
    localWriter: CustomerServiceSqliteLocalMessageWriter(
      ChatLocalDataSourceImpl(),
    ),
    pendingStore: CustomerServiceHivePendingMessageStore(
      PendingMessageQueue(),
    ),
    currentUserIdResolver: () => space?.userId ?? '',
    spaceIdResolver: () => space?.spaceId ?? '',
  );
});

abstract class CustomerServiceLocalMessageWriter {
  Future<void> upsertMessage(
    String spaceId,
    String conversationId,
    Message message,
  );
}

class CustomerServiceSqliteLocalMessageWriter
    implements CustomerServiceLocalMessageWriter {
  final ChatLocalDataSource _local;

  const CustomerServiceSqliteLocalMessageWriter(this._local);

  @override
  Future<void> upsertMessage(
    String spaceId,
    String conversationId,
    Message message,
  ) {
    return _local.upsertMessage(spaceId, conversationId, message);
  }
}

abstract class CustomerServicePendingMessageStore {
  Future<void> enqueue(PendingMessage message);
}

class CustomerServiceHivePendingMessageStore
    implements CustomerServicePendingMessageStore {
  final PendingMessageQueue _queue;

  const CustomerServiceHivePendingMessageStore(this._queue);

  @override
  Future<void> enqueue(PendingMessage message) {
    return _queue.enqueue(message);
  }
}

class CustomerServiceChatController {
  final CustomerServiceRepository _repository;
  final ChatRemoteDataSource _mediaRemote;
  final CustomerServiceLocalMessageWriter _localWriter;
  final CustomerServicePendingMessageStore _pendingStore;
  final String Function()? _currentUserIdResolver;
  final String Function()? _spaceIdResolver;

  const CustomerServiceChatController(
    this._repository, {
    required ChatRemoteDataSource mediaRemote,
    required CustomerServiceLocalMessageWriter localWriter,
    required CustomerServicePendingMessageStore pendingStore,
    String Function()? currentUserIdResolver,
    String Function()? spaceIdResolver,
  })  : _mediaRemote = mediaRemote,
        _localWriter = localWriter,
        _pendingStore = pendingStore,
        _currentUserIdResolver = currentUserIdResolver,
        _spaceIdResolver = spaceIdResolver;

  Future<CsThreadDetail> fetchThread(CsThread thread) {
    return _repository.getThread(thread);
  }

  Future<CsThreadDetail> takeoverThread(CsThread thread) {
    return _repository.takeoverThread(thread);
  }

  Future<Message> sendMessage({
    String? spaceId,
    String? currentUserId,
    required CsThreadDetail thread,
    required String conversationId,
    required MessageType type,
    required MessageBody body,
    String? clientMsgId,
    String? replyToMessageId,
    bool readOnly = false,
    OnOptimisticInsert? onOptimisticInsert,
    OnMessageUpdate? onMessageUpdate,
  }) async {
    final state = CustomerServiceChatState.fromDetail(
      thread,
      isCustomerServiceThread: true,
      readOnly: readOnly,
    );
    if (state.ended) {
      throw const ServerError(
        code: 'TEMP_SESSION_CLOSED',
        message: '会话已结束，不能继续发送消息',
      );
    }
    if (state.requiresManualEntry) {
      throw const ServerError(
        code: 'TEMP_SESSION_NOT_CLAIMED',
        message: '请先接入或人工接管后再回复',
      );
    }

    final effectiveCurrentUserId =
        currentUserId ?? _currentUserIdResolver?.call() ?? '';
    final effectiveSpaceId = spaceId ?? _spaceIdResolver?.call() ?? '';
    final repository = CustomerServiceChatRepositoryAdapter(
      customerServiceRepository: _repository,
      mediaRemote: _mediaRemote,
      threadType: thread.threadType,
      threadId: thread.threadId,
      senderUserId: effectiveCurrentUserId,
    );
    final useCase = SendMessageUseCase(
      repository: repository,
      currentUserId: effectiveCurrentUserId,
      failureMapper: mapAppErrorToMessageSendFailure,
      sendPolicy: const MessageSendPolicy(
        context: MessageSendPolicyContext.enterpriseEmployee,
      ),
      onPendingEnqueue: ({
        required clientMsgId,
        required conversationId,
        required isGroup,
        required type,
        required body,
        mentions,
      }) {
        return _pendingStore.enqueue(PendingMessage(
          spaceId: effectiveSpaceId,
          userId: effectiveCurrentUserId,
          clientMsgId: clientMsgId,
          conversationId: conversationId,
          isGroup: false,
          messageType: GatewayEventHandler.messageTypeToApiString(type),
          body: body.toLocalJson(),
          mentions: mentions,
          threadType: thread.threadType,
          threadId: thread.threadId,
          createdAt: DateTime.now(),
        ));
      },
    );

    final sent = await useCase.execute(
      conversationId: conversationId,
      isGroup: false,
      type: type,
      body: body,
      clientMsgId: clientMsgId,
      replyToMessageId: replyToMessageId,
      onOptimisticInsert: onOptimisticInsert,
      onMessageUpdate: onMessageUpdate,
    );
    await _localWriter.upsertMessage(
      effectiveSpaceId,
      conversationId,
      sent,
    );
    return sent;
  }
}
