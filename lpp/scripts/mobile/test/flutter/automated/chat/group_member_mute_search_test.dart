import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/group_member_mute_page.dart';
import 'package:lpp_mobile/features/chat/presentation/pages/group_settings_page.dart';

void main() {
  group('filterGroupMuteCandidates', () {
    const members = [
      GroupMember(
        userId: 'owner-1',
        displayName: 'Owner',
        role: GroupRole.superAdmin,
      ),
      GroupMember(
        userId: 'admin-1',
        displayName: 'Admin',
        role: GroupRole.admin,
      ),
      GroupMember(
        userId: 'customer-a',
        displayName: '测试客户A',
        role: GroupRole.member,
      ),
      GroupMember(
        userId: 'tech-1',
        displayName: 'LPP技术支持',
        role: GroupRole.member,
        isMuted: true,
        muteReason: '刷屏',
      ),
      GroupMember(userId: '', displayName: '无效用户', role: GroupRole.member),
    ];

    test('keeps only valid ordinary members when query is empty', () {
      final result = filterGroupMuteCandidates(members, '');

      expect(result.map((m) => m.userId), ['customer-a', 'tech-1']);
    });

    test('matches display name, user id, and mute reason', () {
      expect(filterGroupMuteCandidates(members, '客户').map((m) => m.userId), [
        'customer-a',
      ]);
      expect(filterGroupMuteCandidates(members, 'TECH').map((m) => m.userId), [
        'tech-1',
      ]);
      expect(filterGroupMuteCandidates(members, '刷屏').map((m) => m.userId), [
        'tech-1',
      ]);
    });
  });
}
