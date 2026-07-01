import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/domain/entities/scheduled_message.dart';
import 'package:lpp_mobile/features/chat/domain/repositories/chat_repository.dart';
import 'package:lpp_mobile/features/chat/presentation/providers/chat_provider.dart';

final scheduledMessagesControllerProvider =
    Provider.family<ScheduledMessagesController, String>((ref, spaceId) {
  return ScheduledMessagesController(
    ref.watch(scheduledMessageRepositoryProvider(spaceId)),
  );
});

class ScheduledMessagesController {
  final ChatRepository _repository;

  const ScheduledMessagesController(this._repository);

  Future<List<ScheduledMessage>> load(String conversationId) {
    return _repository.getScheduledMessages(conversationId);
  }

  Future<void> cancel(String scheduledMessageId) {
    return _repository.cancelScheduledMessage(scheduledMessageId);
  }

  Future<ScheduledMessage> updateText({
    required String scheduledMessageId,
    required String text,
    required DateTime scheduledAt,
  }) {
    return _repository.updateScheduledMessage(
      scheduledMessageId: scheduledMessageId,
      body: MessageBody(text: text.trim()),
      scheduledAt: scheduledAt,
    );
  }
}
