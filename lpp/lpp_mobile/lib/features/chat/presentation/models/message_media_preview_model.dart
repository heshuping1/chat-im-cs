import 'package:lpp_mobile/features/chat/domain/entities/message.dart';

String? imageBubbleVisualSource(MediaResource? media) {
  if (media == null) return null;
  final localPreview = _nonEmpty(media.localPreviewUrl);
  if (localPreview != null) return localPreview;
  final url = _nonEmpty(media.url);
  if (isLocalVisualMediaUrl(url)) return url;
  return _nonEmpty(media.thumbnailUrl) ?? url;
}

String? videoBubblePosterSource(MediaResource? media) {
  if (media == null) return null;
  return _nonEmpty(media.localPosterUrl) ?? _nonEmpty(media.thumbnailUrl);
}

bool isLocalVisualMediaUrl(String? url) {
  final value = _nonEmpty(url);
  if (value == null) return false;
  return value.startsWith('file://') ||
      value.startsWith('/') ||
      (!value.startsWith('http://') && !value.startsWith('https://'));
}

String? _nonEmpty(String? value) {
  final trimmed = value?.trim();
  return trimmed == null || trimmed.isEmpty ? null : trimmed;
}
