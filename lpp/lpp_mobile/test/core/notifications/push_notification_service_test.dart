import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/notifications/mobile_push_token_provider.dart';
import 'package:lpp_mobile/core/notifications/push_device_registration_service.dart';
import 'package:lpp_mobile/core/notifications/push_notification_service.dart';
import 'package:lpp_mobile/core/storage/secure_storage.dart';

void main() {
  group('PushNotificationService gateway local notifications', () {
    tearDown(() {
      debugDefaultTargetPlatformOverride = null;
    });

    test('allows process-alive message notifications on Android', () {
      debugDefaultTargetPlatformOverride = TargetPlatform.android;

      expect(
        PushNotificationService.supportsGatewayLocalMessageNotification,
        isTrue,
      );
    });

    test('allows process-alive message notifications on desktop', () {
      debugDefaultTargetPlatformOverride = TargetPlatform.macOS;

      expect(
        PushNotificationService.supportsGatewayLocalMessageNotification,
        isTrue,
      );
    });
  });

  group('PushNotificationService mobile registration', () {
    setUp(() {
      debugDefaultTargetPlatformOverride = TargetPlatform.android;
    });

    tearDown(() {
      debugDefaultTargetPlatformOverride = null;
    });

    test('does not register when native push token is unavailable', () async {
      final registrar = _FakePushDeviceRegistrar();
      final storage = _MemorySecureStorage();
      final service = PushNotificationService(
        registrationService: registrar,
        storage: storage,
        mobilePushTokenProvider: const DisabledMobilePushTokenProvider(),
      );

      await service.registerCurrentDevice();

      expect(registrar.registrations, isEmpty);
    });

    test('registers JPush token with a stable device id', () async {
      final registrar = _FakePushDeviceRegistrar();
      final storage = _MemorySecureStorage();
      final service = PushNotificationService(
        registrationService: registrar,
        storage: storage,
        mobilePushTokenProvider: const _StaticMobilePushTokenProvider(
          MobilePushToken(
            channel: PushChannel.jpush,
            token: 'jpush-registration-id',
            region: 'CN',
          ),
        ),
      );

      await service.registerCurrentDevice();

      expect(registrar.registrations, hasLength(1));
      final registration = registrar.registrations.single;
      expect(registration.deviceId, isNotEmpty);
      expect(registration.platform, PushPlatform.android);
      expect(registration.channel, PushChannel.jpush);
      expect(registration.token, 'jpush-registration-id');
      expect(registration.region, 'CN');
      expect(await storage.read('push_device_id'), registration.deviceId);
    });
  });
}

class _StaticMobilePushTokenProvider implements MobilePushTokenProvider {
  const _StaticMobilePushTokenProvider(this.token);

  final MobilePushToken token;

  @override
  Future<MobilePushToken?> requestToken() async => token;
}

class _FakePushDeviceRegistrar implements PushDeviceRegistrar {
  final registrations = <PushDeviceRegistration>[];
  final unregistered = <String>[];

  @override
  Future<void> registerOrUpdate(PushDeviceRegistration registration) async {
    registrations.add(registration);
  }

  @override
  Future<void> unregister(String deviceId) async {
    unregistered.add(deviceId);
  }
}

class _MemorySecureStorage extends SecureStorageService {
  final _values = <String, String>{};

  @override
  Future<void> delete(String key) async {
    _values.remove(key);
  }

  @override
  Future<void> deleteAll() async {
    _values.clear();
  }

  @override
  Future<String?> read(String key) async => _values[key];

  @override
  Future<void> write(String key, String value) async {
    _values[key] = value;
  }
}
