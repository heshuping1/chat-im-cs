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
}
