import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/data/models/message_model.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';

void main() {
  group('MessageModel API contract', () {
    test('parses snake_case message types from server payloads', () {
      final contactCard = MessageModel.fromJson({
        'messageId': 'msg-contact',
        'conversationId': 'c-1',
        'conversationSeq': 1,
        'messageType': 'contact_card',
        'body': {
          'contact_card': {'userId': 'u-1', 'displayName': 'Alice'},
        },
        'sentAt': '2026-05-15T10:00:00Z',
      });
      final callLog = MessageModel.fromJson({
        'messageId': 'msg-call',
        'conversationId': 'c-1',
        'conversationSeq': 2,
        'messageType': 'call_log',
        'body': {
          'call_log': {
            'callId': 'call-1',
            'mediaMode': 'audioVideo',
            'durationSeconds': 12,
            'endReason': 'completed',
            'isCaller': true,
          },
        },
        'sentAt': '2026-05-15T10:01:00Z',
      });

      expect(contactCard.type, MessageType.contactCard);
      expect(contactCard.body.contactCard?.displayName, 'Alice');
      expect(callLog.type, MessageType.callLog);
      expect(callLog.body.callLog?.mediaMode, 'audioVideo');
    });

    test('serializes outgoing text body without null media fields', () {
      const body = MessageBody(text: '你好 😁');

      expect(body.toJson(), {'text': '你好 😁'});
    });

    test('serializes rich message bodies with client API field names', () {
      const body = MessageBody(
        contactCard: ContactCardDto(
          userId: 'u-1',
          displayName: 'Alice',
          avatarUrl: 'https://example.com/a.png',
        ),
        callLog: CallLogDto(
          callId: 'call-1',
          mediaMode: 'audio',
          durationSeconds: 0,
          endReason: 'rejected',
          isCaller: true,
        ),
      );

      expect(body.toJson(), {
        'contactCard': {
          'userId': 'u-1',
          'displayName': 'Alice',
          'avatarUrl': 'https://example.com/a.png',
        },
        'callLog': {
          'callId': 'call-1',
          'mediaMode': 'audio',
          'durationSeconds': 0,
          'endReason': 'rejected',
          'isCaller': true,
        },
      });
    });

    test(
      'builds sent message from send response while preserving local body',
      () {
        const body = MessageBody(text: '发送内容');

        final message = MessageModel.fromSendResponse(
          {
            'messageId': 'server-msg-1',
            'conversationId': 'group-1',
            'conversationSeq': 8,
            'serverTime': '2026-05-15T10:00:00Z',
          },
          clientMsgId: 'client-msg-1',
          type: MessageType.text,
          body: body,
          conversationId: 'group-1',
          senderUserId: 'me',
        );

        expect(message.messageId, 'server-msg-1');
        expect(message.clientMsgId, 'client-msg-1');
        expect(message.conversationSeq, 8);
        expect(message.body.text, '发送内容');
        expect(message.senderUserId, 'me');
        expect(message.status, MessageStatus.sent);
      },
    );

    test('maps local-only message statuses without losing wire names', () {
      final deleted = MessageModel.toJson(
        Message(
          messageId: 'local-msg-1',
          conversationId: 'group-1',
          conversationSeq: 0,
          senderUserId: 'me',
          type: MessageType.text,
          body: const MessageBody(text: 'hello'),
          sentAt: DateTime.utc(2026, 5, 15),
          status: MessageStatus.deletedLocal,
        ),
      );

      expect(deleted['status'], 'deleted_local');
      expect(parseMessageStatus('deleted_local'), MessageStatus.deletedLocal);
      expect(parseMessageStatus('rejected'), MessageStatus.rejected);
    });

    test('round-trips every supported message status wire value', () {
      for (final status in MessageStatus.values) {
        expect(parseMessageStatus(status.wireName), status);
      }
      expect(parseMessageStatus('unknown_future_status'), MessageStatus.sent);
      expect(parseMessageStatus(null), MessageStatus.sent);
    });

    test('marks recalled server messages as recalled status', () {
      final message = MessageModel.fromJson({
        'messageId': 'msg-recalled',
        'conversationId': 'group-1',
        'conversationSeq': 9,
        'messageType': 'text',
        'body': {'text': '被撤回'},
        'isRecalled': true,
        'sentAt': '2026-05-15T10:00:00Z',
      });

      expect(message.isRecalled, isTrue);
      expect(message.status, MessageStatus.recalled);
    });

    test('parses server-provided read and rejected statuses when present', () {
      final read = MessageModel.fromJson({
        'messageId': 'msg-read',
        'conversationId': 'chat-1',
        'conversationSeq': 1,
        'messageType': 'text',
        'body': {'text': 'ok'},
        'status': 'read',
        'sentAt': '2026-05-15T10:00:00Z',
      });
      final rejected = MessageModel.fromJson({
        'messageId': 'local-rejected',
        'conversationId': 'group-1',
        'conversationSeq': 0,
        'messageType': 'text',
        'body': {'text': 'muted'},
        'status': 'rejected',
        'failureReason': 'MSG_GROUP_MUTED',
        'sentAt': '2026-05-15T10:00:00Z',
      });

      expect(read.status, MessageStatus.read);
      expect(rejected.status, MessageStatus.rejected);
      expect(rejected.failureReason, 'MSG_GROUP_MUTED');
    });

    test('parses camelCase body aliases kept by old local caches', () {
      final message = MessageModel.fromJson({
        'messageId': 'msg-rich',
        'conversationId': 'chat-1',
        'conversationSeq': 3,
        'messageType': 'contact_card',
        'body': {
          'contactCard': {'userId': 'u-1', 'displayName': 'Bob'},
          'callLog': {
            'callId': 'call-1',
            'mediaMode': 'audio',
            'durationSeconds': 0,
            'endReason': 'missed',
            'isCaller': false,
          },
        },
        'sentAt': '2026-05-15T10:00:00Z',
      });

      expect(message.body.contactCard?.displayName, 'Bob');
      expect(message.body.callLog?.endReason, 'missed');
    });

    test('parses structured event preview text for system messages', () {
      final body = MessageBody.fromJson({
        'event': {'type': 'group_name_changed', 'preview': '群名称已修改'},
      });

      expect(body.event, '群名称已修改');
      expect(body.eventData?.type, 'group_name_changed');
    });

    test('formats group member join event with member display name', () {
      final body = MessageBody.fromJson({
        'text': '成员已加入群聊',
        'event': {
          'eventType': 'members_added',
          'addedUsers': [
            {'userId': 'u-1', 'displayName': '张三'},
          ],
        },
      });

      expect(body.text, '张三 加入群聊');
      expect(body.event, '张三 加入群聊');
      expect(body.eventData?.type, 'members_added');
    });

    test('serializes location payload with only supported API fields', () {
      const location = LocationDto(
        latitude: 31.2304,
        longitude: 121.4737,
        title: '上海',
        address: '人民广场',
        zoomLevel: 16,
      );

      expect(const MessageBody(location: location).toJson(), {
        'location': {
          'latitude': 31.2304,
          'longitude': 121.4737,
          'title': '上海',
          'address': '人民广场',
          'zoomLevel': 16,
        },
      });
    });
  });
}
