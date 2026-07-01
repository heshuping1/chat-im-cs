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

    test('updates scheduled message content and time by id', () async {
      final repository = _FakeChatRepository(const []);
      final controller = ScheduledMessagesController(repository);
      final scheduledAt = DateTime(2026, 6, 8, 19);

      await controller.updateText(
        scheduledMessageId: 'scheduled-1',
        text: '更新后的内容',
        scheduledAt: scheduledAt,
      );

      expect(repository.updatedIds, ['scheduled-1']);
      expect(repository.updatedBodies.single.text, '更新后的内容');
      expect(repository.updatedTimes, [scheduledAt]);
    });
  });

  group('ScheduledMessage status policy', () {
    test('only pending messages can be edited or canceled', () {
      expect(_scheduledMessage('pending').canEdit, isTrue);
      expect(_scheduledMessage('pending').canCancel, isTrue);
      expect(_scheduledMessage('sent', status: 1).canEdit, isFalse);
      expect(_scheduledMessage('canceled', status: 2).canCancel, isFalse);
      expect(_scheduledMessage('failed', status: 3).canEdit, isFalse);
      expect(_scheduledMessage('delivering', status: 4).canCancel, isFalse);
    });
  });
}

ScheduledMessage _scheduledMessage(String id, {int status = 0}) {
  return ScheduledMessage(
    scheduledMessageId: id,
    conversationId: 'conversation-1',
    isGroup: false,
    type: MessageType.text,
    body: const MessageBody(text: '稍后发送'),
    scheduledAt: DateTime(2026, 6, 8, 18),
    status: status,
  );
}

class _FakeChatRepository implements ChatRepository {
  final List<ScheduledMessage> messages;
  final loadedConversationIds = <String>[];
  final cancelledIds = <String>[];
  final updatedIds = <String>[];
  final updatedBodies = <MessageBody>[];
  final updatedTimes = <DateTime>[];

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
  Future<ScheduledMessage> updateScheduledMessage({
    required String scheduledMessageId,
    MessageBody? body,
    DateTime? scheduledAt,
  }) async {
    updatedIds.add(scheduledMessageId);
    if (body != null) updatedBodies.add(body);
    if (scheduledAt != null) updatedTimes.add(scheduledAt);
    return _scheduledMessage(
      scheduledMessageId,
      status: 0,
    );
  }

  @override
  Future<ConversationsPage> getConversations({String? cursor, int limit = 50}) {
    throw UnimplementedError();
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
