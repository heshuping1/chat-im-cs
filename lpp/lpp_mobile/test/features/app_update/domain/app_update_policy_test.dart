import 'package:flutter_test/flutter_test.dart';
import 'package:lpp_mobile/features/app_update/domain/app_release_update.dart';
import 'package:lpp_mobile/features/app_update/domain/app_version_code.dart';

void main() {
  group('AppReleaseUpdate', () {
    test('marks forceUpdate releases as required updates', () {
      final update = AppReleaseUpdate(
        appKey: 'user',
        platform: 'android',
        clientVersionCode: 10,
        latestVersion: '1.2.0',
        latestVersionCode: 12,
        downloadUrl: '/api/client/v1/app-releases/download?appKey=user',
        fileSizeBytes: 1024,
        fileHashSha256: 'a' * 64,
        releaseNotes: '修复消息通知',
        updateAvailable: true,
        forceUpdate: true,
      );

      expect(update.status, AppUpdateStatus.required);
      expect(update.canStartUpdate, isTrue);
    });

    test('marks optional available releases as optional updates', () {
      const update = AppReleaseUpdate(
        appKey: 'user',
        platform: 'ios',
        clientVersionCode: 10,
        latestVersion: '1.2.0',
        latestVersionCode: 12,
        downloadUrl: 'https://apps.apple.com/app/id123',
        fileSizeBytes: null,
        fileHashSha256: null,
        releaseNotes: '体验优化',
        updateAvailable: true,
        forceUpdate: false,
      );

      expect(update.status, AppUpdateStatus.optional);
      expect(update.canStartUpdate, isTrue);
    });

    test('treats missing download url as not actionable', () {
      const update = AppReleaseUpdate(
        appKey: 'user',
        platform: 'android',
        clientVersionCode: 12,
        latestVersion: '1.2.0',
        latestVersionCode: 12,
        downloadUrl: null,
        fileSizeBytes: null,
        fileHashSha256: null,
        releaseNotes: null,
        updateAvailable: false,
        forceUpdate: false,
      );

      expect(update.status, AppUpdateStatus.none);
      expect(update.canStartUpdate, isFalse);
    });
  });

  group('parseAppVersionCode', () {
    test('uses Flutter build number as integer versionCode', () {
      expect(parseAppVersionCode('104'), 104);
    });

    test('falls back to 1 for invalid build numbers', () {
      expect(parseAppVersionCode('1.0.4'), 1);
      expect(parseAppVersionCode(''), 1);
    });
  });
}
