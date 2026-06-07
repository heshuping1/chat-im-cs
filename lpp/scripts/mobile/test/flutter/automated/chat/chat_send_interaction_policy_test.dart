import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/presentation/models/chat_send_interaction_policy.dart';

void main() {
  group('chat send interaction policy', () {
    test(
      'does not block streamable sends while another message is uploading',
      () {
        for (final action in const [
          ChatSendAction.text,
          ChatSendAction.media,
          ChatSendAction.file,
          ChatSendAction.voice,
          ChatSendAction.contactCard,
        ]) {
          expect(
            shouldBlockChatSendAction(action, isSingleActionRunning: true),
            isFalse,
            reason: '$action should behave like WeChat and enqueue immediately',
          );
        }
      },
    );

    test(
      'keeps state sensitive single actions guarded against repeat taps',
      () {
        for (final action in const [
          ChatSendAction.location,
          ChatSendAction.retryFailed,
        ]) {
          expect(
            shouldBlockChatSendAction(action, isSingleActionRunning: true),
            isTrue,
          );
        }
      },
    );
  });
}
