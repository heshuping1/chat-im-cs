import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/auth/token_refresh_service.dart';
import 'package:lpp_mobile/core/di/injector.dart';
import 'package:lpp_mobile/core/notifications/push_device_registration_service.dart';
import 'package:lpp_mobile/core/notifications/push_notification_service.dart';
import 'package:lpp_mobile/core/storage/secure_storage.dart';
import 'package:lpp_mobile/features/auth/presentation/providers/auth_provider.dart';

void main() {
  group('logout behavior', () {
    test(
      'does not wait for remote push unregister before local logout',
      () async {
        final storage = _MemorySecureStorage();
        await storage.write('push_device_id', 'device-1');
        final registrar = _BlockingPushDeviceRegistrar();
        final container = _authContainer(
          storage: storage,
          pushService: PushNotificationService(
            registrationService: registrar,
            storage: storage,
          ),
        );
        addTearDown(() {
          registrar.complete();
          TokenRefreshService.instance.stop();
          container.dispose();
        });

        final logout = container.read(authProvider.notifier).logout();
        final completed = await Future.any([
          logout.then((_) => true),
          Future<void>.delayed(
            const Duration(milliseconds: 50),
          ).then((_) => false),
        ]);

        expect(completed, isTrue);
        expect(
          container.read(authProvider).valueOrNull?.status,
          AuthStatus.unauthenticated,
        );
        expect(registrar.unregisteredDeviceIds, ['device-1']);
      },
    );

    test('clears remembered email identifiers on logout', () async {
      final storage = _MemorySecureStorage();
      await storage.write('auth_last_login_type', 'email');
      await storage.write('auth_last_login_identifier', 'user@example.com');
      await storage.write(
        'auth_last_login_identifier_email',
        'user@example.com',
      );
      final container = _authContainer(storage: storage);
      addTearDown(() {
        TokenRefreshService.instance.stop();
        container.dispose();
      });

      await container.read(authProvider.notifier).logout();

      expect(await storage.read('auth_last_login_type'), isNull);
      expect(await storage.read('auth_last_login_identifier'), isNull);
      expect(await storage.read('auth_last_login_identifier_email'), isNull);
    });

    test(
      'does not wait for slow noncritical local cleanup before leaving session',
      () async {
        final storage = _MemorySecureStorage(blockAdminDeletes: true);
        await storage.writeKnownTenantIds(['tenant-1']);
        await storage.write(
          SecureStorageService.adminAccessTokenKey('tenant-1'),
          'admin-token',
        );
        final container = _authContainer(storage: storage);
        addTearDown(() {
          storage.completeBlockedDeletes();
          TokenRefreshService.instance.stop();
          container.dispose();
        });

        final logout = container.read(authProvider.notifier).logout();
        final completed = await Future.any([
          logout.then((_) => true),
          Future<void>.delayed(
            const Duration(milliseconds: 50),
          ).then((_) => false),
        ]);

        expect(completed, isTrue);
        expect(
          container.read(authProvider).valueOrNull?.status,
          AuthStatus.unauthenticated,
        );
        expect(
          await storage.blockedDeleteStarted,
          SecureStorageService.adminAccessTokenKey('tenant-1'),
        );
      },
    );
  });
}

ProviderContainer _authContainer({
  required _MemorySecureStorage storage,
  PushNotificationService? pushService,
}) {
  return ProviderContainer(
    overrides: [
      secureStorageProvider.overrideWithValue(storage),
      dioProvider.overrideWithValue(
        Dio(BaseOptions(baseUrl: 'https://test.local')),
      ),
      if (pushService != null)
        pushNotificationServiceProvider.overrideWithValue(pushService),
    ],
  );
}

class _BlockingPushDeviceRegistrar implements PushDeviceRegistrar {
  final _completer = Completer<void>();
  final unregisteredDeviceIds = <String>[];

  @override
  Future<void> registerOrUpdate(PushDeviceRegistration registration) async {}

  @override
  Future<void> unregister(String deviceId) {
    unregisteredDeviceIds.add(deviceId);
    return _completer.future;
  }

  void complete() {
    if (!_completer.isCompleted) {
      _completer.complete();
    }
  }
}

class _MemorySecureStorage extends SecureStorageService {
  _MemorySecureStorage({this.blockAdminDeletes = false});

  final bool blockAdminDeletes;
  final _values = <String, String>{};
  final _blockedDeleteStarted = Completer<String>();
  final _blockedDeleteCompleter = Completer<void>();

  Future<String> get blockedDeleteStarted => _blockedDeleteStarted.future;

  @override
  Future<void> delete(String key) async {
    if (blockAdminDeletes && key.startsWith('admin_')) {
      if (!_blockedDeleteStarted.isCompleted) {
        _blockedDeleteStarted.complete(key);
      }
      await _blockedDeleteCompleter.future;
    }
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

  void completeBlockedDeletes() {
    if (!_blockedDeleteCompleter.isCompleted) {
      _blockedDeleteCompleter.complete();
    }
  }
}
