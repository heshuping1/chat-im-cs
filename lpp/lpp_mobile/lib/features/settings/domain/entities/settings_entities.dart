import 'package:flutter/foundation.dart';

const _unset = Object();

/// 通知设置，对应 GET/PUT /api/client/v1/notification-settings
@immutable
class NotificationSettings {
  final bool globalMute;
  final String? dndStartTime; // "HH:mm"
  final String? dndEndTime; // "HH:mm"
  final bool soundEnabled;
  final bool vibrationEnabled;
  final bool previewEnabled;

  const NotificationSettings({
    this.globalMute = false,
    this.dndStartTime,
    this.dndEndTime,
    this.soundEnabled = true,
    this.vibrationEnabled = true,
    this.previewEnabled = true,
  });

  NotificationSettings copyWith({
    bool? globalMute,
    Object? dndStartTime = _unset,
    Object? dndEndTime = _unset,
    bool? soundEnabled,
    bool? vibrationEnabled,
    bool? previewEnabled,
  }) =>
      NotificationSettings(
        globalMute: globalMute ?? this.globalMute,
        dndStartTime: identical(dndStartTime, _unset)
            ? this.dndStartTime
            : dndStartTime as String?,
        dndEndTime: identical(dndEndTime, _unset)
            ? this.dndEndTime
            : dndEndTime as String?,
        soundEnabled: soundEnabled ?? this.soundEnabled,
        vibrationEnabled: vibrationEnabled ?? this.vibrationEnabled,
        previewEnabled: previewEnabled ?? this.previewEnabled,
      );

  Map<String, dynamic> toJson() => {
        'globalMute': globalMute,
        'dndStartTime': dndStartTime,
        'dndEndTime': dndEndTime,
        'soundEnabled': soundEnabled,
        'vibrationEnabled': vibrationEnabled,
        'previewEnabled': previewEnabled,
      };

  factory NotificationSettings.fromJson(Map<String, dynamic> json) =>
      NotificationSettings(
        globalMute: json['globalMute'] as bool? ?? false,
        dndStartTime: json['dndStartTime'] as String?,
        dndEndTime: json['dndEndTime'] as String?,
        soundEnabled: json['soundEnabled'] as bool? ?? true,
        vibrationEnabled: json['vibrationEnabled'] as bool? ?? true,
        previewEnabled: json['previewEnabled'] as bool? ?? true,
      );
}
