import 'package:uuid/uuid.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/domain/repositories/chat_repository.dart';
import 'package:lpp_mobile/features/chat/domain/services/message_send_failure.dart';
import 'package:lpp_mobile/features/chat/domain/services/message_send_lifecycle.dart';

typedef OnOptimisticInsert = void Function(Message message);
typedef OnMessageUpdate = void Function(String clientMsgId, Message updated);
typedef OnPendingEnqueue = Future<void> Function({
  required String clientMsgId,
  required String conversationId,
  required bool isGroup,
  required MessageType type,
  required MessageBody body,
  List<Mention>? mentions,
});

class SendMessageUseCase {
  final ChatRepository _repository;
  final String currentUserId;
  final OnPendingEnqueue? _onPendingEnqueue;
  final MessageSendFailureMapper _failureMapper;

  static const int _maxRetries = 3;
  static const _uuid = Uuid();

  SendMessageUseCase({
    required ChatRepository repository,
    required this.currentUserId,
    OnPendingEnqueue? onPendingEnqueue,
    MessageSendFailureMapper? failureMapper,
  })  : _repository = repository,
        _onPendingEnqueue = onPendingEnqueue,
        _failureMapper = failureMapper ?? defaultMessageSendFailureMapper;

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
    List<Mention>? mentions,
    OnOptimisticInsert? onOptimisticInsert,
    OnMessageUpdate? onMessageUpdate,
  }) async {
    // 1. 生成 clientMsgId
    final clientMsgId = _uuid.v4();

    final localPath = _isMediaType(type) ? _extractLocalPath(body, type) : null;

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
      mentions: mentions,
      status: MessageStatus.sending,
    );
    MessageSendLifecycle.queued(optimistic, isGroup: isGroup);
    onOptimisticInsert?.call(optimistic);

    // 3. 媒体消息先上传
    MessageBody resolvedBody = body;
    Message sendBase = optimistic;
    if (_isMediaType(type)) {
      if (localPath != null) {
        try {
          final preparing = optimistic.copyWith(
            localUploadState: const MessageLocalUploadState(
              status: MessageLocalUploadStatus.uploading,
              phase: MessageLocalUploadPhase.preparing,
              progress: 0,
            ),
          );
          onMessageUpdate?.call(clientMsgId, preparing);
          MessageSendLifecycle.uploadStarted(
            optimistic,
            isGroup: isGroup,
            localPath: localPath,
          );
          final fallbackTotalBytes = _mediaSizeBytes(body, type);
          final resource = await _repository.uploadMedia(
            localPath,
            onProgress: (event) {
              final progress = mediaUploadProgressPercent(
                event,
                fallbackTotalBytes: fallbackTotalBytes,
              );
              onMessageUpdate?.call(
                clientMsgId,
                optimistic.copyWith(
                  localUploadState: MessageLocalUploadState(
                    status: MessageLocalUploadStatus.uploading,
                    phase: MessageLocalUploadPhase.uploadingMedia,
                    progress: progress,
                  ),
                ),
              );
            },
          );
          resolvedBody = _replaceMediaResource(body, type, resource);
          sendBase = optimistic.copyWith(
            body: resolvedBody,
            localUploadState: const MessageLocalUploadState(
              status: MessageLocalUploadStatus.sending,
              phase: MessageLocalUploadPhase.sending,
              progress: 95,
            ),
          );
          onMessageUpdate?.call(clientMsgId, sendBase);
          MessageSendLifecycle.uploadSucceeded(optimistic, isGroup: isGroup);
        } catch (e) {
          final failure = _failureMapper(e);
          final failed = optimistic.copyWith(
            status: MessageStatus.failed,
            failureReason: _failureReason(failure),
            localUploadState: MessageLocalUploadState(
              status: MessageLocalUploadStatus.failed,
              phase: MessageLocalUploadPhase.failed,
              error: _failureReason(failure),
            ),
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
    Object? lastError;
    MessageSendFailure? lastFailure;
    var failureRecorded = false;
    Message? terminalFailure;
    for (int attempt = 0; attempt < _maxRetries; attempt++) {
      try {
        MessageSendLifecycle.sending(
          sendBase,
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
          mentions: isGroup ? mentions : null,
        );
        // 5a. 成功 → 更新状态为 sent
        final confirmed = sent.copyWith(
          clientMsgId: clientMsgId,
          senderUserId: currentUserId,
          status: MessageStatus.sent,
          mentions: mentions,
          clearLocalUploadState: true,
        );
        onMessageUpdate?.call(clientMsgId, confirmed);
        MessageSendLifecycle.sent(confirmed, isGroup: isGroup);
        return confirmed;
      } catch (e) {
        final failure = _failureMapper(e);
        // MSG_DUPLICATE_CLIENT_MSG_ID → 视为成功
        if (failure.isDuplicateClientMsgId) {
          final confirmed = optimistic.copyWith(
            status: MessageStatus.sent,
            body: resolvedBody,
            clearLocalUploadState: true,
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
        lastFailure = failure;
        // 服务端明确拒绝（权限不足、禁言、参数不合法等）不重试，标记为 rejected。
        if (!failure.shouldRetry) {
          final rejected = optimistic.copyWith(
            status: failure.shouldMarkRejected
                ? MessageStatus.rejected
                : MessageStatus.failed,
            body: resolvedBody,
            failureReason: _failureReason(failure),
            localUploadState: _localUploadFailureState(type, failure),
          );
          terminalFailure = rejected;
          MessageSendLifecycle.failed(
            rejected,
            isGroup: isGroup,
            stage: 'send',
            attempt: attempt + 1,
            error: failure,
          );
          failureRecorded = true;
          break;
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
          failureReason: _failureReason(
            lastFailure ?? const MessageSendFailure.network('发送失败'),
          ),
          localUploadState: _localUploadFailureState(
            type,
            lastFailure ?? const MessageSendFailure.network('发送失败'),
          ),
        );
    onMessageUpdate?.call(clientMsgId, terminal);
    final pendingEnqueue = _onPendingEnqueue;
    if (terminal.status == MessageStatus.failed &&
        lastFailure?.shouldEnqueuePending == true &&
        pendingEnqueue != null) {
      await pendingEnqueue(
        clientMsgId: clientMsgId,
        conversationId: conversationId,
        isGroup: isGroup,
        type: type,
        body: resolvedBody,
        mentions: isGroup ? mentions : null,
      );
    }
    if (!failureRecorded) {
      MessageSendLifecycle.failed(
        terminal,
        isGroup: isGroup,
        stage: 'send',
        error: lastFailure ?? const MessageSendFailure.network('发送失败'),
      );
    }
    throw lastError ?? const MessageSendFailure.network('发送失败');
  }

  bool _isMediaType(MessageType type) {
    return type == MessageType.image ||
        type == MessageType.video ||
        type == MessageType.voice ||
        type == MessageType.file;
  }

  int? _mediaSizeBytes(MessageBody body, MessageType type) {
    switch (type) {
      case MessageType.image:
        return body.image?.sizeBytes;
      case MessageType.video:
        return body.video?.sizeBytes;
      case MessageType.voice:
        return body.voice?.sizeBytes;
      case MessageType.file:
        return body.file?.sizeBytes;
      default:
        return null;
    }
  }

  MessageLocalUploadState? _localUploadFailureState(
    MessageType type,
    MessageSendFailure failure,
  ) {
    if (!_isMediaType(type)) return null;
    return MessageLocalUploadState(
      status: MessageLocalUploadStatus.failed,
      phase: MessageLocalUploadPhase.failed,
      error: _failureReason(failure),
    );
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
        final image = _preserveLocalMediaPreview(
          uploaded: resource,
          local: body.image,
        );
        return MessageBody(
            text: body.text,
            image: image,
            video: body.video,
            voice: body.voice,
            file: body.file);
      case MessageType.video:
        final video = _preserveLocalMediaPreview(
          uploaded: resource,
          local: body.video,
        );
        return MessageBody(
            text: body.text,
            image: body.image,
            video: video,
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

  MediaResource _preserveLocalMediaPreview({
    required MediaResource uploaded,
    required MediaResource? local,
  }) {
    if (local == null) return uploaded;
    final localUrl = _isLocalUrl(local.url) ? local.url : null;
    return uploaded.copyWith(
      localPreviewUrl: local.localPreviewUrl ?? localUrl,
      localPosterUrl: local.localPosterUrl,
    );
  }

  bool _isLocalUrl(String url) {
    return url.startsWith('/') ||
        (!url.startsWith('http://') && !url.startsWith('https://'));
  }

  String _failureReason(MessageSendFailure failure) {
    final code = failure.code;
    if (code != null && code.isNotEmpty) {
      if (_isModerationBlocked(code)) {
        return '内容不符合规范，已禁止发送';
      }
      return code;
    }
    return failure.message;
  }

  bool _isModerationBlocked(String code) {
    return code == 'DIRECT_MESSAGE_BLOCKED_BY_MODERATION' ||
        code == 'GROUP_MESSAGE_BLOCKED_BY_MODERATION' ||
        code == 'TEMP_SESSION_SENSITIVE_BLOCKED' ||
        code == 'MODERATION_BLOCKED';
  }
}
