import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation_page.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/domain/entities/scheduled_message.dart';
import 'package:lpp_mobile/features/chat/domain/repositories/chat_repository.dart';
import 'package:lpp_mobile/features/chat/presentation/controllers/scheduled_messages_controller.dart';

void main() {
  group('ScheduledMessagesController', () {
    test('loads scheduled messages by conversation id', () async {
      final repository = _FakeChatRepository([
        _scheduledMessage('scheduled-1'),
      ]);
      final controller = ScheduledMessagesController(repository);

      final items = await controller.load('conversation-1');

      expect(items.single.scheduledMessageId, 'scheduled-1');
      expect(repository.loadedConversationIds, ['conversation-1']);
    });

    test('cancels scheduled message by id', () async {
      final repository = _FakeChatRepository(const []);
      final controller = ScheduledMessagesController(repository);

      await controller.cancel('scheduled-1');

      expect(repository.cancelledIds, ['scheduled-1']);
    });
  });
}

ScheduledMessage _scheduledMessage(String id) {
  return ScheduledMessage(
    scheduledMessageId: id,
    conversationId: 'conversation-1',
    isGroup: false,
    type: MessageType.text,
    body: const MessageBody(text: '稍后发送'),
    scheduledAt: DateTime(2026, 6, 8, 18),
  );
}

class _FakeChatRepository implements ChatRepository {
  final List<ScheduledMessage> messages;
  final loadedConversationIds = <String>[];
  final cancelledIds = <String>[];

  _FakeChatRepository(this.messages);

  @override
  Future<List<ScheduledMessage>> getScheduledMessages(
    String conversationId,
  ) async {
    loadedConversationIds.add(conversationId);
    return messages;
  }

  @override
  Future<void> cancelScheduledMessage(String scheduledMessageId) async {
    cancelledIds.add(scheduledMessageId);
  }

  @override
  Future<ConversationsPage> getConversations({String? cursor, int limit = 50}) {
    throw UnimplementedError();
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
