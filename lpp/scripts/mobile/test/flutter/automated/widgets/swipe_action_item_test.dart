import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';
import 'package:lpp_mobile/features/chat/presentation/widgets/swipe_action_item.dart';

void main() {
  testWidgets('swipe actions reflect unread, pinned and muted state',
      (tester) async {
    await tester.pumpWidget(_wrap(_item(
      const Conversation(
        conversationId: 'c-1',
        type: ConversationType.direct,
        title: 'Alice',
        unreadCount: 3,
        isPinned: true,
        isMuted: true,
      ),
    )));

    await tester.drag(find.text('Alice'), const Offset(-260, 0));
    await tester.pumpAndSettle();

    expect(find.text('标已读'), findsOneWidget);
    expect(find.text('取消置顶'), findsOneWidget);
    expect(find.text('提醒'), findsOneWidget);
    expect(find.text('删除'), findsOneWidget);
  });

  testWidgets('swipe actions reflect read, unpinned and notification-on state',
      (tester) async {
    await tester.pumpWidget(_wrap(_item(
      const Conversation(
        conversationId: 'c-2',
        type: ConversationType.group,
        title: '群聊',
        unreadCount: 0,
        isPinned: false,
        isMuted: false,
      ),
    )));

    await tester.drag(find.text('群聊'), const Offset(-260, 0));
    await tester.pumpAndSettle();

    expect(find.text('标未读'), findsOneWidget);
    expect(find.text('置顶'), findsOneWidget);
    expect(find.text('免打扰'), findsOneWidget);
    expect(find.text('删除'), findsOneWidget);
  });

  testWidgets('swipe action callbacks receive next desired states',
      (tester) async {
    bool? markAsRead;
    bool? nextPinned;
    bool? nextMuted;
    var deleted = false;

    await tester.pumpWidget(_wrap(SwipeActionItem(
      conversation: const Conversation(
        conversationId: 'c-3',
        type: ConversationType.direct,
        title: 'Bob',
        unreadCount: 2,
        isPinned: false,
        isMuted: false,
      ),
      spaceId: 'tenant',
      onDelete: () async => deleted = true,
      onTogglePin: (value) async => nextPinned = value,
      onToggleMute: (value) async => nextMuted = value,
      onToggleRead: (value) async => markAsRead = value,
      child: Container(
        height: 80,
        alignment: Alignment.centerLeft,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: const Text('Bob'),
      ),
    )));

    await tester.drag(find.text('Bob'), const Offset(-260, 0));
    await tester.pumpAndSettle();
    await tester.tap(find.text('标已读'));
    await tester.pumpAndSettle();
    expect(markAsRead, isTrue);

    await tester.drag(find.text('Bob'), const Offset(-260, 0));
    await tester.pumpAndSettle();
    await tester.tap(find.text('置顶'));
    await tester.pumpAndSettle();
    expect(nextPinned, isTrue);

    await tester.drag(find.text('Bob'), const Offset(-260, 0));
    await tester.pumpAndSettle();
    await tester.tap(find.text('免打扰'));
    await tester.pumpAndSettle();
    expect(nextMuted, isTrue);

    await tester.drag(find.text('Bob'), const Offset(-260, 0));
    await tester.pumpAndSettle();
    await tester.tap(find.text('删除'));
    await tester.pumpAndSettle();
    expect(deleted, isTrue);
  });
}

Widget _wrap(Widget child) {
  return MaterialApp(
    home: Scaffold(
      body: SizedBox(width: 360, height: 96, child: child),
    ),
  );
}

Widget _item(Conversation conversation) {
  return SwipeActionItem(
    conversation: conversation,
    spaceId: 'tenant',
    onDelete: () async {},
    onTogglePin: (_) async {},
    onToggleMute: (_) async {},
    onToggleRead: (_) async {},
    child: Container(
      height: 80,
      alignment: Alignment.centerLeft,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Text(conversation.title),
    ),
  );
}
