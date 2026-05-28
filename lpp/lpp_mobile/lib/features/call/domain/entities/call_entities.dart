import 'package:flutter/foundation.dart';

/// 通话媒体模式
enum CallMediaMode { audio, audioVideo }

/// 通话结束原因
enum CallEndReason {
  hangup,
  callerHangup,
  calleeHangup,
  rejected,
  timeout,
  cancelled,
  connectionLost,
  adminForceEnd,
  failed,
  unknown;

  static CallEndReason fromString(String value) {
    switch (value) {
      case 'hangup':
        return CallEndReason.hangup;
      case 'caller_hangup':
        return CallEndReason.callerHangup;
      case 'callee_hangup':
        return CallEndReason.calleeHangup;
      case 'rejected':
        return CallEndReason.rejected;
      case 'timeout':
        return CallEndReason.timeout;
      case 'cancelled':
        return CallEndReason.cancelled;
      case 'connection_lost':
        return CallEndReason.connectionLost;
      case 'admin_force_end':
        return CallEndReason.adminForceEnd;
      case 'failed':
        return CallEndReason.failed;
      default:
        return CallEndReason.unknown;
    }
  }

  String get label {
    switch (this) {
      case CallEndReason.hangup:
      case CallEndReason.callerHangup:
      case CallEndReason.calleeHangup:
        return '已挂断';
      case CallEndReason.rejected:
        return '已拒绝';
      case CallEndReason.timeout:
        return '未接听';
      case CallEndReason.cancelled:
        return '已取消';
      case CallEndReason.connectionLost:
        return '连接中断';
      case CallEndReason.adminForceEnd:
        return '已强制结束';
      case CallEndReason.failed:
        return '通话失败';
      case CallEndReason.unknown:
        return '已结束';
    }
  }

  String get wireValue {
    switch (this) {
      case CallEndReason.callerHangup:
        return 'caller_hangup';
      case CallEndReason.calleeHangup:
        return 'callee_hangup';
      case CallEndReason.connectionLost:
        return 'connection_lost';
      case CallEndReason.adminForceEnd:
        return 'admin_force_end';
      case CallEndReason.hangup:
      case CallEndReason.rejected:
      case CallEndReason.timeout:
      case CallEndReason.cancelled:
      case CallEndReason.failed:
      case CallEndReason.unknown:
        return name;
    }
  }
}

/// 通话会话摘要（用于在消息列表中展示 call_log）
@immutable
class CallSummary {
  final String callId;
  final CallMediaMode mediaMode;
  final int durationSeconds;
  final CallEndReason endReason;
  final bool isCaller;

  const CallSummary({
    required this.callId,
    required this.mediaMode,
    required this.durationSeconds,
    required this.endReason,
    required this.isCaller,
  });

