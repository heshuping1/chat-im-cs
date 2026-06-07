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

  test('does not prefetch video source when thumbnail is absent', () {
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

    expect(requests, isEmpty);
  });

  test('prefetches video poster when thumbnail is present', () {
    final message = Message(
      messageId: 'm-1',
      conversationId: 'c-1',
      conversationSeq: 1,
      senderUserId: 'u-2',
      type: MessageType.video,
      body: const MessageBody(
        video: MediaResource(
          url: 'https://cdn.example.com/video.mp4',
          thumbnailUrl: 'https://cdn.example.com/video-thumb.jpg',
          sizeBytes: 30 * 1024 * 1024,
        ),
      ),
      sentAt: DateTime(2026),
    );

    final requests = mediaPrefetchRequestsForMessage(message);

    expect(requests, hasLength(1));
    expect(requests.single.mediaKind, MediaKind.video);
    expect(requests.single.variant, MediaVariant.videoPoster);
    expect(
      requests.single.resource.url,
      'https://cdn.example.com/video-thumb.jpg',
    );
    expect(requests.single.generatePoster, isFalse);
  });

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
