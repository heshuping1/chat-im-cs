import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/core/notifications/app_icon_badge_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('AppIconBadgeService', () {
    test('normalizes launcher badge counts for platform limits', () {
      expect(normalizeAppIconBadgeCount(-1), 0);
      expect(normalizeAppIconBadgeCount(0), 0);
      expect(normalizeAppIconBadgeCount(3), 3);
      expect(normalizeAppIconBadgeCount(100000), 9999);
    });

    test('sets positive unread count and clears zero count', () async {
      final adapter = _FakeAppIconBadgeAdapter(isSupported: true);
      final service = AppIconBadgeService(adapter: adapter);

      await service.updateUnreadCount(3);
      await service.updateUnreadCount(0);

      expect(adapter.calls, ['set:3', 'clear']);
    });

    test('does nothing when launcher badge is unsupported', () async {
      final adapter = _FakeAppIconBadgeAdapter(isSupported: false);
      final service = AppIconBadgeService(adapter: adapter);

      await service.updateUnreadCount(5);
      await service.clear();

      expect(adapter.calls, isEmpty);
    });
  });

  group('AndroidLauncherBadgeFallback', () {
    const channel = MethodChannel('test_launcher_badge');

    tearDown(() {
      debugDefaultTargetPlatformOverride = null;
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, null);
    });

    test('updates Android launcher badge through platform channel', () async {
      debugDefaultTargetPlatformOverride = TargetPlatform.android;
      final calls = <MethodCall>[];
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, (call) async {
        calls.add(call);
        return true;
      });
      const fallback = AndroidLauncherBadgeFallback(channel);

      expect(await fallback.isSupported(), isTrue);
      expect(await fallback.updateBadge(7), isTrue);

      expect(calls.map((call) => call.method), ['isSupported', 'updateBadge']);
      expect(calls.last.arguments, {'count': 7});
    });
  });
}

class _FakeAppIconBadgeAdapter implements AppIconBadgeAdapter {
  _FakeAppIconBadgeAdapter({required this.isSupported});

  final bool isSupported;
  final List<String> calls = [];

  @override
  Future<bool> isAppBadgeSupported() async => isSupported;

  @override
  Future<void> removeBadge() async {
    calls.add('clear');
  }

  @override
  Future<void> updateBadge(int count) async {
    calls.add('set:$count');
  }
}
