enum MediaKind {
  image,
  video,
  file,
  voice;

  String get wireName => name;
}

enum MediaVariant {
  thumbnail,
  original,
  videoPoster,
  videoSource,
  attachment,
  voiceSource;

  String get wireName => name;
}

enum MediaLocalStatus {
  missing,
  downloading,
  downloaded,
  failed;

  String get wireName => name;
}

MediaKind mediaKindFromWire(String value) {
  return MediaKind.values.firstWhere(
    (kind) => kind.wireName == value,
    orElse: () => MediaKind.file,
  );
}

MediaVariant mediaVariantFromWire(String value) {
  return MediaVariant.values.firstWhere(
    (variant) => variant.wireName == value,
    orElse: () => MediaVariant.attachment,
  );
}

MediaLocalStatus mediaLocalStatusFromWire(String value) {
  return MediaLocalStatus.values.firstWhere(
    (status) => status.wireName == value,
    orElse: () => MediaLocalStatus.missing,
  );
}

class MediaLocalFile {
  final String id;
  final String spaceId;
  final String conversationId;
  final String messageId;
  final MediaKind mediaKind;
  final MediaVariant variant;
  final String remoteUrl;
  final String? localPath;
  final String? fileName;
  final String? mimeType;
  final int? sizeBytes;
  final MediaLocalStatus status;
  final String? failureReason;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? lastAccessedAt;

  const MediaLocalFile({
    required this.id,
    required this.spaceId,
    required this.conversationId,
    required this.messageId,
    required this.mediaKind,
    required this.variant,
    required this.remoteUrl,
    this.localPath,
    this.fileName,
    this.mimeType,
    this.sizeBytes,
    required this.status,
    this.failureReason,
    required this.createdAt,
    required this.updatedAt,
    this.lastAccessedAt,
  });

  bool get canOpen =>
      status == MediaLocalStatus.downloaded && localPath != null;

  bool get shouldDownload =>
      status == MediaLocalStatus.missing || status == MediaLocalStatus.failed;

  bool get canRetry => status == MediaLocalStatus.failed;

  MediaLocalFile copyWith({
    String? localPath,
    String? fileName,
    String? mimeType,
    int? sizeBytes,
    MediaLocalStatus? status,
    String? failureReason,
    DateTime? updatedAt,
    DateTime? lastAccessedAt,
    bool clearFailureReason = false,
    bool clearLastAccessedAt = false,
  }) {
    return MediaLocalFile(
      id: id,
      spaceId: spaceId,
      conversationId: conversationId,
      messageId: messageId,
      mediaKind: mediaKind,
      variant: variant,
      remoteUrl: remoteUrl,
      localPath: localPath ?? this.localPath,
      fileName: fileName ?? this.fileName,
      mimeType: mimeType ?? this.mimeType,
      sizeBytes: sizeBytes ?? this.sizeBytes,
      status: status ?? this.status,
      failureReason:
          clearFailureReason ? null : (failureReason ?? this.failureReason),
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      lastAccessedAt:
          clearLastAccessedAt ? null : (lastAccessedAt ?? this.lastAccessedAt),
    );
  }

  Map<String, Object?> toRow() {
    return {
      'id': id,
      'space_id': spaceId,
      'conversation_id': conversationId,
      'message_id': messageId,
      'media_kind': mediaKind.wireName,
      'variant': variant.wireName,
      'remote_url': remoteUrl,
      'local_path': localPath,
      'file_name': fileName,
      'mime_type': mimeType,
      'size_bytes': sizeBytes,
      'status': status.wireName,
      'failure_reason': failureReason,
      'created_at': createdAt.millisecondsSinceEpoch,
      'updated_at': updatedAt.millisecondsSinceEpoch,
      'last_accessed_at': lastAccessedAt?.millisecondsSinceEpoch,
    };
  }

  factory MediaLocalFile.fromRow(Map<String, Object?> row) {
    DateTime date(String key) =>
        DateTime.fromMillisecondsSinceEpoch(row[key] as int);
    DateTime? nullableDate(String key) {
      final value = row[key];
      return value is int ? DateTime.fromMillisecondsSinceEpoch(value) : null;
    }

    return MediaLocalFile(
      id: row['id'] as String,
      spaceId: row['space_id'] as String,
      conversationId: row['conversation_id'] as String,
      messageId: row['message_id'] as String,
      mediaKind: mediaKindFromWire(row['media_kind'] as String),
      variant: mediaVariantFromWire(row['variant'] as String),
      remoteUrl: row['remote_url'] as String,
      localPath: row['local_path'] as String?,
      fileName: row['file_name'] as String?,
      mimeType: row['mime_type'] as String?,
      sizeBytes: row['size_bytes'] as int?,
      status: mediaLocalStatusFromWire(row['status'] as String),
      failureReason: row['failure_reason'] as String?,
      createdAt: date('created_at'),
      updatedAt: date('updated_at'),
      lastAccessedAt: nullableDate('last_accessed_at'),
    );
  }
}

String mediaLocalFileId({
  required String spaceId,
  required String conversationId,
  required String messageId,
  required MediaKind mediaKind,
  required MediaVariant variant,
}) {
  return [
    spaceId,
    conversationId,
    messageId,
    mediaKind.wireName,
    variant.wireName,
  ].join('|');
}
