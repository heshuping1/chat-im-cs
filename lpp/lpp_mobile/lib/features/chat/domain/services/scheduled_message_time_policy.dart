class ScheduledMessageTimePolicy {
  static const minLeadTime = Duration(minutes: 1);
  static const maxLeadTime = Duration(days: 14);

  const ScheduledMessageTimePolicy();

  DateTime defaultScheduledAt(DateTime now) {
    final earliest = now.add(minLeadTime);
    final hourStart = DateTime(
      earliest.year,
      earliest.month,
      earliest.day,
      earliest.hour,
    );
    final halfHour = hourStart.add(const Duration(minutes: 30));
    if (!hourStart.isBefore(earliest)) return hourStart;
    if (!halfHour.isBefore(earliest)) return halfHour;
    return hourStart.add(const Duration(hours: 1));
  }

  bool canScheduleAt(DateTime scheduledAt, DateTime now) {
    return !isBeforeMinLeadTime(scheduledAt, now) &&
        !exceedsMaxLeadTime(scheduledAt, now);
  }

  bool isBeforeMinLeadTime(DateTime scheduledAt, DateTime now) {
    return scheduledAt.isBefore(now.add(minLeadTime));
  }

  bool exceedsMaxLeadTime(DateTime scheduledAt, DateTime now) {
    return scheduledAt.isAfter(now.add(maxLeadTime));
  }
}
