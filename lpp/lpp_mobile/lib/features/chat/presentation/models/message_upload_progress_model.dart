import 'package:lpp_mobile/features/chat/domain/entities/message.dart';

class MessageUploadPresentation {
  final bool active;
  final int progress;
  final bool showPercent;
  final bool failed;

  const MessageUploadPresentation({
    required this.active,
    required this.progress,
    this.showPercent = true,
    this.failed = false,
  });
}

MessageUploadPresentation fileMessageUploadPresentation(
  MessageLocalUploadState? state,
) {
  if (state == null || state.status == MessageLocalUploadStatus.sent) {
    return const MessageUploadPresentation(
      active: false,
      progress: 100,
      showPercent: false,
    );
  }
  if (state.status == MessageLocalUploadStatus.failed) {
    return const MessageUploadPresentation(
      active: true,
      progress: 100,
      showPercent: false,
      failed: true,
    );
  }
  return MessageUploadPresentation(
    active: true,
    progress: _composeUploadProgress(
      kind: MessageType.file,
      phase: state.phase,
      rawProgress: state.progress,
    ),
    showPercent: false,
  );
}

MessageUploadPresentation imageMessageUploadPresentation(
  MessageLocalUploadState? state,
) {
  if (state == null || state.status == MessageLocalUploadStatus.sent) {
    return const MessageUploadPresentation(
      active: false,
      progress: 100,
      showPercent: false,
    );
  }
  if (state.status == MessageLocalUploadStatus.failed) {
    return const MessageUploadPresentation(
      active: true,
      progress: 100,
      failed: true,
    );
  }
  return MessageUploadPresentation(
    active: true,
    progress: _composeUploadProgress(
      kind: MessageType.image,
      phase: state.phase,
      rawProgress: state.progress,
    ),
    showPercent: false,
  );
}

MessageUploadPresentation videoMessageUploadPresentation(
  MessageLocalUploadState? state,
) {
  if (state == null || state.status == MessageLocalUploadStatus.sent) {
    return const MessageUploadPresentation(
      active: false,
      progress: 100,
      showPercent: false,
    );
  }
  if (state.status == MessageLocalUploadStatus.failed) {
    return const MessageUploadPresentation(
      active: true,
      progress: 100,
      failed: true,
    );
  }
  return MessageUploadPresentation(
    active: true,
    progress: _composeUploadProgress(
      kind: MessageType.video,
      phase: state.phase,
      rawProgress: state.progress,
    ),
  );
}

int _composeUploadProgress({
  required MessageType kind,
  required MessageLocalUploadPhase phase,
  int? rawProgress,
}) {
  if (phase == MessageLocalUploadPhase.sending) return 95;
  if (phase == MessageLocalUploadPhase.sent) return 100;
  if (phase == MessageLocalUploadPhase.preparing) return 0;

  final progress = _clampProgress(rawProgress ?? 0);
  if (kind == MessageType.file) {
    if (phase == MessageLocalUploadPhase.uploadingMedia) {
      return (progress * 0.9).round().clamp(0, 90).toInt();
    }
    return progress;
  }
  if (kind == MessageType.video) {
    if (phase == MessageLocalUploadPhase.uploadingMedia) {
      return progress.clamp(0, 78).toInt();
    }
    if (phase == MessageLocalUploadPhase.uploadingPoster) {
      return (78 + (progress * 0.1).round()).clamp(78, 88).toInt();
    }
  }
  return progress;
}

int _clampProgress(int value) => value.clamp(0, 100).toInt();
