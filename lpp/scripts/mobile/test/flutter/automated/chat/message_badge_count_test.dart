import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';
import 'package:lpp_mobile/features/chat/domain/usecases/message_badge_count.dart';

void main() {
  group('message badge count', () {
    test('sums only conversations that show numeric unread bubbles', () {
      final conversations = const [
        Conversation(
          conversationId: 'direct',
          type: ConversationType.direct,
          title: '单聊',
          unreadCount: 27,
        ),
        Conversation(
          conversationId: 'group-red-dot',
          type: ConversationType.group,
          title: '群聊',
          unreadCount: 17,
        ),
        Conversation(
          conversationId: 'muted-direct',
          type: ConversationType.direct,
          title: '免打扰单聊',
          unreadCount: 8,
          isMuted: true,
        ),
        Conversation(
          conversationId: 'read',
          type: ConversationType.direct,
          title: '已读',
          unreadCount: 0,
        ),
      ];

      expect(calculateMessageBadgeCount(conversations), 27);
      expect(calculateNumericUnreadConversationCount(conversations), 1);
    });

    test('does not count negative unread values', () {
      expect(
        calculateMessageBadgeCount(const [
          Conversation(
            conversationId: 'negative',
            type: ConversationType.direct,
            title: '异常未读',
            unreadCount: -1,
          ),
        ]),
        0,
      );
    });
  });
}
