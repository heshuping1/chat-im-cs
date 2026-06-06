import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/time/user_timezone_formatter.dart';

void main() {
  group('UserTimezoneFormatter', () {
    final formatter = UserTimezoneFormatter(
      now: () => DateTime.utc(2026, 6, 6, 12, 30),
    );

    test('formats clock time in selected user timezone', () {
      final time = DateTime.utc(2026, 6, 6, 0, 15);

      expect(formatter.clock(time, offsetHours: 8), '08:15');
      expect(formatter.clock(time, offsetHours: -5), '19:15');
    });

    test('uses selected timezone for chat relative day labels', () {
      final time = DateTime.utc(2026, 6, 5, 18, 20);

      expect(formatter.chatList(time, offsetHours: 8), '02:20');
      expect(formatter.chatList(time, offsetHours: -5), '昨天');
    });

    test('formats full timestamps across timezone date boundaries', () {
      final time = DateTime.utc(2026, 6, 5, 18, 20);

      expect(formatter.fullMinute(time, offsetHours: 8), '2026-06-06 02:20');
      expect(formatter.fullMinute(time, offsetHours: -5), '2026-06-05 13:20');
    });

    test('matches selected calendar date in user timezone', () {
      final time = DateTime.utc(2026, 6, 5, 18, 20);
      final selectedDate = DateTime(2026, 6, 6);

      expect(
        formatter.isOnCalendarDate(time, selectedDate, offsetHours: 8),
        isTrue,
      );
      expect(
        formatter.isOnCalendarDate(time, selectedDate, offsetHours: -5),
        isFalse,
      );
    });
  });
}
