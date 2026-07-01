import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/network/error_handler.dart';
import 'package:lpp_mobile/features/chat/presentation/models/scheduled_message_cancel_failure_policy.dart';

void main() {
  test(
    'non-cancelable scheduled message failure should not restore stale task',
    () {
      const policy = ScheduledMessageCancelFailurePolicy();

      expect(
        policy.shouldRestoreAfterCancelFailure(
          const ServerError(
            code: 'SCHEDULED_MESSAGE_NOT_CANCELABLE',
            message: 'only pending scheduled messages can be canceled',
            statusCode: 409,
          ),
        ),
        isFalse,
      );
    },
  );

  test('network failure restores optimistically removed scheduled task', () {
    const policy = ScheduledMessageCancelFailurePolicy();

    expect(
      policy.shouldRestoreAfterCancelFailure(
        const NetworkError('请求超时，请检查网络连接'),
      ),
      isTrue,
    );
  });
}
