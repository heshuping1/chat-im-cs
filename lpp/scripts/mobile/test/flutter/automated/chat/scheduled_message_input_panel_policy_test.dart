import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/domain/entities/scheduled_message.dart';
import 'package:lpp_mobile/features/chat/domain/services/scheduled_message_input_panel_policy.dart';

void main() {
  test('input panel shows only the earliest pending scheduled message', () {
    const policy = ScheduledMessageInputPanelPolicy();
    final now = DateTime(2026, 7, 1, 12);

    final visible = policy.visibleTask([
      ScheduledMessage(
        scheduledMessageId: 'later',
        conversationId: 'conversation-1',
        isGroup: true,
        type: MessageType.text,
        body: const MessageBody(text: 'later'),
        scheduledAt: now.add(const Duration(hours: 2)),
      ),
      ScheduledMessage(
        scheduledMessageId: 'sent',
        conversationId: 'conversation-1',
        isGroup: true,
        type: MessageType.text,
        body: const MessageBody(text: 'sent'),
        scheduledAt: now.add(const Duration(minutes: 10)),
        status: ScheduledMessageStatus.sent.code,
      ),
      ScheduledMessage(
        scheduledMessageId: 'earliest',
        conversationId: 'conversation-1',
        isGroup: true,
        type: MessageType.text,
        body: const MessageBody(text: 'earliest'),
        scheduledAt: now.add(const Duration(minutes: 30)),
      ),
    ]);

    expect(visible?.scheduledMessageId, 'earliest');
  });

  test(
    'input panel does not reserve space while loading without visible task',
    () {
      const policy = ScheduledMessageInputPanelPolicy();

      expect(policy.shouldShowPanel(visibleTask: null, loading: true), isFalse);
      expect(
        policy.shouldShowPanel(visibleTask: null, loading: false),
        isFalse,
      );
    },
  );

  test('input panel stays visible while refreshing an existing task', () {
    const policy = ScheduledMessageInputPanelPolicy();
    final now = DateTime(2026, 7, 1, 12);
    final task = ScheduledMessage(
      scheduledMessageId: 'task',
      conversationId: 'conversation-1',
      isGroup: true,
      type: MessageType.text,
      body: const MessageBody(text: 'task'),
      scheduledAt: now.add(const Duration(minutes: 30)),
    );

    expect(policy.shouldShowPanel(visibleTask: task, loading: true), isTrue);
  });

  test('input panel refreshes shortly after the visible task due time', () {
    const policy = ScheduledMessageInputPanelPolicy();
    final now = DateTime(2026, 7, 1, 12);
    final task = ScheduledMessage(
      scheduledMessageId: 'task',
      conversationId: 'conversation-1',
      isGroup: true,
      type: MessageType.text,
      body: const MessageBody(text: 'task'),
      scheduledAt: now.add(const Duration(minutes: 2)),
    );

    expect(
      policy.refreshDelayForVisibleTask(visibleTask: task, now: now),
      const Duration(minutes: 2, seconds: 2),
    );
    expect(
      policy.refreshDelayForVisibleTask(
        visibleTask: task,
        now: now.add(const Duration(minutes: 3)),
      ),
      Duration.zero,
    );
    expect(
      policy.refreshDelayForVisibleTask(visibleTask: null, now: now),
      isNull,
    );
  });
}
