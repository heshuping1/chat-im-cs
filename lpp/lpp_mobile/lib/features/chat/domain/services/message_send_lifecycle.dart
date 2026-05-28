import 'package:lpp_mobile/core/diagnostics/app_diagnostics.dart';
import 'package:lpp_mobile/core/network/error_handler.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';

abstract final class MessageSendLifecycle {
  static const _category = 'chat.send.lifecycle';

  static void queued(Message message, {required bool isGroup}) {
    AppDiagnostics.instance.info(
      _category,
      'queued',
      context: _baseContext(message, isGroup: isGroup),
    );
  }

  static void uploadStarted(
    Message message, {
    required bool isGroup,
    required String localPath,
  }) {
    AppDiagnostics.instance.info(
      _category,
      'upload_started',
      context: {
        ..._baseContext(message, isGroup: isGroup),
        'localPath': _redactPath(localPath),
      },
    );
  }

  static void uploadSucceeded(Message message, {required bool isGroup}) {
    AppDiagnostics.instance.info(
      _category,
      'upload_succeeded',
      context: _baseContext(message, isGroup: isGroup),
    );
  }

  static void sending(
    Message message, {
    required bool isGroup,
    required int attempt,
  }) {
    AppDiagnostics.instance.info(
      _category,
      'sending',
      context: {
        ..._baseContext(message, isGroup: isGroup),
        'attempt': attempt,
      },
    );
  }

  static void sent(
    Message message, {
    required bool isGroup,
    bool idempotent = false,
  }) {
    AppDiagnostics.instance.info(
      _category,
      'sent',
      context: {
        ..._baseContext(message, isGroup: isGroup),
        'messageId': message.messageId,
        'conversationSeq': message.conversationSeq,
        if (idempotent) 'idempotent': true,
      },
    );
  }

  static void failed(
    Message message, {
    required bool isGroup,
    required String stage,
    required Object error,
    int? attempt,
  }) {
    AppDiagnostics.instance.error(
      _category,
      'failed',
      context: {
        ..._baseContext(message, isGroup: isGroup),
        'stage': stage,
        if (attempt != null) 'attempt': attempt,
        ..._errorContext(error),
      },
    );
  }

  static Map<String, Object?> _baseContext(
    Message message, {
    required bool isGroup,
  }) {
    return {
      'conversationId': message.conversationId,
      'conversationType': isGroup ? 'group' : 'direct',
      'clientMsgId': message.clientMsgId,
      'messageType': message.type.name,
      'status': message.status.wireName,
    };
  }

  static Map<String, Object?> _errorContext(Object error) {
    if (error is ServerError) {
      return {
        'errorType': 'server',
        'code': error.code,
        'message': error.message,
        if (error.statusCode != null) 'statusCode': error.statusCode,
        if (error.requestId != null) 'requestId': error.requestId,
      };
    }
    if (error is AuthError) {
      return {
        'errorType': 'auth',
        'code': error.code,
      };
    }
    if (error is NetworkError) {
      return {
        'errorType': 'network',
        'message': error.message,
      };
    }
    return {
      'errorType': error.runtimeType.toString(),
      'message': error.toString(),
    };
  }

  static String _redactPath(String path) {
    final normalized = path.replaceAll('\\', '/');
    final index = normalized.lastIndexOf('/');
    if (index < 0 || index == normalized.length - 1) {
      return normalized;
    }
    return '.../${normalized.substring(index + 1)}';
  }
}
