import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/domain/services/message_notification_policy.dart';

void main() {
  group('message notification policy', () {
    test('suppresses system notifications for the visible conversation', () {
      expect(
        shouldShowSystemMessageNotification(
          visibility: ChatAppVisibility.foreground,
          incomingConversationId: 'chat-1',
          activeConversationId: 'chat-1',
          isMuted: false,
          isSelf: false,
        ),
        isFalse,
      );
    });

    test('suppresses system notifications while the app is foregrounded', () {
      expect(
        shouldShowSystemMessageNotification(
          visibility: ChatAppVisibility.foreground,
          incomingConversationId: 'chat-2',
          activeConversationId: 'chat-1',
          isMuted: false,
          isSelf: false,
        ),
        isFalse,
      );
    });

    test('allows background system notifications for unread peer messages', () {
      expect(
        shouldShowSystemMessageNotification(
          visibility: ChatAppVisibility.background,
          incomingConversationId: 'chat-2',
          activeConversationId: 'chat-1',
          isMuted: false,
          isSelf: false,
        ),
        isTrue,
      );
    });

    test(
      'allows background notifications for the last visible conversation',
      () {
        expect(
          shouldShowSystemMessageNotification(
            visibility: ChatAppVisibility.background,
            incomingConversationId: 'chat-1',
            activeConversationId: 'chat-1',
            isMuted: false,
            isSelf: false,
          ),
          isTrue,
        );
      },
    );

    test('suppresses muted or self messages', () {
      expect(
        shouldShowSystemMessageNotification(
          visibility: ChatAppVisibility.background,
          incomingConversationId: 'chat-2',
          activeConversationId: null,
          isMuted: true,
          isSelf: false,
        ),
        isFalse,
      );
      expect(
        shouldShowSystemMessageNotification(
          visibility: ChatAppVisibility.background,
          incomingConversationId: 'chat-2',
          activeConversationId: null,
          isMuted: false,
          isSelf: true,
        ),
        isFalse,
      );
    });
  });
}
