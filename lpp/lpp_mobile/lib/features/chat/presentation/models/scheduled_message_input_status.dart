import 'package:lpp_mobile/features/chat/domain/entities/scheduled_message.dart';

enum ScheduledMessageInputStatusKind {
  none,
  localDraft,
  pendingTask,
  editingTask,
}

class ScheduledMessageInputStatus {
  final ScheduledMessageInputStatusKind kind;
  final ScheduledMessage? message;
  final DateTime? scheduledAt;
  final bool canceling;

  const ScheduledMessageInputStatus._({
    required this.kind,
    this.message,
    this.scheduledAt,
    this.canceling = false,
  });

  const ScheduledMessageInputStatus.none()
      : this._(kind: ScheduledMessageInputStatusKind.none);

  const ScheduledMessageInputStatus.localDraft(DateTime scheduledAt)
      : this._(
          kind: ScheduledMessageInputStatusKind.localDraft,
          scheduledAt: scheduledAt,
        );

  factory ScheduledMessageInputStatus.pendingTask(
    ScheduledMessage message, {
    bool canceling = false,
  }) {
    return _PendingScheduledMessageInputStatus(
      message,
      canceling: canceling,
    );
  }

  factory ScheduledMessageInputStatus.editingTask(ScheduledMessage message) {
    return _EditingScheduledMessageInputStatus(message);
  }

  bool get isVisible => kind != ScheduledMessageInputStatusKind.none;
}

class _PendingScheduledMessageInputStatus extends ScheduledMessageInputStatus {
  _PendingScheduledMessageInputStatus(
    ScheduledMessage message, {
    super.canceling = false,
  }) : super._(
          kind: ScheduledMessageInputStatusKind.pendingTask,
          message: message,
          scheduledAt: message.scheduledAt,
        );
}

class _EditingScheduledMessageInputStatus extends ScheduledMessageInputStatus {
  _EditingScheduledMessageInputStatus(ScheduledMessage message)
      : super._(
          kind: ScheduledMessageInputStatusKind.editingTask,
          message: message,
          scheduledAt: message.scheduledAt,
        );
}
