import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/data/datasources/gateway_event_handler.dart';
import 'package:lpp_mobile/features/chat/domain/entities/conversation.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/domain/usecases/filter_conversations.dart';

void main() {
  group('GatewayEventHandler', () {
    test(
      'emits message and conversation update with conversation sequence',
      () async {
        Message? emittedMessage;
        Conversation? emittedConversation;

        await GatewayEventHandler().onNewMessage(
          {
            'messageId': 'msg-1',
            'conversationId': 'group-1',
            'conversationSeq': 12,
            'senderUserId': 'u-1',
            'conversationType': 'group',
            'messageType': 'text',
            'body': {'text': '😁'},
            'sentAt': '2026-05-15T10:00:00Z',
          },
          spaceId: 'space-1',
          onMessage: (_, __, message) => emittedMessage = message,
          onConversationUpdate: (_, conversation) {
            emittedConversation = conversation;
          },
        );

        expect(emittedMessage?.conversationSeq, 12);
        expect(emittedMessage?.body.text, '😁');
        expect(emittedConversation?.type, ConversationType.group);
        expect(emittedConversation?.lastMessageSeq, 12);
        expect(emittedConversation?.lastMessage?.text, '😁');
      },
    );

    test('preserves mentions in realtime conversation summaries', () async {
      Conversation? emittedConversation;

      await GatewayEventHandler().onNewMessage(
        {
          'messageId': 'msg-mention',
          'conversationId': 'group-1',
          'conversationSeq': 13,
          'senderUserId': 'u-1',
          'conversationType': 'group',
          'messageType': 'text',
          'body': {'text': '@mouse hello'},
          'mentions': [
            {'type': 'user', 'userId': 'me', 'offset': 0, 'length': 6},
          ],
          'sentAt': '2026-05-15T10:00:01Z',
        },
        spaceId: 'space-1',
        onMessage: (_, __, ___) {},
        onConversationUpdate: (_, conversation) {
          emittedConversation = conversation;
        },
      );

      expect(emittedConversation?.lastMessage?.mentions, isNotNull);
      expect(emittedConversation?.lastMessage?.mentions?.single.userId, 'me');
    });

    test('ignores events without conversation id', () async {
      var messageCount = 0;
      var conversationCount = 0;

      await GatewayEventHandler().onNewMessage(
        {
          'messageId': 'msg-1',
          'conversationSeq': 1,
          'messageType': 'text',
          'body': {'text': 'hello'},
          'sentAt': '2026-05-15T10:00:00Z',
        },
        spaceId: 'space-1',
        onMessage: (_, __, ___) => messageCount++,
        onConversationUpdate: (_, __) => conversationCount++,
      );

      expect(messageCount, 0);
      expect(conversationCount, 0);
    });

    test(
      'reads nested conversation type fallback from gateway payload',
      () async {
        Conversation? emittedConversation;

        await GatewayEventHandler().onNewMessage(
          {
            'messageId': 'msg-1',
            'conversationId': 'temp-1',
            'conversationSeq': 2,
            'senderUserId': 'u-1',
            'conversation': {'conversationType': 'temp_session'},
            'messageType': 'text',
            'body': {'text': '临时会话'},
            'sentAt': '2026-05-15T10:00:00Z',
          },
          spaceId: 'space-1',
          onMessage: (_, __, ___) {},
          onConversationUpdate: (_, conversation) {
            emittedConversation = conversation;
          },
        );

        expect(emittedConversation?.type, ConversationType.tempSession);
      },
    );

    test(
      'temp session gateway summaries are excluded from home list',
      () async {
        Conversation? emittedConversation;

        await GatewayEventHandler().onNewMessage(
          {
            'messageId': 'msg-1',
            'conversationId': 'temp-1',
            'conversationSeq': 2,
            'senderUserId': 'visitor-1',
            'conversationType': 'temp_session',
            'messageType': 'text',
            'body': {'text': '我要咨询'},
            'sentAt': '2026-05-15T10:00:00Z',
          },
          spaceId: 'space-1',
          onMessage: (_, __, ___) {},
          onConversationUpdate: (_, conversation) {
            emittedConversation = conversation;
          },
        );

        expect(emittedConversation?.type, ConversationType.tempSession);
        expect(filterHomeConversations([emittedConversation!]), isEmpty);
      },
    );

    test(
      'prefers temp session thread type over direct conversation type',
      () async {
        Conversation? emittedConversation;

        await GatewayEventHandler().onNewMessage(
          {
            'messageId': 'msg-2',
            'conversationId': 'direct-under-temp',
            'threadId': 'temp-thread-1',
            'threadType': 'temp_session',
            'conversationType': 'direct',
            'conversationSeq': 3,
            'senderUserId': 'visitor-1',
            'messageType': 'text',
            'body': {'text': '从在线客服来的消息'},
            'sentAt': '2026-05-15T10:00:00Z',
          },
          spaceId: 'space-1',
          onMessage: (_, __, ___) {},
          onConversationUpdate: (_, conversation) {
            emittedConversation = conversation;
          },
        );

        expect(emittedConversation?.type, ConversationType.tempSession);
        expect(filterHomeConversations([emittedConversation!]), isEmpty);
      },
    );

    test('converts every message type to documented API string', () {
      expect(
        GatewayEventHandler.messageTypeToApiString(MessageType.text),
        'text',
      );
      expect(
        GatewayEventHandler.messageTypeToApiString(MessageType.markdown),
        'markdown',
      );
      expect(
        GatewayEventHandler.messageTypeToApiString(MessageType.image),
        'image',
      );
      expect(
        GatewayEventHandler.messageTypeToApiString(MessageType.video),
        'video',
      );
      expect(
        GatewayEventHandler.messageTypeToApiString(MessageType.voice),
        'voice',
      );
      expect(
        GatewayEventHandler.messageTypeToApiString(MessageType.file),
        'file',
      );
      expect(
        GatewayEventHandler.messageTypeToApiString(MessageType.event),
        'event',
      );
      expect(
        GatewayEventHandler.messageTypeToApiString(MessageType.contactCard),
        'contact_card',
      );
      expect(
        GatewayEventHandler.messageTypeToApiString(MessageType.callLog),
        'call_log',
      );
      expect(
        GatewayEventHandler.messageTypeToApiString(MessageType.location),
        'location',
      );
    });
  });
}
