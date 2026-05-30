import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';
import 'package:lpp_mobile/features/space/presentation/providers/spaces_provider.dart';

void main() {
  group('space unread summary', () {
    test('counts only numeric unread bubble conversations', () {
      final summary = computeImUnreadSummaryForSpaceBadges(const [
        Conversation(
          conversationId: 'direct-1',
          type: ConversationType.direct,
          title: 'Alice',
          unreadCount: 2,
        ),
        Conversation(
          conversationId: 'group-1',
          type: ConversationType.group,
          title: '运营群',
          unreadCount: 3,
        ),
        Conversation(
          conversationId: 'muted-direct',
          type: ConversationType.direct,
          title: '免打扰单聊',
          unreadCount: 4,
          isMuted: true,
        ),
        Conversation(
          conversationId: 'temp-1',
          type: ConversationType.tempSession,
          title: '临时会话',
          unreadCount: 8,
        ),
        Conversation(
          conversationId: 'direct-read',
          type: ConversationType.direct,
          title: 'Bob',
          unreadCount: 0,
        ),
      ]);

      expect(summary.unreadConversationCount, 1);
      expect(summary.unreadMessageCount, 2);
    });

    test('normalizes negative unread counts to zero', () {
      final summary = computeImUnreadSummaryForSpaceBadges(const [
        Conversation(
          conversationId: 'direct-1',
          type: ConversationType.direct,
          title: 'Alice',
          unreadCount: -1,
        ),
      ]);

      expect(summary.unreadConversationCount, 0);
      expect(summary.unreadMessageCount, 0);
    });
  });
}
