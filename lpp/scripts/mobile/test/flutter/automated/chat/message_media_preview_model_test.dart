import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/presentation/models/message_media_preview_model.dart';

void main() {
  group('message media preview model', () {
    test(
      'prefers local image preview over remote url while upload resolves',
      () {
        const media = MediaResource(
          url: 'https://cdn.example.com/image.jpg',
          thumbnailUrl: 'https://cdn.example.com/image-thumb.jpg',
          localPreviewUrl: '/tmp/local-image.jpg',
        );

        expect(imageBubbleVisualSource(media), '/tmp/local-image.jpg');
      },
    );

    test('prefers local video poster before server thumbnail is ready', () {
      const media = MediaResource(
        url: 'https://cdn.example.com/video.mp4',
        thumbnailUrl: 'https://cdn.example.com/video-thumb.jpg',
        localPosterUrl: '/tmp/local-video-poster.jpg',
      );

      expect(videoBubblePosterSource(media), '/tmp/local-video-poster.jpg');
    });
  });
}
