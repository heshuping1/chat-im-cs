import '../entities/scheduled_message.dart';

class ScheduledMessageInputPanelPolicy {
  static const dueRefreshGrace = Duration(seconds: 2);

  const ScheduledMessageInputPanelPolicy();

  ScheduledMessage? visibleTask(List<ScheduledMessage> messages) {
    final pending = messages.where((message) => message.canEdit).toList()
      ..sort((a, b) => a.scheduledAt.compareTo(b.scheduledAt));
    return pending.isEmpty ? null : pending.first;
  }

  bool shouldShowPanel({
    required ScheduledMessage? visibleTask,
    required bool loading,
  }) {
    return visibleTask != null;
  }

  Duration? refreshDelayForVisibleTask({
    required ScheduledMessage? visibleTask,
    required DateTime now,
  }) {
    if (visibleTask == null) return null;
    final dueWithGrace = visibleTask.scheduledAt.add(dueRefreshGrace);
    if (!dueWithGrace.isAfter(now)) return Duration.zero;
    return dueWithGrace.difference(now);
  }
}
