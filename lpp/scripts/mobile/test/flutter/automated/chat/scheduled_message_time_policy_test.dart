import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/domain/services/scheduled_message_time_policy.dart';

void main() {
  group('ScheduledMessageTimePolicy', () {
    const policy = ScheduledMessageTimePolicy();

    test('defaults to today 23:30 when now is 23:14', () {
      final now = DateTime(2026, 7, 1, 23, 14, 12);

      expect(policy.defaultScheduledAt(now), DateTime(2026, 7, 1, 23, 30));
    });

    test('allows exactly one minute later', () {
      final now = DateTime(2026, 7, 1, 23, 29);

      expect(policy.canScheduleAt(DateTime(2026, 7, 1, 23, 30), now), isTrue);
    });

    test(
      'rolls default time to tomorrow when today has no valid half-hour',
      () {
        final now = DateTime(2026, 7, 1, 23, 29, 30);

        expect(policy.defaultScheduledAt(now), DateTime(2026, 7, 2));
      },
    );
  });
}
