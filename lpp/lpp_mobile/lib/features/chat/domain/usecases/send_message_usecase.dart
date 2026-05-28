import 'package:uuid/uuid.dart';
import 'package:lpp_mobile/core/network/error_handler.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/domain/repositories/chat_repository.dart';
import 'package:lpp_mobile/features/chat/domain/services/message_send_lifecycle.dart';

typedef OnOptimisticInsert = void Function(Message message);
typedef OnMessageUpdate = void Function(String clientMsgId, Message updated);
typedef OnPendingEnqueue = Future<void> Function({
  required String clientMsgId,
  required String conversationId,
  required bool isGroup,
  required MessageType type,
  required MessageBody body,
});

class SendMessageUseCase {
  final ChatRepository _repository;
  final String currentUserId;
  final OnPendingEnqueue? _onPendingEnqueue;

  static const int _maxRetries = 3;
  static const _uuid = Uuid();

  SendMessageUseCase({
    required ChatRepository repository,
    required this.currentUserId,
    OnPendingEnqueue? onPendingEnqueue,
  })  : _repository = repository,
        _onPendingEnqueue = onPendingEnqueue;

  /// 发送消息
  ///
  /// [onOptimisticInsert] — 乐观插入回调（status: sending）
  /// [onMessageUpdate]    — 状态更新回调（sent / failed / rejected）
  Future<Message> execute({
    required String conversationId,
    required bool isGroup,
    required MessageType type,
    required MessageBody body,
    String? replyToMessageId,
    OnOptimisticInsert? onOptimisticInsert,
    OnMessageUpdate? onMessageUpdate,
  }) async {
    // 1. 生成 clientMsgId
    final clientMsgId = _uuid.v4();

    // 2. 乐观插入（status: sending）
    final optimistic = Message(
      messageId: clientMsgId, // 临时用 clientMsgId 作为 messageId
      clientMsgId: clientMsgId,
      conversationId: conversationId,
      conversationSeq: 0,
      senderUserId: currentUserId,
      type: type,
      body: body,
      sentAt: DateTime.now(),
      replyToMessageId: replyToMessageId,
      status: MessageStatus.sending,
    );
    MessageSendLifecycle.queued(optimistic, isGroup: isGroup);
    onOptimisticInsert?.call(optimistic);

    // 3. 媒体消息先上传
    MessageBody resolvedBody = body;
    if (_isMediaType(type)) {
      final localPath = _extractLocalPath(body, type);
      if (localPath != null) {
        try {
          MessageSendLifecycle.uploadStarted(
            optimistic,
            isGroup: isGroup,
            localPath: localPath,
          );
          final resource = await _repository.uploadMedia(localPath);
          resolvedBody = _replaceMediaResource(body, type, resource);
          MessageSendLifecycle.uploadSucceeded(optimistic, isGroup: isGroup);
        } catch (e) {
          final failed = optimistic.copyWith(
            status: MessageStatus.failed,
            failureReason: _failureReason(e),
          );
          onMessageUpdate?.call(clientMsgId, failed);
          MessageSendLifecycle.failed(
            failed,
            isGroup: isGroup,
            stage: 'upload',
            error: e,
          );
          rethrow;
        }
      }
    }

    // 4. 调用 REST 发送接口（最多重试 3 次）
    AppError? lastError;
    var failureRecorded = false;
    Message? terminalFailure;
    for (int attempt = 0; attempt < _maxRetries; attempt++) {
      try {
        MessageSendLifecycle.sending(
          optimistic,
          isGroup: isGroup,
          attempt: attempt + 1,
        );
        final sent = await _repository.sendMessage(
          conversationId: conversationId,
          isGroup: isGroup,
          clientMsgId: clientMsgId,
          type: type,
          body: resolvedBody,
          replyToMessageId: replyToMessageId,
        );
        // 5a. 成功 → 更新状态为 sent
        final confirmed = sent.copyWith(
          clientMsgId: clientMsgId,
          senderUserId: currentUserId,
          status: MessageStatus.sent,
        );
        onMessageUpdate?.call(clientMsgId, confirmed);
        MessageSendLifecycle.sent(confirmed, isGroup: isGroup);
        return confirmed;
      } catch (e) {
        if (e is AppError) {
          // MSG_DUPLICATE_CLIENT_MSG_ID → 视为成功
          if (ErrorHandler.isDuplicateClientMsgId(e)) {
            final confirmed = optimistic.copyWith(
              status: MessageStatus.sent,
              body: resolvedBody,
            );
            onMessageUpdate?.call(clientMsgId, confirmed);
            MessageSendLifecycle.sent(
              confirmed,
              isGroup: isGroup,
              idempotent: true,
            );
            return confirmed;
          }
          lastError = e;
          // 服务端明确拒绝（权限不足、禁言、参数不合法等）不重试，标记为 rejected。
          if (e is ServerError) {
            final rejected = optimistic.copyWith(
              status: MessageStatus.rejected,
              body: resolvedBody,
              failureReason: _failureReason(e),
            );
            terminalFailure = rejected;
            MessageSendLifecycle.failed(
              rejected,
              isGroup: isGroup,
              stage: 'send',
              attempt: attempt + 1,
              error: e,
            );
            failureRecorded = true;
            break;
          }
        } else {
          lastError = NetworkError(e.toString());
        }
        // 最后一次重试不等待
        if (attempt < _maxRetries - 1) {
          await Future<void>.delayed(
              Duration(milliseconds: 500 * (attempt + 1)));
        }
      }
    }

    // 5b. 超限或服务端拒绝后标记终态
    final terminal = terminalFailure ??
        optimistic.copyWith(
          status: MessageStatus.failed,
          body: resolvedBody,
          failureReason:
              _failureReason(lastError ?? const NetworkError('发送失败')),
        );
    onMessageUpdate?.call(clientMsgId, terminal);
    final pendingEnqueue = _onPendingEnqueue;
    if (terminal.status == MessageStatus.failed &&
        lastError is NetworkError &&
        pendingEnqueue != null) {
      await pendingEnqueue(
        clientMsgId: clientMsgId,
        conversationId: conversationId,
        isGroup: isGroup,
        type: type,
        body: resolvedBody,
      );
    }
    if (!failureRecorded) {
      MessageSendLifecycle.failed(
        terminal,
        isGroup: isGroup,
        stage: 'send',
        error: lastError ?? const NetworkError('发送失败'),
      );
    }
    throw lastError ?? const NetworkError('发送失败');
  }

