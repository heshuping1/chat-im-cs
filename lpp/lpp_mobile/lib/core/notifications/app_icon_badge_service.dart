import 'package:app_badge_plus/app_badge_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

const _androidLauncherBadgeChannelName = 'lpp_mobile/launcher_badge';

int normalizeAppIconBadgeCount(int count) {
  if (count <= 0) return 0;
  if (count > 9999) return 9999;
  return count;
}

abstract interface class AppIconBadgeAdapter {
  Future<bool> isAppBadgeSupported();

  Future<void> updateBadge(int count);

  Future<void> removeBadge();
}

class AppBadgePlusAdapter implements AppIconBadgeAdapter {
  AppBadgePlusAdapter({
    AndroidLauncherBadgeFallback androidFallback =
        const AndroidLauncherBadgeFallback(),
  }) : _androidFallback = androidFallback;

  final AndroidLauncherBadgeFallback _androidFallback;
  bool? _appBadgePlusSupported;

  @override
  Future<bool> isAppBadgeSupported() async {
    if (await _isAppBadgePlusSupported()) return true;
    return _androidFallback.isSupported();
  }

  @override
  Future<void> removeBadge() => _setBadge(0);

  @override
  Future<void> updateBadge(int count) => _setBadge(count);

  Future<void> _setBadge(int count) async {
    if (await _isAppBadgePlusSupported()) {
      await AppBadgePlus.updateBadge(count);
      return;
    }
    await _androidFallback.updateBadge(count);
  }

  Future<bool> _isAppBadgePlusSupported() async {
    final cached = _appBadgePlusSupported;
    if (cached != null) return cached;
    try {
      final supported = await AppBadgePlus.isSupported();
      _appBadgePlusSupported = supported;
      return supported;
    } catch (error) {
      debugPrint('[AppIconBadge] app_badge_plus support check failed: $error');
      _appBadgePlusSupported = false;
      return false;
    }
  }
}

class AndroidLauncherBadgeFallback {
  const AndroidLauncherBadgeFallback([
    this._channel = const MethodChannel(_androidLauncherBadgeChannelName),
  ]);

  final MethodChannel _channel;

  Future<bool> isSupported() async {
    if (defaultTargetPlatform != TargetPlatform.android) return false;
    try {
      return await _channel.invokeMethod<bool>('isSupported') ?? false;
    } on MissingPluginException {
      return false;
    } catch (error) {
      debugPrint(
          '[AppIconBadge] Android fallback support check failed: $error');
      return false;
    }
  }

  Future<bool> updateBadge(int count) async {
    if (defaultTargetPlatform != TargetPlatform.android) return false;
    try {
      return await _channel.invokeMethod<bool>(
            'updateBadge',
            {'count': normalizeAppIconBadgeCount(count)},
          ) ??
          false;
    } on MissingPluginException {
      return false;
    } catch (error) {
      debugPrint('[AppIconBadge] Android fallback update failed: $error');
      return false;
    }
  }
}

class AppIconBadgeService {
  AppIconBadgeService({required AppIconBadgeAdapter adapter})
      : _adapter = adapter;

  final AppIconBadgeAdapter _adapter;
  bool? _supported;

  Future<void> updateUnreadCount(int unreadCount) async {
    final count = normalizeAppIconBadgeCount(unreadCount);
    if (!await _isSupported()) return;
    try {
      if (count <= 0) {
        await _adapter.removeBadge();
        return;
      }
      await _adapter.updateBadge(count);
    } catch (error) {
      debugPrint('[AppIconBadge] update failed: $error');
    }
  }

  Future<void> clear() => updateUnreadCount(0);

  Future<bool> _isSupported() async {
    final cached = _supported;
    if (cached != null) return cached;
    try {
      final supported = await _adapter.isAppBadgeSupported();
      _supported = supported;
      return supported;
    } catch (error) {
      debugPrint('[AppIconBadge] support check failed: $error');
      _supported = false;
      return false;
    }
  }
}
