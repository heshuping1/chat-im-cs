import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/presentation/models/chat_call_launch_model.dart';

void main() {
  group('chat call launch model', () {
    test('uses existing conversation id for established direct chat', () async {
      var called = false;

      final chatId = await resolveCallLogChatId(
        activeConversationId: 'chat-existing',
        ensureDirectConversationId: () async {
          called = true;
          return 'chat-created';
        },
        isPendingDirectChat: false,
      );

      expect(chatId, 'chat-existing');
      expect(called, isFalse);
    });

    test('resolves pending direct chat before launching call', () async {
      final chatId = await resolveCallLogChatId(
        activeConversationId: 'pending_direct_peer-1',
        ensureDirectConversationId: () async => 'chat-created',
        isPendingDirectChat: true,
      );

      expect(chatId, 'chat-created');
    });
  });
}
