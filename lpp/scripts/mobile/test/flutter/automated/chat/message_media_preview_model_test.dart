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

    test('returns empty video poster source when no cover is available', () {
      const media = MediaResource(url: 'https://cdn.example.com/video.mp4');

      expect(videoBubblePosterSource(media), isNull);
    });

    test(
      'treats server relative media urls as remote displayable resources',
      () {
        expect(isLocalVisualMediaUrl('/media/image-id'), isFalse);
        expect(isLocalVisualMediaUrl('/uploads/file-id'), isFalse);
        expect(isLocalVisualMediaUrl('/tmp/local-image.jpg'), isTrue);
      },
    );

    test('sizes landscape image bubbles with original aspect ratio', () {
      final size = imageBubbleSize(
        const MediaResource(url: '/media/wide.jpg', width: 1600, height: 900),
      );

      expect(size.width, greaterThan(size.height));
      expect(size.width, 220);
      expect(size.height, lessThanOrEqualTo(280));
    });

    test('sizes portrait image bubbles with original aspect ratio', () {
      final size = imageBubbleSize(
        const MediaResource(url: '/media/tall.jpg', width: 900, height: 1600),
      );

      expect(size.height, greaterThan(size.width));
      expect(size.height, lessThanOrEqualTo(280));
      expect(size.width, greaterThanOrEqualTo(96));
    });

    test('uses square fallback for image bubbles without metadata', () {
      final size = imageBubbleSize(
        const MediaResource(url: '/media/unknown.jpg'),
      );

      expect(size.width, 220);
      expect(size.height, 220);
    });

    test('caps extreme image bubbles without breaking touch target', () {
      final long = imageBubbleSize(
        const MediaResource(url: '/media/long.jpg', width: 100, height: 2000),
      );
      final panorama = imageBubbleSize(
        const MediaResource(
          url: '/media/panorama.jpg',
          width: 2000,
          height: 100,
        ),
      );

      expect(long.width, greaterThanOrEqualTo(96));
      expect(long.height, 280);
      expect(panorama.width, 220);
      expect(panorama.height, greaterThanOrEqualTo(96));
    });

    test('uses compact 16:9 default for videos without metadata', () {
      final size = videoBubbleSize(
        const MediaResource(url: '/media/video.mp4'),
      );

      expect(size.width, 220);
      expect(size.height, 124);
    });

    test('sizes vertical videos as narrow tall cards', () {
      final size = videoBubbleSize(
        const MediaResource(
          url: '/media/vertical.mp4',
          width: 720,
          height: 1280,
        ),
      );

      expect(size.height, greaterThan(size.width));
      expect(size.height, lessThanOrEqualTo(280));
      expect(size.width, greaterThanOrEqualTo(96));
    });

    test('sizes horizontal videos as wide cards', () {
      final size = videoBubbleSize(
        const MediaResource(
          url: '/media/horizontal.mp4',
          width: 1280,
          height: 720,
        ),
      );

      expect(size.width, greaterThan(size.height));
      expect(size.width, 220);
    });
  });
}
