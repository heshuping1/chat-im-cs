enum MessageSendFailureKind {
  duplicateClientMsgId,
  serverRejected,
  network,
  auth,
  unknown,
}

typedef MessageSendFailureMapper = MessageSendFailure Function(Object error);

class MessageSendFailure implements Exception {
  final MessageSendFailureKind kind;
  final String message;
  final String? code;
  final int? statusCode;
  final String? requestId;

  const MessageSendFailure({
    required this.kind,
    required this.message,
    this.code,
    this.statusCode,
    this.requestId,
  });

  const MessageSendFailure.duplicateClientMsgId({
    String message = 'duplicate client message id',
    String code = 'MSG_DUPLICATE_CLIENT_MSG_ID',
    int? statusCode,
    String? requestId,
  }) : this(
          kind: MessageSendFailureKind.duplicateClientMsgId,
          message: message,
          code: code,
          statusCode: statusCode,
          requestId: requestId,
        );

  const MessageSendFailure.serverRejected({
    required String message,
    String? code,
    int? statusCode,
    String? requestId,
  }) : this(
          kind: MessageSendFailureKind.serverRejected,
          message: message,
          code: code,
          statusCode: statusCode,
          requestId: requestId,
        );

  const MessageSendFailure.network(String message)
      : this(kind: MessageSendFailureKind.network, message: message);

  const MessageSendFailure.auth(String code)
      : this(kind: MessageSendFailureKind.auth, message: code, code: code);

  MessageSendFailure.unknown(Object error)
      : this(
          kind: MessageSendFailureKind.unknown,
          message: error.toString(),
        );

  bool get isDuplicateClientMsgId =>
      kind == MessageSendFailureKind.duplicateClientMsgId;

  bool get shouldRetry =>
      kind == MessageSendFailureKind.network ||
      kind == MessageSendFailureKind.unknown;

  bool get shouldEnqueuePending => kind == MessageSendFailureKind.network;

  bool get shouldMarkRejected =>
      kind == MessageSendFailureKind.serverRejected ||
      kind == MessageSendFailureKind.auth;

  String get displayReason => code?.isNotEmpty == true ? code! : message;

  Map<String, Object?> toDiagnosticContext() {
    return {
      'errorType': switch (kind) {
        MessageSendFailureKind.duplicateClientMsgId =>
          'duplicate_client_msg_id',
        MessageSendFailureKind.serverRejected => 'server',
        MessageSendFailureKind.network => 'network',
        MessageSendFailureKind.auth => 'auth',
        MessageSendFailureKind.unknown => 'unknown',
      },
      'message': message,
      if (code != null) 'code': code,
      if (statusCode != null) 'statusCode': statusCode,
      if (requestId != null) 'requestId': requestId,
    };
  }

  @override
  String toString() => 'MessageSendFailure($kind, $displayReason)';
}

MessageSendFailure defaultMessageSendFailureMapper(Object error) {
  if (error is MessageSendFailure) return error;
  return MessageSendFailure.unknown(error);
}
