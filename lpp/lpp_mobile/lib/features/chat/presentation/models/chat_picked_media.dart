import 'package:path/path.dart' as p;

enum ChatPickedMediaKind { image, video }

class ChatPickedMedia {
  final String path;
  final ChatPickedMediaKind kind;
  final String fileName;
  final String mimeType;
  final int? sizeBytes;

  const ChatPickedMedia({
    required this.path,
    required this.kind,
    required this.fileName,
    required this.mimeType,
    this.sizeBytes,
  });

  bool get isImage => kind == ChatPickedMediaKind.image;
  bool get isVideo => kind == ChatPickedMediaKind.video;

  factory ChatPickedMedia.image({
    required String path,
    String? fileName,
    String? mimeType,
    int? sizeBytes,
  }) {
    return ChatPickedMedia(
      path: path,
      kind: ChatPickedMediaKind.image,
      fileName: _fallbackFileName(path, fileName),
      mimeType: mimeType ?? _imageMimeTypeFromPath(path),
      sizeBytes: sizeBytes,
    );
  }

  factory ChatPickedMedia.video({
    required String path,
    String? fileName,
    String? mimeType,
    int? sizeBytes,
  }) {
    return ChatPickedMedia(
      path: path,
      kind: ChatPickedMediaKind.video,
      fileName: _fallbackFileName(path, fileName),
      mimeType: mimeType ?? _videoMimeTypeFromPath(path),
      sizeBytes: sizeBytes,
    );
  }

  factory ChatPickedMedia.fromPickedFile({
    required String path,
    String? name,
    String? mimeType,
    int? sizeBytes,
  }) {
    final normalizedMime = mimeType?.trim().toLowerCase();
    if (normalizedMime != null && normalizedMime.startsWith('video/')) {
      return ChatPickedMedia.video(
        path: path,
        fileName: name,
        mimeType: normalizedMime,
        sizeBytes: sizeBytes,
      );
    }
    if (normalizedMime != null && normalizedMime.startsWith('image/')) {
      return ChatPickedMedia.image(
        path: path,
        fileName: name,
        mimeType: normalizedMime,
        sizeBytes: sizeBytes,
      );
    }

    if (_isVideoPath(path)) {
      return ChatPickedMedia.video(
        path: path,
        fileName: name,
        sizeBytes: sizeBytes,
      );
    }
    return ChatPickedMedia.image(
      path: path,
      fileName: name,
      sizeBytes: sizeBytes,
    );
  }
}

String _fallbackFileName(String path, String? fileName) {
  final trimmed = fileName?.trim();
  if (trimmed != null && trimmed.isNotEmpty) return trimmed;
  final basename = p.basename(path);
  return basename.isEmpty ? 'media' : basename;
}

bool _isVideoPath(String path) {
  switch (p.extension(path).toLowerCase()) {
    case '.mp4':
    case '.mov':
    case '.m4v':
    case '.webm':
    case '.avi':
    case '.mkv':
      return true;
    default:
      return false;
  }
}

String _imageMimeTypeFromPath(String path) {
  switch (p.extension(path).toLowerCase()) {
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.heic':
      return 'image/heic';
    case '.heif':
      return 'image/heif';
    case '.jpg':
    case '.jpeg':
    default:
      return 'image/jpeg';
  }
}

String _videoMimeTypeFromPath(String path) {
  switch (p.extension(path).toLowerCase()) {
    case '.mov':
      return 'video/quicktime';
    case '.m4v':
      return 'video/x-m4v';
    case '.webm':
      return 'video/webm';
    case '.avi':
      return 'video/x-msvideo';
    case '.mkv':
      return 'video/x-matroska';
    case '.mp4':
    default:
      return 'video/mp4';
  }
}
