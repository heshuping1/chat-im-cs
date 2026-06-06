enum MessageLocalUploadStatus {
  queued,
  uploading,
  sending,
  sent,
  failed,
}

enum MessageLocalUploadPhase {
  preparing,
  uploadingMedia,
  uploadingPoster,
  sending,
  failed,
  sent,
}

class MediaUploadProgressEvent {
  final int? loaded;
  final int? total;
  final num? percent;

  const MediaUploadProgressEvent({
    this.loaded,
    this.total,
    this.percent,
  });
}

typedef MediaUploadProgressCallback = void Function(
  MediaUploadProgressEvent event,
);

class MessageLocalUploadState {
  final MessageLocalUploadStatus status;
  final MessageLocalUploadPhase phase;
  final int? progress;
  final String? error;

  const MessageLocalUploadState({
    required this.status,
    required this.phase,
    this.progress,
    this.error,
  });

  bool get isActive =>
      status == MessageLocalUploadStatus.queued ||
      status == MessageLocalUploadStatus.uploading ||
      status == MessageLocalUploadStatus.sending ||
      status == MessageLocalUploadStatus.failed;

  MessageLocalUploadState copyWith({
    MessageLocalUploadStatus? status,
    MessageLocalUploadPhase? phase,
    int? progress,
    String? error,
  }) {
    return MessageLocalUploadState(
      status: status ?? this.status,
      phase: phase ?? this.phase,
      progress: progress ?? this.progress,
      error: error ?? this.error,
    );
  }
}

int? mediaUploadProgressPercent(
  MediaUploadProgressEvent event, {
  int? fallbackTotalBytes,
}) {
  final rawPercent = event.percent;
  if (rawPercent != null && rawPercent.isFinite) {
    return _clampProgress(rawPercent.toDouble());
  }
  final total = event.total != null && event.total! > 0
      ? event.total
      : fallbackTotalBytes;
  final loaded = event.loaded;
  if (loaded == null || loaded < 0 || total == null || total <= 0) {
    return null;
  }
  return _clampProgress((loaded / total) * 100);
}

int _clampProgress(double value) {
  if (!value.isFinite) return 0;
  return value.clamp(0, 100).round();
}
