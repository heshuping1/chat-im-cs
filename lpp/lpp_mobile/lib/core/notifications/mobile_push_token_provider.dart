import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:lpp_mobile/core/notifications/push_device_registration_service.dart';
import 'package:lpp_mobile/core/platform/platform_capabilities.dart';

const _mobilePushChannelName = 'lpp_mobile/mobile_push';

enum MobilePushProvider {
  disabled,
  jpush,
  oppo;

  static MobilePushProvider parse(String value) {
    return switch (value.trim().toLowerCase()) {
      'jpush' || 'jiguang' || '极光' => MobilePushProvider.jpush,
      'oppo' || 'heytap' => MobilePushProvider.oppo,
      _ => MobilePushProvider.disabled,
    };
  }
}

class MobilePushToken {
  const MobilePushToken({
    required this.channel,
    required this.token,
    this.region,
  });

  final PushChannel channel;
  final String token;
  final String? region;
}

abstract interface class MobilePushTokenProvider {
  Future<MobilePushToken?> requestToken();
}

class DisabledMobilePushTokenProvider implements MobilePushTokenProvider {
  const DisabledMobilePushTokenProvider();

  @override
  Future<MobilePushToken?> requestToken() async => null;
}

class MethodChannelMobilePushTokenProvider implements MobilePushTokenProvider {
  const MethodChannelMobilePushTokenProvider({
    required this.enabled,
    this.provider = MobilePushProvider.disabled,
    this.channel = const MethodChannel(_mobilePushChannelName),
  });

  factory MethodChannelMobilePushTokenProvider.fromEnvironment() {
    const enabled = bool.fromEnvironment('MOBILE_VENDOR_PUSH_ENABLED');
    const provider = String.fromEnvironment('MOBILE_VENDOR_PUSH_PROVIDER');
    return MethodChannelMobilePushTokenProvider(
      enabled: enabled,
      provider: MobilePushProvider.parse(provider),
    );
  }

  final bool enabled;
  final MobilePushProvider provider;
  final MethodChannel channel;

  @override
  Future<MobilePushToken?> requestToken() async {
    if (!enabled || provider == MobilePushProvider.disabled) return null;
    if (!PlatformCapabilities.supportsMobilePush) return null;
    try {
      final available = await channel.invokeMethod<bool>(
            'isAvailable',
            {'provider': provider.name},
          ) ??
          false;
      if (!available) return null;
      final raw = await channel.invokeMapMethod<String, dynamic>(
        'requestToken',
        {'provider': provider.name},
      );
      if (raw == null) return null;
      final rawProvider = (raw['provider'] as String?)?.trim();
      if (rawProvider != null &&
          rawProvider.isNotEmpty &&
          MobilePushProvider.parse(rawProvider) != provider) {
        return null;
      }
      final token = (raw['token'] as String?)?.trim();
      if (token == null || token.isEmpty) return null;
      return MobilePushToken(
        channel: _channelForProvider(provider),
        token: token,
        region: (raw['region'] as String?)?.trim(),
      );
    } on MissingPluginException {
      return null;
    } catch (error) {
      debugPrint('[MobilePush] token request failed: $error');
      return null;
    }
  }

  PushChannel _channelForProvider(MobilePushProvider provider) {
    return switch (provider) {
      MobilePushProvider.jpush => PushChannel.jpush,
      MobilePushProvider.oppo => PushChannel.oppo,
      MobilePushProvider.disabled => PushChannel.jpush,
    };
  }
}
