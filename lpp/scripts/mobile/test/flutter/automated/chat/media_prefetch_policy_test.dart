import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/domain/entities/media_local_file.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/presentation/controllers/media_prefetch_controller.dart';

void main() {
  test('prefetches image thumbnails without downloading originals', () {
    final message = Message(
      messageId: 'm-1',
      conversationId: 'c-1',
      conversationSeq: 1,
      senderUserId: 'u-2',
      type: MessageType.image,
      body: const MessageBody(
        image: MediaResource(
          url: 'https://cdn.example.com/original.jpg',
          thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
        ),
      ),
      sentAt: DateTime(2026),
    );

    final requests = mediaPrefetchRequestsForMessage(message);

    expect(requests, hasLength(1));
    expect(requests.single.mediaKind, MediaKind.image);
    expect(requests.single.variant, MediaVariant.thumbnail);
    expect(requests.single.resource.url, 'https://cdn.example.com/thumb.jpg');
  });

  test(
    'prefetches small video source for generated poster when thumbnail absent',
    () {
      final message = Message(
        messageId: 'm-1',
        conversationId: 'c-1',
        conversationSeq: 1,
        senderUserId: 'u-2',
        type: MessageType.video,
        body: const MessageBody(
          video: MediaResource(
            url: 'https://cdn.example.com/video.mp4',
            sizeBytes: 3 * 1024 * 1024,
          ),
        ),
        sentAt: DateTime(2026),
      );

      final requests = mediaPrefetchRequestsForMessage(message);

      expect(requests, hasLength(1));
      expect(requests.single.mediaKind, MediaKind.video);
      expect(requests.single.variant, MediaVariant.videoSource);
      expect(requests.single.generatePoster, isTrue);
    },
  );

  test('does not auto download files', () {
    final message = Message(
      messageId: 'm-1',
      conversationId: 'c-1',
      conversationSeq: 1,
      senderUserId: 'u-2',
      type: MessageType.file,
      body: const MessageBody(
        file: MediaResource(url: 'https://cdn.example.com/report.pdf'),
      ),
      sentAt: DateTime(2026),
    );

    expect(mediaPrefetchRequestsForMessage(message), isEmpty);
  });
}
