import 'message.dart';

/// A message scheduled to be sent by the server later.
class ScheduledMessage {
  final String scheduledMessageId;
  final String conversationId;
  final bool isGroup;
  final MessageType type;
  final MessageBody body;
  final DateTime scheduledAt;
  final int status;
  final String? failureReason;

  const ScheduledMessage({
    required this.scheduledMessageId,
    required this.conversationId,
    required this.isGroup,
    required this.type,
    required this.body,
    required this.scheduledAt,
    this.status = 0,
    this.failureReason,
  });

  bool get canEdit => status == ScheduledMessageStatus.pending.code;

  bool get canCancel => status == ScheduledMessageStatus.pending.code;
}

enum ScheduledMessageStatus {
  pending(0),
  sent(1),
  canceled(2),
  failed(3),
  delivering(4);

  final int code;

  const ScheduledMessageStatus(this.code);

  static ScheduledMessageStatus? fromCode(int code) {
    for (final status in ScheduledMessageStatus.values) {
      if (status.code == code) return status;
    }
    return null;
  }
}
