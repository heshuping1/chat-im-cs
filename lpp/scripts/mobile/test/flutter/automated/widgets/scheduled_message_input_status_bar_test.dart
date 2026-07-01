import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/domain/entities/scheduled_message.dart';
import 'package:lpp_mobile/features/chat/presentation/models/scheduled_message_input_status.dart';
import 'package:lpp_mobile/features/chat/presentation/widgets/scheduled_message_input_status_bar.dart';

void main() {
  testWidgets('pending scheduled task uses the single compact input bar', (
    tester,
  ) async {
    var editCalls = 0;
    var cancelCalls = 0;

    await tester.pumpWidget(
      _wrap(
        ScheduledMessageInputStatusBar(
          status: ScheduledMessageInputStatus.pendingTask(
            _message(id: 'task-1', scheduledAt: _todayAt(23, 30)),
          ),
          onEditTask: (_) => editCalls++,
          onCancelTask: (_) => cancelCalls++,
          onClearLocalDraft: () {},
          onCancelEditing: () {},
        ),
      ),
    );

    expect(find.text('定时消息将于今天 23:30 发送'), findsOneWidget);
    expect(find.text('编辑'), findsOneWidget);
    expect(find.byIcon(Icons.close_rounded), findsOneWidget);
    expect(find.textContaining('发送时间：'), findsNothing);

    await tester.tap(find.text('编辑'));
    await tester.pump();
    await tester.tap(find.byIcon(Icons.close_rounded));
    await tester.pump();

    expect(editCalls, 1);
    expect(cancelCalls, 1);
  });

  testWidgets('editing scheduled task shows cancel instead of delete', (
    tester,
  ) async {
    var cancelEditingCalls = 0;

    await tester.pumpWidget(
      _wrap(
        ScheduledMessageInputStatusBar(
          status: ScheduledMessageInputStatus.editingTask(
            _message(id: 'task-1', scheduledAt: _todayAt(23, 30)),
          ),
          onEditTask: (_) {},
          onCancelTask: (_) {},
          onClearLocalDraft: () {},
          onCancelEditing: () => cancelEditingCalls++,
        ),
      ),
    );

    expect(find.text('正在编辑定时消息 · 今天 23:30'), findsOneWidget);
    expect(find.text('取消'), findsOneWidget);
    expect(find.byIcon(Icons.close_rounded), findsNothing);

    await tester.tap(find.text('取消'));
    await tester.pump();

    expect(cancelEditingCalls, 1);
  });

  testWidgets('local draft scheduled time can be cleared without task actions', (
    tester,
  ) async {
    var clearCalls = 0;
    var cancelCalls = 0;

    await tester.pumpWidget(
      _wrap(
        ScheduledMessageInputStatusBar(
          status: ScheduledMessageInputStatus.localDraft(
            _todayAt(23, 30),
          ),
          onEditTask: (_) {},
          onCancelTask: (_) => cancelCalls++,
          onClearLocalDraft: () => clearCalls++,
          onCancelEditing: () {},
        ),
      ),
    );

    expect(find.text('将定时发送 · 今天 23:30'), findsOneWidget);
    expect(find.text('编辑'), findsNothing);
    expect(find.byIcon(Icons.close_rounded), findsOneWidget);

    await tester.tap(find.byIcon(Icons.close_rounded));
    await tester.pump();

    expect(clearCalls, 1);
    expect(cancelCalls, 0);
  });

  testWidgets('none status reserves no input area space', (tester) async {
    await tester.pumpWidget(
      _wrap(
        ScheduledMessageInputStatusBar(
          status: const ScheduledMessageInputStatus.none(),
          onEditTask: (_) {},
          onCancelTask: (_) {},
          onClearLocalDraft: () {},
          onCancelEditing: () {},
        ),
      ),
    );

    expect(find.byType(ScheduledMessageInputStatusBar), findsOneWidget);
    expect(find.textContaining('定时'), findsNothing);
    expect(find.byIcon(Icons.schedule_outlined), findsNothing);
  });
}

ScheduledMessage _message({
  required String id,
  required DateTime scheduledAt,
}) {
  return ScheduledMessage(
    scheduledMessageId: id,
    conversationId: 'chat-1',
    isGroup: false,
    type: MessageType.text,
    body: const MessageBody(text: 'hidden content'),
    scheduledAt: scheduledAt,
  );
}

DateTime _todayAt(int hour, int minute) {
  final now = DateTime.now();
  return DateTime(now.year, now.month, now.day, hour, minute);
}

Widget _wrap(Widget child) {
  return MaterialApp(
    locale: const Locale('zh'),
    home: Scaffold(body: Center(child: child)),
  );
}