  /// 格式化通话时长，如 "01:23"
  String get formattedDuration {
    final m = durationSeconds ~/ 60;
    final s = durationSeconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  factory CallSummary.fromJson(Map<String, dynamic> json) {
    final mediaMode = json['mediaMode'] as String? ?? '';
    return CallSummary(
      callId: json['callId'] as String,
      mediaMode: CallDisplay.isVideoMediaMode(mediaMode)
          ? CallMediaMode.audioVideo
          : CallMediaMode.audio,
      durationSeconds: json['durationSeconds'] as int? ?? 0,
      endReason: CallEndReason.fromString(json['endReason'] as String? ?? ''),
      isCaller: json['isCaller'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'callId': callId,
        'mediaMode':
            mediaMode == CallMediaMode.audioVideo ? 'audioVideo' : 'audio',
        'durationSeconds': durationSeconds,
        'endReason': endReason.wireValue,
        'isCaller': isCaller,
      };
}

class CallDisplayText {
  final String title;
  final String status;
  final String? detail;

  const CallDisplayText({
    required this.title,
    required this.status,
    this.detail,
  });
}

/// Shared call-log presentation rules from voice-video-call-reference.md §9.
class CallDisplay {
  const CallDisplay._();

  static bool isVideoMediaMode(String mediaMode) {
    final normalized =
        mediaMode.toLowerCase().replaceAll(RegExp(r'[^a-z]'), '');
    return normalized == 'audiovideo' || normalized == 'video';
  }

  static String mediaTitle({required bool isVideo}) {
    return isVideo ? '视频通话' : '语音通话';
  }

  static String formatSeconds(int seconds) {
    final safeSeconds = seconds < 0 ? 0 : seconds;
    final hours = safeSeconds ~/ 3600;
    final minutes = (safeSeconds ~/ 60).remainder(60);
    final secs = safeSeconds.remainder(60);
    if (hours > 0) {
      return '$hours:${minutes.toString().padLeft(2, '0')}:'
          '${secs.toString().padLeft(2, '0')}';
    }
    return '${minutes.toString().padLeft(2, '0')}:'
        '${secs.toString().padLeft(2, '0')}';
  }

  static String outgoingStatus({
    required bool isVideo,
    required bool isRinging,
    String dots = '',
  }) {
    final media = mediaTitle(isVideo: isVideo);
    return isRinging ? '等待对方接听$media$dots' : '正在发起$media$dots';
  }

  static CallDisplayText ended({
    required bool isVideo,
    required bool isCaller,
    required int durationSeconds,
    required String? endReason,
  }) {
    final media = mediaTitle(isVideo: isVideo);
    final reason = normalizeReason(endReason);
    final durationText =
        durationSeconds > 0 ? '通话时长 ${formatSeconds(durationSeconds)}' : '未接通';

    if (durationSeconds > 0 && _isNormalEnd(reason)) {
      return CallDisplayText(
        title: '$media已结束',
        status: isCaller ? '已拨出' : '已接听',
        detail: durationText,
      );
    }

    return switch (reason) {
      'rejected' => CallDisplayText(
          title: isCaller ? '$media已被拒绝' : '已拒绝$media',
          status: isCaller ? '对方已拒绝' : '已拒绝',
          detail: durationText,
        ),
      'timeout' => CallDisplayText(
          title: isCaller ? '$media无人接听' : '未接$media',
          status: isCaller ? '对方未接听' : '未接来电',
          detail: durationText,
        ),
      'cancelled' => CallDisplayText(
          title: isCaller ? '已取消$media' : '对方已取消$media',
          status: isCaller ? '已取消' : '对方已取消',
          detail: durationText,
        ),
      'connection_lost' => CallDisplayText(
          title: '$media连接中断',
          status: '连接中断',
          detail: durationText,
        ),
      'admin_force_end' => CallDisplayText(
          title: '$media已被结束',
          status: '通话已被结束',
          detail: durationText,
        ),
      'failed' || 'busy' || 'node_offline' => CallDisplayText(
          title: '$media失败',
          status: reason == 'busy' ? '对方忙线中' : '通话失败',
          detail: durationText,
        ),
      _ => CallDisplayText(
          title: durationSeconds > 0 ? '$media已结束' : '$media未接通',
          status: durationSeconds > 0
              ? (isCaller ? '已拨出' : '已接听')
              : (isCaller ? '已取消' : '对方已取消'),
          detail: durationText,
        ),
    };
  }

  static String messageStatus({
    required bool isCaller,
    required int durationSeconds,
    required String? endReason,
  }) {
    final endedText = ended(
      isVideo: false,
      isCaller: isCaller,
      durationSeconds: durationSeconds,
      endReason: endReason,
    );
    if (durationSeconds > 0 && _isNormalEnd(normalizeReason(endReason))) {
      return '${endedText.status} · ${endedText.detail}';
    }
    return endedText.status;
  }

  static String normalizeReason(String? reason) {
    final raw = reason?.trim().toLowerCase() ?? '';
    if (raw.contains('did not') && raw.contains('within')) {
      return 'timeout';
    }
    return switch (raw) {
      'caller_hangup' || 'callee_hangup' || 'normal' => 'hangup',
      'missed' => 'timeout',
      'cancel' => 'cancelled',
      'adminforceend' => 'admin_force_end',
      'connectionlost' => 'connection_lost',
      'nodeoffline' => 'node_offline',
      _ => raw,
    };
  }

  static bool _isNormalEnd(String reason) {
    return reason.isEmpty || reason == 'hangup' || reason == 'ended';
  }
}
