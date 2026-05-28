import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/data/mappers/group_member_payload_mapper.dart';

void main() {
  group('Group member payload mapper', () {
    test('extracts list from documented and wrapped payloads', () {
      expect(
          extractGroupMemberPayloadList([
            {'userId': 'u-1'},
          ]),
          hasLength(1));
      expect(
          extractGroupMemberPayloadList({
            'items': [
              {'userId': 'u-2'},
            ],
          }).single['userId'],
          'u-2');
      expect(
          extractGroupMemberPayloadList({
            'members': [
              {'userId': 'u-3'},
            ],
          }).single['userId'],
          'u-3');
    });

    test('parses nested user avatar, role and mute fields consistently', () {
      final parsed = parseGroupMemberPayload({
        'memberUserId': 'u-1',
        'memberRole': 'admin',
        'muteMode': 'muted',
        'mutedUntil': '2026-05-16T12:00:00Z',
        'user': {
          'displayName': 'Alice',
          'avatarUrl': 'https://example.com/alice.png',
        },
      });

      expect(parsed.userId, 'u-1');
      expect(parsed.displayName, 'Alice');
      expect(parsed.avatarUrl, 'https://example.com/alice.png');
      expect(parsed.role, 'admin');
      expect(parsed.isMuted, isTrue);
      expect(parsed.muteUntil, '2026-05-16T12:00:00Z');
    });
  });
}
