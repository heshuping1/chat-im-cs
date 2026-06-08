import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';
import 'package:lpp_mobile/features/chat/presentation/controllers/conversation_actions_controller.dart';
import 'package:lpp_mobile/features/chat/domain/usecases/filter_conversations.dart';
import 'package:lpp_mobile/features/chat/domain/usecases/sort_conversations.dart';

void main() {
  group('sortConversations', () {
    test(
      'keeps pinned conversations first and sorts by last activity desc',
      () {
        final older = _conversation(
          'older',
          title: '旧会话',
          lastActivityAt: DateTime(2026, 5, 15, 8),
        );
        final pinnedOld = _conversation(
          'pinned-old',
          title: '置顶旧会话',
          isPinned: true,
          lastActivityAt: DateTime(2026, 5, 15, 7),
        );
        final newest = _conversation(
          'newest',
          title: '最新会话',
          lastActivityAt: DateTime(2026, 5, 15, 10),
        );
        final pinnedNew = _conversation(
          'pinned-new',
          title: '置顶新会话',
          isPinned: true,
          lastActivityAt: DateTime(2026, 5, 15, 9),
        );

        final sorted = sortConversations([older, pinnedOld, newest, pinnedNew]);

        expect(sorted.map((e) => e.conversationId), [
          'pinned-new',
          'pinned-old',
          'newest',
          'older',
        ]);
      },
    );

    test('puts conversations without activity time after dated items', () {
      final noTime = _conversation('no-time', title: '无时间');
      final withTime = _conversation(
        'with-time',
        title: '有时间',
        lastActivityAt: DateTime(2026, 5, 15),
      );

      final sorted = sortConversations([noTime, withTime]);

      expect(sorted.map((e) => e.conversationId), ['with-time', 'no-time']);
    });

    test('keeps input list unchanged after sorting', () {
      final first = _conversation(
        'first',
        title: 'First',
        lastActivityAt: DateTime(2026, 5, 15, 8),
      );
      final second = _conversation(
        'second',
        title: 'Second',
        lastActivityAt: DateTime(2026, 5, 15, 9),
      );
      final source = [first, second];

      final sorted = sortConversations(source);

      expect(source.map((e) => e.conversationId), ['first', 'second']);
      expect(sorted.map((e) => e.conversationId), ['second', 'first']);
    });

    test(
      'keeps original relative order when pin and activity are identical',
      () {
        final a = _conversation(
          'a',
          title: 'A',
          isPinned: true,
          lastActivityAt: DateTime(2026, 5, 15),
        );
        final b = _conversation(
          'b',
          title: 'B',
          isPinned: true,
          lastActivityAt: DateTime(2026, 5, 15),
        );

        final sorted = sortConversations([a, b]);

        expect(sorted.map((e) => e.conversationId), ['a', 'b']);
      },
    );
  });

  group('filterConversations', () {
    test('matches title case-insensitively and trims keyword', () {
      final items = [
        _conversation('alice', title: 'Alice'),
        _conversation('bob', title: 'Bob'),
      ];

      final filtered = filterConversations(items, '  ali  ');

      expect(filtered.single.conversationId, 'alice');
    });

    test('matches last message preview including emoji text', () {
      final items = [
        _conversation('text', title: '文字', preview: '你好'),
        _conversation('emoji', title: '表情', preview: '收到 😁'),
      ];

      final filtered = filterConversations(items, '😁');

      expect(filtered.single.conversationId, 'emoji');
    });

    test('returns original list when keyword is blank', () {
      final items = [_conversation('a', title: 'A')];

      expect(filterConversations(items, '   '), same(items));
    });

    test('matches Chinese title and preview text', () {
      final items = [
        _conversation('service', title: '客服会话', preview: '稍后联系'),
        _conversation('group', title: '产品群', preview: '群公告已更新'),
      ];

      expect(filterConversations(items, '公告').single.conversationId, 'group');
      expect(filterConversations(items, '客服').single.conversationId, 'service');
    });

    test('returns empty list when nothing matches', () {
      final items = [
        _conversation('a', title: 'Alice', preview: 'hello'),
        _conversation('b', title: 'Bob', preview: 'world'),
      ];

      expect(filterConversations(items, '不存在'), isEmpty);
    });

    test('keeps customer service temp sessions out of home conversations', () {
      final items = [
        _conversation('direct', title: '普通单聊'),
        _conversation('group', title: '群聊', type: ConversationType.group),
        _conversation(
          'temp',
          title: '访客临时会话',
          type: ConversationType.tempSession,
        ),
      ];

      final filtered = filterHomeConversations(items);

      expect(filtered.map((e) => e.conversationId), ['direct', 'group']);
    });

    test(
      'keeps known customer service conversation ids out even if type is direct',
      () {
        final items = [
          _conversation('direct', title: '普通单聊'),
          _conversation('cs-direct', title: '命令行访客'),
          _conversation('group', title: '群聊', type: ConversationType.group),
        ];

        final filtered = filterHomeConversations(
          items,
          customerServiceConversationIds: {'cs-direct'},
        );

        expect(filtered.map((e) => e.conversationId), ['direct', 'group']);
      },
    );

    test('drops empty duplicate direct placeholders for the same peer', () {
      final items = [
        _conversation('placeholder', title: '测试客户A', peerUserId: 'peer-1'),
        _conversation(
          'chat-real',
          title: '测试客户A',
          peerUserId: 'peer-1',
          preview: '[图片]',
          lastMessageSeq: 26,
        ),
      ];

      final filtered = filterHomeConversations(items);

      expect(filtered.map((e) => e.conversationId), ['chat-real']);
    });
  });

  group('ConversationActionsController', () {
    test('treats group and temp session as group-like API targets', () {
      expect(
        ConversationActionsController.isGroupConversation(
          _conversation('direct', title: '单聊'),
        ),
        isFalse,
      );
      expect(
        ConversationActionsController.isGroupConversation(
          _conversation('group', title: '群聊', type: ConversationType.group),
        ),
        isTrue,
      );
      expect(
        ConversationActionsController.isGroupConversation(
          _conversation(
            'temp',
            title: '临时会话',
            type: ConversationType.tempSession,
          ),
        ),
        isTrue,
      );
    });
  });
}

Conversation _conversation(
  String id, {
  required String title,
  ConversationType type = ConversationType.direct,
  bool isPinned = false,
  DateTime? lastActivityAt,
  String? preview,
  String? peerUserId,
  int lastMessageSeq = 0,
}) {
  return Conversation(
    conversationId: id,
    type: type,
    title: title,
    isPinned: isPinned,
    lastActivityAt: lastActivityAt,
    peerUserId: peerUserId,
    lastMessageSeq: lastMessageSeq,
    lastMessage: preview == null
        ? null
        : LastMessage(
            messageId: 'msg-$id',
            text: preview,
            messageType: 'text',
            senderUserId: 'user-1',
            sentAt: lastActivityAt ?? DateTime(2026, 5, 15),
          ),
  );
}
