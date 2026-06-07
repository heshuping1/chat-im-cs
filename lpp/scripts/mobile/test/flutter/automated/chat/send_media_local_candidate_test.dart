import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/domain/repositories/chat_repository.dart';
import 'package:lpp_mobile/features/chat/domain/usecases/send_message_usecase.dart';

void main() {
  test('sent file messages keep a local candidate path after upload', () async {
    final repository = _UploadRepository();
    final useCase = SendMessageUseCase(
      repository: repository,
      currentUserId: 'u-1',
    );

    final sent = await useCase.execute(
      conversationId: 'c-1',
      isGroup: false,
      type: MessageType.file,
      body: const MessageBody(
        file: MediaResource(
          url: '/local/report.pdf',
          fileName: 'report.pdf',
          mimeType: 'application/pdf',
        ),
      ),
    );

    expect(sent.body.file?.url, 'https://cdn.example.com/report.pdf');
    expect(sent.body.file?.localPreviewUrl, '/local/report.pdf');
  });

  test('sent image messages keep local dimensions after upload', () async {
    final repository = _UploadRepository();
    final useCase = SendMessageUseCase(
      repository: repository,
      currentUserId: 'u-1',
    );

    final sent = await useCase.execute(
      conversationId: 'c-1',
      isGroup: false,
      type: MessageType.image,
      body: const MessageBody(
        image: MediaResource(
          url: '/local/photo.jpg',
          fileName: 'photo.jpg',
          mimeType: 'image/jpeg',
          width: 1600,
          height: 900,
        ),
      ),
    );

    expect(sent.body.image?.url, 'https://cdn.example.com/report.pdf');
    expect(sent.body.image?.localPreviewUrl, '/local/photo.jpg');
    expect(sent.body.image?.width, 1600);
    expect(sent.body.image?.height, 900);
  });
}

class _UploadRepository implements ChatRepository {
  @override
  Future<MediaResource> uploadMedia(
    String filePath, {
    String? mediaKind,
    MediaUploadProgressCallback? onProgress,
  }) async {
    return const MediaResource(
      url: 'https://cdn.example.com/report.pdf',
      fileName: 'report.pdf',
      mimeType: 'application/pdf',
    );
  }

  @override
  Future<Message> sendMessage({
    required String conversationId,
    required bool isGroup,
    required String clientMsgId,
    required MessageType type,
    required MessageBody body,
    String? replyToMessageId,
    List<Mention>? mentions,
  }) async {
    return Message(
      messageId: 'server-$clientMsgId',
      clientMsgId: clientMsgId,
      conversationId: conversationId,
      conversationSeq: 1,
      senderUserId: 'u-1',
      type: type,
      body: body,
      sentAt: DateTime(2026),
    );
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
