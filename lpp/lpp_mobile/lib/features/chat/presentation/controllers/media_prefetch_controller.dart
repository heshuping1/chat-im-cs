import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/platform/local_video_poster.dart';
import 'package:lpp_mobile/features/chat/domain/entities/media_local_file.dart';
import 'package:lpp_mobile/features/chat/domain/entities/message.dart';
import 'package:lpp_mobile/features/chat/presentation/controllers/media_open_controller.dart';

const int defaultAutoVideoPosterSourceLimitBytes = 20 * 1024 * 1024;

final mediaPrefetchControllerProvider =
    Provider.family<MediaPrefetchController, String>((ref, spaceId) {
  return MediaPrefetchController(
    opener: ref.watch(mediaOpenControllerProvider(spaceId)),
  );
});

class MediaPrefetchRequest {
  final Message message;
  final MediaKind mediaKind;
  final MediaVariant variant;
  final MediaResource resource;
  final bool generatePoster;
  final String fallbackName;

  const MediaPrefetchRequest({
    required this.message,
    required this.mediaKind,
    required this.variant,
    required this.resource,
    required this.fallbackName,
    this.generatePoster = false,
  });
}

List<MediaPrefetchRequest> mediaPrefetchRequestsForMessage(
  Message message, {
  int autoVideoPosterSourceLimitBytes = defaultAutoVideoPosterSourceLimitBytes,
}) {
  switch (message.type) {
    case MessageType.image:
      final image = message.body.image;
      final thumbnailUrl = image?.thumbnailUrl?.trim();
      if (image == null || thumbnailUrl == null || thumbnailUrl.isEmpty) {
        return const [];
      }
      return [
        MediaPrefetchRequest(
          message: message,
          mediaKind: MediaKind.image,
          variant: MediaVariant.thumbnail,
          resource: image.copyWith(url: thumbnailUrl),
          fallbackName: image.fileName ?? 'image_thumb.jpg',
        ),
      ];
    case MessageType.video:
      final video = message.body.video;
      if (video == null) return const [];
      final thumbnailUrl = video.thumbnailUrl?.trim();
      if (thumbnailUrl != null && thumbnailUrl.isNotEmpty) {
        return [
          MediaPrefetchRequest(
            message: message,
            mediaKind: MediaKind.video,
            variant: MediaVariant.videoPoster,
            resource: video.copyWith(url: thumbnailUrl),
            fallbackName: 'video_poster.jpg',
          ),
        ];
      }
      final size = video.sizeBytes;
      if (size != null && size > autoVideoPosterSourceLimitBytes) {
        return const [];
      }
      final videoUrl = video.url.trim();
      if (videoUrl.isEmpty) return const [];
      return [
        MediaPrefetchRequest(
          message: message,
          mediaKind: MediaKind.video,
          variant: MediaVariant.videoSource,
          resource: video,
          fallbackName: video.fileName ?? 'video.mp4',
          generatePoster: true,
        ),
      ];
    default:
      return const [];
  }
}

class MediaPrefetchController {
  final MediaOpenController opener;

  const MediaPrefetchController({
    required this.opener,
  });

  void prefetchMessages(Iterable<Message> messages) {
    for (final message in messages) {
      unawaited(prefetchMessage(message));
    }
  }

  Future<void> prefetchMessage(Message message) async {
    final requests = mediaPrefetchRequestsForMessage(message);
    for (final request in requests) {
      try {
        final localPath = await opener.localPathFor(
          MediaOpenRequest.fromResource(
            message: request.message,
            mediaKind: request.mediaKind,
            variant: request.variant,
            resource: request.resource,
            fallbackName: request.fallbackName,
          ),
        );
        if (request.generatePoster) {
          await generateLocalVideoPoster(
            localPath,
            cacheKey: request.resource.url,
          );
        }
      } catch (_) {
        // Prefetch is opportunistic; visible message state must not depend on it.
      }
    }
  }
}
