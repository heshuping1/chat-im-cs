/// 依赖注入统一入口
///
/// 集中注册全局 Riverpod Provider，并 re-export 各模块 Provider，
/// 使业务层只需 import 此文件即可获取所有核心依赖。
library injector;

import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lpp_mobile/core/admin/admin_http_client.dart';
import 'package:lpp_mobile/core/network/http_client.dart';
import 'package:lpp_mobile/core/notifications/push_device_registration_service.dart';
import 'package:lpp_mobile/core/notifications/push_notification_service.dart';
import 'package:lpp_mobile/core/space/space_manager.dart';
import 'package:lpp_mobile/core/storage/secure_storage.dart';
import 'package:lpp_mobile/features/auth/presentation/providers/auth_provider.dart';

// Re-export space providers so callers only need to import injector.dart
export 'package:lpp_mobile/core/space/space_manager.dart'
    show secureStorageProvider, currentSpaceProvider;

// Re-export feature providers
export 'package:lpp_mobile/features/profile/presentation/providers/profile_providers.dart'
    show profileProvider, currentUserProfileProvider, profileRepositoryProvider;
export 'package:lpp_mobile/features/settings/presentation/providers/settings_providers.dart'
    show notificationSettingsProvider, settingsRepositoryProvider;

/// HttpClient Provider
final httpClientProvider = Provider<HttpClient>((ref) {
  final storage = ref.watch(secureStorageProvider);
  return HttpClient(
    storage: storage,
    tokenGetter: () => GlobalTokenHolder.instance.accessToken,
    onAuthFailed: () async {
      GlobalTokenHolder.instance.accessToken = null;
      final spaceId = await storage.read(SecureStorageService.activeSpaceIdKey);
      if (spaceId != null) await storage.clearTokens(spaceId);
      await storage.delete(SecureStorageService.activeSpaceIdKey);
      // platform token 也清除，确保下次启动重新登录
      await storage.delete(SecureStorageService.platformTokenKey);
      ref.read(currentSpaceProvider.notifier).clearSpace();
      // 触发 authProvider 状态变为 unauthenticated，router 自动跳转到登录页
      await ref.read(authProvider.notifier).logout();
    },
    // platformToken 刷新成功后同步更新 authProvider state
    onPlatformTokenRefreshed: (newToken) {
      final authNotifier = ref.read(authProvider.notifier);
      authNotifier.updatePlatformToken(newToken);
    },
    // 租户 token 刷新成功后同步更新 authProvider state
    onTenantTokenRefreshed: (spaceId, newAccessToken) {
      final authNotifier = ref.read(authProvider.notifier);
      authNotifier.updateTenantToken(spaceId, newAccessToken);
    },
  );
});

/// Dio Provider（从 HttpClient 中取出）
final dioProvider = Provider<Dio>((ref) {
  return ref.watch(httpClientProvider).dio;
});

/// 管理后台 Dio。
///
/// 只用于管理员/所有者工作台调用 `/api/admin/v1/*`，会通过 platformToken
/// 调用 `/api/platform/v1/auth/admin-token` 换取管理端 accessToken，并和
/// 普通 client accessToken 隔离。管理数据接口部署在 admin 域名，不能复用
/// 普通业务接口的 chat 域名。
final adminDioProvider = Provider<Dio>((ref) {
  final storage = ref.watch(secureStorageProvider);
  return AdminHttpClient(
    storage: storage,
    spaceGetter: () => ref.read(currentSpaceProvider),
  ).dio;
});

/// Push device registration API wrapper.
///
/// Native FCM/JPush token acquisition is platform-specific; once a token is
/// available, call this provider to register it with the server.
final pushDeviceRegistrationServiceProvider =
    Provider<PushDeviceRegistrationService>((ref) {
  return PushDeviceRegistrationService(ref.watch(dioProvider));
});

/// FCM/local notification coordinator.
///
/// The provider registers the current space's device token whenever a tenant or
/// personal space becomes active. Actual native token acquisition is skipped
/// automatically when Firebase is not configured for the current build.
final pushNotificationServiceProvider =
    Provider<PushNotificationService>((ref) {
  final service = PushNotificationService(
    registrationService: ref.watch(pushDeviceRegistrationServiceProvider),
    storage: ref.watch(secureStorageProvider),
  );
  ref.listen(currentSpaceProvider, (previous, next) {
    if (next != null) {
      unawaited(service.registerCurrentDevice());
    }
  }, fireImmediately: true);
  ref.onDispose(() => unawaited(service.dispose()));
  return service;
});
