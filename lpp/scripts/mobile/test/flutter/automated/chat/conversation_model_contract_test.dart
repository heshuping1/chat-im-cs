import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/data/models/conversation_model.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';

void main() {
  group('ConversationModel API contract', () {
    test('parses temp session type and draft object', () {
      final conversation = ConversationModel.fromJson({
        'conversationId': 'temp-1',
        'conversationType': 'temp_session',
        'title': '临时会话',
        'draft': {'draftText': '稍后回复'},
      });

      expect(conversation.type, ConversationType.tempSession);
      expect(conversation.draft, '稍后回复');
    });

    test('keeps emoji preview as the latest conversation text', () {
      final conversation = ConversationModel.fromJson({
        'conversationId': 'group-1',
        'conversationType': 'group',
        'title': '群聊',
        'lastMessage': {
          'messageId': 'msg-1',
          'messageType': 'text',
          'preview': '😁',
          'sentAt': '2026-05-15T10:00:00Z',
        },
      });

      expect(conversation.lastMessage?.text, '😁');
      expect(conversation.lastMessage?.messageType, 'text');
    });

    test('parses and caps group member avatar previews at 9 users', () {
      final members = List.generate(
        12,
        (index) => {
          'displayName': '成员$index',
          'avatarUrl': 'https://example.com/avatar-$index.png',
        },
      );

      final conversation = ConversationModel.fromJson({
        'conversationId': 'group-1',
        'conversationType': 'group',
        'title': '群聊',
        'members': members,
      });

      expect(conversation.memberNames, hasLength(9));
      expect(conversation.memberAvatarUrls, hasLength(9));
      expect(conversation.memberNames?.first, '成员0');
      expect(conversation.memberNames?.last, '成员8');
      expect(conversation.memberAvatarUrls?.last,
          'https://example.com/avatar-8.png');
    });

    test('parses nested user member previews from loose map payloads', () {
      final conversation = ConversationModel.fromJson({
        'conversationId': 'group-1',
        'conversationType': 'group',
        'title': '群聊',
        'memberPreviews': [
          {
            'userId': 'u-1',
            'user': {
              'displayName': 'Alice',
              'avatarUrl': 'https://example.com/alice.png',
            },
          },
          {
            'memberName': 'Bob',
            'memberAvatarUrl': 'https://example.com/bob.png',
          },
        ],
      });

      expect(conversation.memberNames, ['Alice', 'Bob']);
      expect(conversation.memberAvatarUrls, [
        'https://example.com/alice.png',
        'https://example.com/bob.png',
      ]);
    });

    test('serializes conversation type using server values', () {
      expect(ConversationModel.typeToJson(ConversationType.direct), 'direct');
      expect(ConversationModel.typeToJson(ConversationType.group), 'group');
      expect(
        ConversationModel.typeToJson(ConversationType.tempSession),
        'temp_session',
      );
    });

    test('defaults unknown conversation type to direct for compatibility', () {
      final conversation = ConversationModel.fromJson({
        'conversationId': 'legacy-1',
        'conversationType': 'single',
        'title': '旧单聊',
        'peerUserType': 1,
        'peerUserId': 'customer-1',
      });

      expect(conversation.type, ConversationType.direct);
      expect(conversation.peerUserType, 1);
      expect(conversation.peerUserId, 'customer-1');
    });

    test('uses top-level lastActivityAt when lastMessage is absent', () {
      final conversation = ConversationModel.fromJson({
        'conversationId': 'chat-1',
        'conversationType': 'direct',
        'title': 'Alice',
        'lastActivityAt': '2026-05-15T11:12:13Z',
      });

      expect(conversation.lastMessage, isNull);
      expect(conversation.lastActivityAt?.toUtc().toIso8601String(),
          '2026-05-15T11:12:13.000Z');
    });

    test('keeps lastMessage as the source of last activity when present', () {
      final conversation = ConversationModel.fromJson({
        'conversationId': 'chat-1',
        'conversationType': 'direct',
        'title': 'Alice',
        'lastActivityAt': '2026-05-10T00:00:00Z',
        'lastMessage': {
          'messageId': 'msg-1',
          'messageType': 'image',
          'preview': '[图片]',
          'senderUserId': 'u-1',
          'sentAt': '2026-05-15T12:00:00Z',
        },
      });

      expect(conversation.lastMessage?.messageType, 'image');
      expect(conversation.lastMessage?.senderUserId, 'u-1');
      expect(conversation.lastActivityAt?.toUtc().toIso8601String(),
          '2026-05-15T12:00:00.000Z');
    });

    test('supports legacy string draft and writes current object draft shape',
        () {
      final conversation = ConversationModel.fromJson({
        'conversationId': 'chat-1',
        'conversationType': 'direct',
        'title': 'Alice',
        'draft': '未发送草稿',
      });

      expect(conversation.draft, '未发送草稿');
      expect(ConversationModel.toJson(conversation)['draft'], {
        'draftText': '未发送草稿',
      });
    });

    test('filters blank avatar urls while preserving member name previews', () {
      final conversation = ConversationModel.fromJson({
        'conversationId': 'group-1',
        'conversationType': 'group',
        'title': '群聊',
        'memberAvatarUrls': [
          'https://example.com/a.png',
          '',
          null,
          '  ',
        ],
        'memberNames': ['Alice', 'Bob', 'Eve', 'Mallory'],
      });

      expect(conversation.memberAvatarUrls, [
        'https://example.com/a.png',
        null,
      ]);
      expect(conversation.memberNames, ['Alice', 'Bob', 'Eve', 'Mallory']);
    });

    test('serializes last message summary for local conversation cache', () {
      final json = ConversationModel.toJson(Conversation(
        conversationId: 'chat-1',
        type: ConversationType.direct,
        title: 'Alice',
        lastMessage: LastMessage(
          messageId: 'msg-1',
          text: '😁',
          messageType: 'text',
          senderUserId: 'me',
          sentAt: DateTime.utc(2026, 5, 15, 12),
          mentions: const [
            Mention.user(userId: 'u-2', offset: 0, length: 3),
          ],
        ),
        isPinned: true,
        isMuted: true,
      ));

      expect(json['isPinned'], isTrue);
      expect(json['isMuted'], isTrue);
      expect(json['lastMessage'], {
        'messageId': 'msg-1',
        'preview': '😁',
        'messageType': 'text',
        'senderUserId': 'me',
        'sentAt': '2026-05-15T12:00:00.000Z',
        'mentions': [
          {'type': 'user', 'userId': 'u-2', 'offset': 0, 'length': 3},
        ],
      });
    });

    test('parses last message mentions from conversation list payload', () {
      final conversation = ConversationModel.fromJson({
        'conversationId': 'group-1',
        'conversationType': 'group',
        'title': '群聊',
        'unreadCount': 2,
        'lastMessage': {
          'messageId': 'msg-1',
          'messageType': 'text',
          'preview': '@所有人 开会',
          'senderUserId': 'u-2',
          'sentAt': '2026-06-06T12:00:00Z',
          'mentions': [
            {'type': 'all', 'offset': 0, 'length': 4},
          ],
        },
      });

      expect(conversation.lastMessage?.mentions, const [
        Mention.all(offset: 0, length: 4),
      ]);
    });
  });
}
