import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/group_settings_page.dart';

void main() {
  group('Group detail fallback', () {
    test(
      'uses conversation snapshot when remote group detail is unavailable',
      () {
        const conversation = Conversation(
          conversationId: '019e4ac4-38b9-7dda-ad66-696a155551df',
          type: ConversationType.group,
          title: 'VIP群',
          memberCount: 6,
          ownerUserId: 'owner-1',
          isPinned: true,
          isMuted: true,
        );

        final detail = GroupDetail.fromConversationSnapshot(
          conversation,
          currentUserId: 'owner-1',
        );

        expect(detail.groupId, conversation.conversationId);
        expect(detail.title, 'VIP群');
        expect(detail.memberCount, 6);
        expect(detail.ownerUserId, 'owner-1');
        expect(detail.myRole, GroupRole.superAdmin);
        expect(detail.isPinned, isTrue);
        expect(detail.isMuted, isTrue);
      },
    );

    test(
      'refreshes members when detail count is newer than loaded member list',
      () {
        expect(
          shouldRefreshGroupMembers(
            canViewMembers: true,
            isLoading: false,
            detailMemberCount: 3,
            loadedMemberCount: 2,
          ),
          isTrue,
        );
        expect(
          shouldRefreshGroupMembers(
            canViewMembers: true,
            isLoading: false,
            detailMemberCount: 3,
            loadedMemberCount: 3,
          ),
          isFalse,
        );
        expect(
          shouldRefreshGroupMembers(
            canViewMembers: false,
            isLoading: false,
            detailMemberCount: 3,
            loadedMemberCount: 2,
          ),
          isFalse,
        );
      },
    );
  });
}
