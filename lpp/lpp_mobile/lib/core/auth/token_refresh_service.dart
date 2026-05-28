import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:lpp_mobile/core/network/http_client.dart';
import 'package:lpp_mobile/core/storage/secure_storage.dart';
import 'package:lpp_mobile/core/space/space_manager.dart';

// ---------------------------------------------------------------------------
// TokenRefreshService — 前台定时刷新
//
// 策略：
// - 前台：Timer.periodic 每 45 分钟刷新一次（token 1小时过期，提前 15 分钟）
// - 后台恢复：app.dart 的 didChangeAppLifecycleState 触发立即刷新
// - 不依赖 workmanager，避免平台兼容问题
// ---------------------------------------------------------------------------

class TokenRefreshService {
  static final TokenRefreshService _instance = TokenRefreshService._();
  static TokenRefreshService get instance => _instance;
  TokenRefreshService._();

  Timer? _timer;

  /// 前台刷新间隔：45 分钟
  static const _interval = Duration(minutes: 45);

  /// 启动定时刷新
  /// [onRefresh] 由 AuthNotifier 提供，负责刷新 token 并更新 state
  void start({required Future<void> Function() onRefresh}) {
    _timer?.cancel();
    _timer = Timer.periodic(_interval, (_) async {
      debugPrint('[TokenRefresh] timer triggered');
      try {
        await onRefresh();
      } catch (e) {
        debugPrint('[TokenRefresh] refresh error: $e');
      }
    });
    debugPrint('[TokenRefresh] started, interval=${_interval.inMinutes}min');
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
    debugPrint('[TokenRefresh] stopped');
  }
}

// ---------------------------------------------------------------------------
// 后台刷新辅助（不依赖 Riverpod，直接操作 SecureStorage）
// 供 app 从后台恢复时调用，或在 workmanager 回调中使用
// ---------------------------------------------------------------------------

Future<void> refreshAllTokensStandalone() async {
  final storage = SecureStorageServiceImpl();
  final baseUrl = HttpClient.baseUrl;

  try {
    final platformToken = await storage.read(SecureStorageService.platformTokenKey);
    if (platformToken == null || platformToken.isEmpty) return;

    // 刷新 platformToken
    final newPlatformToken = await _refreshPlatformToken(platformToken, baseUrl);
    if (newPlatformToken == null) return;

    await storage.write(SecureStorageService.platformTokenKey, newPlatformToken);
    debugPrint('[TokenRefresh] platformToken refreshed standalone');

    // 刷新当前激活空间的租户 token
    final activeSpaceId = await storage.read(SecureStorageService.activeSpaceIdKey);
    if (activeSpaceId != null) {
      await _refreshTenantToken(activeSpaceId, newPlatformToken, storage, baseUrl);
    }

    // 刷新所有已知租户的 token
    final knownTenantIds = await storage.readKnownTenantIds();
    for (final tenantId in knownTenantIds) {
      if (tenantId != activeSpaceId) {
        await _refreshTenantToken(tenantId, newPlatformToken, storage, baseUrl);
      }
    }
  } catch (e) {
    debugPrint('[TokenRefresh] standalone refresh error: $e');
  }
}

Future<String?> _refreshPlatformToken(String token, String baseUrl) async {
  try {
    final dio = Dio(BaseOptions(baseUrl: baseUrl));
    final resp = await dio.post<Map<String, dynamic>>(
      '/api/platform/v1/auth/refresh-platform-token',
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
    return resp.data?['data']?['platformToken'] as String?;
  } catch (_) {
    return null;
  }
}

Future<void> _refreshTenantToken(
  String spaceId,
  String platformToken,
  SecureStorageService storage,
  String baseUrl,
) async {
  try {
    final dio = Dio(BaseOptions(baseUrl: baseUrl));
    final endpoint = spaceId == 'personal'
        ? '/api/platform/v1/auth/select-personal-space'
        : '/api/platform/v1/auth/select-tenant';
    final data = spaceId == 'personal' ? null : {'tenantId': spaceId};

    final resp = await dio.post<Map<String, dynamic>>(
      endpoint,
      data: data,
      options: Options(headers: {'Authorization': 'Bearer $platformToken'}),
    );
    final newAccessToken = resp.data?['data']?['accessToken'] as String?;
    final newRefreshToken = resp.data?['data']?['refreshToken'] as String?;
    if (newAccessToken != null && newRefreshToken != null) {
      await storage.writeTokenPair(
        spaceId: spaceId,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      );
      // 同步更新内存 token（如果是当前激活空间）
      final activeSpaceId = await storage.read(SecureStorageService.activeSpaceIdKey);
      if (spaceId == activeSpaceId) {
        GlobalTokenHolder.instance.accessToken = newAccessToken;
      }
      debugPrint('[TokenRefresh] tenant token refreshed for $spaceId');
    }
  } catch (_) {}
}
