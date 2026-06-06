import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/network/error_handler.dart';
import 'package:lpp_mobile/features/chat/data/mappers/message_send_failure_mapper.dart';
import 'package:lpp_mobile/features/chat/domain/services/message_send_failure.dart';

void main() {
  group('mapAppErrorToMessageSendFailure', () {
    test('maps duplicate client message id as idempotent send success', () {
      final failure = mapAppErrorToMessageSendFailure(
        const ServerError(
          code: 'MSG_DUPLICATE_CLIENT_MSG_ID',
          message: 'duplicate',
          statusCode: 409,
          requestId: 'req-dup',
        ),
      );

      expect(failure.kind, MessageSendFailureKind.duplicateClientMsgId);
      expect(failure.isDuplicateClientMsgId, isTrue);
      expect(failure.shouldRetry, isFalse);
      expect(failure.code, 'MSG_DUPLICATE_CLIENT_MSG_ID');
      expect(failure.requestId, 'req-dup');
    });

    test('maps server business errors as non-retry rejected sends', () {
      final failure = mapAppErrorToMessageSendFailure(
        const ServerError(
          code: 'MSG_GROUP_MUTED',
          message: 'group muted',
          statusCode: 403,
          requestId: 'req-muted',
        ),
      );

      expect(failure.kind, MessageSendFailureKind.serverRejected);
      expect(failure.shouldRetry, isFalse);
      expect(failure.shouldMarkRejected, isTrue);
      expect(failure.displayReason, 'MSG_GROUP_MUTED');
      expect(failure.statusCode, 403);
    });

    test('maps network errors as retryable pending sends', () {
      final failure = mapAppErrorToMessageSendFailure(
        const NetworkError('offline'),
      );

      expect(failure.kind, MessageSendFailureKind.network);
      expect(failure.shouldRetry, isTrue);
      expect(failure.shouldEnqueuePending, isTrue);
      expect(failure.displayReason, 'offline');
    });
  });
}
