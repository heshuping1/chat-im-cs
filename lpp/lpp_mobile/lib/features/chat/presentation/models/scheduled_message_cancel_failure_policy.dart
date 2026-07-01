import 'package:lpp_mobile/core/network/error_handler.dart';

class ScheduledMessageCancelFailurePolicy {
  const ScheduledMessageCancelFailurePolicy();

  bool shouldRestoreAfterCancelFailure(Object error) {
    if (error is! ServerError) return true;
    return switch (error.code) {
      'SCHEDULED_MESSAGE_NOT_CANCELABLE' => false,
      'SCHEDULED_MESSAGE_NOT_FOUND' => false,
      _ => true,
    };
  }

  String messageForCancelFailure(Object error) {
    if (!shouldRestoreAfterCancelFailure(error)) {
      return '定时消息已发送或不可取消';
    }
    return '删除失败，请稍后重试';
  }
}
