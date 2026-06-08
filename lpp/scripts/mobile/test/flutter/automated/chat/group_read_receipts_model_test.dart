import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/data/mappers/group_read_receipts_mapper.dart';

void main() {
  group('group read receipts mapper', () {
    test('parses contract dto with lastReadSeq against message seq', () {
      final receipts = parseGroupReadReceiptsPayload(
        {
          'members': [
            {
              'userId': 'u-1',
              'displayName': 'Alice',
              'avatarUrl': 'https://cdn.example.com/a.png',
              'lastReadSeq': 8,
            },
            {
              'userId': 'u-2',
              'displayName': 'Bob',
              'lastReadSeq': 2,
            },
          ],
          'totalMembers': 2,
          'readCount': 1,
          'unreadCount': 1,
        },
        messageSeq: 5,
      );

      expect(receipts.totalMembers, 2);
      expect(receipts.readCount, 1);
      expect(receipts.unreadCount, 1);
      expect(receipts.readMembers.map((m) => m.userId), ['u-1']);
      expect(receipts.unreadMembers.map((m) => m.userId), ['u-2']);
    });

    test('keeps old hasRead list response compatible', () {
      final receipts = parseGroupReadReceiptsPayload(
        [
          {
            'userId': 'u-1',
            'displayName': 'Alice',
            'avatarUrl': 'https://cdn.example.com/a.png',
            'hasRead': true,
          },
          {
            'userId': 'u-2',
            'displayName': '',
            'hasRead': false,
          },
        ],
        messageSeq: 5,
      );

      expect(receipts.totalMembers, 2);
      expect(receipts.readCount, 1);
      expect(receipts.unreadCount, 1);
      expect(receipts.readMembers.single.displayName, 'Alice');
      expect(receipts.unreadMembers.single.displayName, '用户');
    });
  });
}
