import 'package:path/path.dart' as p;

enum ChatPickedMediaKind { image, video }

Future<void> sendChatPickedMediaBatch<T>(
  Iterable<T> items,
  Future<void> Function(T item) sendOne,
) {
  return Future.wait(items.map(sendOne));
}

const chatFileAttachmentAllowedExtensions = <String>[
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'csv',
  'txt',
  'zip',
  'rar',
  '7z',
  'mp3',
  'xml',
  'json',
  'md',
  'log',
  'rtf',
];

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
    return tryFromPickedFile(
          path: path,
          name: name,
          mimeType: mimeType,
          sizeBytes: sizeBytes,
        ) ??
        ChatPickedMedia.image(
          path: path,
          fileName: name,
          sizeBytes: sizeBytes,
        );
  }

  static ChatPickedMedia? tryFromPickedFile({
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

    if (_isImagePath(path)) {
      return ChatPickedMedia.image(
        path: path,
        fileName: name,
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
    return null;
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

bool _isImagePath(String path) {
  switch (p.extension(path).toLowerCase()) {
    case '.jpg':
    case '.jpeg':
    case '.png':
    case '.webp':
    case '.gif':
    case '.heic':
    case '.heif':
      return true;
    default:
      return false;
  }
}

bool isChatFileAttachmentExtension(String extension) {
  final normalized = _normalizeExtension(extension);
  if (normalized.isEmpty) return false;
  return chatFileAttachmentAllowedExtensions.contains(normalized);
}

String chatFileAttachmentMimeType(String extension) {
  switch (_normalizeExtension(extension)) {
    case 'pdf':
      return 'application/pdf';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'ppt':
      return 'application/vnd.ms-powerpoint';
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'csv':
      return 'text/csv';
    case 'txt':
      return 'text/plain';
    case 'xml':
      return 'application/xml';
    case 'json':
      return 'application/json';
    case 'md':
      return 'text/markdown';
    case 'log':
      return 'text/plain';
    case 'rtf':
      return 'application/rtf';
    case 'zip':
      return 'application/zip';
    case 'rar':
      return 'application/vnd.rar';
    case '7z':
      return 'application/x-7z-compressed';
    case 'mp3':
      return 'audio/mpeg';
    default:
      return 'application/octet-stream';
  }
}

String _normalizeExtension(String extension) {
  final value = extension.trim().toLowerCase();
  return value.startsWith('.') ? value.substring(1) : value;
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
