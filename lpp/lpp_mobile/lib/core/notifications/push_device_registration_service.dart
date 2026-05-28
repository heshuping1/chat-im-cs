import 'package:dio/dio.dart';
import 'package:lpp_mobile/core/platform/platform_capabilities.dart';

/// Push provider channel used by the server notification module.
enum PushChannel {
  fcm(1),
  jpush(2);

  final int wireValue;
  const PushChannel(this.wireValue);
}

/// Client platform enum expected by POST /api/v1/notifications/devices.
enum PushPlatform {
  android(1),
  ios(2);

  final int wireValue;
  const PushPlatform(this.wireValue);
}

class PushDeviceRegistration {
  final String deviceId;
  final PushPlatform platform;
  final PushChannel channel;
  final String token;
  final String? region;
  final String? appVersion;

  const PushDeviceRegistration({
    required this.deviceId,
    required this.platform,
    required this.channel,
    required this.token,
    this.region,
    this.appVersion,
  });

  Map<String, dynamic> toJson() => {
        'deviceId': deviceId,
        'platform': platform.wireValue,
        'channel': channel.wireValue,
        'token': token,
        if (region != null) 'region': region,
        if (appVersion != null) 'appVersion': appVersion,
      };
}

class RegisteredPushDevice {
  final String deviceId;
  final int platform;
  final int channel;
  final String? region;
  final String? appVersion;
  final DateTime? lastActiveAt;

  const RegisteredPushDevice({
    required this.deviceId,
    required this.platform,
    required this.channel,
    this.region,
    this.appVersion,
    this.lastActiveAt,
  });

  factory RegisteredPushDevice.fromJson(Map<String, dynamic> json) {
    return RegisteredPushDevice(
      deviceId: json['deviceId'] as String? ?? '',
      platform: json['platform'] as int? ?? 0,
      channel: json['channel'] as int? ?? 0,
      region: json['region'] as String?,
      appVersion: json['appVersion'] as String?,
      lastActiveAt: DateTime.tryParse(json['lastActiveAt'] as String? ?? ''),
    );
  }
}

/// Thin API wrapper for server push device registration.
///
/// This does not acquire FCM/JPush tokens by itself. Platform integrations should
/// obtain the native push token, then call [registerOrUpdate].
class PushDeviceRegistrationService {
  final Dio _dio;

  const PushDeviceRegistrationService(this._dio);

  Future<void> registerOrUpdate(PushDeviceRegistration registration) async {
    await _dio.post<void>(
      '/api/v1/notifications/devices',
      data: registration.toJson(),
    );
  }

  Future<void> unregister(String deviceId) async {
    await _dio.delete<void>('/api/v1/notifications/devices/$deviceId');
  }

  Future<List<RegisteredPushDevice>> listRegisteredDevices() async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/api/v1/notifications/devices',
    );
    final data = response.data?['data'];
    final list = data is List ? data : const [];
    return list
        .map((e) => RegisteredPushDevice.fromJson(
              Map<String, dynamic>.from(e as Map),
            ))
        .toList();
  }

  static PushPlatform? currentMobilePlatform() {
    if (PlatformCapabilities.isAndroid) return PushPlatform.android;
    if (PlatformCapabilities.isIOS) return PushPlatform.ios;
    return null;
  }
}