  bool _isMediaType(MessageType type) {
    return type == MessageType.image ||
        type == MessageType.video ||
        type == MessageType.voice ||
        type == MessageType.file;
  }

  String? _extractLocalPath(MessageBody body, MessageType type) {
    switch (type) {
      case MessageType.image:
        return body.image?.url.startsWith('/') == true ||
                !body.image!.url.startsWith('http')
            ? body.image?.url
            : null;
      case MessageType.video:
        return body.video?.url.startsWith('/') == true ||
                !body.video!.url.startsWith('http')
            ? body.video?.url
            : null;
      case MessageType.voice:
        return body.voice?.url.startsWith('/') == true ||
                !body.voice!.url.startsWith('http')
            ? body.voice?.url
            : null;
      case MessageType.file:
        return body.file?.url.startsWith('/') == true ||
                !body.file!.url.startsWith('http')
            ? body.file?.url
            : null;
      default:
        return null;
    }
  }

  MessageBody _replaceMediaResource(
      MessageBody body, MessageType type, MediaResource resource) {
    switch (type) {
      case MessageType.image:
        return MessageBody(
            text: body.text,
            image: resource,
            video: body.video,
            voice: body.voice,
            file: body.file);
      case MessageType.video:
        return MessageBody(
            text: body.text,
            image: body.image,
            video: resource,
            voice: body.voice,
            file: body.file);
      case MessageType.voice:
        return MessageBody(
            text: body.text,
            image: body.image,
            video: body.video,
            voice: resource,
            file: body.file);
      case MessageType.file:
        return MessageBody(
            text: body.text,
            image: body.image,
            video: body.video,
            voice: body.voice,
            file: resource);
      default:
        return body;
    }
  }

  String _failureReason(Object error) {
    if (error is ServerError) {
      if (_isModerationBlocked(error.code)) {
        return '内容不符合规范，已禁止发送';
      }
      return error.code.isNotEmpty ? error.code : error.message;
    }
    if (error is AuthError) return error.code;
    if (error is NetworkError) return error.message;
    return error.toString();
  }

  bool _isModerationBlocked(String code) {
    return code == 'DIRECT_MESSAGE_BLOCKED_BY_MODERATION' ||
        code == 'GROUP_MESSAGE_BLOCKED_BY_MODERATION' ||
        code == 'TEMP_SESSION_SENSITIVE_BLOCKED' ||
        code == 'MODERATION_BLOCKED';
  }
}
