import 'package:lpp_mobile/features/chat/domain/entities/message.dart';

class MediaBubbleSize {
  final double width;
  final double height;

  const MediaBubbleSize({
    required this.width,
    required this.height,
  });
}

String? imageBubbleVisualSource(
  MediaResource? media, {
  bool skipLocalPreview = false,
}) {
  if (media == null) return null;
  final localPreview =
      skipLocalPreview ? null : _nonEmpty(media.localPreviewUrl);
  if (localPreview != null) return localPreview;
  final url = _nonEmpty(media.url);
  if (isLocalVisualMediaUrl(url)) return url;
  return _nonEmpty(media.thumbnailUrl) ?? url;
}

MediaBubbleSize mediaBubbleSize(
  MediaResource? media, {
  required double fallbackAspectRatio,
  double maxWidth = 220,
  double maxHeight = 280,
  double minWidth = 96,
  double minHeight = 96,
}) {
  final width = media?.width;
  final height = media?.height;
  final aspectRatio = width != null && height != null && width > 0 && height > 0
      ? width / height
      : fallbackAspectRatio;
  final safeRatio = aspectRatio.isFinite && aspectRatio > 0 ? aspectRatio : 1.0;

  var targetWidth = maxWidth;
  var targetHeight = targetWidth / safeRatio;
  if (targetHeight > maxHeight) {
    targetHeight = maxHeight;
    targetWidth = targetHeight * safeRatio;
  }

  if (targetWidth < minWidth) {
    targetWidth = minWidth;
    targetHeight = targetWidth / safeRatio;
  }
  if (targetHeight < minHeight) {
    targetHeight = minHeight;
    targetWidth = targetHeight * safeRatio;
  }

  return MediaBubbleSize(
    width: targetWidth.clamp(minWidth, maxWidth).roundToDouble(),
    height: targetHeight.clamp(minHeight, maxHeight).roundToDouble(),
  );
}

String? videoBubblePosterSource(
  MediaResource? media, {
  String? generatedPosterUrl,
  bool skipLocalPoster = false,
}) {
  if (media == null) return null;
  return (skipLocalPoster ? null : _nonEmpty(media.localPosterUrl)) ??
      _nonEmpty(media.thumbnailUrl) ??
      _nonEmpty(generatedPosterUrl);
}

bool isLocalVisualMediaUrl(String? url) {
  final value = _nonEmpty(url);
  if (value == null) return false;
  if (value.startsWith('/media') ||
      value.startsWith('/api') ||
      value.startsWith('/uploads') ||
      value.startsWith('/files')) {
    return false;
  }
  return value.startsWith('file://') ||
      value.startsWith('/') ||
      (!value.startsWith('http://') && !value.startsWith('https://'));
}

String? _nonEmpty(String? value) {
  final trimmed = value?.trim();
  return trimmed == null || trimmed.isEmpty ? null : trimmed;
}
