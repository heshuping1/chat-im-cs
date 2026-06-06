import 'package:lpp_mobile/core/network/error_handler.dart';
import 'package:lpp_mobile/features/chat/domain/services/message_send_failure.dart';

MessageSendFailure mapAppErrorToMessageSendFailure(Object error) {
  if (error is MessageSendFailure) return error;
  if (error is NetworkError) return MessageSendFailure.network(error.message);
  if (error is AuthError) return MessageSendFailure.auth(error.code);
  if (error is ServerError) {
    if (ErrorHandler.isDuplicateClientMsgId(error)) {
      return MessageSendFailure.duplicateClientMsgId(
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        requestId: error.requestId,
      );
    }
    return MessageSendFailure.serverRejected(
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      requestId: error.requestId,
    );
  }
  return MessageSendFailure.unknown(error);
}
