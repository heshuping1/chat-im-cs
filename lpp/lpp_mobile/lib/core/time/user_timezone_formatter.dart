import 'package:intl/intl.dart';

typedef NowProvider = DateTime Function();

class UserTimezoneFormatter {
  final NowProvider _now;

  const UserTimezoneFormatter({NowProvider? now}) : _now = now ?? DateTime.now;

  DateTime convert(DateTime time, {required double offsetHours}) {
    final minutes = (offsetHours * 60).round();
    return time.toUtc().add(Duration(minutes: minutes));
  }

  String clock(DateTime time, {required double offsetHours}) {
    final local = convert(time, offsetHours: offsetHours);
    return '${_two(local.hour)}:${_two(local.minute)}';
  }

  String date(DateTime time, {required double offsetHours}) {
    final local = convert(time, offsetHours: offsetHours);
    return '${local.year}-${_two(local.month)}-${_two(local.day)}';
  }

  String fullMinute(DateTime time, {required double offsetHours}) {
    final local = convert(time, offsetHours: offsetHours);
    return '${local.year}-${_two(local.month)}-${_two(local.day)} '
        '${_two(local.hour)}:${_two(local.minute)}';
  }

  String chineseFullMinute(DateTime time, {required double offsetHours}) {
    final local = convert(time, offsetHours: offsetHours);
    return '${local.year}年${_two(local.month)}月${_two(local.day)}日 '
        '${_two(local.hour)}:${_two(local.minute)}';
  }

  String monthDayMinute(DateTime time, {required double offsetHours}) {
    final local = convert(time, offsetHours: offsetHours);
    return '${_two(local.month)}-${_two(local.day)} '
        '${_two(local.hour)}:${_two(local.minute)}';
  }

  String chatList(DateTime time, {required double offsetHours}) {
    final local = convert(time, offsetHours: offsetHours);
    final now = convert(_now(), offsetHours: offsetHours);
    final todayStart = DateTime(now.year, now.month, now.day);
    final yesterdayStart = todayStart.subtract(const Duration(days: 1));
    final weekStart = todayStart.subtract(Duration(days: now.weekday - 1));

    if (!local.isBefore(todayStart)) {
      return '${_two(local.hour)}:${_two(local.minute)}';
    }
    if (!local.isBefore(yesterdayStart)) return '昨天';
    if (!local.isBefore(weekStart)) return _weekday(local);
    return '${_two(local.month)}/${_two(local.day)}';
  }

  String chatSeparator(DateTime time, {required double offsetHours}) {
    final local = convert(time, offsetHours: offsetHours);
    final now = convert(_now(), offsetHours: offsetHours);
    final todayStart = DateTime(now.year, now.month, now.day);
    final yesterdayStart = todayStart.subtract(const Duration(days: 1));
    final weekStart = todayStart.subtract(Duration(days: now.weekday - 1));
    final clockText = '${_two(local.hour)}:${_two(local.minute)}';

    if (!local.isBefore(todayStart)) return clockText;
    if (!local.isBefore(yesterdayStart)) return '昨天 $clockText';
    if (!local.isBefore(weekStart)) return '${_weekday(local)} $clockText';
    if (local.year == now.year) {
      return '${local.month}月${local.day}日 $clockText';
    }
    return '${local.year}年${local.month}月${local.day}日 $clockText';
  }

  bool isSameDate(
    DateTime left,
    DateTime right, {
    required double offsetHours,
  }) {
    final a = convert(left, offsetHours: offsetHours);
    final b = convert(right, offsetHours: offsetHours);
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  bool isOnCalendarDate(
    DateTime instant,
    DateTime calendarDate, {
    required double offsetHours,
  }) {
    final local = convert(instant, offsetHours: offsetHours);
    return local.year == calendarDate.year &&
        local.month == calendarDate.month &&
        local.day == calendarDate.day;
  }

  String searchResult(DateTime time, {required double offsetHours}) {
    final local = convert(time, offsetHours: offsetHours);
    final now = convert(_now(), offsetHours: offsetHours);
    final todayStart = DateTime(now.year, now.month, now.day);
    final yesterdayStart = todayStart.subtract(const Duration(days: 1));
    final weekStart = todayStart.subtract(Duration(days: now.weekday - 1));

    if (!local.isBefore(todayStart)) {
      return '${_two(local.hour)}:${_two(local.minute)}';
    }
    if (!local.isBefore(yesterdayStart)) return '昨天';
    if (!local.isBefore(weekStart)) {
      return DateFormat('E', 'zh_CN').format(local);
    }
    return '${_two(local.month)}/${_two(local.day)}';
  }

  static String _two(int value) => value.toString().padLeft(2, '0');

  static String _weekday(DateTime time) {
    const weekdays = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    return weekdays[time.weekday];
  }
}

DateTime toUserTimezone(DateTime time, double offsetHours) {
  return const UserTimezoneFormatter().convert(time, offsetHours: offsetHours);
}

String formatTimeWithTimezone(DateTime time, double offsetHours) {
  return const UserTimezoneFormatter().clock(time, offsetHours: offsetHours);
}

String formatChatTime(DateTime time, double offsetHours) {
  return const UserTimezoneFormatter().chatList(time, offsetHours: offsetHours);
}

String formatChatSeparatorTime(DateTime time, double offsetHours) {
  return const UserTimezoneFormatter()
      .chatSeparator(time, offsetHours: offsetHours);
}

String formatFullMinuteWithTimezone(DateTime time, double offsetHours) {
  return const UserTimezoneFormatter()
      .fullMinute(time, offsetHours: offsetHours);
}

String formatChineseFullMinuteWithTimezone(DateTime time, double offsetHours) {
  return const UserTimezoneFormatter()
      .chineseFullMinute(time, offsetHours: offsetHours);
}

String formatDateWithTimezone(DateTime time, double offsetHours) {
  return const UserTimezoneFormatter().date(time, offsetHours: offsetHours);
}

String formatMonthDayMinuteWithTimezone(DateTime time, double offsetHours) {
  return const UserTimezoneFormatter()
      .monthDayMinute(time, offsetHours: offsetHours);
}
