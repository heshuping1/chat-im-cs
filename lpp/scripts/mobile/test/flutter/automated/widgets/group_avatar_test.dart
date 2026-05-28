import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/widgets/group_avatar.dart';

void main() {
  group('GroupAvatar', () {
    testWidgets('renders local fallback initials for members without avatars',
        (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: GroupAvatar(
              memberAvatarUrls: [null, null, null],
              memberNames: ['Alice', 'Bob', 'Eve'],
            ),
          ),
        ),
      );

      expect(find.text('A'), findsOneWidget);
      expect(find.text('B'), findsOneWidget);
      expect(find.text('E'), findsOneWidget);
    });

    testWidgets('caps visible members at 9 like WeChat grid avatars',
        (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: GroupAvatar(
              memberAvatarUrls: List<String?>.filled(10, null),
              memberNames: const [
                'A',
                'B',
                'C',
                'D',
                'E',
                'F',
                'G',
                'H',
                'I',
                'J',
              ],
            ),
          ),
        ),
      );

      for (final label in const ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']) {
        expect(find.text(label), findsOneWidget);
      }
      expect(find.text('J'), findsNothing);
    });

    testWidgets('renders empty placeholder when no member preview exists',
        (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: GroupAvatar(
              memberAvatarUrls: [],
              memberNames: [],
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.group), findsOneWidget);
    });

    testWidgets('uses member names when avatar url list is shorter',
        (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: GroupAvatar(
              memberAvatarUrls: [null],
              memberNames: ['Alice', 'Bob'],
            ),
          ),
        ),
      );

      expect(find.text('A'), findsOneWidget);
      expect(find.text('B'), findsOneWidget);
    });
  });
}
