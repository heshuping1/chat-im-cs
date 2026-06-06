import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';
import 'package:lpp_mobile/features/chat/domain/usecases/message_badge_count.dart';

void main() {
  group('message badge count', () {
    test('sums unmuted direct and group conversations with numeric badges', () {
      final conversations = const [
        Conversation(
          conversationId: 'direct',
          type: ConversationType.direct,
          title: '单聊',
          unreadCount: 27,
        ),
        Conversation(
          conversationId: 'group',
          type: ConversationType.group,
          title: '群聊',
          unreadCount: 17,
        ),
        Conversation(
          conversationId: 'muted-group',
          type: ConversationType.group,
          title: '免打扰群聊',
          unreadCount: 9,
          isMuted: true,
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

      expect(calculateMessageBadgeCount(conversations), 44);
      expect(calculateNumericUnreadConversationCount(conversations), 2);
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
