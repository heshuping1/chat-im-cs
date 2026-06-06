import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/domain/services/mention_reminder.dart';

void main() {
  group('mentionReminderKindForMessage', () {
    test('returns none for ordinary messages without mentions', () {
      final kind = mentionReminderKindForMessage(
        mentions: null,
        currentUserId: 'me',
        isGroup: true,
        isSelf: false,
      );

      expect(kind, MentionReminderKind.none);
    });

    test('returns me when a user mention targets the current user', () {
      final kind = mentionReminderKindForMessage(
        mentions: const [
          Mention.user(userId: 'me', offset: 0, length: 3),
        ],
        currentUserId: 'me',
        isGroup: true,
        isSelf: false,
      );

      expect(kind, MentionReminderKind.me);
    });

    test('ignores user mentions that target another member', () {
      final kind = mentionReminderKindForMessage(
        mentions: const [
          Mention.user(userId: 'other', offset: 0, length: 5),
        ],
        currentUserId: 'me',
        isGroup: true,
        isSelf: false,
      );

      expect(kind, MentionReminderKind.none);
    });

    test('returns all for all-member mentions in group conversations', () {
      final kind = mentionReminderKindForMessage(
        mentions: const [
          Mention.all(offset: 0, length: 4),
        ],
        currentUserId: 'me',
        isGroup: true,
        isSelf: false,
      );

      expect(kind, MentionReminderKind.all);
    });

    test('ignores mentions from messages sent by the current user', () {
      final kind = mentionReminderKindForMessage(
        mentions: const [
          Mention.user(userId: 'me', offset: 0, length: 3),
          Mention.all(offset: 4, length: 4),
        ],
        currentUserId: 'me',
        isGroup: true,
        isSelf: true,
      );

      expect(kind, MentionReminderKind.none);
    });

    test('prioritizes direct mentions over all-member mentions', () {
      final kind = mentionReminderKindForMessage(
        mentions: const [
          Mention.all(offset: 0, length: 4),
          Mention.user(userId: 'me', offset: 5, length: 3),
        ],
        currentUserId: 'me',
        isGroup: true,
        isSelf: false,
      );

      expect(kind, MentionReminderKind.me);
    });
  });

  group('mentionReminderKindForConversation', () {
    test('shows no reminder when conversation is already read', () {
      final kind = mentionReminderKindForConversation(
        _conversation(
          unreadCount: 0,
          mentions: const [Mention.all(offset: 0, length: 4)],
        ),
        currentUserId: 'me',
      );

      expect(kind, MentionReminderKind.none);
    });

    test('shows an all-member reminder for unread group last message', () {
      final kind = mentionReminderKindForConversation(
        _conversation(
          unreadCount: 3,
          mentions: const [Mention.all(offset: 0, length: 4)],
        ),
        currentUserId: 'me',
      );

      expect(kind, MentionReminderKind.all);
    });
  });

  group('latestUnreadMentionReminderForMessages', () {
    test('returns the newest unread mention reminder', () {
      final reminder = latestUnreadMentionReminderForMessages(
        messages: [
          _message(
            id: 'read-all',
            seq: 1,
            mentions: const [Mention.all(offset: 0, length: 4)],
          ),
          _message(
            id: 'unread-all',
            seq: 2,
            mentions: const [Mention.all(offset: 0, length: 4)],
          ),
          _message(
            id: 'unread-me',
            seq: 3,
            mentions: const [Mention.user(userId: 'me', offset: 0, length: 2)],
          ),
        ],
        currentUserId: 'me',
        isGroup: true,
        lastReadSeq: 1,
      );

      expect(reminder?.messageId, 'unread-me');
      expect(reminder?.kind, MentionReminderKind.me);
    });

    test('ignores read and self-sent mentions', () {
      final reminder = latestUnreadMentionReminderForMessages(
        messages: [
          _message(
            id: 'read-me',
            seq: 1,
            mentions: const [Mention.user(userId: 'me', offset: 0, length: 2)],
          ),
          _message(
            id: 'self-all',
            seq: 2,
            senderUserId: 'me',
            mentions: const [Mention.all(offset: 0, length: 4)],
          ),
        ],
        currentUserId: 'me',
        isGroup: true,
        lastReadSeq: 1,
      );

      expect(reminder, isNull);
    });
  });
}

Conversation _conversation({
  required int unreadCount,
  required List<Mention> mentions,
}) {
  return Conversation(
    conversationId: 'group-1',
    type: ConversationType.group,
    title: '群聊',
    unreadCount: unreadCount,
    lastMessage: LastMessage(
      messageId: 'msg-1',
      text: '@所有人 开会',
      messageType: 'text',
      senderUserId: 'other',
      sentAt: DateTime.utc(2026, 6, 6, 12),
      mentions: mentions,
    ),
  );
}

Message _message({
  required String id,
  required int seq,
  required List<Mention> mentions,
  String senderUserId = 'other',
}) {
  return Message(
    messageId: id,
    conversationId: 'group-1',
    conversationSeq: seq,
    senderUserId: senderUserId,
    type: MessageType.text,
    body: const MessageBody(text: '@消息'),
    sentAt: DateTime.utc(2026, 6, 6, 12),
    mentions: mentions,
  );
}
