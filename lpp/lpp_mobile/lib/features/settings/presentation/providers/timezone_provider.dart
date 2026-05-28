import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/storage/secure_storage.dart';

const _kTimezoneKey = 'user_timezone_offset';

// 常用时区列表
const List<({String label, double offset})> kTimezones = [
  (label: 'UTC-12:00', offset: -12),
  (label: 'UTC-11:00', offset: -11),
  (label: 'UTC-10:00 夏威夷', offset: -10),
  (label: 'UTC-09:00 阿拉斯加', offset: -9),
  (label: 'UTC-08:00 太平洋时间', offset: -8),
  (label: 'UTC-07:00 山地时间', offset: -7),
  (label: 'UTC-06:00 中部时间', offset: -6),
  (label: 'UTC-05:00 东部时间', offset: -5),
  (label: 'UTC-04:00 大西洋时间', offset: -4),
  (label: 'UTC-03:00 巴西利亚', offset: -3),
  (label: 'UTC-02:00', offset: -2),
  (label: 'UTC-01:00 亚速尔群岛', offset: -1),
  (label: 'UTC+00:00 伦敦/都柏林', offset: 0),
  (label: 'UTC+01:00 柏林/巴黎/罗马', offset: 1),
  (label: 'UTC+02:00 开罗/赫尔辛基', offset: 2),
  (label: 'UTC+03:00 莫斯科/利雅得', offset: 3),
  (label: 'UTC+03:30 德黑兰', offset: 3.5),
  (label: 'UTC+04:00 迪拜/巴库', offset: 4),
  (label: 'UTC+04:30 喀布尔', offset: 4.5),
  (label: 'UTC+05:00 卡拉奇/塔什干', offset: 5),
  (label: 'UTC+05:30 孟买/新德里', offset: 5.5),
  (label: 'UTC+05:45 加德满都', offset: 5.75),
  (label: 'UTC+06:00 达卡/阿拉木图', offset: 6),
  (label: 'UTC+06:30 仰光', offset: 6.5),
  (label: 'UTC+07:00 曼谷/河内/雅加达', offset: 7),
  (label: 'UTC+08:00 北京/上海/香港/台北', offset: 8),
  (label: 'UTC+09:00 东京/首尔', offset: 9),
  (label: 'UTC+09:30 阿德莱德', offset: 9.5),
  (label: 'UTC+10:00 悉尼/墨尔本', offset: 10),
  (label: 'UTC+11:00 所罗门群岛', offset: 11),
  (label: 'UTC+12:00 奥克兰/斐济', offset: 12),
];

final timezoneOffsetProvider =
    StateNotifierProvider<TimezoneNotifier, double>((ref) {
  final storage = ref.watch(secureStorageProvider);
  return TimezoneNotifier(storage);
});

class TimezoneNotifier extends StateNotifier<double> {
  final SecureStorageService _storage;

  TimezoneNotifier(this._storage) : super(8.0) {
    _load();
  }

  Future<void> _load() async {
    final stored = await _storage.read(_kTimezoneKey);
    if (stored != null) {
      state = double.tryParse(stored) ?? 8.0;
    }
  }

  Future<void> setOffset(double offset) async {
    state = offset;
    await _storage.write(_kTimezoneKey, offset.toString());
  }
}

/// 将 DateTime 转换为用户时区
DateTime toUserTimezone(DateTime time, double offsetHours) {
  final minutes = (offsetHours * 60).round();
  return time.toUtc().add(Duration(minutes: minutes));
}

/// 格式化为 HH:mm（应用用户时区）
String formatTimeWithTimezone(DateTime time, double offsetHours) {
  final local = toUserTimezone(time, offsetHours);
  final h = local.hour.toString().padLeft(2, '0');
  final m = local.minute.toString().padLeft(2, '0');
  return '$h:$m';
}

/// 微信风格时间格式化（应用用户时区）
/// - 今天：HH:mm
/// - 昨天：昨天
/// - 本周：周X
/// - 更早：MM/dd
String formatChatTime(DateTime time, double offsetHours) {
  final local = toUserTimezone(time, offsetHours);
  final now = toUserTimezone(DateTime.now(), offsetHours);

  final todayStart = DateTime(now.year, now.month, now.day);
  final yesterdayStart = todayStart.subtract(const Duration(days: 1));
  final weekStart = todayStart.subtract(Duration(days: now.weekday - 1));

  if (!local.isBefore(todayStart)) {
    // 今天
    return '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
  } else if (!local.isBefore(yesterdayStart)) {
    return '昨天';
  } else if (!local.isBefore(weekStart)) {
    const weekdays = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    return weekdays[local.weekday];
  } else {
    return '${local.month.toString().padLeft(2, '0')}/${local.day.toString().padLeft(2, '0')}';
  }
}
