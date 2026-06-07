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

    test('falls back when a restored local image preview is unavailable', () {
      const media = MediaResource(
        url: 'https://cdn.example.com/image.jpg',
        thumbnailUrl: 'https://cdn.example.com/image-thumb.jpg',
        localPreviewUrl: '/tmp/deleted-local-image.jpg',
      );

      expect(
        imageBubbleVisualSource(media, skipLocalPreview: true),
        'https://cdn.example.com/image-thumb.jpg',
      );
    });

    test('prefers local video poster before server thumbnail is ready', () {
      const media = MediaResource(
        url: 'https://cdn.example.com/video.mp4',
        thumbnailUrl: 'https://cdn.example.com/video-thumb.jpg',
        localPosterUrl: '/tmp/local-video-poster.jpg',
      );

      expect(videoBubblePosterSource(media), '/tmp/local-video-poster.jpg');
    });

    test('reuses generated video poster when reopening chat', () {
      const media = MediaResource(url: 'https://cdn.example.com/video.mp4');

      expect(
        videoBubblePosterSource(
          media,
          generatedPosterUrl: '/tmp/generated-video-poster.jpg',
        ),
        '/tmp/generated-video-poster.jpg',
      );
    });

    test('falls back when a restored local video poster is unavailable', () {
      const media = MediaResource(
        url: 'https://cdn.example.com/video.mp4',
        thumbnailUrl: 'https://cdn.example.com/video-thumb.jpg',
        localPosterUrl: '/tmp/deleted-video-poster.jpg',
      );

      expect(
        videoBubblePosterSource(media, skipLocalPoster: true),
        'https://cdn.example.com/video-thumb.jpg',
      );
    });

    test(
      'treats server relative media urls as remote displayable resources',
      () {
        expect(isLocalVisualMediaUrl('/media/image-id'), isFalse);
        expect(isLocalVisualMediaUrl('/uploads/file-id'), isFalse);
        expect(isLocalVisualMediaUrl('/tmp/local-image.jpg'), isTrue);
      },
    );

    test('sizes image bubbles with original aspect ratio constraints', () {
      final wide = mediaBubbleSize(
        const MediaResource(url: '/media/wide.jpg', width: 1600, height: 900),
        fallbackAspectRatio: 1,
      );
      final tall = mediaBubbleSize(
        const MediaResource(url: '/media/tall.jpg', width: 900, height: 1600),
        fallbackAspectRatio: 1,
      );

      expect(wide.width, greaterThan(wide.height));
      expect(tall.height, greaterThan(tall.width));
      expect(wide.width, lessThanOrEqualTo(240));
      expect(tall.height, lessThanOrEqualTo(280));
    });

    test('uses compact 16:9 default for videos without metadata', () {
      final size = mediaBubbleSize(
        const MediaResource(url: '/media/video.mp4'),
        fallbackAspectRatio: 16 / 9,
      );

      expect(size.width, 220);
      expect(size.height, 124);
    });
  });
}
