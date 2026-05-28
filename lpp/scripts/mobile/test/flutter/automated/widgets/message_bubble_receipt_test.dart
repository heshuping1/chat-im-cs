import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/presentation/widgets/message_bubble.dart';
import 'package:lpp_mobile/l10n/app_localizations.dart';

void main() {
  testWidgets('direct self messages use one tick before peer reads', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        MessageBubble(
          message: _message(status: MessageStatus.sent),
          isSelf: true,
          showTimestamp: false,
        ),
      ),
    );

    expect(find.byIcon(Icons.done), findsOneWidget);
    expect(find.byIcon(Icons.done_all), findsNothing);
  });

  testWidgets('direct self messages use two ticks after peer reads', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        MessageBubble(
          message: _message(isReadByPeer: true),
          isSelf: true,
          showTimestamp: false,
        ),
      ),
    );

    expect(find.byIcon(Icons.done), findsNothing);
    expect(find.byIcon(Icons.done_all), findsOneWidget);
  });

  testWidgets('group self messages do not show read receipt ticks', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        MessageBubble(
          message: _message(isReadByPeer: true, readCount: 3),
          isSelf: true,
          groupId: 'group-1',
          showTimestamp: false,
        ),
      ),
    );

    expect(find.byIcon(Icons.done), findsNothing);
    expect(find.byIcon(Icons.done_all), findsNothing);
    expect(find.textContaining('已读'), findsNothing);
    expect(find.textContaining('未读'), findsNothing);
  });
}

Widget _wrap(Widget child) {
  return ProviderScope(
    child: MaterialApp(
      locale: const Locale('zh'),
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: Scaffold(body: Center(child: child)),
    ),
  );
}

Message _message({
  MessageStatus status = MessageStatus.sent,
  bool isReadByPeer = false,
  int readCount = 0,
}) {
  return Message(
    messageId: 'msg-1',
    conversationId: 'chat-1',
    conversationSeq: 1,
    senderUserId: 'me',
    type: MessageType.text,
    body: const MessageBody(text: 'hello'),
    sentAt: DateTime.utc(2026, 5, 26, 8),
    status: status,
    isReadByPeer: isReadByPeer,
    readCount: readCount,
  );
}
