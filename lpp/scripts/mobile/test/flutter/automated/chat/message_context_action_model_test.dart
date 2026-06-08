import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/presentation/models/message_context_action_model.dart';

void main() {
  group('message context action model', () {
    test('allows reply and server actions for file messages', () {
      final capabilities = messageContextCapabilities(
        _message(
          type: MessageType.file,
          body: const MessageBody(
            file: MediaResource(
              url: '/media/manual.pdf',
              fileName: 'manual.pdf',
            ),
          ),
        ),
        currentUserId: 'me',
        now: DateTime.utc(2026, 6, 7, 12),
      );

      expect(capabilities.canReply, isTrue);
      expect(capabilities.canForward, isTrue);
      expect(capabilities.canFavorite, isTrue);
      expect(capabilities.canMultiSelect, isTrue);
      expect(capabilities.canDelete, isTrue);
      expect(capabilities.canCopy, isFalse);
      expect(capabilities.canSaveToAlbum, isFalse);
    });

    test('keeps text-only actions limited to text messages', () {
      final capabilities = messageContextCapabilities(
        _message(body: const MessageBody(text: 'hello')),
        currentUserId: 'me',
        now: DateTime.utc(2026, 6, 7, 12),
      );

      expect(capabilities.canReply, isTrue);
      expect(capabilities.canCopy, isTrue);
      expect(capabilities.canTranslate, isTrue);
      expect(capabilities.canAiReply, isTrue);
    });

    test('does not expose server actions for unsent file messages', () {
      final capabilities = messageContextCapabilities(
        _message(
          status: MessageStatus.sending,
          type: MessageType.file,
          body: const MessageBody(
            file: MediaResource(url: '/tmp/manual.pdf', fileName: 'manual.pdf'),
          ),
        ),
        currentUserId: 'me',
        now: DateTime.utc(2026, 6, 7, 12),
      );

      expect(capabilities.canReply, isFalse);
      expect(capabilities.canForward, isFalse);
      expect(capabilities.canFavorite, isFalse);
      expect(capabilities.canMultiSelect, isFalse);
      expect(capabilities.canDelete, isTrue);
    });
  });
}

Message _message({
  MessageStatus status = MessageStatus.sent,
  MessageType type = MessageType.text,
  MessageBody body = const MessageBody(text: 'hello'),
}) {
  return Message(
    messageId: 'msg-1',
    conversationId: 'chat-1',
    conversationSeq: 1,
    senderUserId: 'me',
    type: type,
    body: body,
    sentAt: DateTime.utc(2026, 6, 7, 11, 59),
    status: status,
  );
}
